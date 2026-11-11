import { useState } from "react";
import { Anchor, Group, MultiSelect, Select, Stack, Text } from "@mantine/core";

import { useSchema, useTables } from "../../api/reactQueryHooks/useTables";
import {
  columnLabel,
  valueType,
  type RecordColumn,
  type RollupConfig,
  type TableSchemaInfo,
} from "../../features/records/schema";
import { tableTitle } from "../../layout/nav";

const FNS = [
  { value: "count", label: "Count them" },
  { value: "sum", label: "Add up" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Lowest / earliest" },
  { value: "max", label: "Highest / latest" },
];

// The settings of a "Total" column: which linked records, what to work out,
// and (optionally) only some of them. Links are found from the tables that
// point at this one.
export function RollupEditor({
  table,
  value,
  onChange,
  error,
}: {
  table: string;
  value: Partial<RollupConfig>;
  onChange: (value: Partial<RollupConfig>) => void;
  error?: string;
}) {
  const { data: tables = [] } = useTables();
  const sources = (tables as TableSchemaInfo[]).flatMap((s) =>
    s.columns.filter((c) => c.type === "relation" && c.ref === table).map((c) => ({ schema: s, column: c }))
  );
  const options = sources.map(({ schema, column }) => {
    const several = sources.filter((x) => x.schema === schema).length > 1 || schema.tableName === table;
    return {
      value: `${schema.tableName}|${column.name}`,
      label: several ? `${tableTitle(schema.tableName)} (by ${columnLabel(column)})` : tableTitle(schema.tableName),
    };
  });
  const child = useSchema(value.from ?? "").data as TableSchemaInfo | undefined;
  const childColumns: RecordColumn[] = value.from ? (child?.columns ?? []) : [];
  const fn = value.fn ?? "count";
  const fields = childColumns.filter((c) => {
    const t = valueType(c);
    return fn === "sum" || fn === "avg" ? t === "number" : t === "number" || t === "date";
  });
  const choices = childColumns.filter((c) => c.type === "choice" && !c.multiple);
  const whereColumn = choices.find((c) => c.name === value.where?.column);
  const [showWhere, setShowWhere] = useState(Boolean(value.where));
  const whereMode = value.where?.notIn ? "notIn" : "in";

  if (!options.length) {
    return (
      <Text size="sm" c="dimmed">
        No table links to {tableTitle(table)} yet. Add a <b>Link to table</b> column pointing here in another table (e.g. Tasks → Project),
        then total it here.
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      <Select
        label="Total of"
        description="Records in another table that link to this one"
        placeholder="Choose the linked records"
        data={options}
        value={value.from && value.via ? `${value.from}|${value.via}` : null}
        onChange={(v) => {
          const [from, via] = (v ?? "|").split("|");
          onChange({ fn, from, via });
          setShowWhere(false);
        }}
        withAsterisk
        error={error}
      />
      {value.from && (
        <Group grow align="flex-start">
          <Select
            label="Work out"
            data={FNS}
            value={fn}
            onChange={(v) => onChange({ ...value, fn: (v ?? "count") as RollupConfig["fn"], field: undefined })}
            allowDeselect={false}
          />
          {fn !== "count" && (
            <Select
              label="Of"
              placeholder={fields.length ? "Choose a field" : "No suitable field"}
              data={fields.map((c) => ({ value: c.name, label: columnLabel(c) }))}
              value={value.field ?? null}
              onChange={(v) => onChange({ ...value, field: v ?? undefined })}
              withAsterisk
            />
          )}
        </Group>
      )}
      {value.from && choices.length > 0 && !showWhere && (
        <Anchor component="button" type="button" size="sm" onClick={() => setShowWhere(true)} style={{ alignSelf: "flex-start" }}>
          Only some of them…
        </Anchor>
      )}
      {value.from && showWhere && (
        <Stack gap={6}>
          <Group grow align="flex-end">
            <Select
              label="Only where"
              data={choices.map((c) => ({ value: c.name, label: columnLabel(c) }))}
              value={value.where?.column ?? null}
              onChange={(v) => onChange({ ...value, where: v ? { column: v } : undefined })}
              clearable
              placeholder="Any field"
            />
            <Select
              aria-label="Condition"
              data={[
                { value: "in", label: "is any of" },
                { value: "notIn", label: "is none of" },
              ]}
              value={whereMode}
              disabled={!whereColumn}
              onChange={(mode) => {
                const list = value.where?.in ?? value.where?.notIn ?? [];
                if (value.where) onChange({ ...value, where: { column: value.where.column, [mode ?? "in"]: list } });
              }}
              allowDeselect={false}
            />
          </Group>
          {whereColumn && (
            <MultiSelect
              aria-label="Values"
              data={(whereColumn.options ?? []).map((o) => o.label)}
              value={value.where?.in ?? value.where?.notIn ?? []}
              onChange={(list) => onChange({ ...value, where: { column: whereColumn.name, [whereMode]: list } })}
              placeholder="Choose…"
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}
