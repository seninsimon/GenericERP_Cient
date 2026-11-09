import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Anchor, Button, Group, Box, Text, Center, Loader, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDownload, IconLock, IconUpload } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { errorMessage, getJob, startExport, type Job } from "../../api/api";
import { useCurrentUser } from "../../auth/AuthContext";
import ImportCsvModal from "./ImportCsvModal";

import {
  useTableData,
  useDeleteData,
  useSchema,
} from "../../api/reactQueryHooks/useTables";
import CustomTable from "./MantineTable";

type RowData = {
  _id: string;
  [key: string]: any;
};

export default function TableListPage() {
  const { table } = useParams<{ table: string }>();
  const navigate = useNavigate();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const sortField = sorting[0]?.id;
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  // permissions: { view, create, edit, delete } for the current user
  const { data: schema, isLoading: schemaLoading, isError: schemaError } = useSchema(table || "");
  const permissions = schema?.permissions ?? {};

  const { data, isLoading } = useTableData(table || "", {
    page: pageIndex + 1,
    limit: pageSize,
    search: globalFilter,
    sort: sortField,
    order: sortOrder,
  });

  const deleteMutation = useDeleteData(table || "");

  const rows: RowData[] = data?.data || [];
  const rowCount = data?.total || 0;
  const totalIsEstimate = Boolean(data?.totalIsEstimate);

  /* ---------------- CSV export / import (background jobs) ---------------- */
  const { isAdmin } = useCurrentUser();
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  // import job we started from this page, polled until it finishes
  const [watchedJobId, setWatchedJobId] = useState<string | null>(null);

  const jobsLink = (
    <Anchor size="sm" onClick={() => navigate("/jobs")}>
      Open Imports &amp; exports
    </Anchor>
  );

  const exportCsv = async () => {
    if (!table) return;
    setExporting(true);
    try {
      await startExport(table);
      notifications.show({
        title: "Export started",
        message: (
          <Stack gap={2}>
            <Text size="sm">The CSV is being prepared in the background.</Text>
            {jobsLink}
          </Stack>
        ),
        color: "blue",
      });
    } catch (err) {
      notifications.show({ title: "Couldn't start export", message: errorMessage(err), color: "red" });
    } finally {
      setExporting(false);
    }
  };

  const onImportStarted = (job: Job) => {
    setWatchedJobId(job._id);
    notifications.show({
      title: "Import started",
      message: (
        <Stack gap={2}>
          <Text size="sm">Rows are being imported in the background.</Text>
          {jobsLink}
        </Stack>
      ),
      color: "blue",
    });
  };

  const watchedJob = useQuery({
    queryKey: ["job", watchedJobId],
    queryFn: async () => (await getJob(watchedJobId!)).data,
    enabled: Boolean(watchedJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "failed" ? false : 3000;
    },
  });

  useEffect(() => {
    const job = watchedJob.data;
    if (!job || (job.status !== "done" && job.status !== "failed")) return;

    setWatchedJobId(null);
    qc.invalidateQueries({ queryKey: ["tableData", job.tableName] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
    notifications.show(
      job.status === "done"
        ? {
            title: "Import finished",
            message: `${job.result?.inserted ?? 0} inserted, ${job.result?.failed ?? 0} failed`,
            color: job.result?.failed ? "yellow" : "green",
          }
        : { title: "Import failed", message: job.error ?? "Unknown error", color: "red" }
    );
  }, [watchedJob.data, qc]);

  const handleDelete = (id: string) => {
    if (!table) return;

    deleteMutation.mutate(id);
  };

  const columns = useMemo<MRT_ColumnDef<RowData>[]>(() => {
    if (!rows.length) return [];

    const allKeys = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row))),
    );

    // "_department" is added by the API when the user works with several departments
    return allKeys
      .filter((key) => key === "_department" || (key !== "_id" && !key.startsWith("_")))
      .map((key) => ({
        accessorKey: key,
        header:
          key === "_department"
            ? "Department"
            : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        size: 180,

        Cell: ({ cell }) => {
          const value = cell.getValue<any>();

          if (Array.isArray(value)) {
            return <span>{value.join(", ")}</span>;
          }

          if (typeof value === "object" && value !== null) {
            return <span>{JSON.stringify(value)}</span>;
          }

          return <span>{String(value ?? "")}</span>;
        },
      }));
  }, [rows]);

  if (!table) return <Text>Invalid table</Text>;

  if (schemaLoading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  if (schemaError || !schema) {
    return (
      <Center h={300}>
        <Stack align="center" gap="xs">
          <IconLock size={36} stroke={1.5} />
          <Text c="dimmed">This table doesn't exist or you don't have access to it.</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Box p="md">
      <Group mb="md" justify="space-between">
        <Group>
          {permissions.create && (
            <Button onClick={() => navigate(`/table/${table}/new`)}>Add New</Button>
          )}
        </Group>
        <Group gap="xs">
          {totalIsEstimate && (
            <Text size="xs" c="dimmed">
              ~{rowCount.toLocaleString()} records (estimate)
            </Text>
          )}
          {permissions.create && (
            <Button
              variant="light"
              leftSection={<IconUpload size={16} />}
              onClick={() => setImportOpen(true)}
            >
              Import CSV
            </Button>
          )}
          {permissions.view && (
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              loading={exporting}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
          )}
        </Group>
      </Group>

      <ImportCsvModal
        opened={importOpen}
        onClose={() => setImportOpen(false)}
        table={table}
        schema={schema}
        isAdmin={isAdmin}
        onStarted={onImportStarted}
      />

      <CustomTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        rowCount={rowCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        sorting={sorting}
        globalFilter={globalFilter}
        setPageIndex={setPageIndex}
        setPageSize={setPageSize}
        setSorting={setSorting}
        setGlobalFilter={setGlobalFilter}
        onView={(id) => navigate(`/table/${table}/view/${id}`)}
        onEdit={permissions.edit ? (id) => navigate(`/table/${table}/edit/${id}`) : undefined}
        onDelete={permissions.delete ? handleDelete : undefined}
      />
    </Box>
  );
}
