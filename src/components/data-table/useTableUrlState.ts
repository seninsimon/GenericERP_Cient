import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { SortState } from "./types";

// Server-table state kept in the URL (?page=&size=&q=&sort=&dir=&f=), so
// links can be shared and the back button works.
export interface TableUrlState<F = unknown> {
  page: number;
  pageSize: number | undefined;
  search: string;
  sort: SortState | null;
  filters: F[];
}

export function useTableUrlState<F = unknown>(defaults: { sort?: SortState | null } = {}) {
  const [params, setParams] = useSearchParams();

  const state = useMemo<TableUrlState<F>>(() => {
    let filters: F[] = [];
    try {
      filters = params.get("f") ? JSON.parse(params.get("f")!) : [];
    } catch {
      filters = [];
    }
    const sortId = params.get("sort");
    return {
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: Number(params.get("size")) || undefined,
      search: params.get("q") ?? "",
      sort: sortId ? { id: sortId, desc: params.get("dir") !== "asc" } : (defaults.sort ?? null),
      filters,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const set = useCallback(
    (patch: Partial<TableUrlState<F>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const put = (key: string, value: string | null | undefined) =>
            value ? next.set(key, value) : next.delete(key);

          // anything other than paging sends you back to page 1
          const resetPage = Object.keys(patch).some((k) => k !== "page");
          if ("page" in patch) put("page", patch.page && patch.page > 1 ? String(patch.page) : null);
          else if (resetPage) next.delete("page");
          if ("pageSize" in patch) put("size", patch.pageSize ? String(patch.pageSize) : null);
          if ("search" in patch) put("q", patch.search || null);
          if ("sort" in patch) {
            put("sort", patch.sort?.id ?? null);
            put("dir", patch.sort ? (patch.sort.desc ? "desc" : "asc") : null);
          }
          if ("filters" in patch) put("f", patch.filters?.length ? JSON.stringify(patch.filters) : null);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  return [state, set] as const;
}
