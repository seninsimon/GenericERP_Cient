import { Fragment, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Collapse,
  Group,
  Loader,
  Pagination,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconFileExport,
  IconFileImport,
  IconTransferIn,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { errorMessage, getJobs, jobDownloadUrl, type Job } from "../api/api";
import { useCurrentUser } from "../auth/AuthContext";

const PAGE_SIZE = 25;

const STATUS_COLORS: Record<Job["status"], string> = {
  queued: "gray",
  running: "blue",
  done: "green",
  failed: "red",
};

const fmt = (n?: number) => (n ?? 0).toLocaleString();
const time = (iso: string | null) => (iso ? dayjs(iso).format("DD MMM YYYY, HH:mm") : "—");

// "1,204 rows" / "980 inserted, 3 failed" / "processing… 300 rows"
const summary = (job: Job) => {
  if (job.status === "queued") return "Waiting to start";
  if (job.status === "running") return `Processing… ${fmt(job.progress)} rows`;
  if (job.status === "failed") return job.error ?? "Failed";
  if (job.type === "export") return `${fmt(job.result?.rows ?? job.progress)} rows`;
  return `${fmt(job.result?.inserted)} inserted, ${fmt(job.result?.failed)} failed`;
};

export default function JobsPage() {
  const { isAdmin } = useCurrentUser();
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const jobs = useQuery({
    queryKey: ["jobs", page],
    queryFn: async () => (await getJobs(page, PAGE_SIZE)).data,
    // keep polling while something is still in progress
    refetchInterval: (query) =>
      query.state.data?.data.some((j) => j.status === "queued" || j.status === "running")
        ? 3000
        : false,
  });

  const rows = jobs.data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((jobs.data?.total ?? 0) / PAGE_SIZE));

  return (
    <Box p="md" maw={1200}>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconTransferIn size={26} />
          <Title order={2}>Imports &amp; exports</Title>
        </Group>
        <Button variant="subtle" size="xs" onClick={() => jobs.refetch()} loading={jobs.isFetching}>
          Refresh
        </Button>
      </Group>

      <Card withBorder radius="md" p="md">
        {jobs.isLoading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : jobs.isError ? (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {errorMessage(jobs.error, "Couldn't load jobs")}
          </Alert>
        ) : !rows.length ? (
          <Text c="dimmed" size="sm" ta="center" py="xl">
            No imports or exports yet. Use "Export CSV" or "Import CSV" on a table.
          </Text>
        ) : (
          <Stack>
            <Table.ScrollContainer minWidth={800}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={30} />
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Table</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Result</Table.Th>
                    {isAdmin && <Table.Th>User</Table.Th>}
                    <Table.Th>Started</Table.Th>
                    <Table.Th>Finished</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((job) => {
                    const errors = job.result?.errors ?? [];
                    const canExpand = errors.length > 0 || (job.status === "failed" && job.error);
                    const isOpen = expanded === job._id;
                    return (
                      <Fragment key={job._id}>
                        <Table.Tr>
                          <Table.Td>
                            {canExpand && (
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={() => setExpanded(isOpen ? null : job._id)}
                                aria-label="Show details"
                              >
                                {isOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                              </ActionIcon>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Group gap={6} wrap="nowrap">
                              {job.type === "export" ? (
                                <IconFileExport size={16} />
                              ) : (
                                <IconFileImport size={16} />
                              )}
                              <Text size="sm">{job.type === "export" ? "Export" : "Import"}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {job.tableName}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={STATUS_COLORS[job.status]}
                              variant="light"
                              leftSection={job.status === "running" ? <Loader size={10} /> : undefined}
                            >
                              {job.status}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text
                              size="sm"
                              c={job.status === "failed" ? "red" : job.result?.failed ? "orange" : undefined}
                              lineClamp={1}
                              maw={260}
                            >
                              {summary(job)}
                            </Text>
                          </Table.Td>
                          {isAdmin && (
                            <Table.Td>
                              <Text size="sm">{job.username}</Text>
                            </Table.Td>
                          )}
                          <Table.Td>
                            <Text size="xs">{time(job.createdAt)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs">{time(job.finishedAt)}</Text>
                          </Table.Td>
                          <Table.Td>
                            {job.hasFile && (
                              <Tooltip
                                label={job.type === "export" ? "Download CSV" : "Download error report"}
                              >
                                <Button
                                  component="a"
                                  href={jobDownloadUrl(job._id)}
                                  size="xs"
                                  variant="light"
                                  leftSection={<IconDownload size={14} />}
                                >
                                  {job.type === "export" ? "Download" : "Errors CSV"}
                                </Button>
                              </Tooltip>
                            )}
                          </Table.Td>
                        </Table.Tr>

                        {canExpand && (
                          <Table.Tr style={{ borderTop: isOpen ? undefined : "none" }}>
                            <Table.Td colSpan={isAdmin ? 9 : 8} p={0}>
                              <Collapse in={isOpen}>
                                <Box p="sm" bg="var(--mantine-color-gray-0)">
                                  {job.status === "failed" && job.error && (
                                    <Text size="sm" c="red" mb={errors.length ? "xs" : 0}>
                                      {job.error}
                                    </Text>
                                  )}
                                  {errors.length > 0 && (
                                    <Stack gap={2}>
                                      <Text size="xs" fw={600}>
                                        First {errors.length} problem{errors.length === 1 ? "" : "s"}:
                                      </Text>
                                      {errors.map((e, i) => (
                                        <Text key={i} size="xs">
                                          Row {e.row}: {e.message}
                                        </Text>
                                      ))}
                                    </Stack>
                                  )}
                                </Box>
                              </Collapse>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Fragment>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            {totalPages > 1 && (
              <Group justify="flex-end">
                <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
              </Group>
            )}
          </Stack>
        )}
      </Card>
    </Box>
  );
}
