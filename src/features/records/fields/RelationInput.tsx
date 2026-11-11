import { useMemo, useState } from "react";
import { Loader, MultiSelect, Select } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getRelationOptions, type RelationOption } from "../../../api/api";
import { useRelationNames } from "../../../api/reactQueryHooks/useRecords";
import type { RecordColumn } from "../schema";
import { useLabelProps } from "./compact";

const SEARCH_LIMIT = 50;

const toIds = (value: unknown, multiple: boolean): string[] => {
  if (multiple) return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
  return value ? [String(value)] : [];
};

// Searchable picker for a relation column. Options are searched on the server
// (debounced, limited); the selected ids are resolved separately so their
// names always show, even when they aren't in the current search results.
export function RelationInput({
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
  const ref = column.ref ?? undefined;
  const multiple = Boolean(column.multiple);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);

  const ids = toIds(value, multiple);
  const selected = useRelationNames(ref, ids, column.displayField);

  const results = useQuery({
    queryKey: ["relationOptions", ref, column.displayField, "search", debouncedSearch],
    queryFn: async () =>
      (await getRelationOptions(ref!, { search: debouncedSearch, limit: SEARCH_LIMIT, displayField: column.displayField }))
        .data,
    enabled: Boolean(ref),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const data = useMemo(() => {
    const byValue = new Map<string, RelationOption>();
    for (const option of selected.data ?? []) byValue.set(option.value, option);
    for (const option of results.data ?? []) byValue.set(option.value, option);
    // selected ids the user can't see (or that were deleted) still need an entry
    for (const v of ids) {
      if (!byValue.has(v) && !selected.isLoading) byValue.set(v, { value: v, label: "(unavailable record)" });
    }
    return [...byValue.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.data, selected.isLoading, results.data, ids.join(",")]);

  const loading = results.isFetching || selected.isFetching;
  const labelProps = useLabelProps(column);
  const common = {
    id,
    ...labelProps,
    data,
    searchable: true,
    clearable: true,
    searchValue: search,
    onSearchChange: setSearch,
    // results already come filtered from the server
    filter: ({ options }: { options: unknown }) => options as never,
    nothingFoundMessage: results.isError
      ? "You don't have access to the linked table"
      : loading
        ? "Loading…"
        : "No matches",
    error,
    rightSection: loading ? <Loader size={14} /> : undefined,
    placeholder: "Type to search",
  };

  return multiple ? (
    <MultiSelect {...common} value={ids} onChange={(v) => onChange(v)} />
  ) : (
    <Select {...common} value={ids[0] ?? null} onChange={(v) => onChange(v)} />
  );
}
