import { Box, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title, Tooltip, UnstyledButton } from "@mantine/core";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import api, { getTableData, type ListFilter } from "../api/api";
import { tablePath } from "../layout/nav";
import { formatCompact, formatNumber } from "../lib/format";

type Board = {
  app: string;
  name: string;
  tiles: { label: string; table: string; filters: ListFilter[] }[];
  breakdown: { label: string; table: string; column: string; options: string[] } | null;
};

// how many records match, from the normal list (so it follows the viewer's access)
const countOf = async (table: string, filters: ListFilter[]) =>
  ((await getTableData(table, { page: 1, limit: 1, filters })).data as { total: number }).total;

const listLink = (table: string, filters: ListFilter[]) =>
  `${tablePath(table)}${filters.length ? `?f=${encodeURIComponent(JSON.stringify(filters))}` : ""}`;

// a big number reads at a glance: 1,284 / 12.9K
const compact = (n: number) => (n >= 10_000 ? formatCompact(n) : formatNumber(n));

function Tile({ label, table, filters }: Board["tiles"][number]) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["tile", table, filters], queryFn: () => countOf(table, filters), staleTime: 60_000 });
  return (
    <UnstyledButton
      onClick={() => navigate(listLink(table, filters))}
      p="md"
      bg="var(--app-surface)"
      style={{ border: "1px solid var(--app-border)", borderRadius: "var(--mantine-radius-lg)" }}
      aria-label={`${label}: ${data ?? "loading"}. Open the list`}
    >
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      {isLoading ? (
        <Skeleton h={30} w={60} mt={6} />
      ) : (
        <Text fz={28} fw={600} lh={1.2} mt={4} className="tabular-nums">
          {compact(data ?? 0)}
        </Text>
      )}
    </UnstyledButton>
  );
}

// One category split ("Tasks by status") as horizontal bars: a single hue
// (one series, so no legend), bars start at the same baseline, the count
// printed next to each, and a tooltip with the share.
function Breakdown({ label, table, column, options }: NonNullable<Board["breakdown"]>) {
  const navigate = useNavigate();
  const results = useQueries({
    queries: options.map((option) => {
      const filters: ListFilter[] = [{ field: column, op: "in", value: [option] }];
      return { queryKey: ["tile", table, filters], queryFn: () => countOf(table, filters), staleTime: 60_000 };
    }),
  });
  const counts = results.map((r) => r.data ?? 0);
  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const loading = results.some((r) => r.isLoading);

  return (
    <Paper p="md" radius="lg" bg="var(--app-surface)" style={{ border: "1px solid var(--app-border)" }}>
      <Text size="sm" c="dimmed" mb="sm">
        {label}
      </Text>
      {loading ? (
        <Skeleton h={18 * options.length} />
      ) : (
        <Stack gap={2} role="table" aria-label={label}>
          {options.map((option, i) => {
            const n = counts[i];
            const share = total ? Math.round((n / total) * 100) : 0;
            return (
              <Tooltip key={option} label={`${option}: ${formatNumber(n)} (${share}%)`} position="top-start" openDelay={150}>
                <UnstyledButton
                  role="row"
                  onClick={() => navigate(listLink(table, [{ field: column, op: "in", value: [option] }]))}
                  py={4}
                  style={{ borderRadius: "var(--mantine-radius-sm)" }}
                >
                  <Group gap="sm" wrap="nowrap">
                    <Text role="cell" size="sm" w={110} truncate style={{ flexShrink: 0 }}>
                      {option}
                    </Text>
                    <Box style={{ flex: 1, minWidth: 0 }} role="cell" aria-label={`${share}%`}>
                      {/* data end rounded, baseline end square; zero draws nothing */}
                      {n > 0 && (
                        <Box
                          h={12}
                          w={`${(n / max) * 100}%`}
                          miw={4}
                          bg="var(--mantine-primary-color-filled)"
                          style={{ borderRadius: "0 4px 4px 0" }}
                        />
                      )}
                    </Box>
                    <Text role="cell" size="sm" w={48} ta="right" className="tabular-nums" style={{ flexShrink: 0 }}>
                      {formatNumber(n)}
                    </Text>
                  </Group>
                </UnstyledButton>
              </Tooltip>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}

// Home: the counts of each installed app ("Open tasks", "Overdue invoices").
export function AppDashboards() {
  const { data: boards = [] } = useQuery({
    queryKey: ["dashboards"],
    queryFn: async () => (await api.get<Board[]>("/apps/dashboards")).data,
    staleTime: 60_000,
  });
  if (!boards.length) return null;
  return (
    <Stack gap="lg">
      {boards.map((b) => (
        <Box key={b.app}>
          <Title order={4} mb="sm">
            {b.name}
          </Title>
          {/* tiles, and the breakdown beside them on wide screens */}
          <SimpleGrid cols={{ base: 1, md: b.breakdown && b.tiles.length ? 2 : 1 }} spacing="md">
            {b.tiles.length > 0 && (
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md" style={{ alignContent: "start" }}>
                {b.tiles.map((t) => (
                  <Tile key={t.label} {...t} />
                ))}
              </SimpleGrid>
            )}
            {b.breakdown && <Breakdown {...b.breakdown} />}
          </SimpleGrid>
        </Box>
      ))}
    </Stack>
  );
}
