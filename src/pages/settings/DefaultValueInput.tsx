import { MultiSelect, NumberInput, Select, Switch, TextInput } from "@mantine/core";

import type { ChoiceOption } from "../../features/records/schema";

// "Default value" in the column settings: what new records start with. People
// can still change it in the form. Dates, people and departments only offer
// the one default that's useful (today / whoever creates it / their department).
export function DefaultValueInput({
  type,
  multiple,
  options,
  value,
  onChange,
}: {
  type: string;
  multiple: boolean;
  options: ChoiceOption[];
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const description = "New records start with this; people can change it";

  switch (type) {
    case "date":
      return (
        <Switch
          label="New records start with today's date"
          checked={value === "today"}
          onChange={(e) => onChange(e.currentTarget.checked ? "today" : null)}
        />
      );
    case "user":
      return (
        <Switch
          label="New records start with the person creating them"
          description="e.g. Assignee or Owner"
          checked={value === "$me"}
          onChange={(e) => onChange(e.currentTarget.checked ? "$me" : null)}
        />
      );
    case "department":
      return (
        <Switch
          label="New records start with the creator's department"
          description="Left empty for people in several departments"
          checked={value === "$mine"}
          onChange={(e) => onChange(e.currentTarget.checked ? "$mine" : null)}
        />
      );
    case "boolean":
      return (
        <Select
          label="Default value"
          description={description}
          data={[
            { value: "", label: "None" },
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]}
          value={value === true ? "true" : value === false ? "false" : ""}
          onChange={(v) => onChange(v === "true" ? true : v === "false" ? false : null)}
          allowDeselect={false}
        />
      );
    case "number":
      return (
        <NumberInput
          label="Default value"
          description={description}
          placeholder="None"
          value={typeof value === "number" ? value : ""}
          onChange={(v) => onChange(v === "" ? null : Number(v))}
        />
      );
    case "choice": {
      const data = [...new Set(options.map((o) => o.label.trim()).filter(Boolean))];
      return multiple ? (
        <MultiSelect
          label="Default value"
          description={description}
          placeholder={Array.isArray(value) && value.length ? undefined : "None"}
          data={data}
          value={(Array.isArray(value) ? value : typeof value === "string" ? [value] : []).filter(
            (v): v is string => data.includes(v)
          )}
          onChange={(v) => onChange(v.length ? v : null)}
          clearable
        />
      ) : (
        <Select
          label="Default value"
          description={description}
          placeholder="None"
          data={data}
          value={((Array.isArray(value) ? value[0] : value) as string | undefined) ?? null}
          onChange={(v) => onChange(v ?? null)}
          clearable
        />
      );
    }
    case "text":
    case "textarea":
      return (
        <TextInput
          label="Default value"
          description={description}
          placeholder="None"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.currentTarget.value || null)}
        />
      );
    default:
      return null;
  }
}
