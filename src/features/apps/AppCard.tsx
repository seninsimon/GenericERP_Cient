import { Card, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useNavigate } from "react-router-dom";

import { AppIcon } from "./AppIcon";
import { appPath, type LauncherApp } from "./appMenu";

// One app in the launcher (Home): icon, name, what it's for.
export function AppCard({ app }: { app: LauncherApp }) {
  const navigate = useNavigate();
  const count = app.tables.length;
  return (
    <Card padding={0}>
      <UnstyledButton onClick={() => navigate(appPath(app.key))} p="md" h="100%" aria-label={`Open ${app.name}`}>
        <Group gap="md" wrap="nowrap" align="flex-start">
          <AppIcon name={app.icon} size={44} />
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={600} truncate>
              {app.name}
            </Text>
            <Text size="sm" c="dimmed" lineClamp={2}>
              {app.description}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {count} {count === 1 ? "table" : "tables"}
            </Text>
          </Stack>
        </Group>
      </UnstyledButton>
    </Card>
  );
}
