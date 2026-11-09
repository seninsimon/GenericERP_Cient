import { NumberInput } from "@mantine/core";

export default function NumberField({ column, value, isView, onChange, error }: any) {
  return (
    <NumberInput
      label={column.label}
      value={value ?? ""}
      disabled={isView}
      withAsterisk={Boolean(column.required)}
      error={error}
      // empty input clears the value instead of sending ""
      onChange={(v) => onChange(column.name, v === "" ? null : v)}
    />
  );
}
