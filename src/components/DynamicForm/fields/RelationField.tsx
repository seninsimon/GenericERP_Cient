import { useMemo, useState } from "react";
import { Loader, MultiSelect, Select } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getRelationOptions, type RelationOption } from "../../../api/api";

const SEARCH_LIMIT = 50;

const toIds = (value: any, multiple: boolean): string[] => {
  if (multiple) return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
  return value ? [String(value)] : [];
};

// Searchable select for a relation column. Options are searched on the server
// (debounced, limited), and the currently selected ids are resolved separately
// so their labels always show even when they're not in the search results.
export default function RelationField({ column, value, isView, onChange, error }: any) {
  const ref: string | undefined = column.ref;
  const multiple = Boolean(column.multiple);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const ids = toIds(value, multiple);
  const idsKey = ids.join(",");

  // labels of the selected value(s)
  const selected = useQuery({
    queryKey: ["relationOptions", ref, column.displayField, "ids", idsKey],
    queryFn: async () =>
      (await getRelationOptions(ref!, { ids, displayField: column.displayField })).data,
    enabled: Boolean(ref) && ids.length > 0,
    staleTime: 60_000,
  });

  // search results (not needed in view mode)
  const results = useQuery({
    queryKey: ["relationOptions", ref, column.displayField, "search", debouncedSearch],
    queryFn: async () =>
      (
        await getRelationOptions(ref!, {
          search: debouncedSearch,
          limit: SEARCH_LIMIT,
          displayField: column.displayField,
        })
      ).data,
    enabled: Boolean(ref) && !isView,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const data = useMemo(() => {
    const byValue = new Map<string, RelationOption>();
    for (const option of selected.data ?? []) byValue.set(option.value, option);
    for (const option of results.data ?? []) byValue.set(option.value, option);
    // selected ids the user can't see (or that were deleted) still need an entry
    for (const id of ids) {
      if (!byValue.has(id) && !selected.isLoading) {
        byValue.set(id, { value: id, label: "(unavailable record)" });
      }
    }
    return [...byValue.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.data, selected.isLoading, results.data, idsKey]);

  const loading = results.isFetching || selected.isFetching;
  const nothingFound = results.isError
    ? "You don't have access to the linked table"
    : loading
      ? "Loading…"
      : "No matches";

  const common = {
    label: column.label,
    data,
    disabled: isView,
    searchable: true,
    clearable: !isView,
    searchValue: search,
    onSearchChange: setSearch,
    nothingFoundMessage: nothingFound,
    withAsterisk: Boolean(column.required),
    error,
    rightSection: loading && !isView ? <Loader size={14} /> : undefined,
    placeholder: isView ? undefined : "Type to search",
  };

  if (multiple) {
    return (
      <MultiSelect
        {...common}
        value={ids}
        onChange={(v) => onChange(column.name, v)}
      />
    );
  }

  return (
    <Select
      {...common}
      value={ids[0] ?? null}
      onChange={(v) => onChange(column.name, v)}
    />
  );
}
