import { useState } from "react";
import { Alert, Button, Checkbox, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import api, { errorMessage } from "../../api/api";
import { FieldInput } from "./fields/FieldInput";
import { bulkFields, columnLabel, type RecordColumn } from "./schema";

// Set one field to one value on the selected records ("mark these 12 as
// Contacted"). The server applies the same rules as editing one record and
// skips (and lists) any it can't change.


const plural = (n: number) => `${n} ${n === 1 ? "record" : "records"}`;

export function BulkUpdateModal({
  table,
  columns,
  ids,
  opened,
  onClose,
  onDone,
}: {
  table: string;
  columns: RecordColumn[];
  ids: string[];
  opened: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const fields = bulkFields(columns);
  const [field, setField] = useState<string | null>(null);
  const [value, setValue] = useState<unknown>(null);
  const [clear, setClear] = useState(false);
  const [saving, setSaving] = useState(false);
  const column = fields.find((c) => c.name === field);
  const empty = value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length);

  const close = () => {
    setField(null);
    setValue(null);
    setClear(false);
    onClose();
  };

  const apply = async () => {
    if (!column) return;
    setSaving(true);
    try {
      const { data } = await api.post<{ updated: number; skipped: { id: string; message: string }[] }>(
        `/table/${encodeURIComponent(table)}/bulk-update`,
        { ids, field: column.name, value: clear ? null : value }
      );
      for (const key of ["tableData", "singleData", "related", "tile"]) qc.invalidateQueries({ queryKey: [key] });
      if (data.skipped.length) {
        notifications.show({
          title: `${plural(data.updated)} updated, ${data.skipped.length} not changed`,
          message: `Why: ${data.skipped[0].message}${data.skipped.length > 1 ? ` (and ${data.skipped.length - 1} more)` : ""}`,
          color: "yellow",
          autoClose: 10_000,
        });
      } else {
        notifications.show({ message: `${columnLabel(column)} updated on ${plural(data.updated)}`, color: "green" });
      }
      onDone();
      close();
    } catch (err) {
      notifications.show({ title: "Couldn't update", message: errorMessage(err), color: "red" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title={`Update ${plural(ids.length)}`} size="md">
      <Stack gap="md">
        <Select
          label="Field"
          placeholder="Choose the field to change"
          data={fields.map((c) => ({ value: c.name, label: columnLabel(c) }))}
          value={field}
          onChange={(v) => {
            setField(v);
            setValue(null);
            setClear(false);
          }}
          searchable
          data-autofocus
        />
        {column && !clear && (
          // the same input as the edit form (a dropdown for choices, a person picker, a date picker…)
          <FieldInput key={column.name} id="bulk-value" column={{ ...column, required: false }} value={value} onChange={setValue} />
        )}
        {column && !column.required && (
          <Checkbox label={`Clear ${columnLabel(column)} instead (leave it empty)`} checked={clear} onChange={(e) => setClear(e.currentTarget.checked)} />
        )}
        {column && (
          <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />} p="sm">
            <Text size="sm">
              {clear ? "Clears" : "Sets"} <b>{columnLabel(column)}</b> on {plural(ids.length)}. Records you can't change are skipped, and you'll see why.
            </Text>
          </Alert>
        )}
        {!fields.length && (
          <Text size="sm" c="dimmed">
            This table has no fields that can be changed for many records at once.
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button onClick={apply} loading={saving} disabled={!column || (!clear && empty && column.type !== "boolean")}>
            {column ? `${clear ? "Clear" : "Update"} ${plural(ids.length)}` : "Update"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
