import { Button, TextInput, Select, Checkbox, Group, Grid, Paper, Tooltip, Stack } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { confirmAction } from "../../utils/confirmModal";
import { columnTypes, INDEXABLE_TYPES, INDEXED_HELP } from "./columnTypes";

interface AddColumnFormProps {
  columnName: string;
  setColumnName: (value: string) => void;
  columnLabel: string;
  setColumnLabel: (value: string) => void;
  columnType: string;
  setColumnType: (value: string) => void;
  showInTable: boolean;
  setShowInTable: (value: boolean) => void;
  refTable: string;
  setRefTable: (value: string) => void;
  multiple: boolean;
  setMultiple: (value: boolean) => void;
  required: boolean;
  setRequired: (value: boolean) => void;
  indexed: boolean;
  setIndexed: (value: boolean) => void;
  tables: any[];
  selectedTable: string;
  onAddColumn: () => Promise<void>;
  addingColumn: boolean;
}



const groupedColumnTypes = columnTypes.reduce((acc: any, type) => {
  if (!acc[type.group]) acc[type.group] = [];
  acc[type.group].push(type);
  return acc;
}, {});

export default function AddColumnForm({
  columnName,
  setColumnName,
  columnLabel,
  setColumnLabel,
  columnType,
  setColumnType,
  showInTable,
  setShowInTable,
  refTable,
  setRefTable,
  multiple,
  setMultiple,
  required,
  setRequired,
  indexed,
  setIndexed,
  tables,
  selectedTable,
  onAddColumn,
  addingColumn,
}: AddColumnFormProps) {
  return (
    <Paper withBorder p="md" radius="sm" mb="lg">
      <Grid>
        <Grid.Col span={3}>
          <TextInput
            label="Column Name"
            placeholder="e.g., first_name"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value.trim())}
            disabled={columnType === "relation"}
            size="xs"
          />
        </Grid.Col>

        <Grid.Col span={3}>
          <TextInput
            label="Display Label"
            placeholder="e.g., First Name"
            value={columnLabel}
            onChange={(e) => setColumnLabel(e.target.value)}
            size="xs"
          />
        </Grid.Col>

        <Grid.Col span={3}>
          <Select
            label="Data Type"
            data={Object.entries(groupedColumnTypes).map(
              ([group, types]: [string, any]) => ({
                group,
                items: types.map((t: any) => ({
                  value: t.value,
                  label: t.label,
                })),
              })
            )}
            value={columnType}
            onChange={(v) => {
              const type = v || "text";
              setColumnType(type);
              if (!INDEXABLE_TYPES.includes(type)) setIndexed(false);
              if (type !== "relation") {
                setRefTable("");
                setMultiple(false);
              }
            }}
            size="xs"
          />
        </Grid.Col>

        <Grid.Col span={3}>
          <Stack gap={6} justify="flex-end" h="100%">
            <Tooltip label="Show this column in table views">
              <Checkbox
                label="Show in table"
                checked={showInTable}
                onChange={(e) => setShowInTable(e.currentTarget.checked)}
                size="xs"
              />
            </Tooltip>
            <Tooltip label="Records can't be saved without a value">
              <Checkbox
                label="Required"
                checked={required}
                onChange={(e) => setRequired(e.currentTarget.checked)}
                size="xs"
              />
            </Tooltip>
            <Tooltip label={INDEXED_HELP} multiline w={260} withArrow>
              <div>
                <Checkbox
                  label="Indexed (fast sort)"
                  checked={indexed && INDEXABLE_TYPES.includes(columnType)}
                  disabled={!INDEXABLE_TYPES.includes(columnType)}
                  onChange={(e) => setIndexed(e.currentTarget.checked)}
                  size="xs"
                />
              </div>
            </Tooltip>
          </Stack>
        </Grid.Col>
      </Grid>

      {columnType === "relation" && (
        <Grid mt="xs">
          <Grid.Col span={6}>
            <Select
              label="Reference Table"
              placeholder="Select table to relate to"
              data={tables
                .filter((t: any) => t.tableName !== selectedTable)
                .map((t: any) => t.tableName)}
              value={refTable}
              onChange={(v) => {
                const table = v || "";
                setRefTable(table);
                setColumnName(table);
                setColumnLabel(table);
              }}
              size="xs"
              description="The table this column relates to"
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <div className="flex items-end h-full">
              <Checkbox
                label="Allow multiple selections"
                description="Enables many-to-many relationship"
                checked={multiple}
                onChange={(e) => setMultiple(e.currentTarget.checked)}
                size="xs"
              />
            </div>
          </Grid.Col>
        </Grid>
      )}

      <Group justify="flex-end" mt="md">
        <Button
          size="sm"
          loading={addingColumn}
          onClick={() =>
            confirmAction("Are you sure you want to add this column?", onAddColumn)
          }
          leftSection={<IconPlus size={16} />}
          disabled={!columnName.trim()}
        >
          Add Column
        </Button>
      </Group>
    </Paper>
  );
}