import { ActionIcon, Button, Group, Skeleton, Table, Text, Tooltip } from "@mantine/core";
import { IconPlus, IconX } from "@tabler/icons-react";

import { FieldValue } from "../../components/ui/FieldValue";
import { tableTitle } from "../../layout/nav";
import { CompactFields } from "./fields/compact";
import { FieldInput } from "./fields/FieldInput";
import type { LineGroup, LineItems } from "./lineItems";
import { columnLabel, SERVER_TYPES, valueType } from "./schema";

// The lines of one table inside the record's form: one row per line, an
// input per column, worked-out values (amounts, totals) read-only.
export function LineItemsGrid({
  group,
  items,
  live,
}: {
  group: LineGroup;
  items: LineItems;
  // worked-out values (amounts) per line, from the form's live preview
  live?: Map<string, Record<string, unknown>>;
}) {
  const { table, columns, lines } = group;
  if (group.loading) return <Skeleton h={80} />;

  return (
    <>
      {lines.length > 0 ? (
        <Table.ScrollContainer minWidth={Math.max(480, columns.length * 150 + 48)}>
          <Table verticalSpacing={6} horizontalSpacing="xs" aria-label={tableTitle(table)} style={{ tableLayout: "fixed" }}>
            <Table.Thead>
              <Table.Tr>
                {columns.map((c) => (
                  <Table.Th key={c.name} style={{ textAlign: valueType(c) === "number" ? "right" : undefined }}>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      {columnLabel(c)}
                      {c.required && !SERVER_TYPES.includes(c.type) ? " *" : ""}
                    </Text>
                  </Table.Th>
                ))}
                <Table.Th w={40} aria-label="Remove" />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <CompactFields.Provider value>
                {lines.map((line, i) => {
                  const readOnly = Boolean(line._id) && !group.canEdit;
                  return (
                    <Table.Tr key={line.key}>
                      {columns.map((c) => (
                        <Table.Td key={c.name} style={{ verticalAlign: "top" }}>
                          {SERVER_TYPES.includes(c.type) || readOnly ? (
                            // amounts and totals are worked out when saved
                            <Text size="sm" ta={valueType(c) === "number" ? "right" : undefined} pt={6} className="tabular-nums">
                              {(() => {
                                const v = live?.get(line.key)?.[c.name] ?? (line._id ? line.values[c.name] : undefined);
                                return v === undefined ? <Text span c="dimmed">—</Text> : <FieldValue column={c} value={v} />;
                              })()}
                            </Text>
                          ) : (
                            <FieldInput
                              id={`line-${table}-${line.key}-${c.name}`}
                              column={c}
                              value={line.values[c.name]}
                              onChange={(v) => items.update(table, line.key, c.name, v)}
                              error={items.errorFor(table, line.key, c.name)}
                            />
                          )}
                        </Table.Td>
                      ))}
                      <Table.Td style={{ verticalAlign: "top" }}>
                        {(!line._id || group.canDelete) && (
                          <Tooltip label="Remove line">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              mt={2}
                              aria-label={`Remove line ${i + 1}`}
                              onClick={() => items.remove(table, line.key)}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </CompactFields.Provider>
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      ) : (
        <Text size="sm" c="dimmed" px="md" py="sm">
          No lines yet.
        </Text>
      )}
      {group.canAdd && (
        <Group px="md" py="sm" style={{ borderTop: lines.length ? "1px solid var(--app-border)" : undefined }}>
          <Button size="xs" variant="default" leftSection={<IconPlus size={14} />} onClick={() => items.add(table)}>
            Add line
          </Button>
        </Group>
      )}
    </>
  );
}
