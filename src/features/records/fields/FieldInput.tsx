import { ColorSwatch, Group, Input, MultiSelect, NumberInput, Select, Switch, Textarea, TextInput } from "@mantine/core";
import { DateInput } from "@mantine/dates";

import { columnLabel, type RecordColumn } from "../schema";
import { RelationInput } from "./RelationInput";
import { RichTextInput } from "./RichText";
import { DepartmentInput } from "./DepartmentInput";
import { UserInput } from "./UserInput";

// Input for one column (all types except files/images, see FileInputArea).
export function FieldInput({
  column,
  value,
  onChange,
  error,
}: {
  column: RecordColumn;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const id = `field-${column.name}`;
  const common = {
    id,
    label: columnLabel(column),
    withAsterisk: Boolean(column.required),
    error,
  };

  switch (column.type) {
    case "number":
      return (
        <NumberInput
          {...common}
          value={typeof value === "number" || typeof value === "string" ? value : ""}
          // an empty box clears the value instead of sending ""
          onChange={(v) => onChange(v === "" ? null : v)}
          thousandSeparator=","
          className="tabular-nums"
        />
      );

    case "date":
      return (
        <DateInput
          {...common}
          // stored values may include a time; the picker works with YYYY-MM-DD
          value={typeof value === "string" && value ? value.slice(0, 10) : null}
          onChange={(v) => onChange(v || null)}
          clearable
          placeholder="Pick a date"
        />
      );

    case "boolean":
      return (
        <Input.Wrapper label={common.label} withAsterisk={common.withAsterisk} error={error}>
          <Switch
            id={id}
            mt={8}
            checked={value === true}
            onChange={(e) => onChange(e.currentTarget.checked)}
            label={value === true ? "Yes" : "No"}
            aria-label={common.label}
          />
        </Input.Wrapper>
      );

    case "choice": {
      // a value whose option was removed stays pickable on this record
      const current = ([] as unknown[]).concat(value ?? []).filter((v): v is string => typeof v === "string" && v !== "");
      const options = column.options ?? [];
      const data = [
        ...options.map((o) => ({ value: o.label, label: o.label })),
        ...current.filter((v) => !options.some((o) => o.label === v)).map((v) => ({ value: v, label: `${v} (removed)` })),
      ];
      const colorOf = (label: string) => options.find((o) => o.label === label)?.color ?? "gray";
      const renderOption = ({ option }: { option: { value: string; label: string } }) => (
        <Group gap={8} wrap="nowrap">
          <ColorSwatch color={`var(--mantine-color-${colorOf(option.value)}-filled)`} size={10} withShadow={false} />
          {option.label}
        </Group>
      );
      return column.multiple ? (
        <MultiSelect
          {...common}
          data={data}
          value={current}
          onChange={(v) => onChange(v)}
          renderOption={renderOption}
          searchable={data.length > 8}
          clearable
          placeholder={current.length ? undefined : "Choose…"}
        />
      ) : (
        <Select
          {...common}
          data={data}
          value={current[0] ?? null}
          onChange={(v) => onChange(v ?? null)}
          renderOption={renderOption}
          searchable={data.length > 8}
          clearable={!column.required}
          placeholder="Choose…"
          leftSection={
            current[0] ? (
              <ColorSwatch color={`var(--mantine-color-${colorOf(current[0])}-filled)`} size={10} withShadow={false} />
            ) : undefined
          }
        />
      );
    }

    case "relation":
      return <RelationInput id={id} column={column} value={value} onChange={onChange} error={error} />;

    case "department":
      return <DepartmentInput id={id} column={column} value={value} onChange={onChange} error={error} />;

    case "user":
      return <UserInput id={id} column={column} value={value} onChange={onChange} error={error} />;

    case "richtext":
      return <RichTextInput id={id} column={column} value={value} onChange={onChange} error={error} />;

    case "textarea":
      return (
        <Textarea
          {...common}
          value={typeof value === "string" ? value : value == null ? "" : String(value)}
          onChange={(e) => onChange(e.currentTarget.value)}
          minRows={4}
          maxRows={14}
        />
      );

    default:
      return (
        <TextInput
          {...common}
          value={typeof value === "string" ? value : value == null ? "" : String(value)}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      );
  }
}
