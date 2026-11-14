import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Group,
  Menu,
  Pagination,
  Progress,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue, useHotkeys, useMediaQuery } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconDots,
  IconSearch,
} from "@tabler/icons-react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";

import { EmptyState } from "../ui/EmptyState";
import { formatNumber } from "../../lib/format";
import classes from "./DataTable.module.css";
import type { DataTableColumn, DataTableProps } from "./types";
import { useTablePrefs } from "./useTablePrefs";
import { ViewOptions } from "./ViewOptions";

const PAGE_SIZES = ["10", "25", "50", "100"];
const INTERACTIVE = "a, button, input, label, textarea, select, [role='menuitem'], [role='checkbox'], [data-no-row-click]";

// The one table component for every list in the app. See UI_GUIDELINES.md §5.
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    data,
    columns,
    getRowId,
    label,
    mode = "client",
    loading,
    fetching,
    error,
    onRetry,
    toolbar,
    toolbarActions,
    onRowClick,
    rowActions,
    selectable,
    bulkActions,
    storageKey,
    emptyState,
    isFiltered,
    maxHeight = "calc(100dvh - 260px)",
    searchPlaceholder = "Search…",
    searchable = true,
  } = props;
  const server = mode === "server";
  const isMobile = useMediaQuery("(max-width: 48em)") ?? false;
  const { prefs, update, reset } = useTablePrefs(storageKey);

  /* ---------- page / sort / search (controlled in server mode) ---------- */
  const [localPage, setLocalPage] = useState(1);
  const [localSort, setLocalSort] = useState<SortingState>([]);
  const [localSearch, setLocalSearch] = useState("");

  const pageSize = props.pageSize ?? prefs.pageSize;
  const page = server ? (props.page ?? 1) : localPage;
  const sorting: SortingState = server ? (props.sort ? [props.sort] : []) : localSort;

  const setPage = (p: number) => (server ? props.onPageChange?.(p) : setLocalPage(p));
  const setPageSize = (size: number) => {
    update({ pageSize: size });
    // server mode: one change only. Changing the size already goes back to
    // page 1 (useTableUrlState); a second "page 1" change in the same click
    // would overwrite the new size in the address.
    if (server) props.onPageSizeChange?.(size);
    else setLocalPage(1);
  };

  // search box: typed text is debounced before it's applied
  const [searchText, setSearchText] = useState(server ? (props.search ?? "") : "");
  const [debouncedSearch] = useDebouncedValue(searchText, 300);
  useEffect(() => {
    if (server) {
      if ((props.search ?? "") !== debouncedSearch) props.onSearchChange?.(debouncedSearch);
    } else {
      setLocalSearch(debouncedSearch);
      setLocalPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  // external search changes (e.g. back button) update the box
  useEffect(() => {
    if (server && props.search !== undefined && props.search !== debouncedSearch) setSearchText(props.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.search]);

  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys([["/", () => searchRef.current?.focus()]]);

  /* ---------- column visibility & order ---------- */
  const visibleColumns = useMemo(() => {
    const hidden = new Set(prefs.hidden);
    const shown = new Set(prefs.shown);
    const isVisible = (c: DataTableColumn<T>) =>
      c.hideable === false || (c.hiddenByDefault ? shown.has(c.id) : !hidden.has(c.id));
    const ordered = [...columns].sort((a, b) => {
      const ia = prefs.order.indexOf(a.id);
      const ib = prefs.order.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return { ordered, visible: ordered.filter(isVisible), isVisible };
  }, [columns, prefs.hidden, prefs.shown, prefs.order]);

  /* ---------- TanStack table ---------- */
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const tanstackColumns = useMemo<ColumnDef<T>[]>(
    () =>
      visibleColumns.visible.map((c) => ({
        id: c.id,
        accessorFn: (row: T) => (c.accessor ? c.accessor(row) : (row as Record<string, unknown>)[c.id]),
        header: c.header,
        enableSorting: c.sortable ?? false,
        sortUndefined: "last",
      })),
    [visibleColumns.visible]
  );

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    getRowId,
    state: {
      sorting,
      rowSelection,
      globalFilter: server ? undefined : localSearch,
      pagination: { pageIndex: page - 1, pageSize },
    },
    manualSorting: server,
    manualPagination: server,
    manualFiltering: server,
    enableRowSelection: Boolean(selectable),
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (server) props.onSortChange?.(next[0] ? { id: next[0].id, desc: next[0].desc } : null);
      else setLocalSort(next);
    },
    globalFilterFn: (row, _columnId, filter) => {
      const needle = String(filter).toLowerCase();
      return visibleColumns.visible.some((c) => {
        const v = c.accessor ? c.accessor(row.original) : (row.original as Record<string, unknown>)[c.id];
        return String(v ?? "").toLowerCase().includes(needle);
      });
    },
    getCoreRowModel: getCoreRowModel(),
    ...(server
      ? {}
      : {
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          getPaginationRowModel: getPaginationRowModel(),
        }),
  });

  // clear selection when the data set changes (page, filters)
  useEffect(() => setRowSelection({}), [data]);

  const rows = table.getRowModel().rows;
  const total = server ? (props.total ?? 0) : table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const clearSelection = () => setRowSelection({});
  const columnById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const filtered = isFiltered ?? Boolean(server ? props.search : localSearch);

  // keep the current page valid when the total shrinks
  useEffect(() => {
    if (!loading && page > pageCount) setPage(pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, loading]);

  /* ---------- row interaction ---------- */
  const activate = (row: T, event: MouseEvent | KeyboardEvent) => {
    if (!onRowClick) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    onRowClick(row);
  };
  const onRowKey = (row: T) => (event: KeyboardEvent) => {
    if (event.key === "Enter" && event.target === event.currentTarget) activate(row, event);
  };

  const renderCell = (row: T, column: DataTableColumn<T>): ReactNode => {
    if (column.cell) return column.cell(row);
    const value = column.accessor ? column.accessor(row) : (row as Record<string, unknown>)[column.id];
    return value === null || value === undefined || value === "" ? (
      <Text span c="dimmed">
        —
      </Text>
    ) : (
      String(value)
    );
  };

  const actionsMenu = (row: T) =>
    rowActions ? (
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon aria-label="Row actions" size="md">
            <IconDots size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>{rowActions(row)}</Menu.Dropdown>
      </Menu>
    ) : null;

  /* ---------- toolbar ---------- */
  const toolbarContent =
    selectedIds.length > 0 && bulkActions ? (
      <Group justify="space-between" w="100%" wrap="wrap" gap="sm">
        <Text size="sm" fw={500}>
          {formatNumber(selectedIds.length)} selected
        </Text>
        <Group gap="xs">
          {bulkActions(selectedIds, clearSelection)}
          <Button variant="subtle" color="gray" onClick={clearSelection}>
            Clear selection
          </Button>
        </Group>
      </Group>
    ) : (
      <Group justify="space-between" w="100%" wrap="wrap" gap="sm">
        <Group gap="sm" wrap="wrap" style={{ flex: "1 1 260px" }}>
          {searchable && <TextInput
            ref={searchRef}
            aria-label={`Search ${label}`}
            placeholder={searchPlaceholder}
            leftSection={<IconSearch size={16} />}
            rightSection={
              searchText ? (
                <CloseButton size="sm" aria-label="Clear search" onClick={() => setSearchText("")} />
              ) : null
            }
            value={searchText}
            onChange={(e) => setSearchText(e.currentTarget.value)}
            w={{ base: "100%", xs: 280 }}
          />}
          {toolbar}
        </Group>
        <Group gap="xs" wrap="nowrap">
          {toolbarActions}
          <ViewOptions
            columns={visibleColumns.ordered}
            isVisible={visibleColumns.isVisible}
            prefs={prefs}
            update={update}
            reset={reset}
          />
        </Group>
      </Group>
    );

  /* ---------- body states ---------- */
  const skeletonRows = Array.from({ length: Math.min(pageSize, 8) });
  const showEmpty = !loading && !error && rows.length === 0;
  const verticalSpacing = prefs.density === "compact" ? 8 : 14;

  const desktop = (
    <Box className={classes.scroll} mah={maxHeight} mih={loading || showEmpty ? undefined : 120}>
      <Table className={classes.table} verticalSpacing={verticalSpacing} highlightOnHover aria-label={label}>
        <Table.Thead>
          <Table.Tr>
            {selectable && (
              <Table.Th w={44} className={classes.stickyStart}>
                <Checkbox
                  aria-label="Select all rows on this page"
                  size="xs"
                  checked={table.getIsAllPageRowsSelected()}
                  indeterminate={table.getIsSomePageRowsSelected()}
                  onChange={table.getToggleAllPageRowsSelectedHandler()}
                />
              </Table.Th>
            )}
            {table.getHeaderGroups()[0]?.headers.map((header) => {
              const column = columnById.get(header.column.id)!;
              const sorted = header.column.getIsSorted();
              return (
                <Table.Th
                  key={header.id}
                  miw={column.width}
                  ta={column.align}
                  aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                >
                  {header.column.getCanSort() ? (
                    <UnstyledButton
                      className={classes.sortButton}
                      onClick={header.column.getToggleSortingHandler()}
                      aria-label={`Sort by ${column.header}`}
                    >
                      {column.header}
                      {sorted === "asc" ? (
                        <IconArrowUp size={13} />
                      ) : sorted === "desc" ? (
                        <IconArrowDown size={13} />
                      ) : (
                        <IconArrowsSort size={13} opacity={0.4} />
                      )}
                    </UnstyledButton>
                  ) : (
                    column.header
                  )}
                </Table.Th>
              );
            })}
            {rowActions && (
              <Table.Th w={56} className={classes.stickyEnd}>
                <span className="visually-hidden">Actions</span>
              </Table.Th>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading
            ? skeletonRows.map((_, i) => (
                <Table.Tr key={i}>
                  {selectable && <Table.Td />}
                  {visibleColumns.visible.map((c) => (
                    <Table.Td key={c.id}>
                      <Skeleton h={14} w={`${50 + ((i * 17 + c.id.length * 7) % 40)}%`} />
                    </Table.Td>
                  ))}
                  {rowActions && <Table.Td />}
                </Table.Tr>
              ))
            : rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  className={`${onRowClick ? classes.clickable : ""} ${row.getIsSelected() ? classes.selected : ""}`}
                  onClick={(e) => activate(row.original, e)}
                  onKeyDown={onRowClick ? onRowKey(row.original) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {selectable && (
                    <Table.Td className={classes.stickyStart}>
                      <Checkbox
                        aria-label="Select row"
                        size="xs"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                      />
                    </Table.Td>
                  )}
                  {visibleColumns.visible.map((c) => (
                    <Table.Td key={c.id} ta={c.align} miw={c.width}>
                      <div className={classes.cell}>{renderCell(row.original, c)}</div>
                    </Table.Td>
                  ))}
                  {rowActions && (
                    <Table.Td className={classes.stickyEnd} ta="right">
                      {actionsMenu(row.original)}
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
        </Table.Tbody>
      </Table>
    </Box>
  );

  // phones: one card per row (title, subtitle, a few fields)
  const mobile = (() => {
    const title = visibleColumns.visible.find((c) => c.mobile === "title") ?? visibleColumns.visible[0];
    const subtitle = visibleColumns.visible.find((c) => c.mobile === "subtitle");
    const fields = visibleColumns.visible
      .filter((c) => c !== title && c !== subtitle && c.mobile !== "hidden")
      .slice(0, 3);
    if (loading) {
      return (
        <Stack p="md" gap="md">
          {skeletonRows.slice(0, 4).map((_, i) => (
            <Skeleton key={i} h={64} />
          ))}
        </Stack>
      );
    }
    return (
      <Box role="list" aria-label={label}>
        {rows.map((row) => (
          <Box
            key={row.id}
            role="listitem"
            className={`${classes.card} ${onRowClick ? classes.clickable : ""}`}
            px="md"
            py="sm"
            onClick={(e: MouseEvent) => activate(row.original, e)}
            onKeyDown={onRowClick ? onRowKey(row.original) : undefined}
            tabIndex={onRowClick ? 0 : undefined}
          >
            <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text component="div" fw={600} size="sm" truncate>
                  {title ? renderCell(row.original, title) : row.id}
                </Text>
                {subtitle && (
                  <Text component="div" size="xs" c="dimmed" truncate>
                    {renderCell(row.original, subtitle)}
                  </Text>
                )}
              </Stack>
              {actionsMenu(row.original)}
            </Group>
            {fields.length > 0 && (
              <Stack gap={4} mt={6}>
                {fields.map((c) => (
                  <Group key={c.id} gap="xs" wrap="nowrap">
                    <Text size="xs" c="dimmed" w={96} style={{ flexShrink: 0 }} truncate>
                      {c.header}
                    </Text>
                    <Box fz="sm" style={{ minWidth: 0, overflow: "hidden" }}>
                      {renderCell(row.original, c)}
                    </Box>
                  </Group>
                ))}
              </Stack>
            )}
          </Box>
        ))}
      </Box>
    );
  })();

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const approx = props.totalIsEstimate ? "~" : "";

  return (
    <Box className={classes.root}>
      {fetching && !loading && (
        <Progress className={classes.progress} value={100} animated size={2} radius={0} aria-hidden />
      )}

      <Group className={classes.toolbar} px="md" py="sm">
        {toolbarContent}
      </Group>

      {error ? (
        <Alert color="red" icon={<IconAlertCircle size={16} />} m="md" title="Couldn't load the data">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{error}</Text>
            {onRetry && (
              <Button size="xs" variant="light" color="red" onClick={onRetry}>
                Try again
              </Button>
            )}
          </Stack>
        </Alert>
      ) : showEmpty ? (
        emptyState ? (
          emptyState(filtered)
        ) : (
          <EmptyState
            title={filtered ? "No matching records" : "Nothing here yet"}
            description={filtered ? "Try a different search or remove some filters." : undefined}
          />
        )
      ) : isMobile ? (
        mobile
      ) : (
        desktop
      )}

      {!error && total > 0 && (
        <Group className={classes.footer} justify="space-between" px="md" py="xs" gap="sm" wrap="wrap">
          <Text size="sm" c="dimmed" className="tabular-nums" aria-live="polite">
            {formatNumber(from)}–{formatNumber(to)} of {approx}
            {formatNumber(total)}
          </Text>
          <Group gap="sm" wrap="wrap">
            <Group gap={6} visibleFrom="xs">
              <Text size="sm" c="dimmed">
                Rows
              </Text>
              <Select
                aria-label="Rows per page"
                data={PAGE_SIZES}
                value={String(pageSize)}
                onChange={(v) => v && setPageSize(Number(v))}
                w={76}
                size="xs"
                allowDeselect={false}
              />
            </Group>
            {pageCount > 1 && (
              <Pagination
                total={pageCount}
                value={Math.min(page, pageCount)}
                onChange={setPage}
                size="sm"
                siblings={isMobile ? 0 : 1}
                boundaries={1}
                getControlProps={(control) => ({
                  "aria-label": control === "previous" ? "Previous page" : control === "next" ? "Next page" : control,
                })}
              />
            )}
          </Group>
        </Group>
      )}
    </Box>
  );
}
