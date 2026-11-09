import { useState } from "react";
import { Alert, Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import { deleteTable, errorMessage } from "../../api/api";

// "Delete table" with a type-the-name confirmation, since it can't be undone.
export default function DeleteTableButton({
  table,
  onDeleted,
}: {
  table: string;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const close = () => {
    setOpened(false);
    setTyped("");
  };

  const confirm = async () => {
    setDeleting(true);
    try {
      const { data } = await deleteTable(table);
      notifications.show({ title: "Table deleted", message: data.message, color: "green" });
      qc.removeQueries({ queryKey: ["schema", table] });
      qc.removeQueries({ queryKey: ["tableData", table] });
      qc.invalidateQueries({ queryKey: ["tables"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
      close();
      onDeleted();
    } catch (err) {
      notifications.show({ title: "Couldn't delete table", message: errorMessage(err), color: "red" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        size="xs"
        color="red"
        variant="light"
        leftSection={<IconTrash size={14} />}
        onClick={() => setOpened(true)}
      >
        Delete table
      </Button>

      <Modal opened={opened} onClose={close} title={`Delete table "${table}"`} centered>
        <Stack>
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            This permanently deletes the table, <b>all of its records</b> and their uploaded
            files. Role permissions and department assignments for it are removed too. This
            can't be undone.
          </Alert>
          <TextInput
            label={
              <Text size="sm" span>
                Type <b>{table}</b> to confirm
              </Text>
            }
            value={typed}
            onChange={(e) => setTyped(e.currentTarget.value)}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>
              Cancel
            </Button>
            <Button color="red" disabled={typed !== table} loading={deleting} onClick={confirm}>
              Delete table
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
