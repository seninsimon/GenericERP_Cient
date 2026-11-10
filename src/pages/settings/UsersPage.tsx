import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  MultiSelect,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import { IconEdit, IconKey, IconPlus, IconTrash, IconUserCheck, IconUserOff, IconUsers } from "@tabler/icons-react";

import { errorMessage } from "../../api/api";
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
import { useCurrentUser } from "../../auth/AuthContext";
import { DataTable, type DataTableColumn } from "../../components/data-table";
import { confirmDanger } from "../../components/ui/confirm";
import { EmptyState } from "../../components/ui/EmptyState";
import { Page, PageHeader } from "../../components/ui/Page";
import { initialsOf } from "../../layout/UserMenu";
import { formatDateTime, formatRelative, pluralize } from "../../lib/format";

const USERNAME = /^[a-zA-Z0-9._-]{3,50}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

const EMPTY: FormValues = {
  username: "",
  fullName: "",
  email: "",
  phone: "",
  password: "",
  roleId: "",
  departmentIds: [],
  isActive: true,
};

/* ---------------- create / edit ---------------- */

function UserModal({ opened, onClose, user }: { opened: boolean; onClose: () => void; user: User | null }) {
  const fullScreen = useMediaQuery("(max-width: 36em)");
  const { user: me } = useCurrentUser();
  const { data: roles = [] } = useRoles();
  const { data: departments = [] } = useDepartments();
  const create = useCreateUser();
  const update = useUpdateUser();
  const isSelf = user?._id === me._id;

  const form = useForm<FormValues>({
    initialValues: EMPTY,
    validate: {
      username: (v) => (USERNAME.test(v.trim()) ? null : "3–50 characters: letters, numbers, dot, dash or underscore"),
      email: (v) => (!v || EMAIL.test(v.trim()) ? null : "Enter a valid email address"),
      password: (v) =>
        !user && !v
          ? "Set a password"
          : v && v.length < MIN_PASSWORD
            ? `At least ${MIN_PASSWORD} characters`
            : null,
      roleId: (v) => (v ? null : "Choose a role"),
    },
  });

  useEffect(() => {
    if (!opened) return;
    form.setValues(
      user
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
        : EMPTY
    );
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, user]);

  const selectedRole = roles.find((r) => r._id === form.values.roleId);

  const submit = form.onSubmit(async (v) => {
    const data: UserInput = {
      username: v.username.trim(),
      fullName: v.fullName.trim(),
      email: v.email.trim(),
      phone: v.phone.trim(),
      roleId: v.roleId,
      departmentIds: v.departmentIds,
      isActive: v.isActive,
    };
    if (v.password) data.password = v.password;
    try {
      if (user) await update.mutateAsync({ id: user._id, data });
      else await create.mutateAsync(data);
      onClose();
    } catch (err) {
      form.setFieldError(/username/i.test(errorMessage(err)) ? "username" : "roleId", errorMessage(err));
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={user ? `Edit ${user.fullName || user.username}` : "New user"}
      size="lg"
      fullScreen={fullScreen}
    >
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Full name" placeholder="e.g. Asha Menon" data-autofocus {...form.getInputProps("fullName")} />
            <TextInput
              label="Username"
              description="Used to sign in"
              placeholder="e.g. asha.menon"
              withAsterisk
              autoCapitalize="none"
              spellCheck={false}
              {...form.getInputProps("username")}
            />
            <TextInput label="Email" type="email" placeholder="name@company.com" {...form.getInputProps("email")} />
            <TextInput label="Phone" type="tel" {...form.getInputProps("phone")} />
          </SimpleGrid>

          <PasswordInput
            label={user ? "Reset password" : "Password"}
            description={
              user
                ? "Leave blank to keep the current password. Resetting signs the user out everywhere."
                : `At least ${MIN_PASSWORD} characters. Share it with the user securely.`
            }
            withAsterisk={!user}
            autoComplete="new-password"
            visibilityToggleButtonProps={{ "aria-label": "Show or hide password" }}
            {...form.getInputProps("password")}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Role"
              description="What the user can do in each table"
              withAsterisk
              data={roles.map((r) => ({ value: r._id, label: r.isAdmin ? `${r.name} (full access)` : r.name }))}
              disabled={isSelf}
              {...form.getInputProps("roleId")}
            />
            <MultiSelect
              label="Departments"
              description={
                selectedRole?.isAdmin
                  ? "Admins see every department anyway"
                  : "The user only sees tables and records of these departments"
              }
              data={departments.map((d) => ({ value: d._id, label: d.name }))}
              searchable
              clearable
              {...form.getInputProps("departmentIds")}
            />
          </SimpleGrid>

          <Switch
            label="Active"
            description={isSelf ? "You can't disable your own account" : "Disabled users can't sign in"}
            disabled={isSelf}
            {...form.getInputProps("isActive", { type: "checkbox" })}
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {user ? "Save user" : "Create user"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

/* ---------------- reset password ---------------- */

function ResetPasswordModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const fullScreen = useMediaQuery("(max-width: 36em)");
  const update = useUpdateUser();
  const form = useForm({
    initialValues: { password: "" },
    validate: { password: (v) => (v.length >= MIN_PASSWORD ? null : `At least ${MIN_PASSWORD} characters`) },
  });
  useEffect(() => form.reset(), [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = form.onSubmit(async ({ password }) => {
    if (!user) return;
    try {
      await update.mutateAsync({ id: user._id, data: { password } });
      onClose();
    } catch (err) {
      form.setFieldError("password", errorMessage(err));
    }
  });

  return (
    <Modal opened={user !== null} onClose={onClose} title={`Reset password for ${user?.fullName || user?.username}`} fullScreen={fullScreen}>
      <form onSubmit={submit} noValidate>
        <Stack>
          <PasswordInput
            label="New password"
            description="The user is signed out everywhere and must use this password next time."
            withAsterisk
            autoComplete="new-password"
            data-autofocus
            visibilityToggleButtonProps={{ "aria-label": "Show or hide password" }}
            {...form.getInputProps("password")}
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="red" loading={update.isPending}>
              Reset password
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

/* ---------------- page ---------------- */

// Administration → Users
export default function UsersPage() {
  const { user: me } = useCurrentUser();
  const { data: users = [], isLoading, isFetching, error, refetch } = useUsers();
  const update = useUpdateUser();
  const remove = useDeleteUser();
  const [modal, setModal] = useState<{ user: User | null } | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);

  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        id: "name",
        header: "User",
        sortable: true,
        hideable: false,
        mobile: "title",
        width: 220,
        accessor: (u) => u.fullName || u.username,
        cell: (u) => (
          <Group gap="sm" wrap="nowrap">
            <Avatar size={30} radius="xl" color="initials" name={u.fullName || u.username}>
              {initialsOf(u.fullName || u.username)}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <Text size="sm" fw={500} truncate>
                {u.fullName || u.username}
                {u._id === me._id && (
                  <Text span c="dimmed" size="xs">
                    {" "}
                    (you)
                  </Text>
                )}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                @{u.username}
              </Text>
            </div>
          </Group>
        ),
      },
      {
        id: "role",
        header: "Role",
        sortable: true,
        width: 150,
        mobile: "subtitle",
        accessor: (u) => u.role?.name ?? "",
        cell: (u) => <Badge color={u.role?.isAdmin ? "red" : "blue"}>{u.role?.name}</Badge>,
      },
      {
        id: "departments",
        header: "Departments",
        width: 220,
        accessor: (u) => (u.departments ?? []).map((d) => d.name).join(", "),
        cell: (u) =>
          u.departments?.length ? (
            <Group gap={4} wrap="nowrap">
              {u.departments.slice(0, 2).map((d) => (
                <Badge key={d._id} variant="default">
                  {d.name}
                </Badge>
              ))}
              {u.departments.length > 2 && (
                <Tooltip label={u.departments.slice(2).map((d) => d.name).join(", ")}>
                  <Badge variant="default">+{u.departments.length - 2}</Badge>
                </Tooltip>
              )}
            </Group>
          ) : (
            <Text span c="dimmed" size="sm">
              {u.role?.isAdmin ? "All (admin)" : "None"}
            </Text>
          ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        width: 100,
        accessor: (u) => (u.isActive ? "Active" : "Disabled"),
        cell: (u) => <Badge color={u.isActive ? "teal" : "gray"}>{u.isActive ? "Active" : "Disabled"}</Badge>,
      },
      {
        id: "email",
        header: "Email",
        width: 200,
        hiddenByDefault: true,
        cell: (u) =>
          u.email ? (
            <Text size="sm" truncate>
              {u.email}
            </Text>
          ) : (
            <Text span c="dimmed">
              —
            </Text>
          ),
      },
      {
        id: "lastLoginAt",
        header: "Last sign-in",
        sortable: true,
        width: 140,
        accessor: (u) => u.lastLoginAt ?? "",
        cell: (u) =>
          u.lastLoginAt ? (
            <Tooltip label={formatDateTime(u.lastLoginAt)}>
              <Text size="sm" c="dimmed" span>
                {formatRelative(u.lastLoginAt)}
              </Text>
            </Tooltip>
          ) : (
            <Text size="sm" c="dimmed" span>
              Never
            </Text>
          ),
      },
    ],
    [me._id]
  );

  const toggleActive = (u: User) => {
    if (u.isActive) {
      confirmDanger({
        title: "Disable user",
        message: `${u.fullName || u.username} will be signed out and can't sign in until you enable the account again.`,
        confirmLabel: "Disable user",
        onConfirm: async () => {
          await update.mutateAsync({ id: u._id, data: { isActive: false } });
        },
      });
    } else {
      update.mutate({ id: u._id, data: { isActive: true } });
    }
  };

  const askDelete = (u: User) =>
    confirmDanger({
      title: "Delete user",
      message: `Delete ${u.fullName || u.username}? Their records stay, but the account is removed permanently. To keep the history of who they are, disable the account instead.`,
      confirmLabel: "Delete user",
      onConfirm: async () => {
        await remove.mutateAsync(u._id);
      },
    });

  return (
    <Page title="Users" breadcrumbs={[{ label: "Administration" }, { label: "Users" }]} width="wide">
      <PageHeader
        title="Users"
        description="Accounts, their role and the departments they work in."
        meta={users.length ? <Badge variant="default">{pluralize(users.length, "user")}</Badge> : undefined}
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModal({ user: null })}>
            New user
          </Button>
        }
      />

      <DataTable
        label="Users"
        data={users}
        columns={columns}
        getRowId={(u) => u._id}
        loading={isLoading}
        fetching={isFetching}
        error={error ? errorMessage(error) : null}
        onRetry={refetch}
        searchPlaceholder="Search users…"
        storageKey="settings:users"
        onRowClick={(u) => setModal({ user: u })}
        rowActions={(u) => {
          const self = u._id === me._id;
          return (
            <>
              <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => setModal({ user: u })}>
                Edit
              </Menu.Item>
              <Menu.Item leftSection={<IconKey size={16} />} onClick={() => setResetting(u)}>
                Reset password
              </Menu.Item>
              <Menu.Item
                leftSection={u.isActive ? <IconUserOff size={16} /> : <IconUserCheck size={16} />}
                disabled={self}
                onClick={() => toggleActive(u)}
              >
                {u.isActive ? "Disable" : "Enable"}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={16} />} disabled={self} onClick={() => askDelete(u)}>
                Delete
              </Menu.Item>
            </>
          );
        }}
        emptyState={(filtered) =>
          filtered ? (
            <EmptyState title="No matching users" description="Try a different search." />
          ) : (
            <EmptyState
              icon={<IconUsers size={26} stroke={1.5} />}
              title="No users yet"
              action={
                <Button leftSection={<IconPlus size={16} />} onClick={() => setModal({ user: null })}>
                  New user
                </Button>
              }
            />
          )
        }
      />

      <UserModal opened={modal !== null} onClose={() => setModal(null)} user={modal?.user ?? null} />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
    </Page>
  );
}
