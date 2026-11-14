import { useMemo } from "react";
import { Alert, Box, Button, Group, Skeleton, Stack, Text, Tooltip } from "@mantine/core";
import { IconAlertCircle, IconHistory } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { errorMessage, getAuditLog, getDepartmentOptions, getRelationOptions, getUserOptions } from "../../api/api";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDateTime, formatRelative } from "../../lib/format";
import { ActionBadge, ChangesView } from "../../utils/auditFormat";
import { columnLabel, type RecordColumn } from "./schema";

const PAGE_SIZE = 15;

// Audit trail of one record, newest first (side panel or drawer content).
export function RecordActivity({
  table,
  recordId,
  columns,
  enabled = true,
}: {
  table: string;
  recordId: string;
  columns: RecordColumn[];
  enabled?: boolean;
}) {
  const labels = useMemo(() => Object.fromEntries(columns.map((c) => [c.name, columnLabel(c)])), [columns]);

  const history = useInfiniteQuery({
    queryKey: ["audit", "record", table, recordId],
    queryFn: async ({ pageParam }) =>
      (await getAuditLog({ tableName: table, recordId, page: pageParam, limit: PAGE_SIZE })).data,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    enabled: enabled && Boolean(recordId),
  });
  const entries = useMemo(() => history.data?.pages.flatMap((p) => p.data) ?? [], [history.data]);

  // show linked records by name instead of id (only ones the user may see)
  const relationIds = useMemo(() => {
    const byField: Record<string, string[]> = {};
    for (const column of columns) {
      if (!["user", "department"].includes(column.type) && (column.type !== "relation" || !column.ref)) continue;
      const ids = new Set<string>();
      for (const entry of entries) {
        const change = entry.changes?.[column.name];
        if (!change || typeof change !== "object") continue;
        for (const v of [change.from, change.to].flat()) if (typeof v === "string" && v) ids.add(v);
      }
      if (ids.size) byField[column.name] = [...ids].sort();
    }
    return byField;
  }, [columns, entries]);

  const { data: names = {} } = useQuery({
    queryKey: ["audit-names", table, relationIds],
    enabled: Object.keys(relationIds).length > 0,
    queryFn: async () => {
      const result: Record<string, Record<string, string>> = {};
      for (const [field, ids] of Object.entries(relationIds)) {
        const column = columns.find((c) => c.name === field)!;
        try {
          const { data } =
            column.type === "user"
              ? await getUserOptions({ ids })
              : column.type === "department"
                ? await getDepartmentOptions()
                : await getRelationOptions(column.ref!, { ids, displayField: column.displayField });
          result[field] = Object.fromEntries(data.map((o) => [o.value, o.label]));
        } catch {
          // no access to the linked table: ids stay as they are
        }
      }
      return result;
    },
  });

  if (history.isLoading) {
    return (
      <Stack gap="md">
        {Array.from({ length: 3 }).map((_, i) => (
          <Stack key={i} gap={6}>
            <Skeleton h={14} w="60%" />
            <Skeleton h={12} w="90%" />
          </Stack>
        ))}
      </Stack>
    );
  }
  if (history.isError) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={16} />}>
        {errorMessage(history.error, "Couldn't load the history")}
      </Alert>
    );
  }
  if (!entries.length) {
    return (
      <EmptyState
        compact
        icon={<IconHistory size={20} stroke={1.5} />}
        title="No changes yet"
        description="Edits to this record will appear here."
      />
    );
  }

  return (
    <Stack gap={0}>
      {entries.map((entry, i) => (
        <Box
          key={entry._id}
          py="sm"
          style={{ borderTop: i ? "1px solid var(--app-border)" : undefined }}
        >
          <Group justify="space-between" gap="xs" mb={6} wrap="nowrap">
            <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
              <ActionBadge action={entry.action} />
              <Text size="sm" fw={500} truncate>
                {entry.username ?? "System"}
              </Text>
            </Group>
            <Tooltip label={formatDateTime(entry.at)}>
              <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {formatRelative(entry.at)}
              </Text>
            </Tooltip>
          </Group>
          {entry.action === "create" ? (
            // what it was created with is on the page already
            <Text size="sm" c="dimmed">
              Created the record
            </Text>
          ) : (
            <ChangesView changes={entry.changes} labels={labels} names={names} />
          )}
        </Box>
      ))}
      {history.hasNextPage && (
        <Button
          variant="subtle"
          size="xs"
          mt="xs"
          onClick={() => history.fetchNextPage()}
          loading={history.isFetchingNextPage}
        >
          Show older changes
        </Button>
      )}
    </Stack>
  );
}
