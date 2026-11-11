import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { ReactNode } from "react";

// Confirmation for destructive actions only (delete, disable, reset).
// Never confirm saves or other reversible actions; see UI_GUIDELINES.md §7.
export function confirmDanger({
  title,
  message,
  confirmLabel,
  onConfirm,
}: {
  title: string;
  message: ReactNode;
  // say what happens: "Delete record", not "OK"
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}) {
  modals.openConfirmModal({
    title,
    children: typeof message === "string" ? <Text size="sm">{message}</Text> : message,
    labels: { confirm: confirmLabel, cancel: "Cancel" },
    confirmProps: { color: "red" },
    cancelProps: { variant: "default" },
    // failures are shown by the mutation hooks (a notification); keep them
    // out of the page's unhandled errors
    onConfirm: () => {
      Promise.resolve()
        .then(onConfirm)
        .catch((err) => console.warn("confirmed action failed:", err));
    },
  });
}
