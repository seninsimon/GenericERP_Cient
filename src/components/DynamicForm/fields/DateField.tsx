import { DatePickerInput } from "@mantine/dates";

export default function DateField({ column, value, isView, onChange, error }: any) {
  return (
    <DatePickerInput
      label={column.label}
      value={value || null}
      disabled={isView}
      withAsterisk={Boolean(column.required)}
      error={error}
      clearable={!isView}
      onChange={(e) => onChange(column.name, e)}
    />
  );
}
