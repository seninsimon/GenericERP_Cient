import {
  Group,
  Text,
  Box,
  Burger,
  useMantineColorScheme,
  ActionIcon,
  Select,
  Popover,
  Stack,
  Divider,
  Progress,
  Loader,
  Menu,
  Avatar,
  UnstyledButton,
} from "@mantine/core";
import {
  IconMoon,
  IconSun,
  IconSettings,
  IconUser,
  IconLogout,
  IconChevronDown,
  IconTransferIn,
} from "@tabler/icons-react";
import { useCurrentUser } from "../auth/AuthContext";
import { useState } from "react";
import { useSystemHealth } from "../api/reactQueryHooks/useHealth";
import { useNavigate } from "react-router-dom";

export default function TopNavbar({
  opened,
  toggle,
  themeName,
  setThemeName,
}: any) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [openedSettings, setOpenedSettings] = useState(false);

  const { user, isAdmin, logout } = useCurrentUser();
  const { data: health, isLoading } = useSystemHealth(isAdmin);
  const navigate = useNavigate();

  const displayName = user.fullName || user.username;
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Box
      px="md"
      style={{
        height: 60,
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid #E5E7EB",
        background: colorScheme === "dark" ? "#111827" : "#FFFFFF",
      }}
    >
      <Group justify="space-between" w="100%">
        <Group>
          <Burger opened={opened} onClick={toggle} size="sm" />

          <Text
            fw={700}
            size="lg"
            style={{
              cursor: "pointer",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "4px",
            }}
            onClick={() => navigate("/")}
          >
            ERP - Zenin
          </Text>
        </Group>

        <Group>
          <Popover
            opened={openedSettings}
            onChange={setOpenedSettings}
            position="bottom-end"
            shadow="md"
            width={240}
          >
            <Popover.Target>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => setOpenedSettings((o) => !o)}
              >
                <IconSettings size={18} />
              </ActionIcon>
            </Popover.Target>

            <Popover.Dropdown>
              <Stack gap="sm">
                {/* Dark / Light Mode */}
                <Group justify="space-between">
                  <Text size="sm">Mode</Text>

                  <ActionIcon
                    variant="light"
                    onClick={() => toggleColorScheme()}
                  >
                    {colorScheme === "dark" ? (
                      <IconSun size={16} />
                    ) : (
                      <IconMoon size={16} />
                    )}
                  </ActionIcon>
                </Group>

                {/* Theme Selector */}
                <Select
                  label="Theme"
                  value={themeName}
                  onChange={setThemeName}
                  data={[
                    { value: "blue", label: "Blue Theme" },
                    { value: "green", label: "Green Theme" },
                    { value: "gray", label: "Gray Theme" },
                    { value: "violet", label: "Violet Theme" },
                    { value: "", label: "Default" },
                  ]}
                />

                {/* System Health (admins only) */}
                {isAdmin && (
                <>
                <Divider />

                <Text fw={600} size="sm">
                  System Health
                </Text>

                {isLoading ? (
                  <Loader size="sm" />
                ) : (
                  <>
                    <Stack gap={4}>
                      <Text size="xs">CPU {health?.cpu}%</Text>
                      <Progress value={health?.cpu} color="orange" size="sm" />
                    </Stack>

                    <Stack gap={4}>
                      <Text size="xs">
                        RAM {health?.ram}% ({health?.ramUsed} /{" "}
                        {health?.ramTotal} GB)
                      </Text>
                      <Progress value={health?.ram} color="blue" size="sm" />
                    </Stack>

                    <Stack gap={4}>
                      <Text size="xs">
                        Disk {health?.disk}% ({health?.diskUsed} /{" "}
                        {health?.diskTotal} GB)
                      </Text>
                      <Progress value={health?.disk} color="green" size="sm" />
                    </Stack>
                  </>
                )}
                </>
                )}
              </Stack>
            </Popover.Dropdown>
          </Popover>

          {/* USER MENU */}
          <Menu position="bottom-end" shadow="md" width={220}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap={8}>
                  <Avatar size={32} radius="xl" color="blue">
                    {initials}
                  </Avatar>
                  <Box visibleFrom="sm">
                    <Text size="sm" fw={500} lh={1.2}>
                      {displayName}
                    </Text>
                    <Text size="xs" c="dimmed" lh={1.2}>
                      {user.role.name}
                    </Text>
                  </Box>
                  <IconChevronDown size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Signed in as {user.username}</Menu.Label>
              <Menu.Item
                leftSection={<IconUser size={16} />}
                onClick={() => navigate("/profile")}
              >
                My profile
              </Menu.Item>
              <Menu.Item
                leftSection={<IconTransferIn size={16} />}
                onClick={() => navigate("/jobs")}
              >
                Imports &amp; exports
              </Menu.Item>
              {isAdmin && (
                <Menu.Item
                  leftSection={<IconSettings size={16} />}
                  onClick={() => navigate("/settings")}
                >
                  Settings
                </Menu.Item>
              )}
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
        </Group>
      </Group>
    </Box>
  );
}
