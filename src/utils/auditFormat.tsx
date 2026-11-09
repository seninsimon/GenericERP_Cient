import { Badge, Code, Group, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";

import type { AuditEntry } from "../api/api";

const MAX_VALUE_LENGTH = 120;

const stripTags = (value: string) =>
  value
    .replace(/<(br|\/p|\/h\d|\/li)\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

// Human-readable rendering of one stored value.
export const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    if (typeof value.url === "string") return value.url;
    return JSON.stringify(value);
  }
  let text = String(value);
  if (/<[a-z][\s\S]*>/i.test(text)) text = stripTags(text);
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text;
};

const ACTION_COLORS: Record<string, string> = {
  create: "green",
  update: "blue",
  delete: "red",
  import: "grape",
  login: "teal",
  logout: "gray",
  login_failed: "orange",
  password_change: "yellow",
  settings: "cyan",
  assign_unassigned: "cyan",
};

export const actionLabel = (action: string) =>
  action.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function ActionBadge({ action }: { action: string }) {
  return (
    <Badge size="sm" variant="light" color={ACTION_COLORS[action] ?? "gray"}>
      {actionLabel(action)}
    </Badge>
  );
}

export const formatTime = (iso: string) => dayjs(iso).format("DD MMM YYYY, HH:mm:ss");

const isFromToMap = (changes: any) =>
  changes &&
  typeof changes === "object" &&
  !Array.isArray(changes) &&
  Object.values(changes).length > 0 &&
  Object.values(changes).every(
    (v: any) => v && typeof v === "object" && !Array.isArray(v) && ("from" in v || "to" in v)
  );

// Readable list of what changed. `labels` maps column names to display labels;
// `names` maps relation field -> record id -> display name.
export function ChangesView({
  changes,
  labels = {},
  names = {},
}: {
  changes: any;
  labels?: Record<string, string>;
  names?: Record<string, Record<string, string>>;
}) {
  const show = (field: string, value: any) => {
    const map = names[field];
    if (!map) return formatValue(value);
    const swap = (v: any) => (typeof v === "string" && map[v] ? map[v] : v);
    return formatValue(Array.isArray(value) ? value.map(swap) : swap(value));
  };

  if (changes === null || changes === undefined) {
    return (
      <Text size="xs" c="dimmed">
        No details
      </Text>
    );
  }

  const labelFor = (key: string) =>
    key === "_department" ? "Department" : (labels[key] ?? key);

  if (isFromToMap(changes)) {
    return (
      <Stack gap={4}>
        {Object.entries(changes).map(([field, change]: [string, any]) => {
          const hasFrom = "from" in change;
          const hasTo = "to" in change;
          return (
            <Group key={field} gap={6} wrap="nowrap" align="flex-start">
              <Text size="xs" fw={600} miw={110} style={{ flexShrink: 0 }}>
                {labelFor(field)}
              </Text>
              <Text size="xs" style={{ wordBreak: "break-word" }}>
                {hasFrom && hasTo ? (
                  <>
                    <Text span size="xs" c="dimmed" td="line-through">
                      {show(field, change.from)}
                    </Text>
                    {"  →  "}
                    {show(field, change.to)}
                  </>
                ) : hasTo ? (
                  show(field, change.to)
                ) : (
                  <Text span size="xs" c="dimmed">
                    {show(field, change.from)}
                  </Text>
                )}
              </Text>
            </Group>
          );
        })}
      </Stack>
    );
  }

  if (typeof changes === "object" && !Array.isArray(changes)) {
    const entries = Object.entries(changes);
    if (!entries.length) {
      return (
        <Text size="xs" c="dimmed">
          No details
        </Text>
      );
    }
    return (
      <Stack gap={4}>
        {entries.map(([key, value]) => (
          <Group key={key} gap={6} wrap="nowrap" align="flex-start">
            <Text size="xs" fw={600} miw={110} style={{ flexShrink: 0 }}>
              {labelFor(key)}
            </Text>
            <Text size="xs" style={{ wordBreak: "break-word" }}>
              {show(key, value)}
            </Text>
          </Group>
        ))}
      </Stack>
    );
  }

  return <Code block>{JSON.stringify(changes, null, 2)}</Code>;
}

// One-line description of an entry, e.g. "Record created in projects".
export const describeEntry = (entry: AuditEntry) => {
  const where = entry.tableName ? ` in ${entry.tableName}` : "";
  switch (entry.entity) {
    case "session":
      return entry.action === "login_failed" ? "Failed login attempt" : actionLabel(entry.action);
    case "record":
      return entry.action === "import"
        ? `Records imported${where}`
        : `Record ${entry.action === "create" ? "created" : entry.action === "delete" ? "deleted" : "updated"}${where}`;
    default:
      return `${actionLabel(entry.entity)} ${actionLabel(entry.action).toLowerCase()}${where}`;
  }
};
