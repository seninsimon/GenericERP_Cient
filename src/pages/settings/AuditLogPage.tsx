import { useMemo, useState } from "react";
import {
  Anchor,
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconFilterOff, IconHistory } from "@tabler/icons-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import dayjs from "dayjs";

import { errorMessage, getAuditLog, type AuditEntry, type AuditQuery } from "../../api/api";
import { useUsers } from "../../api/reactQueryHooks/useAdmin";
import { useTables } from "../../api/reactQueryHooks/useTables";
import { DataTable, useTableUrlState, type DataTableColumn } from "../../components/data-table";
import { EmptyState } from "../../components/ui/EmptyState";
import { Page, PageHeader } from "../../components/ui/Page";
import { recordPath, tableTitle } from "../../layout/nav";
import { formatDateTime, formatNumber, formatRelative } from "../../lib/format";
import { ActionBadge, actionLabel, ChangesView, describeEntry } from "../../utils/auditFormat";

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
].map((a) => ({ value: a, label: actionLabel(a) }));

// Filter values kept in the URL (as the single item of the table state's filters).
type AuditFilters = {
  tableName?: string;
  userId?: string;
  entity?: string;
  action?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
};

/* ---------------- one entry in detail ---------------- */

function EntryDrawer({
  entry,
  labels,
  onClose,
}: {
  entry: AuditEntry | null;
  labels: Record<string, string>;
  onClose: () => void;
}) {
  const canOpenRecord =
    entry?.entity === "record" && entry.tableName && entry.recordId && entry.action !== "delete";
  return (
    <Drawer opened={entry !== null} onClose={onClose} title="Audit entry" size="md">
      {entry && (
        <Stack gap="md">
          <Group gap="xs">
            <ActionBadge action={entry.action} />
            <Text fw={600}>{describeEntry(entry)}</Text>
          </Group>
          <SimpleGrid cols={2} spacing="sm" verticalSpacing="xs">
            <Text size="sm" c="dimmed">
              Who
            </Text>
            <Text size="sm">{entry.username ?? "System"}</Text>
            <Text size="sm" c="dimmed">
              When
            </Text>
            <Text size="sm" className="tabular-nums">
              {formatDateTime(entry.at)}
            </Text>
            {entry.tableName && (
              <>
                <Text size="sm" c="dimmed">
                  Table
                </Text>
                <Text size="sm">{tableTitle(entry.tableName)}</Text>
              </>
            )}
            {entry.recordId && (
              <>
                <Text size="sm" c="dimmed">
                  {entry.entity === "record" ? "Record" : "Item"}
                </Text>
                {canOpenRecord ? (
                  <Anchor component={Link} to={recordPath(entry.tableName!, entry.recordId)} size="sm" ff="monospace">
                    {entry.recordId}
                  </Anchor>
                ) : (
                  <Text size="sm" ff="monospace" style={{ overflowWrap: "anywhere" }}>
                    {entry.recordId}
                  </Text>
                )}
              </>
            )}
            {entry.ip && (
              <>
                <Text size="sm" c="dimmed">
                  IP address
                </Text>
                <Text size="sm" ff="monospace">
                  {entry.ip}
                </Text>
              </>
            )}
          </SimpleGrid>
          <Divider label="Changes" labelPosition="left" />
          <ChangesView changes={entry.changes} labels={labels} />
        </Stack>
      )}
    </Drawer>
  );
}

/* ---------------- page ---------------- */

// Administration → Audit log: who did what, when.
export default function AuditLogPage() {
  const [url, setUrl] = useTableUrlState<AuditFilters>();
  const filters: AuditFilters = url.filters[0] ?? {};
  const pageSize = url.pageSize ?? 25;
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  // the API has no free-text search: the box filters the rows on this page
  const [pageFilter, setPageFilter] = useState("");

  const { data: tables = [] } = useTables();
  const { data: users = [] } = useUsers();

  const setFilter = (patch: Partial<AuditFilters>) => {
    const next = Object.fromEntries(
      Object.entries({ ...filters, ...patch }).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ) as AuditFilters;
    setUrl({ filters: Object.keys(next).length ? [next] : [] });
  };
  const hasFilters = Object.keys(filters).length > 0;

  const query: AuditQuery = {
    tableName: filters.tableName,
    userId: filters.userId,
    entity: filters.entity,
    action: filters.action,
    from: filters.from ? dayjs(filters.from).startOf("day").toISOString() : undefined,
    to: filters.to ? dayjs(filters.to).endOf("day").toISOString() : undefined,
    page: url.page,
    limit: pageSize,
  };

  const audit = useQuery({
    queryKey: ["audit", "log", query],
    queryFn: async () => (await getAuditLog(query)).data,
    placeholderData: keepPreviousData,
  });

  // column name -> label, per table
  const labelsByTable = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const t of tables as { tableName: string; columns?: { name: string; label?: string }[] }[]) {
      map[t.tableName] = Object.fromEntries((t.columns ?? []).map((c) => [c.name, c.label || c.name]));
    }
    return map;
  }, [tables]);

  const rows = useMemo(() => {
    const all = audit.data?.data ?? [];
    const needle = pageFilter.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((e) =>
      [describeEntry(e), e.username, e.action, e.tableName, e.recordId, e.ip]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [audit.data, pageFilter]);

  const columns = useMemo<DataTableColumn<AuditEntry>[]>(
    () => [
      {
        id: "at",
        header: "When",
        width: 130,
        mobile: "subtitle",
        cell: (e) => (
          <Tooltip label={formatDateTime(e.at)}>
            <Text size="sm" c="dimmed" span className="tabular-nums">
              {formatRelative(e.at)}
            </Text>
          </Tooltip>
        ),
      },
      {
        id: "username",
        header: "User",
        width: 140,
        cell: (e) =>
          e.username ? (
            <Text size="sm" truncate>
              {e.username}
            </Text>
          ) : (
            <Text size="sm" c="dimmed" span>
              System
            </Text>
          ),
      },
      {
        id: "action",
        header: "Action",
        width: 130,
        cell: (e) => <ActionBadge action={e.action} />,
      },
      {
        id: "description",
        header: "What happened",
        hideable: false,
        mobile: "title",
        width: 260,
        cell: (e) => (
          <Text size="sm" truncate>
            {describeEntry(e)}
          </Text>
        ),
      },
      {
        id: "recordId",
        header: "Item",
        width: 140,
        hiddenByDefault: true,
        cell: (e) =>
          e.recordId ? (
            <Text size="xs" ff="monospace" c="dimmed" truncate>
              {e.recordId}
            </Text>
          ) : (
            <Text span c="dimmed">
              —
            </Text>
          ),
      },
      {
        id: "ip",
        header: "IP address",
        width: 140,
        hiddenByDefault: true,
        cell: (e) =>
          e.ip ? (
            <Text size="xs" ff="monospace" c="dimmed">
              {e.ip}
            </Text>
          ) : (
            <Text span c="dimmed">
              —
            </Text>
          ),
      },
    ],
    []
  );

  const filterControls = (
    <Group gap="xs" wrap="wrap">
      <Select
        aria-label="Table"
        placeholder="All tables"
        data={(tables as { tableName: string }[]).map((t) => ({ value: t.tableName, label: tableTitle(t.tableName) }))}
        value={filters.tableName ?? null}
        onChange={(v) => setFilter({ tableName: v ?? undefined })}
        searchable
        clearable
        w={160}
      />
      <Select
        aria-label="User"
        placeholder="Everyone"
        data={users.map((u) => ({ value: u._id, label: u.fullName ? `${u.fullName} (${u.username})` : u.username }))}
        value={filters.userId ?? null}
        onChange={(v) => setFilter({ userId: v ?? undefined })}
        searchable
        clearable
        w={170}
      />
      <Select
        aria-label="What changed"
        placeholder="Everything"
        data={ENTITIES}
        value={filters.entity ?? null}
        onChange={(v) => setFilter({ entity: v ?? undefined })}
        clearable
        w={140}
      />
      <Select
        aria-label="Action"
        placeholder="Any action"
        data={ACTIONS}
        value={filters.action ?? null}
        onChange={(v) => setFilter({ action: v ?? undefined })}
        clearable
        w={150}
      />
      <DatePickerInput
        type="range"
        aria-label="Date range"
        placeholder="Any time"
        value={[filters.from ?? null, filters.to ?? null]}
        onChange={(v) => {
          const [from, to] = v as [string | null, string | null];
          // apply once both ends are chosen (or both cleared)
          if ((from && to) || (!from && !to)) setFilter({ from: from ?? undefined, to: to ?? undefined });
        }}
        clearable
        allowSingleDateInRange
        valueFormat="DD MMM YYYY"
        w={230}
      />
      {hasFilters && (
        <Button variant="subtle" color="gray" leftSection={<IconFilterOff size={14} />} onClick={() => setUrl({ filters: [] })}>
          Clear filters
        </Button>
      )}
    </Group>
  );

  return (
    <Page title="Audit log" breadcrumbs={[{ label: "Administration" }, { label: "Audit log" }]} width="wide">
      <PageHeader
        title="Audit log"
        description="Every change, sign-in and setting update, newest first."
        meta={
          audit.data ? <Badge variant="default">{formatNumber(audit.data.total)} entries</Badge> : undefined
        }
      />

      <DataTable
        label="Audit log"
        mode="server"
        data={rows}
        columns={columns}
        getRowId={(e) => e._id}
        total={audit.data?.total ?? 0}
        page={url.page}
        pageSize={pageSize}
        onPageChange={(page) => setUrl({ page })}
        onPageSizeChange={(size) => setUrl({ pageSize: size })}
        search={pageFilter}
        onSearchChange={setPageFilter}
        searchable={false}
        toolbar={filterControls}
        loading={audit.isLoading}
        fetching={audit.isFetching}
        error={audit.isError ? errorMessage(audit.error, "Couldn't load the audit log") : null}
        onRetry={() => audit.refetch()}
        storageKey="settings:audit"
        onRowClick={setSelected}
        isFiltered={hasFilters || Boolean(pageFilter)}
        emptyState={(filtered) =>
          filtered ? (
            <EmptyState
              title="No entries match"
              description="Try other filters or a wider date range."
              action={
                hasFilters ? (
                  <Button variant="default" onClick={() => setUrl({ filters: [] })}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState icon={<IconHistory size={26} stroke={1.5} />} title="No activity yet" />
          )
        }
      />

      <EntryDrawer
        entry={selected}
        labels={selected?.tableName ? (labelsByTable[selected.tableName] ?? {}) : {}}
        onClose={() => setSelected(null)}
      />
    </Page>
  );
}
