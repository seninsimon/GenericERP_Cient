import { useMemo, useState } from "react";
import { Loader, MultiSelect, Select } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getUserOptions } from "../../../api/api";
import { useUserNames } from "../../../api/reactQueryHooks/useRecords";
import { useCurrentUser } from "../../../auth/AuthContext";
import { columnLabel, type RecordColumn } from "../schema";

const SEARCH_LIMIT = 50;

const toIds = (value: unknown, multiple: boolean): string[] => {
  if (multiple) return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
  return value ? [String(value)] : [];
};

// Picker for a "User" column: searches the active login accounts by name or
// username. People already chosen keep their name even after their account is
// deactivated (shown as such), so old records stay readable.
export function UserInput({
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
  const { user: me } = useCurrentUser();
  const multiple = Boolean(column.multiple);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);

  const ids = toIds(value, multiple);
  const selected = useUserNames(ids);
  const results = useQuery({
    queryKey: ["userOptions", "search", debouncedSearch],
    queryFn: async () => (await getUserOptions({ search: debouncedSearch, limit: SEARCH_LIMIT })).data,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const data = useMemo(() => {
    const byValue = new Map<string, { value: string; label: string }>();
    const add = (o: { value: string; label: string; isActive: boolean }) =>
      byValue.set(o.value, {
        value: o.value,
        label: o.value === me._id ? `${o.label} (you)` : o.isActive ? o.label : `${o.label} (deactivated)`,
      });
    (selected.data ?? []).forEach(add);
    (results.data ?? []).forEach(add);
    for (const v of ids) if (!byValue.has(v) && !selected.isLoading) byValue.set(v, { value: v, label: "Deleted user" });
    return [...byValue.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.data, selected.isLoading, results.data, ids.join(","), me._id]);

  const loading = results.isFetching || selected.isFetching;
  const common = {
    id,
    label: columnLabel(column),
    data,
    searchable: true,
    clearable: true,
    searchValue: search,
    onSearchChange: setSearch,
    // results already come filtered from the server
    filter: ({ options }: { options: unknown }) => options as never,
    nothingFoundMessage: loading ? "Loading…" : "No one found",
    withAsterisk: Boolean(column.required),
    error,
    rightSection: loading ? <Loader size={14} /> : undefined,
    placeholder: "Type a name",
  };

  return multiple ? (
    <MultiSelect {...common} value={ids} onChange={(v) => onChange(v)} />
  ) : (
    <Select {...common} value={ids[0] ?? null} onChange={(v) => onChange(v)} />
  );
}
