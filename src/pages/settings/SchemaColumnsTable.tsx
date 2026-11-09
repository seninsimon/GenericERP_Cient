import { useMemo } from "react";
import type { MRT_ColumnDef } from "mantine-react-table";
import AppTable from "../../components/MantineTable";
import {
  Group,
  TextInput,
  Select,
  Switch,
  Badge,
  Text,
  ActionIcon,
  Tooltip,
  Stack,
} from "@mantine/core";
import {
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { confirmAction } from "../../utils/confirmModal";
import { columnTypes, INDEXABLE_TYPES, INDEXED_HELP } from "./columnTypes";

interface SchemaColumnsTableProps {
  columnsData: any[];
  editing: string | null;
  setEditing: (name: string | null) => void;
  tables: any[];
  onSaveColumn: (col: any) => Promise<void>;
  onDeleteColumn: (name: string) => Promise<void>;
  updateLocalColumn: (name: string, key: string, value: any) => void;
}


const groupedColumnTypes = columnTypes.reduce((acc: any, type) => {
  if (!acc[type.group]) acc[type.group] = [];
  acc[type.group].push(type);
  return acc;
}, {});

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    text: "blue",
    number: "green",
    date: "violet",
    richtext: "violet",
    boolean: "cyan",
    relation: "orange",
    options: "pink",
    image: "red",
    images: "red",
    file: "grape",
    files: "grape",
    textarea: "blue",
  };
  return colors[type] || "gray";
};

export default function SchemaColumnsTable({
  columnsData,
  editing,
  setEditing,
  tables,
  onSaveColumn,
  onDeleteColumn,
  updateLocalColumn,
}: SchemaColumnsTableProps) {
  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Column Name",
        size: 150,
        Cell: ({ row }) => (
          <Text fw={500} size="sm">
            {row.original.name}
          </Text>
        ),
      },
      {
        accessorKey: "label",
        header: "Display Label",
        size: 180,
        Cell: ({ row }) => {
          const col = row.original;
          if (editing === col.name) {
            return (
              <TextInput
                size="xs"
                value={col.label}
                onChange={(e) =>
                  updateLocalColumn(col.name, "label", e.target.value)
                }
              />
            );
          }
          return col.label;
        },
      },
      {
        accessorKey: "type",
        header: "Data Type",
        size: 140,
        Cell: ({ row }) => {
          const col = row.original;
          if (editing === col.name) {
            return (
              <Select
                size="xs"
                data={Object.entries(groupedColumnTypes).map(
                  ([group, types]: [string, any]) => ({
                    group,
                    items: types.map((t: any) => ({
                      value: t.value,
                      label: t.label,
                    })),
                  })
                )}
                value={col.type}
                onChange={(v) => {
                  updateLocalColumn(col.name, "type", v);
                  if (!INDEXABLE_TYPES.includes(v || "")) {
                    updateLocalColumn(col.name, "indexed", false);
                  }
                  if (v !== "relation") {
                    updateLocalColumn(col.name, "ref", null);
                    updateLocalColumn(col.name, "multiple", false);
                  }
                }}
              />
            );
          }
          return (
            <Badge color={getTypeColor(col.type)} variant="light">
              {col.type}
            </Badge>
          );
        },
      },
      {
        accessorKey: "ref",
        header: "References",
        size: 150,
        Cell: ({ row }) => {
          const col = row.original;
          if (editing === col.name && col.type === "relation") {
            return (
              <Select
                size="xs"
                placeholder="Select table"
                data={tables.map((t: any) => t.tableName)}
                value={col.ref || ""}
                onChange={(v) => updateLocalColumn(col.name, "ref", v)}
              />
            );
          }
          return col.ref ? (
            <Badge color="blue" variant="outline">
              {col.ref}
            </Badge>
          ) : (
            <Text c="dimmed" size="xs">-</Text>
          );
        },
      },
      {
        accessorKey: "multiple",
        header: "Multiple",
        size: 100,
        Cell: ({ row }) => {
          const col = row.original;
          if (col.type !== "relation")
            return <Text c="dimmed" size="xs">-</Text>;

          if (editing === col.name) {
            return (
              <Switch
                size="xs"
                checked={col.multiple || false}
                onChange={(e) =>
                  updateLocalColumn(
                    col.name,
                    "multiple",
                    e.currentTarget.checked
                  )
                }
              />
            );
          }
          return col.multiple ? (
            <Badge color="green" size="xs">
              Yes
            </Badge>
          ) : (
            <Badge color="gray" size="xs">
              No
            </Badge>
          );
        },
      },
      {
        accessorKey: "showInTable",
        header: "Show in Table",
        size: 120,
        Cell: ({ row }) => {
          const col = row.original;
          if (editing === col.name) {
            return (
              <Switch
                size="xs"
                checked={col.showInTable}
                onChange={(e) =>
                  updateLocalColumn(
                    col.name,
                    "showInTable",
                    e.currentTarget.checked
                  )
                }
              />
            );
          }
          return col.showInTable ? (
            <IconCheck size={18} color="green" />
          ) : (
            <IconX size={18} color="gray" />
          );
        },
      },
      {
        id: "options",
        header: "Options",
        size: 170,
        Cell: ({ row }) => {
          const col = row.original;
          const indexable = INDEXABLE_TYPES.includes(col.type);
          if (editing === col.name) {
            return (
              <Stack gap={4}>
                <Switch
                  size="xs"
                  label="Required"
                  checked={Boolean(col.required)}
                  onChange={(e) =>
                    updateLocalColumn(col.name, "required", e.currentTarget.checked)
                  }
                />
                <Tooltip label={INDEXED_HELP} multiline w={260} withArrow>
                  <div>
                    <Switch
                      size="xs"
                      label="Indexed"
                      disabled={!indexable}
                      checked={Boolean(col.indexed) && indexable}
                      onChange={(e) =>
                        updateLocalColumn(col.name, "indexed", e.currentTarget.checked)
                      }
                    />
                  </div>
                </Tooltip>
              </Stack>
            );
          }
          if (!col.required && !col.indexed) {
            return <Text c="dimmed" size="xs">-</Text>;
          }
          return (
            <Group gap={4}>
              {col.required && (
                <Badge color="red" variant="light" size="xs">
                  Required
                </Badge>
              )}
              {col.indexed && (
                <Badge color="violet" variant="light" size="xs">
                  Indexed
                </Badge>
              )}
            </Group>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        size: 120,
        Cell: ({ row }) => {
          const col = row.original;
          return (
            <Group gap={4}>
              {editing === col.name ? (
                <>
                  <Tooltip label="Save changes">
                    <ActionIcon
                      size="sm"
                      color="teal"
                      onClick={() => onSaveColumn(col)}
                    >
                      <IconCheck size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Cancel">
                    <ActionIcon
                      size="sm"
                      variant="default"
                      onClick={() => setEditing(null)}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip label="Edit column">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={() => setEditing(col.name)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete column">
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="subtle"
                      onClick={() =>
                        confirmAction(
                          "Are you sure you want to delete this column?",
                          () => onDeleteColumn(col.name)
                        )
                      }
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </>
              )}
            </Group>
          );
        },
      },
    ],
    [editing, setEditing, tables, onSaveColumn, onDeleteColumn, updateLocalColumn]
  );

  return <AppTable columns={columns} data={columnsData} />;
}