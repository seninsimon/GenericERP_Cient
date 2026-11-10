import { useState } from "react";
import {
  Avatar,
  Box,
  CheckIcon,
  ColorSwatch,
  Group,
  Loader,
  Menu,
  Modal,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
  type MantineColorScheme,
} from "@mantine/core";
import { IconActivity, IconChevronDown, IconLogout, IconSettings, IconUser } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { useSystemHealth } from "../api/reactQueryHooks/useHealth";
import { useCurrentUser } from "../auth/AuthContext";
import { usePreferences } from "../lib/preferences";
import { ACCENTS, type Accent } from "../theme/theme";

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function SystemStatus({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { data, isLoading } = useSystemHealth(opened);
  const row = (label: string, value: number, detail: string, color: string) => (
    <Stack gap={4}>
      <Group justify="space-between">
        <Text size="sm">{label}</Text>
        <Text size="sm" c="dimmed" className="tabular-nums">
          {detail}
        </Text>
      </Group>
      <Progress value={value} color={value > 85 ? "red" : color} aria-label={`${label} ${value}%`} />
    </Stack>
  );
  return (
    <Modal opened={opened} onClose={onClose} title="System status" size="sm">
      {isLoading || !data ? (
        <Loader size="sm" />
      ) : (
        <Stack>
          {row("CPU", Number(data.cpu), `${data.cpu}%`, "blue")}
          {row("Memory", Number(data.ram), `${data.ramUsed} / ${data.ramTotal} GB`, "teal")}
          {row("Disk", Number(data.disk), `${data.diskUsed} / ${data.diskTotal} GB`, "grape")}
        </Stack>
      )}
    </Modal>
  );
}

export default function UserMenu() {
  const { user, isAdmin, logout } = useCurrentUser();
  const { accent, setPreference } = usePreferences();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const [statusOpen, setStatusOpen] = useState(false);
  const name = user.fullName || user.username;

  return (
    <>
      <Menu position="bottom-end" width={260} closeOnItemClick>
        <Menu.Target>
          <UnstyledButton aria-label={`Account menu for ${name}`} ml={4}>
            <Group gap={8} wrap="nowrap">
              <Avatar size={32} radius="xl" color="initials" name={name}>
                {initialsOf(name)}
              </Avatar>
              <Box visibleFrom="md" style={{ lineHeight: 1.2 }}>
                <Text size="sm" fw={500} truncate maw={140}>
                  {name}
                </Text>
                <Text size="xs" c="dimmed" truncate maw={140}>
                  {user.role.name}
                </Text>
              </Box>
              <IconChevronDown size={14} opacity={0.6} />
            </Group>
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Box px="sm" py={6}>
            <Text size="sm" fw={600} truncate>
              {name}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              @{user.username} · {user.role.name}
            </Text>
          </Box>
          <Menu.Divider />
          <Menu.Item leftSection={<IconUser size={16} />} onClick={() => navigate("/profile")}>
            My profile
          </Menu.Item>
          {isAdmin && (
            <>
              <Menu.Item leftSection={<IconSettings size={16} />} onClick={() => navigate("/settings/tables")}>
                Administration
              </Menu.Item>
              <Menu.Item leftSection={<IconActivity size={16} />} onClick={() => setStatusOpen(true)}>
                System status
              </Menu.Item>
            </>
          )}

          <Menu.Divider />
          <Menu.Label>Appearance</Menu.Label>
          <Box px="sm" pb="xs">
            <SegmentedControl
              fullWidth
              size="xs"
              value={colorScheme}
              onChange={(v) => setColorScheme(v as MantineColorScheme)}
              data={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "auto", label: "System" },
              ]}
              aria-label="Colour scheme"
            />
            <Group gap={8} mt="sm" role="radiogroup" aria-label="Accent colour">
              {(Object.keys(ACCENTS) as Accent[]).map((key) => (
                <ColorSwatch
                  key={key}
                  component="button"
                  type="button"
                  role="radio"
                  aria-checked={accent === key}
                  aria-label={ACCENTS[key]}
                  color={theme.colors[key][6]}
                  size={22}
                  onClick={() => setPreference("accent", key)}
                  style={{ color: "white", cursor: "pointer" }}
                >
                  {accent === key && <CheckIcon size={10} />}
                </ColorSwatch>
              ))}
            </Group>
          </Box>

          <Menu.Divider />
          <Menu.Item
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={() => {
              navigate("/");
              logout();
            }}
          >
            Sign out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      {isAdmin && <SystemStatus opened={statusOpen} onClose={() => setStatusOpen(false)} />}
    </>
  );
}
