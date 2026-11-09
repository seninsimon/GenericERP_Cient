import { useState, useEffect } from "react";
import {
  Button,
  TextInput,
  Select,
  Group,
  Loader,
  Card,
  Title,
  Divider,
  Alert,
  Tabs,
  Grid,
  Switch,
  MultiSelect,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconTable,
  IconPlus,
  IconDatabase,
  IconSettings,
  IconInfoCircle,
} from "@tabler/icons-react";
import { confirmAction } from "../../utils/confirmModal";

import {
  useTables,
  useSchema,
  useCreateTable,
  useAddColumn,
  useDeleteColumn,
  useUpdateColumn,
  useUpdateTableSettings, // ✅ NEW
} from "../../api/reactQueryHooks/useTables";

import { useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useDepartments } from "../../api/reactQueryHooks/useAdmin";
import { assignUnassignedRecords, errorMessage } from "../../api/api";
import AddColumnForm from "./AddColumnForm";
import { INDEXABLE_TYPES } from "./columnTypes";
import DeleteTableButton from "./DeleteTableButton";
import SchemaColumnsTable from "./SchemaColumnsTable";

export default function SettingsTables() {
  const [selectedTable, setSelectedTable] = useState("");
  const [columnsData, setColumnsData] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>("create");
  const [tableName, setTableName] = useState("");

  const [showInMenu, setShowInMenu] = useState(true);
  const [tableDepartments, setTableDepartments] = useState<string[]>([]);
  const { data: departments = [] } = useDepartments();

  const [columnName, setColumnName] = useState("");
  const [columnLabel, setColumnLabel] = useState("");
  const [columnType, setColumnType] = useState("text");
  const [showInTable, setShowInTable] = useState(true);
  const [refTable, setRefTable] = useState("");
  const [multiple, setMultiple] = useState(false);
  const [required, setRequired] = useState(false);
  const [indexed, setIndexed] = useState(false);

  const { data: tables = [], isLoading: tablesLoading } = useTables();
  const { data: schema, isLoading: schemaLoading } = useSchema(selectedTable);

  const { mutateAsync: createTableMutate, isPending: creatingTable } = useCreateTable();
  const { mutateAsync: addColumnMutate, isPending: addingColumn } = useAddColumn(selectedTable);
  const { mutateAsync: updateColumnMutate } = useUpdateColumn(selectedTable, editing || "");
  const { mutateAsync: deleteColumnMutate } = useDeleteColumn(selectedTable);

  // ✅ NEW MUTATION
  const { mutateAsync: updateTableSettingsMutate, isPending: updatingMenu } =
    useUpdateTableSettings();

  /* records with no department (e.g. created before departments existed) */
  const qc = useQueryClient();
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const assignUnassigned = async () => {
    if (!assignTo) return;
    setAssigning(true);
    try {
      const { data } = await assignUnassignedRecords(selectedTable, assignTo);
      notifications.show({ title: "Records assigned", message: data.message, color: "green" });
      setAssignTo(null);
      qc.invalidateQueries({ queryKey: ["schema", selectedTable] });
      qc.invalidateQueries({ queryKey: ["tableData", selectedTable] });
    } catch (err) {
      notifications.show({ title: "Couldn't assign records", message: errorMessage(err), color: "red" });
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => {
    if (schema?.columns) {
      setColumnsData(schema.columns);
    }

    if (schema) {
      setShowInMenu(schema.showInMenu ?? true);
      setTableDepartments((schema.departments ?? []).map((d: any) => d._id));
    }
  }, [schema]);

  const createNewTable = async () => {
    if (!tableName.trim()) return;
    await createTableMutate({ tableName });
    setTableName("");
    setSelectedTable(tableName);
    setActiveTab("edit");
  };

  const addNewColumn = async () => {
    if (!columnName.trim()) return;

    await addColumnMutate({
      name: columnName,
      label: columnLabel || columnName,
      type: columnType,
      showInTable,
      ref: columnType === "relation" ? refTable : null,
      multiple: columnType === "relation" ? multiple : false,
      required,
      indexed: INDEXABLE_TYPES.includes(columnType) ? indexed : false,
    });

    setColumnName("");
    setColumnLabel("");
    setColumnType("text");
    setShowInTable(true);
    setRefTable("");
    setMultiple(false);
    setRequired(false);
    setIndexed(false);
  };

  const removeColumn = async (name: string) => {
    await deleteColumnMutate(name);
  };

  const saveColumn = async (col: any) => {
    // the API accepts these fields on a column update
    await updateColumnMutate({
      label: col.label,
      type: col.type,
      showInTable: col.showInTable,
      required: Boolean(col.required),
      indexed: INDEXABLE_TYPES.includes(col.type) ? Boolean(col.indexed) : false,
    });
    setEditing(null);
  };

  const updateLocalColumn = (name: string, key: string, value: any) => {
    setColumnsData((prev) =>
      prev.map((col) => (col.name === name ? { ...col, [key]: value } : col))
    );
  };

  const updateTableMenu = async () => {
    await updateTableSettingsMutate({
      table: selectedTable,
      data: { showInMenu, departmentIds: tableDepartments },
    });
    
  };

  if (tablesLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full">

      <Tabs value={activeTab} onChange={setActiveTab} mb="xl">
        <Tabs.List>
          <Tabs.Tab value="create" leftSection={<IconPlus size={16} />}>
            Create New Table
          </Tabs.Tab>
          <Tabs.Tab
            value="edit"
            leftSection={<IconSettings size={16} />}
            disabled={!selectedTable}
          >
            Edit Table Schema
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {activeTab === "create" && (
        <Card withBorder shadow="sm" p="lg" radius="md" mb="xl">
          <Group mb="md">
            <IconDatabase size={24} />
            <Title order={4}>Create a New Table</Title>
          </Group>

          <Divider mb="lg" />

          <Grid>
            <Grid.Col span={8}>
              <TextInput
                label="Table Name"
                value={tableName}
                onChange={(e) => setTableName(e.target.value.trim())}
                leftSection={<IconTable size={16} />}
              />
            </Grid.Col>

            <Grid.Col span={4} className="flex items-end">
              <Button
                fullWidth
                loading={creatingTable}
                onClick={() =>
                  confirmAction("Create this table?", createNewTable)
                }
              >
                Create Table
              </Button>
            </Grid.Col>
          </Grid>
        </Card>
      )}

      <Card withBorder shadow="sm" p="lg" radius="md">
        <Group mb="md">
          <IconDatabase size={24} />
          <Title order={4}>Select Table to Configure</Title>
        </Group>

        <Select
          placeholder="Select a table"
          data={tables.map((t: any) => ({
            value: t.tableName,
            label: t.tableName,
          }))}
          value={selectedTable}
          onChange={(v) => {
            setSelectedTable(v || "");
            setActiveTab("edit");
          }}
          mb="lg"
        />

        {selectedTable && (
          <Card withBorder p="sm" mb="md">
            <Stack gap="sm">
              <Switch
                label="Show this table in sidebar menu"
                checked={showInMenu}
                onChange={(e) => setShowInMenu(e.currentTarget.checked)}
              />
              <MultiSelect
                label="Departments"
                description="Only users in these departments can see this table, and only records of their own departments. With no department, only admins can use it."
                placeholder={tableDepartments.length ? undefined : "Admins only"}
                data={departments.map((d: any) => ({ value: d._id, label: d.name }))}
                value={tableDepartments}
                onChange={setTableDepartments}
                searchable
                clearable
              />
              {!departments.length && (
                <Text size="xs" c="dimmed">
                  Create departments in the Departments tab first.
                </Text>
              )}
              <Group justify="space-between">
                <DeleteTableButton
                  table={selectedTable}
                  onDeleted={() => {
                    setSelectedTable("");
                    setActiveTab("create");
                  }}
                />
                <Button size="xs" onClick={updateTableMenu} loading={updatingMenu}>
                  Save
                </Button>
              </Group>

              {schema?.unassignedCount > 0 && (
                <Alert color="yellow" icon={<IconInfoCircle size={16} />} title={`${schema.unassignedCount} record(s) have no department`}>
                  <Text size="sm" mb="xs">
                    Only admins can see these. Move them all into one of this table's departments:
                  </Text>
                  {schema.departments?.length ? (
                    <Group align="flex-end">
                      <Select
                        placeholder="Choose department"
                        data={schema.departments.map((d: any) => ({ value: d._id, label: d.name }))}
                        value={assignTo}
                        onChange={setAssignTo}
                        size="xs"
                      />
                      <Button
                        size="xs"
                        color="yellow"
                        disabled={!assignTo}
                        loading={assigning}
                        onClick={() =>
                          confirmAction(
                            `Assign all ${schema.unassignedCount} unassigned record(s) to this department?`,
                            assignUnassigned
                          )
                        }
                      >
                        Assign
                      </Button>
                    </Group>
                  ) : (
                    <Text size="xs" c="dimmed">Save at least one department for this table first.</Text>
                  )}
                </Alert>
              )}
            </Stack>
          </Card>
        )}

        {selectedTable && (
          <>
            {schemaLoading ? (
              <Loader />
            ) : (
              <>
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  title="Column Management"
                  color="blue"
                  mb="xs"
                />

                <AddColumnForm
                  columnName={columnName}
                  setColumnName={setColumnName}
                  columnLabel={columnLabel}
                  setColumnLabel={setColumnLabel}
                  columnType={columnType}
                  setColumnType={setColumnType}
                  showInTable={showInTable}
                  setShowInTable={setShowInTable}
                  refTable={refTable}
                  setRefTable={setRefTable}
                  multiple={multiple}
                  setMultiple={setMultiple}
                  required={required}
                  setRequired={setRequired}
                  indexed={indexed}
                  setIndexed={setIndexed}
                  tables={tables}
                  selectedTable={selectedTable}
                  onAddColumn={addNewColumn}
                  addingColumn={addingColumn}
                />

                <SchemaColumnsTable
                  columnsData={columnsData}
                  editing={editing}
                  setEditing={setEditing}
                  tables={tables}
                  onSaveColumn={saveColumn}
                  onDeleteColumn={removeColumn}
                  updateLocalColumn={updateLocalColumn}
                />
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}