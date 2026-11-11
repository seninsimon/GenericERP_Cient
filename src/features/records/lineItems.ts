import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";

import { getTableData } from "../../api/api";
import { useTables } from "../../api/reactQueryHooks/useTables";
import { useCurrentUser } from "../../auth/AuthContext";
import { FILE_TYPES, newRecordValues, SERVER_TYPES, type RecordColumn, type TableSchemaInfo } from "./schema";

// Line items: records of another table edited inside this record's form (an
// invoice's lines). A table qualifies when its link column to this table is
// marked "inline". The lines are sent with the record as `_children` and
// saved in the same request.

export type Line = { key: string; _id?: string; values: Record<string, unknown>; original?: Record<string, unknown> };
type GroupState = { lines: Line[]; removed: string[] };

export type LineGroup = {
  table: string;
  schema: TableSchemaInfo;
  link: RecordColumn;
  // the columns shown in the grid (inputs, or read-only for server-worked values)
  columns: RecordColumn[];
  lines: Line[];
  loading: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

let counter = 0;
const newKey = () => `new-${++counter}`;
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function useLineItems(table: string, recordId?: string) {
  const { data: tables = [] } = useTables();
  const { user } = useCurrentUser();
  const children = useMemo(
    () =>
      (tables as TableSchemaInfo[]).flatMap((schema) =>
        schema.columns
          .filter((c) => c.type === "relation" && c.ref === table && c.inline && !c.multiple)
          .map((link) => ({ schema, link }))
      ),
    [tables, table]
  );

  // lines already saved (when editing)
  const loaded = useQueries({
    queries: children.map((c) => ({
      queryKey: ["lines", c.schema.tableName, recordId],
      enabled: Boolean(recordId),
      queryFn: async () =>
        (
          await getTableData(c.schema.tableName, {
            page: 1,
            limit: 500,
            raw: true,
            sort: "_createdAt",
            order: "asc",
            filters: [{ field: c.link.name, op: "in", value: [recordId] }],
          })
        ).data.data as (Record<string, unknown> & { _id: string })[],
    })),
  });

  const [state, setState] = useState<Record<string, GroupState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({}); // "<table>:<line key>:<column>"

  const savedLines = (i: number): Line[] =>
    (loaded[i]?.data ?? []).map((row) => ({ key: row._id, _id: row._id, values: { ...row }, original: { ...row } }));
  const groupState = (i: number): GroupState => state[children[i].schema.tableName] ?? { lines: savedLines(i), removed: [] };

  const groups: LineGroup[] = children.map((c, i) => ({
    table: c.schema.tableName,
    schema: c.schema,
    link: c.link,
    columns: c.schema.columns.filter(
      (col) =>
        col !== c.link &&
        !FILE_TYPES.includes(col.type) &&
        col.type !== "richtext" &&
        (col.showInTable !== false || col.required)
    ),
    lines: groupState(i).lines,
    loading: Boolean(recordId) && loaded[i]?.isLoading,
    canAdd: Boolean(c.schema.permissions?.create),
    canEdit: Boolean(c.schema.permissions?.edit),
    canDelete: Boolean(c.schema.permissions?.delete),
  }));

  const change = (t: string, fn: (g: GroupState) => GroupState) => {
    const i = children.findIndex((c) => c.schema.tableName === t);
    setState((prev) => ({ ...prev, [t]: fn(prev[t] ?? groupState(i)) }));
  };

  const add = (t: string) => {
    const group = groups.find((g) => g.table === t)!;
    const defaults = newRecordValues(group.schema.columns, user, "");
    delete defaults[group.link.name];
    change(t, (g) => ({ ...g, lines: [...g.lines, { key: newKey(), values: defaults }] }));
  };
  const update = (t: string, key: string, column: string, value: unknown) => {
    change(t, (g) => ({ ...g, lines: g.lines.map((l) => (l.key === key ? { ...l, values: { ...l.values, [column]: value } } : l)) }));
    setErrors((prev) => {
      const k = `${t}:${key}:${column}`;
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };
  const remove = (t: string, key: string) =>
    change(t, (g) => {
      const line = g.lines.find((l) => l.key === key);
      return { lines: g.lines.filter((l) => l.key !== key), removed: line?._id ? [...g.removed, line._id] : g.removed };
    });

  // what changed, for the save request; `where` maps server error keys back to lines
  const changes = () => {
    const payload: Record<string, { create: object[]; update: object[]; delete: string[] }> = {};
    const where: Record<string, { create: string[]; update: string[] }> = {};
    for (const group of groups) {
      const s = state[group.table];
      if (!s) continue;
      const editable = (values: Record<string, unknown>) =>
        Object.fromEntries(
          Object.entries(values).filter(([k]) => {
            const col = group.schema.columns.find((c) => c.name === k);
            return col && col !== group.link && !SERVER_TYPES.includes(col.type);
          })
        );
      const create = s.lines.filter((l) => !l._id);
      const update = s.lines
        .filter((l) => l._id)
        .map((l) => ({ line: l, diff: Object.fromEntries(Object.entries(editable(l.values)).filter(([k, v]) => !same(v, l.original?.[k]))) }))
        .filter((u) => Object.keys(u.diff).length);
      if (!create.length && !update.length && !s.removed.length) continue;
      payload[group.table] = {
        create: create.map((l) => editable(l.values)),
        update: update.map((u) => ({ _id: u.line._id, ...u.diff })),
        delete: s.removed,
      };
      where[group.table] = { create: create.map((l) => l.key), update: update.map((u) => u.line.key) };
    }
    return { payload: Object.keys(payload).length ? payload : undefined, where };
  };

  // server errors ("lines.create.1.qty") onto the grid
  const showErrors = (fieldErrors: Record<string, string>, where: ReturnType<typeof changes>["where"]) => {
    const next: Record<string, string> = {};
    for (const [key, message] of Object.entries(fieldErrors)) {
      const m = /^(.+)\.(create|update)\.(\d+)\.(.+)$/.exec(key);
      if (!m) continue;
      const lineKey = where[m[1]]?.[m[2] as "create" | "update"]?.[Number(m[3])];
      if (lineKey) next[`${m[1]}:${lineKey}:${m[4]}`] = message;
    }
    setErrors(next);
    return Object.keys(next).length > 0;
  };

  const reset = () => {
    setState({});
    setErrors({});
  };

  return {
    groups,
    add,
    update,
    remove,
    changes,
    showErrors,
    reset,
    errorFor: (t: string, key: string, column: string) => errors[`${t}:${key}:${column}`],
    dirty: Object.keys(state).length > 0,
  };
}

export type LineItems = ReturnType<typeof useLineItems>;
