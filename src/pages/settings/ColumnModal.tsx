import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";

import { errorMessage } from "../../api/api";
import { useAddColumn, useTables, useUpdateColumn } from "../../api/reactQueryHooks/useTables";
import { tableTitle } from "../../layout/nav";
import { columnTypeInfo, columnTypes, INDEXABLE_TYPES, INDEXED_HELP, slugify } from "./columnTypes";
import classes from "./settings.module.css";

export type SchemaColumn = {
  _id?: string;
  name: string;
  label?: string;
  type: string;
  showInTable?: boolean;
  required?: boolean;
  indexed?: boolean;
  ref?: string | null;
  multiple?: boolean;
};

const COLUMN_NAME = /^[a-zA-Z0-9_][a-zA-Z0-9_ -]{0,62}$/;

type Values = {
  type: string;
  label: string;
  name: string;
  required: boolean;
  indexed: boolean;
  showInTable: boolean;
  ref: string | null;
  multiple: boolean;
};

const NEW_COLUMN: Values = {
  type: "text",
  label: "",
  name: "",
  required: false,
  indexed: false,
  showInTable: true,
  ref: null,
  multiple: false,
};

// Type picker: icon + name + one-line description per column type.
function TypePicker({ value, onChange }: { value: string; onChange: (type: string) => void }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="xs" role="radiogroup" aria-label="Column type">
      {columnTypes.map((t) => {
        const selected = value === t.value;
        return (
          <UnstyledButton
            key={t.value}
            role="radio"
            aria-checked={selected}
            className={classes.typeCard}
            data-selected={selected || undefined}
            onClick={() => onChange(t.value)}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon variant={selected ? "filled" : "light"} size={30} radius="md" aria-hidden>
                <t.icon size={17} stroke={1.75} />
              </ThemeIcon>
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={600}>
                  {t.label}
                </Text>
                <Text size="xs" c="dimmed" lh={1.35}>
                  {t.description}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        );
      })}
    </SimpleGrid>
  );
}

// "Add column" (no `column`) or "Edit column".
export function ColumnModal({
  opened,
  onClose,
  table,
  column,
  existingNames,
}: {
  opened: boolean;
  onClose: () => void;
  table: string;
  column?: SchemaColumn | null;
  existingNames: string[];
}) {
  const editing = Boolean(column);
  const fullScreen = useMediaQuery("(max-width: 36em)");
  const { data: tables = [] } = useTables();
  const add = useAddColumn(table);
  const update = useUpdateColumn(table, column?.name ?? "");
  // the name follows the label until the user edits the name themselves
  const [nameTouched, setNameTouched] = useState(false);

  const form = useForm<Values>({
    initialValues: NEW_COLUMN,
    validate: {
      label: (v) => (v.trim() ? null : "Enter a label"),
      name: (v) =>
        editing
          ? null
          : !v.trim()
            ? "Enter a column name"
            : !COLUMN_NAME.test(v.trim())
              ? "Use letters, numbers, _ or - (max 63 characters)"
              : existingNames.includes(v.trim())
                ? "A column with this name already exists"
                : null,
      ref: (v, values) => (!editing && values.type === "relation" && !v ? "Choose the table to link to" : null),
    },
  });

  useEffect(() => {
    if (!opened) return;
    setNameTouched(Boolean(column));
    form.setValues(
      column
        ? {
            type: column.type === "richText" ? "richtext" : column.type,
            label: column.label || column.name,
            name: column.name,
            required: Boolean(column.required),
            indexed: Boolean(column.indexed),
            showInTable: column.showInTable !== false,
            ref: column.ref ?? null,
            multiple: Boolean(column.multiple),
          }
        : NEW_COLUMN
    );
    form.resetDirty();
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, column]);

  const indexable = INDEXABLE_TYPES.includes(form.values.type);
  const setType = (type: string) => {
    form.setFieldValue("type", type);
    if (!INDEXABLE_TYPES.includes(type)) form.setFieldValue("indexed", false);
  };

  const submit = form.onSubmit(async (v) => {
    try {
      if (editing) {
        await update.mutateAsync({
          label: v.label.trim(),
          type: v.type,
          showInTable: v.showInTable,
          required: v.required,
          indexed: indexable && v.indexed,
        });
      } else {
        await add.mutateAsync({
          name: v.name.trim(),
          label: v.label.trim(),
          type: v.type,
          showInTable: v.showInTable,
          required: v.required,
          indexed: indexable && v.indexed,
          ref: v.type === "relation" ? v.ref : null,
          multiple: v.type === "relation" ? v.multiple : false,
        });
      }
      onClose();
    } catch (err) {
      form.setErrors({ label: errorMessage(err, "Couldn't save the column") });
    }
  });

  // editing: a relation can't change type, and other columns can't become relations
  // (the linked table is chosen when the column is created)
  const editTypes = columnTypes
    .filter((t) => (column?.type === "relation" ? t.value === "relation" : t.value !== "relation"))
    .map((t) => ({ value: t.value, label: t.label }));

  const tableOptions = (tables as { tableName: string }[]).map((t) => ({
    value: t.tableName,
    label: tableTitle(t.tableName),
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? `Edit column "${column?.label || column?.name}"` : "Add column"}
      size={editing ? "md" : "xl"}
      fullScreen={fullScreen}
    >
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          {editing ? (
            <Select
              label="Type"
              data={editTypes}
              value={form.values.type}
              onChange={(v) => v && setType(v)}
              allowDeselect={false}
              disabled={column?.type === "relation"}
              description={
                column?.type === "relation"
                  ? `Links to ${tableTitle(column.ref ?? "")}. Delete and re-add the column to link elsewhere.`
                  : "Changing the type doesn't convert existing values."
              }
            />
          ) : (
            <Stack gap={6}>
              <Text size="sm" fw={500}>
                Type
              </Text>
              <TypePicker value={form.values.type} onChange={setType} />
            </Stack>
          )}

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Label"
              description="Shown to people above the field and as the column header"
              placeholder="e.g. Order date"
              withAsterisk
              data-autofocus
              {...form.getInputProps("label")}
              onChange={(e) => {
                const label = e.currentTarget.value;
                form.setFieldValue("label", label);
                if (!editing && !nameTouched) form.setFieldValue("name", slugify(label));
              }}
            />
            <TextInput
              label="Column name"
              description={editing ? "Can't be changed once created" : "Used in imports, exports and the API"}
              placeholder="e.g. order_date"
              ff="monospace"
              withAsterisk={!editing}
              disabled={editing}
              {...form.getInputProps("name")}
              onChange={(e) => {
                setNameTouched(true);
                form.setFieldValue("name", e.currentTarget.value);
              }}
            />
          </SimpleGrid>

          {form.values.type === "relation" && !editing && (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Select
                label="Links to table"
                placeholder="Choose a table"
                data={tableOptions}
                searchable
                withAsterisk
                {...form.getInputProps("ref")}
              />
              <Switch
                mt={{ base: 0, sm: 30 }}
                label="Allow several records"
                description="e.g. several tags instead of one"
                {...form.getInputProps("multiple", { type: "checkbox" })}
              />
            </SimpleGrid>
          )}

          <Stack gap="sm">
            <Switch
              label="Required"
              description="Records can't be saved without a value"
              {...form.getInputProps("required", { type: "checkbox" })}
            />
            <Switch
              label="Show in the records list"
              description="Users can still show or hide it from the table's view options"
              {...form.getInputProps("showInTable", { type: "checkbox" })}
            />
            <Switch
              label={
                <Group gap={6}>
                  Indexed for fast sorting
                  {!indexable && <Badge size="xs" color="gray">Not available for {columnTypeInfo(form.values.type).label}</Badge>}
                </Group>
              }
              description={INDEXED_HELP}
              disabled={!indexable}
              {...form.getInputProps("indexed", { type: "checkbox" })}
            />
          </Stack>

          <Group justify="flex-end" gap="xs" mt="xs">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={add.isPending || update.isPending}>
              {editing ? "Save column" : "Add column"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
