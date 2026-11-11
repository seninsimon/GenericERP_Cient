import { ActionIcon, Anchor, Box, Group, Indicator, Popover, ScrollArea, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/api";
import { formatRelative } from "../lib/format";
import { recordPath } from "./nav";

type Notice = {
  _id: string;
  title: string;
  body: string;
  tableName: string | null;
  recordId: string | null;
  actor: string;
  read: boolean;
  createdAt: string;
};

// The bell: "Asha put you as Assignee", "Your leave request was approved".
export function NotificationBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [opened, setOpened] = useState(false);
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get<{ unread: number; items: Notice[] }>("/notifications")).data,
    refetchInterval: 60_000,
  });
  const read = useMutation({
    mutationFn: async (ids?: string[]) => api.post("/notifications/read", ids ? { ids } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  const open = (n: Notice) => {
    if (!n.read) read.mutate([n._id]);
    setOpened(false);
    if (n.tableName && n.recordId) navigate(recordPath(n.tableName, n.recordId));
  };

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" width={340} shadow="md" withinPortal>
      <Popover.Target>
        <Tooltip label={unread ? `${unread} new` : "Notifications"} disabled={opened}>
          <Indicator disabled={!unread} label={unread > 9 ? "9+" : unread} size={16} offset={6} color="red">
            <ActionIcon aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} onClick={() => setOpened((o) => !o)}>
              <IconBell size={18} />
            </ActionIcon>
          </Indicator>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group justify="space-between" px="md" py="sm" style={{ borderBottom: "1px solid var(--app-border)" }}>
          <Text fw={600} size="sm">
            Notifications
          </Text>
          {unread > 0 && (
            <Anchor component="button" size="xs" onClick={() => read.mutate(undefined)}>
              Mark all as read
            </Anchor>
          )}
        </Group>
        {items.length ? (
          <ScrollArea.Autosize mah={420} type="auto">
            <Stack gap={0}>
              {items.map((n) => (
                <UnstyledButton
                  key={n._id}
                  onClick={() => open(n)}
                  px="md"
                  py="sm"
                  bg={n.read ? undefined : "var(--mantine-primary-color-light)"}
                  style={{ borderBottom: "1px solid var(--app-border)" }}
                >
                  <Group gap="xs" wrap="nowrap" align="flex-start">
                    <Box
                      mt={6}
                      w={8}
                      h={8}
                      style={{ borderRadius: 8, flexShrink: 0, background: n.read ? "transparent" : "var(--mantine-primary-color-filled)" }}
                      aria-hidden
                    />
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={n.read ? 400 : 600} lineClamp={2}>
                        {n.title}
                      </Text>
                      {n.body && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {n.body}
                        </Text>
                      )}
                      <Text size="xs" c="dimmed">
                        {formatRelative(n.createdAt)}
                      </Text>
                    </div>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        ) : (
          <Text size="sm" c="dimmed" p="md">
            Nothing yet. You'll see here when someone assigns you, or a status you care about changes.
          </Text>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
