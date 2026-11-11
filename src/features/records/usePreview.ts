import { useDebouncedValue } from "@mantine/hooks";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { previewSave, type SavePreview } from "../../api/api";
import type { Line, LineItems } from "./lineItems";
import type { RecordColumn } from "./schema";

// Formulas and totals are worked out by the server. While a form is being
// filled in, a "preview save" (rolled back on the server) shows them live.
const LIVE = ["formula", "rollup"];

export function useSavePreview({
  table,
  id,
  columns,
  values,
  departmentId,
  lineItems,
  enabled,
}: {
  table: string;
  id?: string;
  columns: RecordColumn[];
  values: Record<string, unknown>;
  departmentId: string | null;
  lineItems: LineItems;
  enabled: boolean;
}) {
  const needed =
    columns.some((c) => LIVE.includes(c.type)) || lineItems.groups.some((g) => g.columns.some((c) => LIVE.includes(c.type)));
  // only what formulas can use (no files, nothing worked out by the server)
  const body: Record<string, unknown> = {};
  for (const c of columns) {
    if (c.name in values && !LIVE.includes(c.type) && c.type !== "autonumber" && !["image", "images", "file", "files"].includes(c.type)) {
      body[c.name] = values[c.name];
    }
  }
  if (departmentId) body._departmentId = departmentId;
  const children = lineItems.changes().payload;
  if (children) body._children = children;
  const [debounced] = useDebouncedValue(JSON.stringify(body), 500);

  const query = useQuery({
    queryKey: ["savePreview", table, id ?? null, debounced],
    queryFn: async () => (await previewSave(table, id, JSON.parse(debounced))).data,
    enabled: enabled && needed,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60_000,
  });
  const preview: SavePreview | undefined = query.data;

  // a line's worked-out values: saved lines by id, new ones in order after them
  const lineValues = (table: string, lines: Line[]): Map<string, Record<string, unknown>> => {
    const out = new Map<string, Record<string, unknown>>();
    const rows = preview?.lines[table] ?? [];
    const savedIds = new Set(lines.filter((l) => l._id).map((l) => l._id));
    const fresh = rows.filter((r) => !savedIds.has(r._id));
    let next = 0;
    for (const line of lines) {
      const row = line._id ? rows.find((r) => r._id === line._id) : fresh[next++];
      if (row) out.set(line.key, row);
    }
    return out;
  };

  return { value: (column: string) => preview?.data[column], lineValues, live: needed && Boolean(preview) };
}
