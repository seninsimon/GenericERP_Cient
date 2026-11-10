import type { ReactNode } from "react";
import { Center, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";

// Shown when a list/page has nothing to display. Always say why and, when
// the user can do something about it, offer the action.
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <Center py={compact ? "lg" : 48} px="md">
      <Stack align="center" gap="xs" maw={420}>
        <ThemeIcon size={compact ? 40 : 52} radius="xl" variant="light" color="gray">
          {icon ?? <IconInbox size={compact ? 20 : 26} stroke={1.5} />}
        </ThemeIcon>
        <Title order={4} ta="center" mt={4}>
          {title}
        </Title>
        {description && (
          <Text size="sm" c="dimmed" ta="center">
            {description}
          </Text>
        )}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </Stack>
    </Center>
  );
}
