import { Button, Group, Paper, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import type { LiveChange } from "./live";

const who = (list: LiveChange[]) => {
  const names = [...new Set(list.map((c) => c.byName))];
  return names.length === 1 ? names[0] : `${names[0]} and ${names.length - 1} other${names.length > 2 ? "s" : ""}`;
};

// "Hana changed this list · Refresh"
export function LiveChangeBar({
  changes: list,
  subject,
  onRefresh,
  editing,
}: {
  changes: LiveChange[];
  subject: "list" | "record";
  onRefresh?: () => void;
  // in the edit form: a warning, no refresh (that would lose the edits)
  editing?: boolean;
}) {
  if (!list.length) return null;
  const deleted = subject === "record" && list.some((c) => c.deleted);
  const text = deleted
    ? `${who(list.filter((c) => c.deleted))} deleted this record`
    : editing
      ? `${who(list)} just changed this record. When you save, you'll be asked before replacing their changes.`
      : `${who(list)} changed this ${subject}${list.length > 1 && subject === "list" ? ` (${list.length} changes)` : ""}`;
  return (
    <Paper
      role="status"
      px="md"
      py="xs"
      mb="md"
      radius="md"
      style={{ border: "1px solid var(--mantine-color-blue-light-hover)", background: "var(--mantine-color-blue-light)" }}
    >
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Text size="sm">{text}</Text>
        {onRefresh && !editing && !deleted && (
          <Button size="xs" variant="white" leftSection={<IconRefresh size={14} />} onClick={onRefresh}>
            Refresh
          </Button>
        )}
      </Group>
    </Paper>
  );
}
