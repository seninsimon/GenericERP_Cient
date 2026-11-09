import { useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  MultiSelect,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconEdit, IconPlus, IconTrash, IconUsers } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import dayjs from "dayjs";

import AppTable from "../../components/MantineTable";
import { confirmAction } from "../../utils/confirmModal";
import { useCurrentUser } from "../../auth/AuthContext";
import {
  useCreateUser,
  useDeleteUser,
  useDepartments,
  useRoles,
  useUpdateUser,
  useUsers,
  type User,
  type UserInput,
} from "../../api/reactQueryHooks/useAdmin";

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,50}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

type FormValues = {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  roleId: string;
  departmentIds: string[];
  isActive: boolean;
};

const emptyValues: FormValues = {
  username: "",
  fullName: "",
  email: "",
  phone: "",
  password: "",
  roleId: "",
  departmentIds: [],
  isActive: true,
};

function UserFormModal({
  opened,
  onClose,
  user,
}: {
  opened: boolean;
  onClose: () => void;
  user: User | null; // null = create
}) {
  const creating = !user;
  const { data: roles = [] } = useRoles();
  const { data: departments = [] } = useDepartments();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const form = useForm<FormValues>({
    initialValues: user
      ? {
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          password: "",
          roleId: user.role._id,
          departmentIds: user.departments.map((d) => d._id),
          isActive: user.isActive,
        }
      : emptyValues,
    validate: {
      username: (v) =>
        USERNAME_PATTERN.test(v.trim())
          ? null
          : "3-50 characters: letters, numbers, dot, dash or underscore",
      email: (v) => (!v.trim() || EMAIL_PATTERN.test(v.trim()) ? null : "Invalid email address"),
      password: (v) => {
        if (creating && v.length < MIN_PASSWORD) return `At least ${MIN_PASSWORD} characters`;
        if (!creating && v && v.length < MIN_PASSWORD) return `At least ${MIN_PASSWORD} characters`;
        return null;
      },
      roleId: (v) => (v ? null : "Choose a role"),
    },
  });

  const submit = async (values: FormValues) => {
    const data: UserInput = {
      username: values.username.trim(),
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      roleId: values.roleId,
      departmentIds: values.departmentIds,
      isActive: values.isActive,
    };
    if (values.password) data.password = values.password;

    try {
      if (user) await updateUser.mutateAsync({ id: user._id, data });
      else await createUser.mutateAsync(data);
      onClose();
    } catch {
      // error notification is shown by the mutation hook
    }
  };

  const selectedRole = roles.find((r) => r._id === form.values.roleId);

  return (
    <Modal opened={opened} onClose={onClose} title={user ? `Edit ${user.username}` : "New user"} size="lg">
      <form onSubmit={form.onSubmit(submit)}>
        <Stack gap="sm">
          <Group grow align="flex-start">
            <TextInput label="Username" withAsterisk autoComplete="off" {...form.getInputProps("username")} />
            <TextInput label="Full name" {...form.getInputProps("fullName")} />
          </Group>
          <Group grow align="flex-start">
            <TextInput label="Email" type="email" {...form.getInputProps("email")} />
            <TextInput label="Phone" {...form.getInputProps("phone")} />
          </Group>

          {creating ? (
            <PasswordInput
              label="Password"
              withAsterisk
              autoComplete="new-password"
              description={`At least ${MIN_PASSWORD} characters`}
              {...form.getInputProps("password")}
            />
          ) : (
            <PasswordInput
              label="Reset password"
              autoComplete="new-password"
              description="Leave blank to keep the current password. Resetting signs the user out everywhere."
              {...form.getInputProps("password")}
            />
          )}

          <Select
            label="Role"
            withAsterisk
            data={roles.map((r) => ({ value: r._id, label: r.isAdmin ? `${r.name} (full access)` : r.name }))}
            {...form.getInputProps("roleId")}
          />

          <MultiSelect
            label="Departments"
            description={
              selectedRole?.isAdmin
                ? "Admins can see every department; this only sets the default for new records"
                : "The user only sees tables and records of these departments"
            }
            data={departments.map((d) => ({ value: d._id, label: d.name }))}
            searchable
            clearable
            {...form.getInputProps("departmentIds")}
          />

          <Switch
            label="Active"
            description="Disabled users can't log in"
            {...form.getInputProps("isActive", { type: "checkbox" })}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createUser.isPending || updateUser.isPending}>
              {creating ? "Create user" : "Save"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useCurrentUser();
  const { data: users = [], isLoading } = useUsers();
  const deleteUser = useDeleteUser();

  // modal state: undefined = closed, null = create, User = edit
  const [editing, setEditing] = useState<User | null | undefined>(undefined);

  const columns = useMemo<MRT_ColumnDef<User>[]>(
    () => [
      { accessorKey: "username", header: "Username" },
      { accessorKey: "fullName", header: "Full name" },
      { accessorKey: "email", header: "Email" },
      {
        id: "role",
        header: "Role",
        // fields can be null in the table's loading placeholder rows
        accessorFn: (u) => u.role?.name ?? "",
        Cell: ({ row }) => (
          <Badge color={row.original.role?.isAdmin ? "red" : "blue"} variant="light">
            {row.original.role?.name}
          </Badge>
        ),
      },
      {
        id: "departments",
        header: "Departments",
        accessorFn: (u) => (u.departments ?? []).map((d) => d.name).join(", "),
        Cell: ({ row }) =>
          row.original.departments?.length ? (
            <Group gap={4}>
              {row.original.departments.map((d) => (
                <Badge key={d._id} variant="outline" size="sm">
                  {d.name}
                </Badge>
              ))}
            </Group>
          ) : (
            <Text size="xs" c="dimmed">
              None
            </Text>
          ),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (u) => (u.isActive ? "Active" : "Disabled"),
        Cell: ({ row }) => (
          <Badge color={row.original.isActive ? "green" : "gray"} variant="light">
            {row.original.isActive ? "Active" : "Disabled"}
          </Badge>
        ),
      },
      {
        id: "lastLoginAt",
        header: "Last login",
        accessorFn: (u) => u.lastLoginAt ?? "",
        Cell: ({ row }) =>
          row.original.lastLoginAt ? dayjs(row.original.lastLoginAt).format("DD MMM YYYY, HH:mm") : "Never",
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        size: 100,
        Cell: ({ row }) => {
          const isSelf = row.original._id === currentUser?._id;
          return (
            <Group gap="xs" wrap="nowrap">
              <Tooltip label="Edit">
                <ActionIcon variant="subtle" color="yellow" onClick={() => setEditing(row.original)}>
                  <IconEdit size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={isSelf ? "You can't delete your own account" : "Delete"}>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  disabled={isSelf}
                  onClick={() =>
                    confirmAction(
                      `Delete user "${row.original.username}"? This can't be undone.`,
                      () => deleteUser.mutate(row.original._id),
                      "Delete user"
                    )
                  }
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          );
        },
      },
    ],
    [currentUser?._id, deleteUser]
  );

  return (
    <Card withBorder shadow="sm" p="lg" radius="md">
      <Group justify="space-between" mb="md">
        <Group>
          <IconUsers size={24} />
          <Title order={4}>Users</Title>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
          New user
        </Button>
      </Group>

      <AppTable columns={columns} data={users} loading={isLoading} />

      {editing !== undefined && (
        <UserFormModal
          // remount per user so the form picks up fresh initial values
          key={editing?._id ?? "new"}
          opened
          user={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Card>
  );
}
