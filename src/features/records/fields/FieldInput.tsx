import { ColorSwatch, Group, Input, MultiSelect, NumberInput, Select, Switch, Text, Textarea, TextInput } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { DateInput } from "@mantine/dates";

import { formatDate, formatNumber } from "../../../lib/format";
import { useCurrentUser } from "../../../auth/AuthContext";
import { canChoose, columnLabel, type RecordColumn } from "../schema";
import { useLabelProps } from "./compact";
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
  id: idProp,
}: {
  column: RecordColumn;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  // unique element id when the same column appears several times (line items)
  id?: string;
}) {
  const id = idProp ?? `field-${column.name}`;
  const labelProps = useLabelProps(column);
  const { user } = useCurrentUser();
  const common = {
    id,
    ...labelProps,
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
            aria-label={columnLabel(column)}
          />
        </Input.Wrapper>
      );

    case "formula":
    case "rollup": {
      // worked out by the server: from the other fields, or the linked records
      const kind = column.type === "formula" ? column.formula?.type : (column.rollup?.type ?? "number");
      const shown =
        value == null || value === ""
          ? ""
          : kind === "number"
            ? formatNumber(value)
            : kind === "date"
              ? formatDate(value)
              : kind === "boolean"
                ? value === true
                  ? "Yes"
                  : "No"
                : String(value);
      return (
        <TextInput
          {...common}
          withAsterisk={false}
          value={shown}
          placeholder="Worked out as you fill in the form"
          description={
            shown
              ? column.type === "rollup"
                ? "Added up from the linked records"
                : "Worked out from the other fields"
              : undefined
          }
          readOnly
          variant="filled"
        />
      );
    }

    case "autonumber":
      // given by the server when the record is created; never typed
      return (
        <TextInput
          {...common}
          withAsterisk={false}
          value={typeof value === "string" ? value : ""}
          placeholder="Given automatically when saved"
          readOnly
          variant="filled"
        />
      );

    case "choice": {
      // a value whose option was removed stays pickable on this record
      const current = ([] as unknown[]).concat(value ?? []).filter((v): v is string => typeof v === "string" && v !== "");
      const options = column.options ?? [];
      // approval steps ("Approved") only for the roles that may choose them
      const data = [
        ...options.map((o) => ({ value: o.label, label: o.label, disabled: !canChoose(o, user) && !current.includes(o.label) })),
        ...current.filter((v) => !options.some((o) => o.label === v)).map((v) => ({ value: v, label: `${v} (removed)` })),
      ];
      const colorOf = (label: string) => options.find((o) => o.label === label)?.color ?? "gray";
      const renderOption = ({ option }: { option: { value: string; label: string; disabled?: boolean } }) => (
        <Group gap={8} wrap="nowrap">
          <ColorSwatch color={`var(--mantine-color-${colorOf(option.value)}-filled)`} size={10} withShadow={false} />
          {option.label}
          {option.disabled && (
            <Group gap={2} wrap="nowrap" c="dimmed">
              <IconLock size={12} />
              <Text span size="xs">
                needs approval
              </Text>
            </Group>
          )}
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
