import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Menu,
  Modal,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconEdit, IconInfoCircle, IconPlus, IconShieldLock, IconTrash } from "@tabler/icons-react";

import { errorMessage } from "../../api/api";
import {
  useCreateRole,
  useDeleteRole,
  useRoles,
  useUpdateRole,
  type PermissionMap,
  type Role,
  type TablePermission,
} from "../../api/reactQueryHooks/useAdmin";
import { useTables } from "../../api/reactQueryHooks/useTables";
import { DataTable, type DataTableColumn } from "../../components/data-table";
import { confirmDanger } from "../../components/ui/confirm";
import { EmptyState } from "../../components/ui/EmptyState";
import { Page, PageHeader } from "../../components/ui/Page";
import { tableTitle } from "../../layout/nav";
import { pluralize } from "../../lib/format";
import classes from "./settings.module.css";

const ACTIONS = ["view", "create", "edit", "delete"] as const;
type Action = (typeof ACTIONS)[number];
const ACTION_LABELS: Record<Action, string> = { view: "View", create: "Create", edit: "Edit", delete: "Delete" };

const NONE: TablePermission = { view: false, create: false, edit: false, delete: false };
const ALL: TablePermission = { view: true, create: true, edit: true, delete: true };

const OWN_HELP =
  "Only records they created, or where they're picked in a User column (e.g. Employee, Assigned to). Leave it off to see the whole department's records.";

// One change: write actions imply view; removing view clears everything.
const toggle = (perm: TablePermission, action: Action, checked: boolean): TablePermission => {
  if (action === "view") return checked ? { ...perm, view: true } : { ...NONE };
  const next = { ...perm, [action]: checked };
  if (checked) next.view = true;
  return next;
};

/* ---------------- permission matrix ---------------- */

function PermissionMatrix({
  tables,
  value,
  onChange,
}: {
  tables: string[];
  value: PermissionMap;
  onChange: (next: PermissionMap) => void;
}) {
  const isPhone = useMediaQuery("(max-width: 36em)");
  const get = (table: string) => value[table] ?? NONE;

  const setTable = (table: string, perm: TablePermission) => {
    const next = { ...value };
    if (perm.view) next[table] = perm;
    else delete next[table];
    onChange(next);
  };

  const columnState = (action: Action) => {
    const count = tables.filter((t) => get(t)[action]).length;
    return { all: tables.length > 0 && count === tables.length, some: count > 0 && count < tables.length };
  };

  const setColumn = (action: Action, checked: boolean) => {
    const next: PermissionMap = {};
    for (const table of tables) {
      const perm = toggle(get(table), action, checked);
      if (perm.view) next[table] = perm;
    }
    onChange(next);
  };

  if (!tables.length) {
    return (
      <Text size="sm" c="dimmed">
        No tables yet. Create tables under Administration → Tables & columns first.
      </Text>
    );
  }

  // phones: one card per table with four switches
  if (isPhone) {
    return (
      <Stack gap="xs">
        {tables.map((table) => {
          const perm = get(table);
          return (
            <div key={table} className={classes.permCard}>
              <Text size="sm" fw={600} mb="xs">
                {tableTitle(table)}
              </Text>
              <SimpleGrid cols={2} spacing="xs">
                {ACTIONS.map((action) => (
                  <Switch
                    key={action}
                    size="sm"
                    label={ACTION_LABELS[action]}
                    checked={perm[action]}
                    onChange={(e) => setTable(table, toggle(perm, action, e.currentTarget.checked))}
                  />
                ))}
              </SimpleGrid>
              <Switch
                size="sm"
                mt="xs"
                label="Own records only"
                description={OWN_HELP}
                disabled={!perm.view}
                checked={Boolean(perm.own)}
                onChange={(e) => setTable(table, { ...perm, own: e.currentTarget.checked })}
              />
            </div>
          );
        })}
      </Stack>
    );
  }

  return (
    <ScrollArea.Autosize mah={380} type="auto">
      <Table className={classes.matrix} withTableBorder verticalSpacing={6} stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Table</Table.Th>
            {ACTIONS.map((action) => {
              const state = columnState(action);
              return (
                <Table.Th key={action} w={90}>
                  <Stack gap={4} align="center">
                    <Text size="xs" fw={600}>
                      {ACTION_LABELS[action]}
                    </Text>
                    <Checkbox
                      size="xs"
                      checked={state.all}
                      indeterminate={state.some}
                      onChange={(e) => setColumn(action, e.currentTarget.checked)}
                      aria-label={`${ACTION_LABELS[action]} in all tables`}
                    />
                  </Stack>
                </Table.Th>
              );
            })}
            <Table.Th w={90}>
              <Tooltip label={OWN_HELP} multiline w={260} withArrow>
                <Group gap={4} justify="center" wrap="nowrap" style={{ cursor: "help" }}>
                  <Text size="xs" fw={600}>
                    Own only
                  </Text>
                  <IconInfoCircle size={13} aria-hidden />
                </Group>
              </Tooltip>
            </Table.Th>
            <Table.Th w={70}>
              <Text size="xs" fw={600}>
                All
              </Text>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {tables.map((table) => {
            const perm = get(table);
            const allChecked = ACTIONS.every((a) => perm[a]);
            return (
              <Table.Tr key={table}>
                <Table.Td>
                  <Text size="sm">{tableTitle(table)}</Text>
                </Table.Td>
                {ACTIONS.map((action) => (
                  <Table.Td key={action}>
                    <Group justify="center">
                      <Checkbox
                        checked={perm[action]}
                        onChange={(e) => setTable(table, toggle(perm, action, e.currentTarget.checked))}
                        aria-label={`${ACTION_LABELS[action]} ${tableTitle(table)}`}
                      />
                    </Group>
                  </Table.Td>
                ))}
                <Table.Td>
                  <Group justify="center">
                    <Checkbox
                      checked={Boolean(perm.own)}
                      disabled={!perm.view}
                      onChange={(e) => setTable(table, { ...perm, own: e.currentTarget.checked })}
                      aria-label={`Own records only in ${tableTitle(table)}`}
                    />
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Group justify="center">
                    <Checkbox
                      checked={allChecked}
                      indeterminate={!allChecked && perm.view}
                      // "own only" is a limit, not an action: "All" keeps it as it is
                      onChange={(e) => setTable(table, e.currentTarget.checked ? { ...ALL, own: perm.own } : { ...NONE })}
                      aria-label={`All permissions for ${tableTitle(table)}`}
                    />
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
}

/* ---------------- create / edit ---------------- */

function RoleModal({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const fullScreen = useMediaQuery("(max-width: 36em)");
  const { data: tables = [] } = useTables();
  const create = useCreateRole();
  const update = useUpdateRole();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<PermissionMap>(role?.permissions ?? {});
  const [nameError, setNameError] = useState<string | null>(null);
  const tableNames: string[] = (tables as { tableName: string }[]).map((t) => t.tableName);

  const submit = async () => {
    if (!name.trim()) {
      setNameError("Enter a role name");
      return;
    }
    // only send permissions for tables that still exist
    const cleaned: PermissionMap = {};
    for (const t of tableNames) if (permissions[t]?.view) cleaned[t] = permissions[t];
    const data = role?.isAdmin
      ? { name: name.trim(), description: description.trim() }
      : { name: name.trim(), description: description.trim(), permissions: cleaned };
    try {
      if (role) await update.mutateAsync({ id: role._id, data });
      else await create.mutateAsync(data);
      onClose();
    } catch (err) {
      setNameError(errorMessage(err));
    }
  };

  return (
    <Modal opened onClose={onClose} title={role ? `Edit role "${role.name}"` : "New role"} size="xl" fullScreen={fullScreen}>
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Name"
            placeholder="e.g. Sales editor"
            withAsterisk
            data-autofocus
            value={name}
            error={nameError}
            onChange={(e) => {
              setName(e.currentTarget.value);
              setNameError(null);
            }}
          />
          <Textarea
            label="Description"
            placeholder="Who this role is for (optional)"
            minRows={1}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
        </SimpleGrid>

        {role?.isAdmin ? (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Admins always have full access">
            Users with this role can view, create, edit and delete records in every table and department, and manage
            tables, users, roles and departments.
          </Alert>
        ) : (
          <Stack gap={6}>
            <div>
              <Text size="sm" fw={500}>
                Table permissions
              </Text>
              <Text size="xs" c="dimmed">
                People still only see tables and records of their own departments. Create, edit and delete include
                view. <b>Own only</b> limits a table to their own records (e.g. each person sees just their own
                employee record or leave requests).
              </Text>
            </div>
            <PermissionMatrix tables={tableNames} value={permissions} onChange={setPermissions} />
          </Stack>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending || update.isPending}>
            {role ? "Save role" : "Create role"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

const permissionCount = (role: Role) => Object.values(role.permissions ?? {}).filter((p) => p.view).length;

/* ---------------- page ---------------- */

// Administration → Roles & permissions
export default function RolesPage() {
  const { data: roles = [], isLoading, isFetching, error, refetch } = useRoles();
  const remove = useDeleteRole();
  // undefined = closed, null = new, Role = edit
  const [editing, setEditing] = useState<Role | null | undefined>(undefined);

  const askDelete = (r: Role) =>
    confirmDanger({
      title: "Delete role",
      message: r.userCount
        ? `"${r.name}" is assigned to ${pluralize(r.userCount, "user")}. Give them another role before deleting it.`
        : `Delete the role "${r.name}"?`,
      confirmLabel: "Delete role",
      onConfirm: async () => {
        await remove.mutateAsync(r._id);
      },
    });

  const columns = useMemo<DataTableColumn<Role>[]>(
    () => [
      {
        id: "name",
        header: "Role",
        sortable: true,
        hideable: false,
        mobile: "title",
        width: 200,
        cell: (r) => (
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={500} truncate>
              {r.name}
            </Text>
            {r.isAdmin && <Badge color="red">Admin</Badge>}
            {r.appKey && (
              <Tooltip label="Comes with the app, and goes when the app is removed. Give it to people through App access on their page.">
                <Badge variant="light">App</Badge>
              </Tooltip>
            )}
          </Group>
        ),
      },
      {
        id: "description",
        header: "Description",
        width: 260,
        mobile: "subtitle",
        cell: (r) =>
          r.description ? (
            <Text size="sm" c="dimmed" truncate>
              {r.description}
            </Text>
          ) : (
            <Text span c="dimmed">
              —
            </Text>
          ),
      },
      {
        id: "access",
        header: "Access",
        sortable: true,
        width: 140,
        accessor: (r) => (r.isAdmin ? Infinity : permissionCount(r)),
        cell: (r) =>
          r.isAdmin ? (
            <Text size="sm">All tables</Text>
          ) : permissionCount(r) ? (
            <Text size="sm">{pluralize(permissionCount(r), "table")}</Text>
          ) : r.name.toLowerCase() === "member" ? (
            // empty on purpose: a Member's rights come from their app access
            <Text size="sm" c="dimmed">
              Through app access
            </Text>
          ) : (
            <Badge color="yellow">No tables</Badge>
          ),
      },
      {
        id: "userCount",
        header: "Users",
        sortable: true,
        align: "right",
        width: 80,
        cell: (r) => <span className="tabular-nums">{r.userCount}</span>,
      },
    ],
    []
  );

  return (
    <Page title="Roles & permissions" breadcrumbs={[{ label: "Administration" }, { label: "Roles & permissions" }]} width="wide">
      <PageHeader
        title="Roles & permissions"
        description="A role says what people can do in each table: view, create, edit or delete. Apps bring their own roles; give them to people through App access on the Users page."
        meta={roles.length ? <Badge variant="default">{pluralize(roles.length, "role")}</Badge> : undefined}
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
            New role
          </Button>
        }
      />

      <DataTable
        label="Roles"
        data={roles}
        columns={columns}
        getRowId={(r) => r._id}
        loading={isLoading}
        fetching={isFetching}
        error={error ? errorMessage(error) : null}
        onRetry={refetch}
        searchPlaceholder="Search roles…"
        storageKey="settings:roles"
        onRowClick={(r) => setEditing(r)}
        rowActions={(r) => (
          <>
            <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => setEditing(r)}>
              Edit
            </Menu.Item>
            {!r.isAdmin && !r.appKey && (
              <>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => askDelete(r)}>
                  Delete
                </Menu.Item>
              </>
            )}
          </>
        )}
        emptyState={(filtered) =>
          filtered ? (
            <EmptyState title="No matching roles" />
          ) : (
            <EmptyState
              icon={<IconShieldLock size={26} stroke={1.5} />}
              title="No roles yet"
              action={
                <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
                  New role
                </Button>
              }
            />
          )
        }
      />

      {editing !== undefined && (
        <RoleModal key={editing?._id ?? "new"} role={editing} onClose={() => setEditing(undefined)} />
      )}
    </Page>
  );
}
