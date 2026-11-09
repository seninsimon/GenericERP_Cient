import { useMemo, useState } from "react";
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBuilding, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";

import AppTable from "../../components/MantineTable";
import { confirmAction } from "../../utils/confirmModal";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
  type Department,
} from "../../api/reactQueryHooks/useAdmin";

function DepartmentFormModal({
  department,
  onClose,
}: {
  department: Department | null;
  onClose: () => void;
}) {
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();

  const form = useForm({
    initialValues: {
      name: department?.name ?? "",
      description: department?.description ?? "",
    },
    validate: {
      name: (v) => (v.trim() ? null : "Department name is required"),
    },
  });

  const submit = async (values: { name: string; description: string }) => {
    const data = { name: values.name.trim(), description: values.description.trim() };
    try {
      if (department) await updateDepartment.mutateAsync({ id: department._id, data });
      else await createDepartment.mutateAsync(data);
      onClose();
    } catch {
      // error notification is shown by the mutation hook
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={department ? `Edit department: ${department.name}` : "New department"}
    >
      <form onSubmit={form.onSubmit(submit)}>
        <Stack gap="sm">
          <TextInput label="Name" withAsterisk {...form.getInputProps("name")} />
          <Textarea label="Description" autosize minRows={2} {...form.getInputProps("description")} />
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createDepartment.isPending || updateDepartment.isPending}>
              {department ? "Save" : "Create department"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default function DepartmentsPage() {
  const { data: departments = [], isLoading } = useDepartments();
  const deleteDepartment = useDeleteDepartment();

  // undefined = closed, null = create, Department = edit
  const [editing, setEditing] = useState<Department | null | undefined>(undefined);

  const columns = useMemo<MRT_ColumnDef<Department>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "description", header: "Description" },
      { accessorKey: "userCount", header: "Users", size: 90 },
      { accessorKey: "tableCount", header: "Tables", size: 90 },
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
            <Tooltip label="Delete">
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() =>
                  confirmAction(
                    `Delete department "${row.original.name}"? Its ${row.original.userCount} user(s) and ${row.original.tableCount} table(s) lose this department, and records filed under it become "Unassigned" (visible only to admins until reassigned).`,
                    () => deleteDepartment.mutate(row.original._id),
                    "Delete department"
                  )
                }
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [deleteDepartment]
  );

  return (
    <Card withBorder shadow="sm" p="lg" radius="md">
      <Group justify="space-between" mb="md">
        <Group>
          <IconBuilding size={24} />
          <Title order={4}>Departments</Title>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
          New department
        </Button>
      </Group>

      <AppTable columns={columns} data={departments} loading={isLoading} />

      {editing !== undefined && (
        <DepartmentFormModal
          key={editing?._id ?? "new"}
          department={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Card>
  );
}
