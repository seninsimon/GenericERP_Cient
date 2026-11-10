import { useMemo, useState } from "react";
import { ActionIcon, Anchor, Badge, Button, Group, Menu, Skeleton, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconChevronDown,
  IconDots,
  IconDownload,
  IconEye,
  IconFilterOff,
  IconPencil,
  IconPlus,
  IconTable,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { errorMessage, getRelationOptions, startExport, type Job } from "../../api/api";
import { useDeleteRecord, useWatchJob } from "../../api/reactQueryHooks/useRecords";
import { useBulkDelete, useSchema, useTableData } from "../../api/reactQueryHooks/useTables";
import { useCurrentUser } from "../../auth/AuthContext";
import {
  DataTable,
  FilterBar,
  useTableUrlState,
  type DataTableColumn,
  type Filter,
  type FilterField,
} from "../../components/data-table";
import { EmptyState } from "../../components/ui/EmptyState";
import { FieldValue } from "../../components/ui/FieldValue";
import { Page, PageHeader } from "../../components/ui/Page";
import { confirmDanger } from "../../components/ui/confirm";
import { editRecordPath, newRecordPath, recordPath, tableTitle } from "../../layout/nav";
import { formatDateTime, formatNumber, pluralize } from "../../lib/format";
import { readJson } from "../../lib/storage";
import { ImportCsvModal } from "../../features/records/ImportCsvModal";
import { NoTableAccess } from "../../features/records/states";
import {
  columnLabel,
  FILE_TYPES,
  httpStatus,
  primaryColumn,
  SORTABLE_TYPES,
  type RecordColumn,
  type RecordRow,
  type TableSchemaInfo,
} from "../../features/records/schema";

const filterKind = (column: RecordColumn): FilterField["kind"] => {
  if (column.type === "number" || column.type === "date" || column.type === "boolean" || column.type === "relation") {
    return column.type;
  }
  return FILE_TYPES.includes(column.type) ? "file" : "text";
};

export default function RecordListPage() {
  const { table = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useCurrentUser();
  const title = tableTitle(table);
  const storageKey = `records:${table}`;

  const schemaQuery = useSchema(table);
  const schema = schemaQuery.data as TableSchemaInfo | undefined;
  const perms = schema?.permissions ?? {};

  const [url, setUrl] = useTableUrlState<Filter>();
  const [defaultPageSize] = useState(() => readJson(`erp:table:${storageKey}`, { pageSize: 25 }).pageSize);
  const pageSize = url.pageSize ?? defaultPageSize;

  const listParams = {
    page: url.page,
    limit: pageSize,
    search: url.search || undefined,
    sort: url.sort?.id,
    order: url.sort ? (url.sort.desc ? "desc" : "asc") : undefined,
    filters: url.filters,
  } as const;
  const list = useTableData(schema ? table : "", listParams);
  const rows = (list.data?.data ?? []) as RecordRow[];

  const deleteOne = useDeleteRecord(table);
  const bulkDelete = useBulkDelete(table);
  const [importOpen, setImportOpen] = useState(false);

  /* ---------- background jobs (import / export) ---------- */
  const jobsLink = (
    <Anchor component={Link} to="/jobs" size="sm">
      Open Imports & exports
    </Anchor>
  );
  const { watch } = useWatchJob((job: Job) => {
    if (job.type !== "import") return;
    qc.invalidateQueries({ queryKey: ["tableData", table] });
    const r = job.result;
    notifications.show({
      title: job.status === "done" ? "Import finished" : "Import failed",
      color: job.status === "done" ? (r?.failed ? "yellow" : "teal") : "red",
      message:
        job.status === "done" ? (
          <>
            {pluralize(r?.inserted ?? 0, "record")} added
            {r?.failed ? `, ${formatNumber(r.failed)} skipped` : ""}. {r?.failed ? jobsLink : null}
          </>
        ) : (
          (job.error ?? "The import couldn't run.")
        ),
    });
  });

  const exportCsv = async (view: boolean) => {
    try {
      await startExport(table, view ? { search: url.search, filters: url.filters } : undefined);
      notifications.show({
        title: "Export started",
        message: <>We'll prepare the file in the background. {jobsLink}</>,
        color: "blue",
      });
    } catch (err) {
      notifications.show({ title: "Couldn't start the export", message: errorMessage(err), color: "red" });
    }
  };

  /* ---------- columns & filters ---------- */
  const showDepartment = Boolean(schema) && (isAdmin || (schema?.allowedDepartments?.length ?? 0) > 1);

  const columns = useMemo<DataTableColumn<RecordRow>[]>(() => {
    if (!schema) return [];
    const primary = primaryColumn(schema.columns);
    const ordered = primary ? [primary, ...schema.columns.filter((c) => c !== primary)] : schema.columns;

    const fromSchema: DataTableColumn<RecordRow>[] = ordered.map((column) => ({
      id: column.name,
      header: columnLabel(column),
      sortable: SORTABLE_TYPES.includes(column.type),
      align: column.type === "number" ? "right" : undefined,
      width: column === primary ? 200 : column.type === "richtext" || column.type === "textarea" ? 240 : 120,
      hiddenByDefault: column !== primary && column.showInTable === false,
      hideable: column !== primary,
      mobile: column === primary ? "title" : FILE_TYPES.includes(column.type) ? "hidden" : undefined,
      cell: (row) =>
        column === primary ? (
          <Text span inherit fw={500}>
            <FieldValue column={column} value={row[column.name]} />
          </Text>
        ) : (
          <FieldValue column={column} value={row[column.name]} />
        ),
    }));

    const system: DataTableColumn<RecordRow>[] = [
      ...(showDepartment
        ? [
            {
              id: "_department",
              header: "Department",
              width: 120,
              mobile: "subtitle" as const,
              cell: (row: RecordRow) =>
                row._department ? (
                  <Badge variant="default" c={row._departmentId ? undefined : "dimmed"}>
                    {String(row._department)}
                  </Badge>
                ) : null,
            },
          ]
        : []),
      {
        id: "_createdAt",
        header: "Created",
        sortable: true,
        hiddenByDefault: true,
        width: 150,
        cell: (row) => <Text span inherit className="tabular-nums">{formatDateTime(row._createdAt)}</Text>,
      },
      {
        id: "_updatedAt",
        header: "Updated",
        sortable: true,
        hiddenByDefault: true,
        width: 150,
        cell: (row) => <Text span inherit className="tabular-nums">{formatDateTime(row._updatedAt)}</Text>,
      },
    ];
    return [...fromSchema, ...system];
  }, [schema, showDepartment]);

  const filterFields = useMemo<FilterField[]>(() => {
    if (!schema) return [];
    const fields: FilterField[] = schema.columns.map((column) => ({
      name: column.name,
      label: columnLabel(column),
      kind: filterKind(column),
      loadOptions:
        column.type === "relation" && column.ref
          ? (search: string) =>
              getRelationOptions(column.ref!, { search, limit: 20, displayField: column.displayField })
                .then((r) => r.data)
                .catch(() => [])
          : undefined,
    }));
    if (showDepartment) {
      fields.push({
        name: "_department",
        label: "Department",
        kind: "department",
        options: (schema.allowedDepartments ?? []).map((d) => ({ value: d._id, label: d.name })),
      });
    }
    return fields;
  }, [schema, showDepartment]);

  /* ---------- states ---------- */
  if (schemaQuery.isError && httpStatus(schemaQuery.error) === 404) return <NoTableAccess table={title} />;

  const isFiltered = Boolean(url.search) || url.filters.length > 0;
  const clearFilters = () => setUrl({ search: "", filters: [] });
  const total = list.data?.total ?? 0;

  const askDelete = (row: RecordRow) =>
    confirmDanger({
      title: "Delete record?",
      message: "This permanently deletes the record and its uploaded files. This can't be undone.",
      confirmLabel: "Delete record",
      onConfirm: () => deleteOne.mutateAsync(row._id),
    });

  return (
    <Page title={title} breadcrumbs={[{ label: "Tables" }, { label: title }]}>
      <PageHeader
        title={title}
        meta={
          list.data ? (
            <Badge variant="default" className="tabular-nums">
              {list.data.totalIsEstimate ? "~" : ""}
              {pluralize(total, "record")}
            </Badge>
          ) : schemaQuery.isLoading ? (
            <Skeleton h={20} w={80} />
          ) : null
        }
        actions={
          schema && (
            <>
              {/* tablets and up: separate buttons */}
              <Group gap="xs" visibleFrom="sm">
                {perms.create && (
                  <Button variant="default" leftSection={<IconUpload size={16} />} onClick={() => setImportOpen(true)}>
                    Import
                  </Button>
                )}
                <Menu position="bottom-end">
                  <Menu.Target>
                    <Button
                      variant="default"
                      leftSection={<IconDownload size={16} />}
                      rightSection={<IconChevronDown size={14} />}
                    >
                      Export
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => exportCsv(true)} disabled={!isFiltered}>
                      Export current view{isFiltered && list.data ? ` (${formatNumber(total)})` : ""}
                    </Menu.Item>
                    <Menu.Item onClick={() => exportCsv(false)}>Export all records</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
              {/* phones: secondary actions in one menu */}
              <Menu position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="default" size="lg" hiddenFrom="sm" aria-label="More actions">
                    <IconDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {perms.create && (
                    <Menu.Item leftSection={<IconUpload size={16} />} onClick={() => setImportOpen(true)}>
                      Import CSV
                    </Menu.Item>
                  )}
                  <Menu.Item leftSection={<IconDownload size={16} />} onClick={() => exportCsv(true)} disabled={!isFiltered}>
                    Export current view
                  </Menu.Item>
                  <Menu.Item leftSection={<IconDownload size={16} />} onClick={() => exportCsv(false)}>
                    Export all records
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              {perms.create && (
                <Button component={Link} to={newRecordPath(table)} leftSection={<IconPlus size={16} />}>
                  New record
                </Button>
              )}
            </>
          )
        }
      />

      <DataTable<RecordRow>
        label={title}
        mode="server"
        data={rows}
        columns={columns}
        getRowId={(r) => r._id}
        total={total}
        totalIsEstimate={list.data?.totalIsEstimate}
        page={url.page}
        pageSize={pageSize}
        onPageChange={(page) => setUrl({ page })}
        onPageSizeChange={(size) => setUrl({ pageSize: size })}
        sort={url.sort}
        onSortChange={(sort) => setUrl({ sort })}
        search={url.search}
        onSearchChange={(search) => setUrl({ search })}
        searchPlaceholder={`Search ${title.toLowerCase()}…`}
        loading={schemaQuery.isLoading || (list.isLoading && !list.data)}
        fetching={list.isFetching}
        error={list.isError ? errorMessage(list.error) : schemaQuery.isError ? errorMessage(schemaQuery.error) : null}
        onRetry={() => {
          schemaQuery.refetch();
          list.refetch();
        }}
        toolbar={
          filterFields.length > 0 && (
            <FilterBar fields={filterFields} value={url.filters} onChange={(filters) => setUrl({ filters })} />
          )
        }
        onRowClick={(row) => navigate(recordPath(table, row._id))}
        rowActions={(row) => (
          <>
            <Menu.Item leftSection={<IconEye size={16} />} component={Link} to={recordPath(table, row._id)}>
              Open
            </Menu.Item>
            {perms.edit && (
              <Menu.Item leftSection={<IconPencil size={16} />} component={Link} to={editRecordPath(table, row._id)}>
                Edit
              </Menu.Item>
            )}
            {perms.delete && (
              <>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => askDelete(row)}>
                  Delete
                </Menu.Item>
              </>
            )}
          </>
        )}
        selectable={Boolean(perms.delete)}
        bulkActions={(ids, clear) => (
          <Button
            color="red"
            variant="light"
            leftSection={<IconTrash size={16} />}
            loading={bulkDelete.isPending}
            onClick={() =>
              confirmDanger({
                title: `Delete ${pluralize(ids.length, "record")}?`,
                message: "This permanently deletes the selected records and their uploaded files. This can't be undone.",
                confirmLabel: `Delete ${pluralize(ids.length, "record")}`,
                onConfirm: () => bulkDelete.mutateAsync(ids).then(clear),
              })
            }
          >
            Delete
          </Button>
        )}
        storageKey={storageKey}
        isFiltered={isFiltered}
        emptyState={(filtered) =>
          filtered ? (
            <EmptyState
              icon={<IconFilterOff size={26} stroke={1.5} />}
              title="No matching records"
              description="Try a different search, or remove some filters."
              action={
                <Button variant="default" onClick={clearFilters}>
                  Clear search and filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<IconTable size={26} stroke={1.5} />}
              title={`No records in ${title} yet`}
              description={
                perms.create
                  ? "Add the first record, or import a CSV file."
                  : "Records added by your team will appear here."
              }
              action={
                perms.create && (
                  <Group gap="xs">
                    <Button variant="default" leftSection={<IconUpload size={16} />} onClick={() => setImportOpen(true)}>
                      Import CSV
                    </Button>
                    <Button component={Link} to={newRecordPath(table)} leftSection={<IconPlus size={16} />}>
                      New record
                    </Button>
                  </Group>
                )
              }
            />
          )
        }
      />

      {schema && perms.create && (
        <ImportCsvModal
          opened={importOpen}
          onClose={() => setImportOpen(false)}
          table={table}
          title={title}
          schema={schema}
          isAdmin={isAdmin}
          onStarted={(job) => {
            watch(job._id);
            notifications.show({
              title: "Import started",
              message: <>We'll refresh the table when it's done. {jobsLink}</>,
              color: "blue",
            });
          }}
        />
      )}
    </Page>
  );
}
