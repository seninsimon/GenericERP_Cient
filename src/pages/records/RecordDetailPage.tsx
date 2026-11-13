import { useMemo } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Drawer,
  Grid,
  Group,
  Menu,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconCopy, IconDots, IconHistory, IconPencil, IconTrash } from "@tabler/icons-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useDeleteRecord, useRecord } from "../../api/reactQueryHooks/useRecords";
import { useSchema, useTables } from "../../api/reactQueryHooks/useTables";
import { EMPTY, FieldValue } from "../../components/ui/FieldValue";
import { Page, PageHeader, Section } from "../../components/ui/Page";
import { confirmDanger } from "../../components/ui/confirm";
import { editRecordPath, newRecordPath, tablePath, tableTitle } from "../../layout/nav";
import { formatDateTime, formatRelative, isEmptyValue } from "../../lib/format";
import { RichTextView } from "../../features/records/fields/RichText";
import { RecordActivity } from "../../features/records/RecordActivity";
import { RelatedRecords } from "../../features/records/RelatedRecords";
import { RelationLinks } from "../../features/records/RelationLinks";
import { UserNames } from "../../features/records/UserNames";
import { DepartmentNames } from "../../features/records/DepartmentNames";
import { NoTableAccess, RecordNotFound } from "../../features/records/states";
import {
  columnLabel,
  FILE_TYPES,
  FULL_WIDTH_TYPES,
  httpStatus,
  recordTitle,
  type RecordColumn,
  type TableSchemaInfo,
} from "../../features/records/schema";
import { useAppCrumb } from "../../features/apps/appMenu";

function DetailValue({
  column,
  value,
  canOpenRef,
}: {
  column: RecordColumn;
  value: unknown;
  canOpenRef: boolean;
}) {
  if (column.type === "relation") return <RelationLinks column={column} value={value} canOpen={canOpenRef} />;
  if (column.type === "user") return <UserNames value={value} />;
  if (column.type === "department") return <DepartmentNames value={value} />;
  if (column.type === "richtext") {
    return typeof value === "string" && !isEmptyValue(value.replace(/<[^>]*>/g, "").trim()) ? (
      <RichTextView html={value} />
    ) : (
      EMPTY
    );
  }
  return (
    <Box fz="sm">
      <FieldValue column={column} value={value} variant="detail" />
    </Box>
  );
}

export default function RecordDetailPage() {
  const { table = "", id = "" } = useParams();
  const appCrumb = useAppCrumb(); // "HR & leave" when inside an app
  const navigate = useNavigate();
  const title = tableTitle(table);
  const listPath = tablePath(table);
  const wide = useMediaQuery("(min-width: 75em)");
  const [historyOpen, history] = useDisclosure(false);

  const schemaQuery = useSchema(table);
  const schema = schemaQuery.data as TableSchemaInfo | undefined;
  const recordQuery = useRecord(table, id);
  const record = recordQuery.data;
  const { data: tables = [] } = useTables();
  const deleteRecord = useDeleteRecord(table);

  const readableTables = useMemo(
    () => new Set((tables as { tableName: string }[]).map((t) => t.tableName)),
    [tables]
  );

  if (schemaQuery.isError && httpStatus(schemaQuery.error) === 404) return <NoTableAccess table={title} />;
  if (recordQuery.isError && httpStatus(recordQuery.error) === 404) {
    return <RecordNotFound table={title} title={title} listPath={listPath} />;
  }

  const columns = schema?.columns ?? [];
  const perms = schema?.permissions ?? {};
  const name = recordTitle(columns, record);
  const loading = !schema || !record;

  const duplicate = () => {
    if (!record) return;
    // files aren't copied: two records must never share an uploaded file
    const prefill = Object.fromEntries(
      columns.filter((c) => !FILE_TYPES.includes(c.type)).map((c) => [c.name, record[c.name]])
    );
    navigate(newRecordPath(table), { state: { prefill, departmentIds: record._departmentIds } });
  };

  const askDelete = () =>
    confirmDanger({
      title: "Delete record?",
      message: `"${name}" and its uploaded files will be permanently deleted. This can't be undone.`,
      confirmLabel: "Delete record",
      onConfirm: () => deleteRecord.mutateAsync(id).then(() => navigate(listPath)),
    });

  const updatedAt = record?._updatedAt as string | undefined;
  const createdAt = record?._createdAt as string | undefined;
  const createdBy = record?._createdBy as string | null | undefined;

  const activity = schema && record && (
    <RecordActivity table={table} recordId={id} columns={columns} />
  );

  return (
    <Page
      title={loading ? title : `${name} · ${title}`}
      breadcrumbs={[appCrumb, { label: title, to: listPath }, { label: loading ? "…" : name }]}
      width="wide"
    >
      <PageHeader
        title={loading ? <Skeleton h={28} w={220} /> : name}
        meta={
          record && (
            <>
              {/* "Visible to": only interesting when the table is shared with several departments */}
              {schema?.byDepartment === false ? null : record._departmentName && (schema?.departments?.length ?? 0) > 1 ? (
                <Tooltip label="Visible to">
                  <Group gap={4}>
                    {((record._departmentIds as string[] | undefined) ?? []).map((d) => (
                      <Badge key={d} variant="default">
                        {schema?.departments?.find((x) => x._id === d)?.name ?? "Deleted department"}
                      </Badge>
                    ))}
                  </Group>
                </Tooltip>
              ) : record._departmentId === null && schema?.departments?.length ? (
                <Tooltip label="Not in any department yet: only admins can see it">
                  <Badge variant="default" c="dimmed">
                    Admins only
                  </Badge>
                </Tooltip>
              ) : null}
              {updatedAt && (
                <Tooltip label={`Updated ${formatDateTime(updatedAt)}`}>
                  <Text size="sm" c="dimmed">
                    Updated {formatRelative(updatedAt)}
                  </Text>
                </Tooltip>
              )}
            </>
          )
        }
        actions={
          record && (
            <>
              {!wide && (
                <Button variant="default" leftSection={<IconHistory size={16} />} onClick={history.open}>
                  History
                </Button>
              )}
              {(perms.create || perms.delete) && (
                <Menu position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="default" size="lg" aria-label="More actions">
                      <IconDots size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {perms.create && (
                      <Menu.Item leftSection={<IconCopy size={16} />} onClick={duplicate}>
                        Duplicate
                      </Menu.Item>
                    )}
                    {perms.delete && (
                      <>
                        {perms.create && <Menu.Divider />}
                        <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={askDelete}>
                          Delete record
                        </Menu.Item>
                      </>
                    )}
                  </Menu.Dropdown>
                </Menu>
              )}
              {perms.edit && (
                <Button component={Link} to={editRecordPath(table, id)} leftSection={<IconPencil size={16} />}>
                  Edit
                </Button>
              )}
            </>
          )
        }
      />

      <Grid gutter="lg" align="flex-start">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="lg">
            <Section title="Details">
              {loading ? (
                <Grid gutter="lg">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Grid.Col key={i} span={{ base: 12, sm: 6 }}>
                      <Stack gap={6}>
                        <Skeleton h={10} w={80} />
                        <Skeleton h={16} w="70%" />
                      </Stack>
                    </Grid.Col>
                  ))}
                </Grid>
              ) : (
                // <dl> may only contain <div> groups of <dt>/<dd>, so this is a
                // plain CSS grid rather than Mantine Grid (which adds a wrapper div)
                <SimpleGrid component="dl" cols={{ base: 1, sm: 2 }} spacing="lg" verticalSpacing="lg" m={0}>
                  {columns.map((column) => (
                    <Box
                      key={column.name}
                      style={{ gridColumn: FULL_WIDTH_TYPES.includes(column.type) ? "1 / -1" : undefined, minWidth: 0 }}
                    >
                      <Text component="dt" size="xs" c="dimmed" fw={500} mb={4}>
                        {columnLabel(column)}
                      </Text>
                      <Box component="dd" m={0} style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                        <DetailValue
                          column={column}
                          value={record[column.name]}
                          canOpenRef={Boolean(column.ref && readableTables.has(column.ref))}
                        />
                      </Box>
                    </Box>
                  ))}
                </SimpleGrid>
              )}
              {createdAt && (
                <Text size="xs" c="dimmed" mt="lg" pt="md" style={{ borderTop: "1px solid var(--app-border)" }}>
                  Created {formatDateTime(createdAt)}
                  {createdBy ? ` by ${createdBy}` : ""}
                  {updatedAt && updatedAt !== createdAt ? ` · Last updated ${formatDateTime(updatedAt)}` : ""}
                </Text>
              )}
  </Section>
            {/* records elsewhere that link here: a project's tasks, a customer's orders */}
            {!loading && (
              <RelatedRecords table={table} recordId={id} recordName={name} departmentIds={(record._departmentIds as string[] | undefined) ?? []} />
            )}
          </Stack>
        </Grid.Col>

        {wide && (
          <Grid.Col span={4}>
            <Section title="Activity" padding="md">
              {activity ?? <Skeleton h={80} />}
            </Section>
          </Grid.Col>
        )}
      </Grid>

      {!wide && (
        <Drawer opened={historyOpen} onClose={history.close} title="Activity" size="md">
          {historyOpen && activity}
        </Drawer>
      )}
    </Page>
  );
}
