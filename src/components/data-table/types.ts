import type { ReactNode } from "react";

export type Density = "compact" | "comfortable";

export interface DataTableColumn<T> {
  // stable key (e.g. column name); also used for saved view preferences
  id: string;
  header: string;
  // value used for client-side sorting/search (defaults to row[id])
  accessor?: (row: T) => unknown;
  // how the cell looks (defaults to the accessor value as text)
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  // min width in px (cells truncate beyond their width)
  width?: number;
  hiddenByDefault?: boolean;
  // false = always shown (e.g. the primary column)
  hideable?: boolean;
  // role in the mobile card layout
  mobile?: "title" | "subtitle" | "field" | "hidden";
}

export interface SortState {
  id: string;
  desc: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  // accessible name of the table, e.g. "Projects"
  label: string;

  // "server": page/sort/search are controlled props and done by the API.
  // "client": the table pages/sorts/searches `data` itself.
  mode?: "server" | "client";
  total?: number;
  totalIsEstimate?: boolean;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  // false = no search box (e.g. the API can't search this list)
  searchable?: boolean;

  loading?: boolean; // first load: skeleton rows
  fetching?: boolean; // refreshing with data on screen: thin progress bar
  error?: string | null;
  onRetry?: () => void;

  // extra controls after the search box (e.g. filters) and on the right
  toolbar?: ReactNode;
  toolbarActions?: ReactNode;

  onRowClick?: (row: T) => void;
  // Menu.Item elements for the row's "⋯" menu
  rowActions?: (row: T) => ReactNode;

  selectable?: boolean;
  // shown instead of the toolbar while rows are selected
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => ReactNode;

  // remembers column visibility/order, density and page size (localStorage)
  storageKey?: string;

  // shown when there are no rows; `isFiltered` tells you whether a search/filter is active
  emptyState?: (isFiltered: boolean) => ReactNode;
  isFiltered?: boolean;
  // max height of the scrolling table area (header stays visible)
  maxHeight?: string;
}
