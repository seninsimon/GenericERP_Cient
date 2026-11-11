import { Anchor, Badge, Button, Group, Skeleton, Stack, Table, Text } from "@mantine/core";
import { IconArrowRight, IconPlus } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import { useQueries } from "@tanstack/react-query";
import { Fragment, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getTableData } from "../../api/api";
import { useTables } from "../../api/reactQueryHooks/useTables";
import { FieldValue } from "../../components/ui/FieldValue";
import { Section } from "../../components/ui/Page";
import { newRecordPath, recordPath, tablePath, tableTitle } from "../../layout/nav";
import { pluralize } from "../../lib/format";
import { columnLabel, FILE_TYPES, primaryColumn, type RecordColumn, type RecordRow, type TableSchemaInfo } from "./schema";

const SHOWN = 5;
// columns that don't fit a compact row
const SKIP_TYPES = [...FILE_TYPES, "richtext", "textarea"];

type Group = { schema: TableSchemaInfo; column: RecordColumn; title: string; via: string | null };

// Records in other tables that link to this one: a project's tasks, a
// customer's orders. Worked out from the tables the user can see (their
// "Link to table" columns), and loaded through the normal list, so the
// user's departments and "Own only" apply. Empty groups share one line.
export function RelatedRecords({ table, recordId, recordName }: { table: string; recordId: string; recordName: string }) {
  const navigate = useNavigate();
  const { data: tables = [] } = useTables();
  // phones: the name and one more column, no sideways scrolling
  const narrow = useMediaQuery("(max-width: 36em)");

  const groups = useMemo<Group[]>(() => {
    const list = (tables as TableSchemaInfo[]).flatMap((schema) =>
      schema.columns
        .filter((c) => c.type === "relation" && c.ref === table)
        .map((column) => ({ schema, column }))
    );
    return list.map(({ schema, column }) => {
      // name the link when it isn't obvious: two links from one table, or a
      // table linking to itself (sub-tasks)
      const ambiguous = schema.tableName === table || list.filter((g) => g.schema === schema).length > 1;
      return { schema, column, title: tableTitle(schema.tableName), via: ambiguous ? columnLabel(column) : null };
    });
  }, [tables, table]);

  const filterFor = (g: Group) => [{ field: g.column.name, op: "in", value: [recordId] }];
  const results = useQueries({
    queries: groups.map((g) => ({
      queryKey: ["related", g.schema.tableName, g.column.name, recordId],
      queryFn: async () =>
        // lines (edited inside this record) in their order; other records newest first
        (await getTableData(g.schema.tableName, { page: 1, limit: SHOWN, filters: filterFor(g), sort: "_createdAt", order: g.column.inline ? "asc" : "desc" }))
          .data as { data: RecordRow[]; total: number; totalIsEstimate?: boolean },
      staleTime: 30_000,
    })),
  });

  if (!groups.length) return null;

  const viewAll = (g: Group) =>
    `${tablePath(g.schema.tableName)}?f=${encodeURIComponent(
      JSON.stringify([{ ...filterFor(g)[0], labels: [recordName] }])
    )}`;
  const addLink = (g: Group) => `${newRecordPath(g.schema.tableName)}?${encodeURIComponent(g.column.name)}=${encodeURIComponent(recordId)}`;
  const canAdd = (g: Group) => Boolean(g.schema.permissions?.create);
  const name = (g: Group) => (g.via ? `${g.title} (${g.via})` : g.title);

  const empty = groups.filter((_, i) => results[i].data && results[i].data!.total === 0);

  return (
    <Stack gap="lg">
      {groups.map((g, i) => {
        const result = results[i];
        if (result.data && result.data.total === 0) return null;
        if (result.isError) return null;
        const rows = result.data?.data ?? [];
        const total = result.data?.total ?? 0;
        const primary = primaryColumn(g.schema.columns);
        const others = g.schema.columns
          .filter((c) => c !== primary && c !== g.column && c.showInTable !== false && !SKIP_TYPES.includes(c.type))
          .slice(0, narrow ? 1 : 3);
        const cols = primary ? [primary, ...others] : others;

        return (
          <Section
            key={`${g.schema.tableName}.${g.column.name}`}
            padding={0}
            title={
              <Group gap="xs">
                {name(g)}
                {result.data && (
                  <Badge variant="default" className="tabular-nums">
                    {result.data.totalIsEstimate ? "~" : ""}
                    {total.toLocaleString()}
                  </Badge>
                )}
              </Group>
            }
            actions={
              <Group gap="xs">
                {canAdd(g) && (
                  <Button size="xs" variant="default" leftSection={<IconPlus size={14} />} component={Link} to={addLink(g)}>
                    Add
                  </Button>
                )}
                <Button size="xs" variant="subtle" rightSection={<IconArrowRight size={14} />} component={Link} to={viewAll(g)}>
                  View all
                </Button>
              </Group>
            }
          >
            {result.isLoading ? (
              <Stack p="md" gap="xs">
                <Skeleton h={14} />
                <Skeleton h={14} />
              </Stack>
            ) : (
              <Table.ScrollContainer minWidth={narrow ? 0 : 420}>
                <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="md" aria-label={name(g)}>
                  <Table.Thead>
                    <Table.Tr>
                      {cols.map((c) => (
                        <Table.Th key={c.name}>
                          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {columnLabel(c)}
                          </Text>
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.map((row) => (
                      <Table.Tr
                        key={row._id}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(recordPath(g.schema.tableName, row._id))}
                      >
                        {cols.map((c, ci) => (
                          <Table.Td key={c.name} fz="sm">
                            {ci === 0 ? (
                              <Anchor
                                component={Link}
                                to={recordPath(g.schema.tableName, row._id)}
                                fw={500}
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FieldValue column={c} value={row[c.name]} />
                              </Anchor>
                            ) : (
                              <FieldValue column={c} value={row[c.name]} />
                            )}
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                {total > rows.length && (
                  <Text size="xs" c="dimmed" px="md" py="xs" style={{ borderTop: "1px solid var(--app-border)" }}>
                    Showing {g.column.inline ? "the first" : "the latest"} {rows.length} of {pluralize(total, "record")}.{" "}
                    <Anchor component={Link} to={viewAll(g)} size="xs">
                      View all
                    </Anchor>
                  </Text>
                )}
              </Table.ScrollContainer>
            )}
          </Section>
        );
      })}

      {empty.length > 0 && (
        <Text size="sm" c="dimmed">
          Nothing linked yet in{" "}
          {empty.map((g, i) => (
            <Fragment key={`${g.schema.tableName}.${g.column.name}`}>
              {i > 0 && (i === empty.length - 1 ? " or " : ", ")}
              <Text span fw={500} c="var(--mantine-color-text)">
                {name(g)}
              </Text>
              {canAdd(g) && (
                <>
                  {" "}
                  (
                  <Anchor component={Link} to={addLink(g)} size="sm">
                    add
                  </Anchor>
                  )
                </>
              )}
            </Fragment>
          ))}
          .
        </Text>
      )}
    </Stack>
  );
}
