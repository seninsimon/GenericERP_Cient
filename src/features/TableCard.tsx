import { Box, Button, Card, Group, Skeleton, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { IconArrowRight, IconPlus, IconTable } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { getTableData } from "../api/api";
import { newRecordPath, tablePath, tableTitle } from "../layout/nav";
import { formatNumber } from "../lib/format";

export type TableInfo = { tableName: string; permissions?: { create?: boolean } };

/* ---------------- one table card ---------------- */

export function TableCard({ table }: { table: TableInfo }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["tableCount", table.tableName],
    queryFn: async () => (await getTableData(table.tableName, { page: 1, limit: 1 })).data,
    staleTime: 60_000,
  });
  const title = tableTitle(table.tableName);

  return (
    <Card padding="md" style={{ display: "flex", flexDirection: "column" }}>
      <UnstyledButton
        onClick={() => navigate(tablePath(table.tableName))}
        aria-label={`Open ${title}`}
        style={{ flex: 1 }}
      >
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <ThemeIcon variant="light" size={36} radius="md" aria-hidden>
            <IconTable size={18} stroke={1.75} />
          </ThemeIcon>
          <Box style={{ minWidth: 0 }}>
            <Text fw={600} truncate>
              {title}
            </Text>
            {isLoading ? (
              <Skeleton h={12} w={70} mt={6} />
            ) : (
              <Text size="sm" c="dimmed" className="tabular-nums">
                {data?.totalIsEstimate ? "~" : ""}
                {formatNumber(data?.total ?? 0)} {data?.total === 1 ? "record" : "records"}
              </Text>
            )}
          </Box>
        </Group>
      </UnstyledButton>
      <Group gap="xs" mt="md">
        <Button
          component={Link}
          to={tablePath(table.tableName)}
          variant="default"
          size="xs"
          rightSection={<IconArrowRight size={14} />}
        >
          Open
        </Button>
        {table.permissions?.create && (
          <Button
            component={Link}
            to={newRecordPath(table.tableName)}
            variant="subtle"
            size="xs"
            leftSection={<IconPlus size={14} />}
            aria-label={`New record in ${title}`}
          >
            New
          </Button>
        )}
      </Group>
    </Card>
  );
}
