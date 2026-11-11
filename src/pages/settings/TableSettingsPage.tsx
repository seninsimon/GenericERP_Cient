import { AutomationsSection } from "./AutomationsSection";
import type { RecordColumn } from "../../features/records/schema";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  MultiSelect,
  Select,
  Skeleton,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconEdit,
  IconInfoCircle,
  IconLink,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { assignUnassignedRecords, deleteTable, errorMessage } from "../../api/api";
import { useDepartments } from "../../api/reactQueryHooks/useAdmin";
import { useDeleteColumn, useSchema, useUpdateTableSettings } from "../../api/reactQueryHooks/useTables";
import { DataTable, type DataTableColumn } from "../../components/data-table";
import { confirmDanger } from "../../components/ui/confirm";
import { EmptyState } from "../../components/ui/EmptyState";
import { Page, PageHeader, Section } from "../../components/ui/Page";
import { tablePath, tableTitle } from "../../layout/nav";
import { pluralize } from "../../lib/format";
import { ColumnModal, type SchemaColumn } from "./ColumnModal";
import { columnTypeInfo } from "./columnTypes";

type Schema = {
  tableName: string;
  columns: SchemaColumn[];
  showInMenu: boolean;
  departments: { _id: string; name: string }[];
  unassignedCount?: number;
};

/* ---------------- access ---------------- */

function AccessSection({ schema }: { schema: Schema }) {
  const qc = useQueryClient();
  const { data: departments = [] } = useDepartments();
  const save = useUpdateTableSettings();
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [showInMenu, setShowInMenu] = useState(true);
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setDepartmentIds(schema.departments.map((d) => d._id));
    setShowInMenu(schema.showInMenu !== false);
  }, [schema]);

  const dirty =
    showInMenu !== (schema.showInMenu !== false) ||
    [...departmentIds].sort().join() !== schema.departments.map((d) => d._id).sort().join();

  const assign = async () => {
    if (!assignTo) return;
    setAssigning(true);
    try {
      const { data } = await assignUnassignedRecords(schema.tableName, assignTo);
      notifications.show({ title: "Records assigned", message: data.message, color: "green" });
      setAssignTo(null);
      qc.invalidateQueries({ queryKey: ["schema", schema.tableName] });
      qc.invalidateQueries({ queryKey: ["tableData", schema.tableName] });
    } catch (err) {
      notifications.show({ title: "Couldn't assign records", message: errorMessage(err), color: "red" });
    } finally {
      setAssigning(false);
    }
  };

  const unassigned = schema.unassignedCount ?? 0;

  return (
    <Section
      title="Access"
      description="People see this table only if their role allows it and they belong to one of its departments. They only see records of their own departments."
      actions={
        <Button
          disabled={!dirty}
          loading={save.isPending}
          onClick={() => save.mutate({ table: schema.tableName, data: { showInMenu, departmentIds } })}
        >
          Save access
        </Button>
      }
    >
      <Stack gap="md">
        <MultiSelect
          label="Departments"
          description={
            departments.length
              ? "Leave empty to keep the table for admins only."
              : "There are no departments yet. Create them under Administration → Departments."
          }
          placeholder={departmentIds.length ? undefined : "Admins only"}
          data={departments.map((d) => ({ value: d._id, label: d.name }))}
          value={departmentIds}
          onChange={setDepartmentIds}
          searchable
          clearable
        />
        {!departmentIds.length && (
          <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />} p="sm">
            <Text size="sm">With no department, only admins can see and use this table.</Text>
          </Alert>
        )}
        <Switch
          label="Show in the sidebar"
          description="Hidden tables still work in links, relations and the command palette."
          checked={showInMenu}
          onChange={(e) => setShowInMenu(e.currentTarget.checked)}
        />

        {unassigned > 0 && (
          <Alert
            color="yellow"
            icon={<IconInfoCircle size={16} />}
            title={`${pluralize(unassigned, "record")} visible to admins only`}
          >
            <Text size="sm" mb="sm">
              They aren't in any department yet. Move them all into one of this table's departments.
            </Text>
            {schema.departments.length ? (
              <Group gap="xs" align="flex-end" wrap="wrap">
                <Select
                  aria-label="Department for admins-only records"
                  placeholder="Choose a department"
                  data={schema.departments.map((d) => ({ value: d._id, label: d.name }))}
                  value={assignTo}
                  onChange={setAssignTo}
                  w={220}
                />
                <Button
                  color="yellow"
                  disabled={!assignTo}
                  loading={assigning}
                  onClick={() =>
                    confirmDanger({
                      title: "Move records",
                      message: `Move ${pluralize(unassigned, "admins-only record")} into ${
                        schema.departments.find((d) => d._id === assignTo)?.name
                      }?`,
                      confirmLabel: "Move records",
                      onConfirm: assign,
                    })
                  }
                >
                  Assign
                </Button>
              </Group>
            ) : (
              <Text size="xs" c="dimmed">
                Save at least one department for this table first.
              </Text>
            )}
          </Alert>
        )}
      </Stack>
    </Section>
  );
}

/* ---------------- columns ---------------- */

function ColumnsSection({ schema }: { schema: Schema }) {
  const remove = useDeleteColumn(schema.tableName);
  const [modal, setModal] = useState<{ column: SchemaColumn | null } | null>(null);

  const columns = useMemo<DataTableColumn<SchemaColumn>[]>(
    () => [
      {
        id: "label",
        header: "Column",
        hideable: false,
        mobile: "title",
        width: 200,
        accessor: (c) => c.label || c.name,
        cell: (c) => (
          <div style={{ minWidth: 0 }}>
            <Text size="sm" fw={500} truncate>
              {c.label || c.name}
            </Text>
            <Text size="xs" c="dimmed" ff="monospace" truncate>
              {c.name}
            </Text>
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        width: 150,
        mobile: "subtitle",
        accessor: (c) => columnTypeInfo(c.type).label,
        cell: (c) => {
          const info = columnTypeInfo(c.type);
          return (
            <Group gap={8} wrap="nowrap">
              <ThemeIcon variant="light" color="gray" size={24} radius="sm" aria-hidden>
                <info.icon size={14} stroke={1.75} />
              </ThemeIcon>
              <Text size="sm">{info.label}</Text>
            </Group>
          );
        },
      },
      {
        id: "options",
        header: "Options",
        width: 220,
        accessor: (c) =>
          [c.required && "Required", c.indexed && "Indexed", c.showInTable === false && "Hidden", c.multiple && "Multiple"]
            .filter(Boolean)
            .join(" "),
        cell: (c) => {
          const badges = [
            c.required && <Badge key="r" color="red">Required</Badge>,
            c.indexed && <Badge key="i" color="blue">Indexed</Badge>,
            c.showInTable === false && <Badge key="h" color="gray">Hidden in list</Badge>,
            c.multiple && <Badge key="m" color="violet">Multiple</Badge>,
          ].filter(Boolean);
          return badges.length ? (
            <Group gap={4} wrap="nowrap">
              {badges}
            </Group>
          ) : (
            <Text span c="dimmed">
              —
            </Text>
          );
        },
      },
      {
        id: "ref",
        header: "Links to",
        width: 160,
        accessor: (c) => (c.type === "relation" ? tableTitle(c.ref ?? "") : ""),
        cell: (c) =>
          c.type === "relation" && c.ref ? (
            <Group gap={4} wrap="nowrap">
              <IconLink size={14} opacity={0.6} aria-hidden />
              <Text size="sm" truncate>
                {tableTitle(c.ref)}
              </Text>
            </Group>
          ) : (
            <Text span c="dimmed">
              —
            </Text>
          ),
      },
    ],
    []
  );

  const askDelete = (c: SchemaColumn) =>
    confirmDanger({
      title: "Delete column",
      message: `Delete "${c.label || c.name}"? It disappears from forms, lists and exports. Values already stored stay in the records but are no longer shown.`,
      confirmLabel: "Delete column",
      onConfirm: async () => {
        await remove.mutateAsync(c.name);
      },
    });

  return (
    <Section
      title="Columns"
      description="The fields every record of this table has, in form order."
      actions={
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModal({ column: null })}>
          Add column
        </Button>
      }
      padding={0}
    >
      <DataTable
        label="Columns"
        data={schema.columns}
        columns={columns}
        getRowId={(c) => c.name}
        searchPlaceholder="Search columns…"
        storageKey="settings:columns"
        maxHeight="none"
        onRowClick={(c) => setModal({ column: c })}
        rowActions={(c) => (
          <>
            <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => setModal({ column: c })}>
              Edit
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => askDelete(c)}>
              Delete
            </Menu.Item>
          </>
        )}
        emptyState={(filtered) =>
          filtered ? (
            <EmptyState compact title="No matching columns" />
          ) : (
            <EmptyState
              compact
              title="No columns yet"
              description="Add the fields this table's records should have."
              action={
                <Button leftSection={<IconPlus size={16} />} onClick={() => setModal({ column: null })}>
                  Add column
                </Button>
              }
            />
          )
        }
      />
      <ColumnModal
        opened={modal !== null}
        onClose={() => setModal(null)}
        table={schema.tableName}
        column={modal?.column}
        existingNames={schema.columns.map((c) => c.name)}
      />
    </Section>
  );
}

/* ---------------- danger zone ---------------- */

function DeleteTableModal({ table, opened, onClose }: { table: string; opened: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fullScreen = useMediaQuery("(max-width: 36em)");
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const close = () => {
    setTyped("");
    onClose();
  };

  const confirm = async () => {
    setDeleting(true);
    try {
      const { data } = await deleteTable(table);
      notifications.show({ title: "Table deleted", message: data.message, color: "green" });
      qc.removeQueries({ queryKey: ["schema", table] });
      qc.removeQueries({ queryKey: ["tableData", table] });
      qc.invalidateQueries({ queryKey: ["tables"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
      close();
      navigate("/settings/tables");
    } catch (err) {
      notifications.show({ title: "Couldn't delete the table", message: errorMessage(err), color: "red" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title={`Delete "${tableTitle(table)}"`} fullScreen={fullScreen}>
      <Stack>
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>
          This permanently deletes the table, <b>all of its records</b> and their uploaded files. Role permissions and
          department assignments for it are removed too. This can't be undone.
        </Alert>
        <TextInput
          label={
            <>
              Type <b>{table}</b> to confirm
            </>
          }
          value={typed}
          onChange={(e) => setTyped(e.currentTarget.value)}
          autoComplete="off"
          data-autofocus
        />
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button color="red" disabled={typed !== table} loading={deleting} onClick={confirm}>
            Delete table
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/* ---------------- page ---------------- */

// Administration → Tables & columns → one table
export default function TableSettingsPage() {
  const { table = "" } = useParams();
  const { data, isLoading, error } = useSchema(table);
  const [deleting, setDeleting] = useState(false);
  const schema = data as Schema | undefined;
  const title = tableTitle(table);

  const crumbs = [
    { label: "Administration" },
    { label: "Tables & columns", to: "/settings/tables" },
    { label: title },
  ];

  if (isLoading) {
    return (
      <Page title={title} breadcrumbs={crumbs} width="wide">
        <Skeleton h={36} w={240} mb="lg" />
        <Stack gap="lg">
          <Skeleton h={180} radius="lg" />
          <Skeleton h={260} radius="lg" />
        </Stack>
      </Page>
    );
  }

  if (error || !schema) {
    return (
      <Page title="Table not found" breadcrumbs={crumbs} width="wide">
        <EmptyState
          title="Table not found"
          description="It may have been deleted or renamed."
          action={
            <Button component={Link} to="/settings/tables" variant="default">
              Back to tables
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <Page title={`${title} settings`} breadcrumbs={crumbs} width="wide">
      <PageHeader
        title={title}
        description={
          <>
            <Text span ff="monospace" inherit>
              {schema.tableName}
            </Text>{" "}
            · {pluralize(schema.columns.length, "column")}
          </>
        }
        meta={
          schema.departments.length ? undefined : (
            <Badge color="yellow" leftSection={<IconAlertTriangle size={12} />}>
              Admins only
            </Badge>
          )
        }
        actions={
          <Button
            component={Link}
            to={tablePath(schema.tableName)}
            variant="default"
            rightSection={<IconArrowUpRight size={16} />}
          >
            Open table
          </Button>
        }
      />

      <Stack gap="lg">
        <AccessSection schema={schema} />
        <ColumnsSection schema={schema} />
        <AutomationsSection table={schema.tableName} columns={schema.columns as RecordColumn[]} />
        <Section danger title="Danger zone">
          <Group justify="space-between" wrap="wrap" gap="md">
            <div style={{ flex: "1 1 280px" }}>
              <Text size="sm" fw={600}>
                Delete this table
              </Text>
              <Text size="sm" c="dimmed">
                Removes the table, all its records and uploaded files. Not possible while other tables link to it.
              </Text>
            </div>
            <Button color="red" variant="light" leftSection={<IconTrash size={16} />} onClick={() => setDeleting(true)}>
              Delete table
            </Button>
          </Group>
        </Section>
      </Stack>

      <DeleteTableModal table={schema.tableName} opened={deleting} onClose={() => setDeleting(false)} />
    </Page>
  );
}
