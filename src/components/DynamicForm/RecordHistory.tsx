import { useMemo } from "react";
import {
  Alert,
  Button,
  Center,
  Divider,
  Drawer,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { errorMessage, getAuditLog, getRelationOptions } from "../../api/api";
import { ActionBadge, ChangesView, formatTime } from "../../utils/auditFormat";

const PAGE_SIZE = 20;

// Drawer listing the audit trail of one record, newest first.
export default function RecordHistory({
  opened,
  onClose,
  table,
  recordId,
  columns,
}: {
  opened: boolean;
  onClose: () => void;
  table: string;
  recordId: string;
  columns: any[];
}) {
  const labels = useMemo(
    () => Object.fromEntries((columns ?? []).map((c: any) => [c.name, c.label || c.name])),
    [columns]
  );

  const history = useInfiniteQuery({
    queryKey: ["audit", "record", table, recordId],
    queryFn: async ({ pageParam }) =>
      (await getAuditLog({ tableName: table, recordId, page: pageParam, limit: PAGE_SIZE })).data,
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    enabled: opened && Boolean(recordId),
  });

  const entries = history.data?.pages.flatMap((p) => p.data) ?? [];

  // show linked records by name instead of id (only ones the user may see)
  const relationIds = useMemo(() => {
    const byField: Record<string, Set<string>> = {};
    for (const col of columns ?? []) {
      if (col.type !== "relation" || !col.ref) continue;
      for (const entry of entries) {
        const change = entry.changes?.[col.name];
        if (!change || typeof change !== "object") continue;
        for (const v of [change.from, change.to].flat()) {
          if (typeof v === "string" && v) (byField[col.name] ??= new Set()).add(v);
        }
      }
    }
    return byField;
  }, [columns, entries]);

  const { data: names = {} } = useQuery({
    queryKey: ["audit-names", table, Object.entries(relationIds).map(([f, ids]) => [f, [...ids].sort()])],
    enabled: Object.keys(relationIds).length > 0,
    queryFn: async () => {
      const result: Record<string, Record<string, string>> = {};
      for (const [field, ids] of Object.entries(relationIds)) {
        const col = columns.find((c: any) => c.name === field);
        try {
          const { data } = await getRelationOptions(col.ref, { ids: [...ids], displayField: col.displayField });
          result[field] = Object.fromEntries(data.map((o) => [o.value, o.label]));
        } catch {
          // no access to the linked table: keep showing ids
        }
      }
      return result;
    },
  });

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="md" title="Record history">
      {history.isLoading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : history.isError ? (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {errorMessage(history.error, "Couldn't load the history")}
        </Alert>
      ) : !entries.length ? (
        <Text c="dimmed" size="sm">
          No changes recorded yet.
        </Text>
      ) : (
        <Stack gap="sm">
          {entries.map((entry) => (
            <Paper key={entry._id} withBorder radius="md" p="sm">
              <Group justify="space-between" mb={6}>
                <Group gap={6}>
                  <ActionBadge action={entry.action} />
                  <Text size="sm" fw={500}>
                    {entry.username ?? "System"}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  {formatTime(entry.at)}
                </Text>
              </Group>
              <Divider mb={6} />
              <ChangesView changes={entry.changes} labels={labels} names={names} />
            </Paper>
          ))}

          {history.hasNextPage && (
            <Button
              variant="light"
              onClick={() => history.fetchNextPage()}
              loading={history.isFetchingNextPage}
            >
              Load more
            </Button>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
