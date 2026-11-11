import { useState } from "react";
import { ActionIcon, Badge, Box, ColorSwatch, Group, Menu, ScrollArea, Skeleton, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowsMove, IconDots, IconLock, IconPlus } from "@tabler/icons-react";
import { useCurrentUser } from "../../auth/AuthContext";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { errorMessage, getTableData, updateData, type ListFilter } from "../../api/api";
import { FieldValue } from "../../components/ui/FieldValue";
import { newRecordPath, recordPath } from "../../layout/nav";
import { canChoose, cardTitle, columnLabel, FILE_TYPES, primaryColumn, type RecordColumn, type RecordRow, type TableSchemaInfo } from "./schema";

const PER_LANE = 50;
const EMPTY = "__empty__";

// A board: one lane per option of a choice column (Status), a card per
// record. Drag a card to another lane (or use "Move to") to change it.
export function BoardView({
  table,
  schema,
  groupBy,
  search,
  filters,
}: {
  table: string;
  schema: TableSchemaInfo;
  groupBy: RecordColumn;
  search: string;
  filters: ListFilter[];
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canEdit = Boolean(schema.permissions?.edit);
  const canCreate = Boolean(schema.permissions?.create);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  const lanes = [...(groupBy.options ?? []).map((o) => ({ key: o.label, label: o.label, color: o.color })), { key: EMPTY, label: "No value", color: "gray" }];
  // approval steps: lanes this user may not move cards into
  const { user } = useCurrentUser();
  const allowed = (key: string) => {
    const option = groupBy.options?.find((o) => o.label === key);
    return !option || canChoose(option, user);
  };
  const laneFilter = (key: string): ListFilter =>
    key === EMPTY ? { field: groupBy.name, op: "isEmpty" } : { field: groupBy.name, op: "in", value: [key] };
  const results = useQueries({
    queries: lanes.map((lane) => ({
      queryKey: ["board", table, groupBy.name, lane.key, search, filters],
      queryFn: async () =>
        (
          await getTableData(table, {
            page: 1,
            limit: PER_LANE,
            search: search || undefined,
            filters: [...filters, laneFilter(lane.key)],
            sort: "_updatedAt",
            order: "desc",
          })
        ).data as { data: RecordRow[]; total: number; totalIsEstimate?: boolean },
    })),
  });

  const primary = primaryColumn(schema.columns);
  const details = schema.columns
    .filter(
      (c) =>
        c !== primary &&
        c !== groupBy &&
        c.type !== "relation" &&
        c.showInTable !== false &&
        !FILE_TYPES.includes(c.type) &&
        !["richtext", "textarea"].includes(c.type)
    )
    .slice(0, 3);

  const move = async (id: string, to: string, from: string) => {
    if (to === from) return;
    setMoving(id);
    try {
      await updateData(table, id, { [groupBy.name]: to === EMPTY ? null : to });
      await qc.invalidateQueries({ queryKey: ["board", table] });
      void qc.invalidateQueries({ queryKey: ["tableData", table] });
    } catch (err) {
      notifications.show({ title: "Couldn't move it", message: errorMessage(err), color: "red" });
    } finally {
      setMoving(null);
    }
  };

  // the "No value" lane only when something is in it
  const visible = lanes.map((lane, i) => ({ lane, result: results[i] })).filter(({ lane, result }) => lane.key !== EMPTY || (result.data?.total ?? 0) > 0);

  return (
    <ScrollArea type="auto" offsetScrollbars>
      <Group align="flex-start" gap="md" wrap="nowrap" pb="sm">
        {visible.map(({ lane, result }) => {
          const rows = result.data?.data ?? [];
          const total = result.data?.total ?? 0;
          return (
            <Box
              key={lane.key}
              w={290}
              miw={290}
              p="xs"
              bg={dragOver === lane.key ? "var(--mantine-primary-color-light)" : "var(--app-muted)"}
              style={{ borderRadius: "var(--mantine-radius-lg)", border: "1px solid var(--app-border)", transition: "background-color 120ms" }}
              onDragOver={(e) => {
                if (!canEdit || !allowed(lane.key)) return;
                e.preventDefault();
                setDragOver(lane.key);
              }}
              onDragLeave={() => setDragOver((k) => (k === lane.key ? null : k))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const [id, from] = e.dataTransfer.getData("text/plain").split("|");
                if (id) void move(id, lane.key, from);
              }}
              aria-label={`${lane.label}: ${total}`}
              role="region"
            >
              <Group justify="space-between" mb="xs" px={4} wrap="nowrap">
                <Group gap={8} wrap="nowrap">
                  <ColorSwatch color={`var(--mantine-color-${lane.color}-filled)`} size={10} withShadow={false} />
                  <Text fw={600} size="sm" truncate>
                    {lane.label}
                  </Text>
                  <Badge variant="default" size="sm" className="tabular-nums">
                    {result.data?.totalIsEstimate ? "~" : ""}
                    {total}
                  </Badge>
                </Group>
                {canCreate && lane.key !== EMPTY && (
                  <Tooltip label={`New record in ${lane.label}`}>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      component={Link}
                      to={`${newRecordPath(table)}?${encodeURIComponent(groupBy.name)}=${encodeURIComponent(lane.key)}`}
                      aria-label={`New record in ${lane.label}`}
                    >
                      <IconPlus size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
              <Stack gap={8} mih={60}>
                {result.isLoading && <Skeleton h={64} radius="md" />}
                {rows.map((row) => (
                  <Box
                    key={row._id}
                    draggable={canEdit}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", `${row._id}|${lane.key}`)}
                    bg="var(--app-surface)"
                    p="sm"
                    style={{
                      border: "1px solid var(--app-border)",
                      borderRadius: "var(--mantine-radius-md)",
                      cursor: canEdit ? "grab" : "pointer",
                      opacity: moving === row._id ? 0.5 : 1,
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap" align="flex-start" gap={4}>
                      <UnstyledButton onClick={() => navigate(recordPath(table, row._id))} style={{ minWidth: 0, flex: 1 }}>
                        <Text size="sm" fw={500} lineClamp={2}>
                          {cardTitle(schema.columns, row)}
                        </Text>
                      </UnstyledButton>
                      {canEdit && (
                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Move to">
                              <IconDots size={14} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Label>
                              <Group gap={4}>
                                <IconArrowsMove size={12} /> Move to
                              </Group>
                            </Menu.Label>
                            {lanes
                              .filter((l) => l.key !== lane.key)
                              .map((l) => (
                                <Menu.Item
                                  key={l.key}
                                  onClick={() => void move(row._id, l.key, lane.key)}
                                  disabled={!allowed(l.key)}
                                  rightSection={allowed(l.key) ? undefined : <IconLock size={12} />}
                                >
                                  {l.label}
                                </Menu.Item>
                              ))}
                          </Menu.Dropdown>
                        </Menu>
                      )}
                    </Group>
                    {details.length > 0 && (
                      <Stack gap={2} mt={6}>
                        {details.map((c) =>
                          row[c.name] === null || row[c.name] === undefined || row[c.name] === "" ? null : (
                            <Group key={c.name} gap={6} wrap="nowrap">
                              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                                {columnLabel(c)}
                              </Text>
                              <Box fz="xs" style={{ minWidth: 0 }}>
                                <FieldValue column={c} value={row[c.name]} />
                              </Box>
                            </Group>
                          )
                        )}
                      </Stack>
                    )}
                  </Box>
                ))}
                {!result.isLoading && !rows.length && (
                  <Text size="xs" c="dimmed" ta="center" py="sm">
                    {canEdit ? "Drop a card here" : "Nothing here"}
                  </Text>
                )}
                {total > rows.length && (
                  <Text size="xs" c="dimmed" ta="center">
                    Showing {rows.length} of {total}. Filter or search to narrow it down.
                  </Text>
                )}
              </Stack>
            </Box>
          );
        })}
      </Group>
    </ScrollArea>
  );
}
