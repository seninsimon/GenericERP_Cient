import { useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconEdit,
  IconInfoCircle,
  IconPlus,
  IconShieldLock,
  IconTrash,
} from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";

import AppTable from "../../components/MantineTable";
import { confirmAction } from "../../utils/confirmModal";
import { useTables } from "../../api/reactQueryHooks/useTables";
import {
  useCreateRole,
  useDeleteRole,
  useRoles,
  useUpdateRole,
  type PermissionMap,
  type Role,
  type TablePermission,
} from "../../api/reactQueryHooks/useAdmin";

const ACTIONS = ["view", "create", "edit", "delete"] as const;
type Action = (typeof ACTIONS)[number];

const ACTION_LABELS: Record<Action, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
};

const NONE: TablePermission = { view: false, create: false, edit: false, delete: false };
const ALL: TablePermission = { view: true, create: true, edit: true, delete: true };

// Apply one checkbox change: write actions imply view; removing view clears everything.
const toggle = (perm: TablePermission, action: Action, checked: boolean): TablePermission => {
  if (action === "view") return checked ? { ...perm, view: true } : { ...NONE };
  const next = { ...perm, [action]: checked };
  if (checked) next.view = true;
  return next;
};

function PermissionMatrix({
  tables,
  value,
  onChange,
}: {
  tables: string[];
  value: PermissionMap;
  onChange: (next: PermissionMap) => void;
}) {
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
        No tables yet. Create tables in the Tables tab first.
      </Text>
    );
  }

  return (
    <ScrollArea.Autosize mah={360}>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Table</Table.Th>
            {ACTIONS.map((action) => {
              const state = columnState(action);
              return (
                <Table.Th key={action} ta="center">
                  <Stack gap={2} align="center">
                    <Text size="xs" fw={600}>
                      {ACTION_LABELS[action]}
                    </Text>
                    <Tooltip label={`Toggle ${ACTION_LABELS[action].toLowerCase()} for all tables`}>
                      <Checkbox
                        size="xs"
                        checked={state.all}
                        indeterminate={state.some}
                        onChange={(e) => setColumn(action, e.currentTarget.checked)}
                        aria-label={`${ACTION_LABELS[action]} all tables`}
                      />
                    </Tooltip>
                  </Stack>
                </Table.Th>
              );
            })}
            <Table.Th ta="center">
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
            const someChecked = !allChecked && ACTIONS.some((a) => perm[a]);
            return (
              <Table.Tr key={table}>
                <Table.Td>
                  <Text size="sm">{table}</Text>
                </Table.Td>
                {ACTIONS.map((action) => (
                  <Table.Td key={action}>
                    <Group justify="center">
                      <Checkbox
                        checked={perm[action]}
                        onChange={(e) => setTable(table, toggle(perm, action, e.currentTarget.checked))}
                        aria-label={`${ACTION_LABELS[action]} ${table}`}
                      />
                    </Group>
                  </Table.Td>
                ))}
                <Table.Td>
                  <Group justify="center">
                    <Checkbox
                      checked={allChecked}
                      indeterminate={someChecked}
                      onChange={(e) => setTable(table, e.currentTarget.checked ? { ...ALL } : { ...NONE })}
                      aria-label={`All permissions for ${table}`}
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

function RoleFormModal({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const { data: tables = [] } = useTables();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<PermissionMap>(role?.permissions ?? {});
  const [nameError, setNameError] = useState<string | null>(null);

  const tableNames: string[] = tables.map((t: any) => t.tableName);

  const submit = async () => {
    if (!name.trim()) {
      setNameError("Role name is required");
      return;
    }
    // only send permissions for tables that still exist
    const cleaned: PermissionMap = {};
    for (const t of tableNames) if (permissions[t]?.view) cleaned[t] = permissions[t];

    const data = role?.isAdmin
      ? { name: name.trim(), description: description.trim() }
      : { name: name.trim(), description: description.trim(), permissions: cleaned };

    try {
      if (role) await updateRole.mutateAsync({ id: role._id, data });
      else await createRole.mutateAsync(data);
      onClose();
    } catch {
      // error notification is shown by the mutation hook
    }
  };

  return (
    <Modal opened onClose={onClose} title={role ? `Edit role: ${role.name}` : "New role"} size="xl">
      <Stack gap="sm">
        <TextInput
          label="Name"
          withAsterisk
          value={name}
          error={nameError}
          onChange={(e) => {
            setName(e.currentTarget.value);
            setNameError(null);
          }}
        />
        <Textarea
          label="Description"
          autosize
          minRows={2}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
        />

        {role?.isAdmin ? (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Admins always have full access">
            Users with this role can view, create, edit and delete records in every table and
            department, and manage settings, users, roles and departments.
          </Alert>
        ) : (
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Table permissions
            </Text>
            <Text size="xs" c="dimmed">
              Users still only see tables and records of their own departments. Create, edit and
              delete include view.
            </Text>
            <PermissionMatrix tables={tableNames} value={permissions} onChange={setPermissions} />
          </Stack>
        )}

        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={createRole.isPending || updateRole.isPending}>
            {role ? "Save" : "Create role"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

const permissionSummary = (role: Role) => {
  if (role.isAdmin) return "All tables";
  const count = Object.values(role.permissions ?? {}).filter((p) => p.view).length;
  return count ? `${count} table${count === 1 ? "" : "s"}` : "No tables";
};

export default function RolesPage() {
  const { data: roles = [], isLoading } = useRoles();
  const deleteRole = useDeleteRole();

  // undefined = closed, null = create, Role = edit
  const [editing, setEditing] = useState<Role | null | undefined>(undefined);

  const columns = useMemo<MRT_ColumnDef<Role>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        Cell: ({ row }) => (
          <Group gap="xs">
            <Text size="sm">{row.original.name}</Text>
            {row.original.isAdmin && (
              <Badge color="red" variant="light" size="sm">
                Admin
              </Badge>
            )}
          </Group>
        ),
      },
      { accessorKey: "description", header: "Description" },
      {
        id: "access",
        header: "Access",
        accessorFn: (r) => permissionSummary(r),
      },
      { accessorKey: "userCount", header: "Users", size: 90 },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        size: 100,
        Cell: ({ row }) => (
          <Group gap="xs" wrap="nowrap">
            <Tooltip label="Edit">
              <ActionIcon variant="subtle" color="yellow" onClick={() => setEditing(row.original)}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
            {!row.original.isAdmin && (
              <Tooltip label="Delete">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() =>
                    confirmAction(
                      `Delete role "${row.original.name}"?`,
                      () => deleteRole.mutate(row.original._id),
                      "Delete role"
                    )
                  }
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        ),
      },
    ],
    [deleteRole]
  );

  return (
    <Card withBorder shadow="sm" p="lg" radius="md">
      <Group justify="space-between" mb="md">
        <Group>
          <IconShieldLock size={24} />
          <Title order={4}>Roles & permissions</Title>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
          New role
        </Button>
      </Group>

      <AppTable columns={columns} data={roles} loading={isLoading} />

      {editing !== undefined && (
        <RoleFormModal key={editing?._id ?? "new"} role={editing} onClose={() => setEditing(undefined)} />
      )}
    </Card>
  );
}
