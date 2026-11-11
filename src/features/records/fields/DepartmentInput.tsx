import { useMemo } from "react";
import { MultiSelect, Select } from "@mantine/core";

import { useDepartmentOptions } from "../../../api/reactQueryHooks/useRecords";
import type { RecordColumn } from "../schema";
import { useLabelProps } from "./compact";

// Picker for a "Department" column: the company's departments (a short list,
// loaded once). A department that was deleted keeps showing as such.
export function DepartmentInput({
  id,
  column,
  value,
  onChange,
  error,
}: {
  id: string;
  column: RecordColumn;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const multiple = Boolean(column.multiple);
  const { data: options = [], isLoading } = useDepartmentOptions();
  const ids = multiple ? (Array.isArray(value) ? value.map(String) : []) : value ? [String(value)] : [];

  const data = useMemo(() => {
    const known = new Set(options.map((o) => o.value));
    const missing = isLoading ? [] : ids.filter((v) => !known.has(v)).map((v) => ({ value: v, label: "Deleted department" }));
    return [...options, ...missing];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, isLoading, ids.join(",")]);

  const labelProps = useLabelProps(column);
  const common = {
    id,
    ...labelProps,
    data,
    searchable: true,
    clearable: true,
    error,
    placeholder: isLoading ? "Loading…" : "Choose a department",
    nothingFoundMessage: "No department found",
  };

  return multiple ? (
    <MultiSelect {...common} value={ids} onChange={(v) => onChange(v)} />
  ) : (
    <Select {...common} value={ids[0] ?? null} onChange={(v) => onChange(v)} />
  );
}
