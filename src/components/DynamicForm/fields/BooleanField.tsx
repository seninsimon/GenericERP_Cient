import { Checkbox } from "@mantine/core";

export default function BooleanField({ column, value, isView, onChange, error }: any) {
  return (
    <Checkbox
      label={column.label}
      checked={value || false}
      disabled={isView}
      error={error}
      onChange={(e) => onChange(column.name, e.currentTarget.checked)}
    />
  );
}
