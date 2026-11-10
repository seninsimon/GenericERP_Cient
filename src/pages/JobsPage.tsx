import { useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Anchor,
  Button,
  Drawer,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconAlertCircle, IconDownload, IconFileExport, IconFileImport } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { errorMessage, getJobs, jobDownloadUrl, type Job } from "../api/api";
import { useCurrentUser } from "../auth/AuthContext";
import { DataTable, type DataTableColumn } from "../components/data-table";
import { JobStatusBadge, jobResultSummary } from "../components/JobStatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { Page, PageHeader } from "../components/ui/Page";
import { tablePath, tableTitle } from "../layout/nav";
import { formatDateTime, formatNumber, formatRelative } from "../lib/format";

const isActive = (job: Job) => job.status === "queued" || job.status === "running";

function TypeCell({ job }: { job: Job }) {
  return (
    <Group gap={6} wrap="nowrap">
      {job.type === "import" ? <IconFileImport size={16} aria-hidden /> : <IconFileExport size={16} aria-hidden />}
      <Text span size="sm">
        {job.type === "import" ? "Import" : "Export"}
      </Text>
    </Group>
  );
}

function downloadLabel(job: Job) {
  return job.type === "import" ? "Errors CSV" : "Download CSV";
}

function JobDetails({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const row = (label: string, value: ReactNode) => (
    <Group justify="space-between" wrap="nowrap" gap="md" py={6} style={{ borderBottom: "1px solid var(--app-border)" }}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" ta="right" component="div">
        {value}
      </Text>
    </Group>
  );
  return (
    <Drawer
      opened={!!job}
      onClose={onClose}
      title={job ? `${job.type === "import" ? "Import into" : "Export of"} ${tableTitle(job.tableName)}` : ""}
      size={isMobile ? "100%" : "md"}
    >
      {job && (
        <Stack gap="md">
          <Stack gap={0}>
            {row("Status", <JobStatusBadge status={job.status} />)}
            {row("Table", <Anchor component={Link} to={tablePath(job.tableName)}>{tableTitle(job.tableName)}</Anchor>)}
            {row("Started by", job.username)}
            {row("Created", formatDateTime(job.createdAt))}
            {job.startedAt && row("Started", formatDateTime(job.startedAt))}
            {job.finishedAt && row("Finished", formatDateTime(job.finishedAt))}
            {row("Processed", <span className="tabular-nums">{formatNumber(job.progress)} rows</span>)}
            {job.result && row("Result", jobResultSummary(job))}
          </Stack>

          {job.error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} title="The job failed">
              {job.error}
            </Alert>
          )}

          {job.hasFile && (
            <Button
              component="a"
              href={jobDownloadUrl(job._id)}
              download
              leftSection={<IconDownload size={16} />}
              variant={job.type === "export" ? "filled" : "default"}
            >
              {downloadLabel(job)}
            </Button>
          )}

          {!!job.result?.errors?.length && (
            <Stack gap="xs">
              <Text fw={600} size="sm">
                Problems ({formatNumber(job.result.errors.length)}
                {job.result.failed && job.result.failed > job.result.errors.length ? ` of ${formatNumber(job.result.failed)}` : ""})
              </Text>
              <ScrollArea.Autosize mah={360}>
                <Table verticalSpacing={6} fz="sm" aria-label="Import problems">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={64}>Row</Table.Th>
                      <Table.Th>Problem</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {job.result.errors.map((e, i) => (
                      <Table.Tr key={i}>
                        <Table.Td className="tabular-nums">{e.row}</Table.Td>
                        <Table.Td>{e.message}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
            </Stack>
          )}
        </Stack>
      )}
    </Drawer>
  );
}

export default function JobsPage() {
  const { isAdmin } = useCurrentUser();
  const [selected, setSelected] = useState<string | null>(null);

  // the latest 100 jobs; searched, sorted and paged in the browser
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["jobs", "list"],
    queryFn: async () => (await getJobs(1, 100)).data,
    // poll while anything is still running
    refetchInterval: (q) => (q.state.data?.data.some(isActive) ? 3000 : false),
  });

  const jobs = data?.data ?? [];
  const selectedJob = jobs.find((j) => j._id === selected) ?? null;

  const columns = useMemo<DataTableColumn<Job>[]>(
    () => [
      { id: "type", header: "Type", width: 110, sortable: true, cell: (j) => <TypeCell job={j} />, mobile: "subtitle" },
      {
        id: "tableName",
        header: "Table",
        sortable: true,
        hideable: false,
        mobile: "title",
        cell: (j) => (
          <Anchor component={Link} to={tablePath(j.tableName)} size="sm" fw={500}>
            {tableTitle(j.tableName)}
          </Anchor>
        ),
      },
      { id: "status", header: "Status", width: 110, sortable: true, cell: (j) => <JobStatusBadge status={j.status} /> },
      {
        id: "result",
        header: "Result",
        width: 180,
        accessor: (j) => jobResultSummary(j),
        cell: (j) => {
          const text = jobResultSummary(j);
          return text ? (
            <Text span size="sm" c={j.status === "failed" ? "red" : j.result?.failed ? "orange" : undefined}>
              {text}
            </Text>
          ) : (
            <Text span c="dimmed">
              —
            </Text>
          );
        },
      },
      {
        id: "createdAt",
        header: "Started",
        width: 140,
        sortable: true,
        cell: (j) => (
          <Tooltip label={formatDateTime(j.createdAt)}>
            <Text span size="sm">
              {formatRelative(j.createdAt)}
            </Text>
          </Tooltip>
        ),
      },
      ...(isAdmin ? [{ id: "username", header: "User", width: 120, sortable: true } as DataTableColumn<Job>] : []),
    ],
    [isAdmin]
  );

  return (
    <Page title="Imports & exports" breadcrumbs={[{ label: "Imports & exports" }]}>
      <PageHeader
        title="Imports & exports"
        description={
          isAdmin
            ? "The latest CSV imports and exports from everyone. Files are kept for 14 days."
            : "Your latest CSV imports and exports. Files are kept for 14 days."
        }
      />

      <DataTable<Job>
        label="Imports and exports"
        mode="client"
        data={jobs}
        columns={columns}
        getRowId={(j) => j._id}
        loading={isLoading}
        fetching={isFetching}
        error={error ? errorMessage(error, "Couldn't load your jobs") : null}
        onRetry={() => refetch()}
        searchPlaceholder="Search jobs…"
        storageKey="jobs"
        onRowClick={(j) => setSelected(j._id)}
        rowActions={(j) => (
          <>
            <Menu.Item onClick={() => setSelected(j._id)}>View details</Menu.Item>
            {j.hasFile && (
              <Menu.Item component="a" href={jobDownloadUrl(j._id)} download leftSection={<IconDownload size={14} />}>
                {downloadLabel(j)}
              </Menu.Item>
            )}
            <Menu.Item component={Link} to={tablePath(j.tableName)}>
              Open table
            </Menu.Item>
          </>
        )}
        emptyState={() => (
          <EmptyState
            icon={<IconFileExport size={26} stroke={1.5} />}
            title="No imports or exports yet"
            description="Open a table and use Import or Export. Large files are processed in the background and appear here."
          />
        )}
      />

      <JobDetails job={selectedJob} onClose={() => setSelected(null)} />
    </Page>
  );
}
