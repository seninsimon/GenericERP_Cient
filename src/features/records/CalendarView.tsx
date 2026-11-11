import { useState } from "react";
import { ActionIcon, Anchor, Badge, Box, Button, ColorSwatch, Group, SimpleGrid, Skeleton, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";

import { getTableData, type ListFilter } from "../../api/api";
import { newRecordPath, recordPath, tablePath } from "../../layout/nav";
import { cardTitle, type RecordColumn, type RecordRow, type TableSchemaInfo } from "./schema";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHOWN_PER_DAY = 3;
const LIMIT = 500;

// A month calendar: each record on the day of a date column. Click a record
// to open it, an empty part of a day to add one on that date. Phones get a
// list of days instead of a grid.
export function CalendarView({
  table,
  schema,
  dateColumn,
  search,
  filters,
}: {
  table: string;
  schema: TableSchemaInfo;
  dateColumn: RecordColumn;
  search: string;
  filters: ListFilter[];
}) {
  const navigate = useNavigate();
  const narrow = useMediaQuery("(max-width: 48em)");
  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const canCreate = Boolean(schema.permissions?.create);

  // the visible weeks, Monday first
  const first = month.subtract((month.day() + 6) % 7, "day");
  const last = month.endOf("month").add((7 - month.endOf("month").day()) % 7, "day");
  const days: dayjs.Dayjs[] = [];
  for (let d = first; !d.isAfter(last, "day"); d = d.add(1, "day")) days.push(d);
  const from = (narrow ? month : first).format("YYYY-MM-DD");
  const to = (narrow ? month.endOf("month") : last).format("YYYY-MM-DD");

  const { data, isLoading } = useQuery({
    queryKey: ["calendar", table, dateColumn.name, from, to, search, filters],
    queryFn: async () =>
      (
        await getTableData(table, {
          page: 1,
          limit: LIMIT,
          search: search || undefined,
          filters: [...filters, { field: dateColumn.name, op: "between", value: from, value2: to }],
          sort: dateColumn.name,
          order: "asc",
        })
      ).data as { data: RecordRow[]; total: number },
  });

  // a choice column (Status) colours the entries
  const colorBy = schema.columns.find((c) => c.type === "choice" && !c.multiple);
  const colorOf = (row: RecordRow) =>
    (colorBy && colorBy.options?.find((o) => o.label === row[colorBy.name])?.color) || "blue";

  const byDay = new Map<string, RecordRow[]>();
  for (const row of data?.data ?? []) {
    const day = String(row[dateColumn.name] ?? "").slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), row]);
  }
  const today = dayjs().format("YYYY-MM-DD");
  const newOn = (day: string) => `${newRecordPath(table)}?${encodeURIComponent(dateColumn.name)}=${day}`;
  const listOn = (day: string) =>
    `${tablePath(table)}?f=${encodeURIComponent(JSON.stringify([...filters, { field: dateColumn.name, op: "eq", value: day }]))}`;

  const entry = (row: RecordRow) => (
    <UnstyledButton
      key={row._id}
      onClick={(e) => {
        e.stopPropagation();
        navigate(recordPath(table, row._id));
      }}
      w="100%"
    >
      <Group gap={6} wrap="nowrap">
        <ColorSwatch color={`var(--mantine-color-${colorOf(row)}-filled)`} size={8} withShadow={false} style={{ flexShrink: 0 }} />
        <Text size="xs" truncate title={cardTitle(schema.columns, row)}>
          {cardTitle(schema.columns, row)}
        </Text>
      </Group>
    </UnstyledButton>
  );

  const header = (
    <Group justify="space-between" mb="sm">
      <Group gap="xs">
        <ActionIcon variant="default" aria-label="Previous month" onClick={() => setMonth((m) => m.subtract(1, "month"))}>
          <IconChevronLeft size={16} />
        </ActionIcon>
        <ActionIcon variant="default" aria-label="Next month" onClick={() => setMonth((m) => m.add(1, "month"))}>
          <IconChevronRight size={16} />
        </ActionIcon>
        <Text fw={600}>{month.format("MMMM YYYY")}</Text>
      </Group>
      <Group gap="xs">
        {(data?.total ?? 0) > LIMIT && (
          <Badge variant="light" color="yellow">
            Showing {LIMIT} of {data!.total}: filter to narrow it down
          </Badge>
        )}
        <Button size="xs" variant="default" onClick={() => setMonth(dayjs().startOf("month"))}>
          Today
        </Button>
      </Group>
    </Group>
  );

  if (narrow) {
    // phones: the month's days that have something, as a list
    const listed = [...byDay.keys()].sort();
    return (
      <Box>
        {header}
        {isLoading ? (
          <Skeleton h={120} />
        ) : listed.length ? (
          <Stack gap="sm">
            {listed.map((day) => (
              <Box key={day} p="sm" bg="var(--app-surface)" style={{ border: "1px solid var(--app-border)", borderRadius: "var(--mantine-radius-md)" }}>
                <Text size="sm" fw={600} mb={4} c={day === today ? "var(--mantine-primary-color-filled)" : undefined}>
                  {dayjs(day).format("ddd D MMM")}
                </Text>
                <Stack gap={4}>{byDay.get(day)!.map(entry)}</Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            Nothing in {month.format("MMMM")}.
          </Text>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {header}
      <SimpleGrid cols={7} spacing={0} style={{ border: "1px solid var(--app-border)", borderRadius: "var(--mantine-radius-lg)", overflow: "hidden" }}>
        {WEEKDAYS.map((d) => (
          <Text key={d} size="xs" fw={600} c="dimmed" tt="uppercase" p={6} bg="var(--app-muted)" style={{ borderBottom: "1px solid var(--app-border)" }}>
            {d}
          </Text>
        ))}
        {days.map((d) => {
          const day = d.format("YYYY-MM-DD");
          const rows = byDay.get(day) ?? [];
          const outside = d.month() !== month.month();
          return (
            <Box
              key={day}
              p={6}
              mih={104}
              bg={outside ? "var(--app-muted)" : "var(--app-surface)"}
              style={{
                borderRight: d.day() === 0 ? undefined : "1px solid var(--app-border)",
                borderBottom: "1px solid var(--app-border)",
                cursor: canCreate ? "copy" : undefined,
              }}
              onClick={() => canCreate && navigate(newOn(day))}
              aria-label={d.format("D MMMM")}
            >
              <Group justify="space-between" mb={4}>
                <Text
                  size="xs"
                  fw={day === today ? 700 : 500}
                  c={day === today ? "var(--mantine-primary-color-filled)" : outside ? "dimmed" : undefined}
                >
                  {d.date()}
                </Text>
                {isLoading && day === first.format("YYYY-MM-DD") && <Skeleton h={8} w={30} />}
              </Group>
              <Stack gap={2}>
                {rows.slice(0, SHOWN_PER_DAY).map(entry)}
                {rows.length > SHOWN_PER_DAY && (
                  <Tooltip label="Show them all in the list">
                    <Anchor component={Link} to={listOn(day)} size="xs" onClick={(e) => e.stopPropagation()}>
                      +{rows.length - SHOWN_PER_DAY} more
                    </Anchor>
                  </Tooltip>
                )}
              </Stack>
            </Box>
          );
        })}
      </SimpleGrid>
      {canCreate && (
        <Text size="xs" c="dimmed" mt={6}>
          Click a day to add a record on that date.
        </Text>
      )}
    </Box>
  );
}
