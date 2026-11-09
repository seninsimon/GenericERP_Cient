import { TextInput } from "@mantine/core";

export default function TextField({ column, value, isView, onChange, error }: any) {
  return (
    <TextInput
      label={column.label}
      value={value || ""}
      disabled={isView}
      withAsterisk={Boolean(column.required)}
      error={error}
      onChange={(e) => onChange(column.name, e.target.value)}
    />
  );
}
