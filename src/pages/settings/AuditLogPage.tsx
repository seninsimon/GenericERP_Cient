import { Fragment, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Button,
  Card,
  Center,
  Collapse,
  Grid,
  Group,
  Loader,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronRight,
  IconFilterOff,
  IconHistory,
} from "@tabler/icons-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import { errorMessage, getAuditLog, type AuditQuery } from "../../api/api";
import { useTables } from "../../api/reactQueryHooks/useTables";
import { useUsers } from "../../api/reactQueryHooks/useAdmin";
import { ActionBadge, ChangesView, describeEntry, formatTime } from "../../utils/auditFormat";

const PAGE_SIZE = 25;

const ENTITIES = [
  { value: "record", label: "Records" },
  { value: "session", label: "Sign-ins" },
  { value: "user", label: "Users" },
  { value: "role", label: "Roles" },
  { value: "department", label: "Departments" },
  { value: "table", label: "Tables" },
  { value: "column", label: "Columns" },
];

const ACTIONS = [
  "create",
  "update",
  "delete",
  "import",
  "login",
  "login_failed",
  "logout",
  "password_change",
  "settings",
  "assign_unassigned",
].map((a) => ({ value: a, label: a.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) }));

type Filters = {
  tableName: string | null;
  userId: string | null;
  entity: string | null;
  action: string | null;
  range: [string | null, string | null];
};

const EMPTY: Filters = { tableName: null, userId: null, entity: null, action: null, range: [null, null] };

// Settings → Audit log (admins): who did what, when.
export default function AuditLogPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: tables = [] } = useTables();
  const { data: users = [] } = useUsers();

  // column name -> label, per table
  const labelsByTable = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const t of tables as any[]) {
      map[t.tableName] = Object.fromEntries(
        (t.columns ?? []).map((c: any) => [c.name, c.label || c.name])
      );
    }
    return map;
  }, [tables]);

  const query: AuditQuery = {
    tableName: filters.tableName ?? undefined,
    userId: filters.userId ?? undefined,
    entity: filters.entity ?? undefined,
    action: filters.action ?? undefined,
    from: filters.range[0] ? dayjs(filters.range[0]).startOf("day").toISOString() : undefined,
    to: filters.range[1] ? dayjs(filters.range[1]).endOf("day").toISOString() : undefined,
    page,
    limit: PAGE_SIZE,
  };

  const audit = useQuery({
    queryKey: ["audit", "log", query],
    queryFn: async () => (await getAuditLog(query)).data,
    placeholderData: keepPreviousData,
  });

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const rows = audit.data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((audit.data?.total ?? 0) / PAGE_SIZE));
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY);

  return (
    <Card withBorder shadow="sm" p="lg" radius="md">
      <Group justify="space-between" mb="md">
        <Group>
          <IconHistory size={24} />
          <Title order={4}>Audit log</Title>
          {audit.data && (
            <Text size="sm" c="dimmed">
              {audit.data.total.toLocaleString()} entries
            </Text>
          )}
        </Group>
        {hasFilters && (
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconFilterOff size={14} />}
            onClick={() => {
              setFilters(EMPTY);
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </Group>

      <Grid mb="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Select
            label="Table"
            placeholder="All tables"
            data={(tables as any[]).map((t) => t.tableName)}
            value={filters.tableName}
            onChange={(v) => setFilter("tableName", v)}
            searchable
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Select
            label="User"
            placeholder="Everyone"
            data={users.map((u: any) => ({ value: u._id, label: u.fullName ? `${u.fullName} (${u.username})` : u.username }))}
            value={filters.userId}
            onChange={(v) => setFilter("userId", v)}
            searchable
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Select
            label="What"
            placeholder="Everything"
            data={ENTITIES}
            value={filters.entity}
            onChange={(v) => setFilter("entity", v)}
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Select
            label="Action"
            placeholder="Any action"
            data={ACTIONS}
            value={filters.action}
            onChange={(v) => setFilter("action", v)}
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 12, md: 2.4 }}>
          <DatePickerInput
            type="range"
            label="Date range"
            placeholder="Any time"
            value={filters.range}
            onChange={(v) => setFilter("range", v as [string | null, string | null])}
            clearable
            allowSingleDateInRange
          />
        </Grid.Col>
      </Grid>

      {audit.isLoading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : audit.isError ? (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {errorMessage(audit.error, "Couldn't load the audit log")}
        </Alert>
      ) : !rows.length ? (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          No entries match these filters.
        </Text>
      ) : (
        <Stack>
          <Table.ScrollContainer minWidth={850}>
            <Table verticalSpacing="xs" highlightOnHover style={{ opacity: audit.isFetching ? 0.6 : 1 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={30} />
                  <Table.Th>Time</Table.Th>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Action</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Record</Table.Th>
                  <Table.Th>IP</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((entry) => {
                  const isOpen = expanded === entry._id;
                  const canOpenRecord =
                    entry.entity === "record" &&
                    entry.recordId &&
                    entry.tableName &&
                    entry.action !== "delete";
                  return (
                    <Fragment key={entry._id}>
                      <Table.Tr
                        style={{ cursor: "pointer" }}
                        onClick={() => setExpanded(isOpen ? null : entry._id)}
                      >
                        <Table.Td>
                          <ActionIcon variant="subtle" size="sm" aria-label="Show changes">
                            {isOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                          </ActionIcon>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" style={{ whiteSpace: "nowrap" }}>
                            {formatTime(entry.at)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{entry.username ?? "System"}</Text>
                        </Table.Td>
                        <Table.Td>
                          <ActionBadge action={entry.action} />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{describeEntry(entry)}</Text>
                        </Table.Td>
                        <Table.Td>
                          {entry.recordId ? (
                            canOpenRecord ? (
                              <Anchor
                                size="xs"
                                ff="monospace"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/table/${entry.tableName}/view/${entry.recordId}`);
                                }}
                              >
                                {entry.recordId.slice(0, 8)}…
                              </Anchor>
                            ) : (
                              <Text size="xs" ff="monospace" c="dimmed">
                                {entry.recordId.slice(0, 8)}…
                              </Text>
                            )
                          ) : (
                            <Text size="xs" c="dimmed">
                              —
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {entry.ip ?? "—"}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr style={{ borderTop: isOpen ? undefined : "none" }}>
                        <Table.Td colSpan={7} p={0}>
                          <Collapse in={isOpen}>
                            <Box p="sm" bg="var(--mantine-color-gray-0)">
                              <ChangesView
                                changes={entry.changes}
                                labels={entry.tableName ? labelsByTable[entry.tableName] : undefined}
                              />
                            </Box>
                          </Collapse>
                        </Table.Td>
                      </Table.Tr>
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
  );
}
