import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Group, Menu, Modal, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import { IconBuilding, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";

import { errorMessage } from "../../api/api";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
  type Department,
} from "../../api/reactQueryHooks/useAdmin";
import { DataTable, type DataTableColumn } from "../../components/data-table";
import { confirmDanger } from "../../components/ui/confirm";
import { EmptyState } from "../../components/ui/EmptyState";
import { Page, PageHeader } from "../../components/ui/Page";
import { formatDate, pluralize } from "../../lib/format";

function DepartmentModal({
  opened,
  onClose,
  department,
}: {
  opened: boolean;
  onClose: () => void;
  department: Department | null;
}) {
  const fullScreen = useMediaQuery("(max-width: 36em)");
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const form = useForm({
    initialValues: { name: "", description: "" },
    validate: { name: (v) => (v.trim() ? null : "Enter a name") },
  });

  useEffect(() => {
    if (!opened) return;
    form.setValues({ name: department?.name ?? "", description: department?.description ?? "" });
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, department]);

  const submit = form.onSubmit(async (values) => {
    const data = { name: values.name.trim(), description: values.description.trim() };
    try {
      if (department) await update.mutateAsync({ id: department._id, data });
      else await create.mutateAsync(data);
      onClose();
    } catch (err) {
      form.setFieldError("name", errorMessage(err));
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={department ? "Edit department" : "New department"} fullScreen={fullScreen}>
      <form onSubmit={submit} noValidate>
        <Stack>
          <TextInput label="Name" placeholder="e.g. Sales" withAsterisk data-autofocus {...form.getInputProps("name")} />
          <Textarea
            label="Description"
            placeholder="What this department covers (optional)"
            {...form.getInputProps("description")}
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {department ? "Save department" : "Create department"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// Administration → Departments
export default function DepartmentsPage() {
  const { data: departments = [], isLoading, isFetching, error, refetch } = useDepartments();
  const remove = useDeleteDepartment();
  const [modal, setModal] = useState<{ department: Department | null } | null>(null);

  const askDelete = (d: Department) =>
    confirmDanger({
      title: "Delete department",
      message: (
        <Stack gap="xs">
          <Text size="sm">Delete "{d.name}"?</Text>
          <Text size="sm" c="dimmed">
            {pluralize(d.userCount, "user")} and {pluralize(d.tableCount, "table")} lose this department. Its records
            become <b>unassigned</b>, so only admins can see them until they're moved to another department.
          </Text>
        </Stack>
      ),
      confirmLabel: "Delete department",
      onConfirm: async () => {
        await remove.mutateAsync(d._id);
      },
    });

  const columns = useMemo<DataTableColumn<Department>[]>(
    () => [
      {
        id: "name",
        header: "Department",
        sortable: true,
        hideable: false,
        mobile: "title",
        width: 200,
        cell: (d) => (
          <Text size="sm" fw={500} truncate>
            {d.name}
          </Text>
        ),
      },
      {
        id: "description",
        header: "Description",
        width: 260,
        mobile: "subtitle",
        cell: (d) =>
          d.description ? (
            <Text size="sm" c="dimmed" truncate>
              {d.description}
            </Text>
          ) : (
            <Text span c="dimmed">
              —
            </Text>
          ),
      },
      {
        id: "userCount",
        header: "Users",
        sortable: true,
        align: "right",
        width: 80,
        cell: (d) => <span className="tabular-nums">{d.userCount}</span>,
      },
      {
        id: "tableCount",
        header: "Tables",
        sortable: true,
        align: "right",
        width: 80,
        cell: (d) => <span className="tabular-nums">{d.tableCount}</span>,
      },
      {
        id: "createdAt",
        header: "Created",
        sortable: true,
        width: 130,
        hiddenByDefault: true,
        cell: (d) => <span className="tabular-nums">{formatDate(d.createdAt)}</span>,
      },
    ],
    []
  );

  return (
    <Page title="Departments" breadcrumbs={[{ label: "Administration" }, { label: "Departments" }]} width="wide">
      <PageHeader
        title="Departments"
        description="Departments decide which tables and records people can see."
        meta={departments.length ? <Badge variant="default">{pluralize(departments.length, "department")}</Badge> : undefined}
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModal({ department: null })}>
            New department
          </Button>
        }
      />

      <DataTable
        label="Departments"
        data={departments}
        columns={columns}
        getRowId={(d) => d._id}
        loading={isLoading}
        fetching={isFetching}
        error={error ? errorMessage(error) : null}
        onRetry={refetch}
        searchPlaceholder="Search departments…"
        storageKey="settings:departments"
        onRowClick={(d) => setModal({ department: d })}
        rowActions={(d) => (
          <>
            <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => setModal({ department: d })}>
              Edit
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => askDelete(d)}>
              Delete
            </Menu.Item>
          </>
        )}
        emptyState={(filtered) =>
          filtered ? (
            <EmptyState title="No matching departments" />
          ) : (
            <EmptyState
              icon={<IconBuilding size={26} stroke={1.5} />}
              title="Create your first department"
              description="For example Sales, HR or IT. Assign tables and users to departments to control who sees what."
              action={
                <Button leftSection={<IconPlus size={16} />} onClick={() => setModal({ department: null })}>
                  New department
                </Button>
              }
            />
          )
        }
      />

      <DepartmentModal opened={modal !== null} onClose={() => setModal(null)} department={modal?.department ?? null} />
    </Page>
  );
}
