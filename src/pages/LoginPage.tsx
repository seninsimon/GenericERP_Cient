import { useState, type KeyboardEvent } from "react";
import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconAlertCircle,
  IconBuilding,
  IconHistory,
  IconLock,
  IconShieldLock,
  IconTable,
  IconUser,
} from "@tabler/icons-react";

import { errorMessage, login } from "../api/api";
import type { CurrentUser } from "../auth/AuthContext";
import { BrandMark } from "../components/ui/BrandMark";

const FEATURES = [
  { icon: IconTable, text: "Build the tables your team needs, no code required" },
  { icon: IconShieldLock, text: "Roles and departments decide who sees what" },
  { icon: IconHistory, text: "Every change is recorded in the audit log" },
];

function Logo({ size = 36 }: { size?: number }) {
  return <BrandMark size={size} nameSize="lg" />;
}

export default function LoginPage({ onLoggedIn }: { onLoggedIn: (user: CurrentUser) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const form = useForm({
    initialValues: { username: "", password: "" },
    validate: {
      username: (v) => (v.trim() ? null : "Enter your username"),
      password: (v) => (v ? null : "Enter your password"),
    },
  });

  const submit = form.onSubmit(async ({ username, password }) => {
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await login(username.trim(), password);
      onLoggedIn(data.user);
    } catch (err) {
      setError(errorMessage(err, "Could not reach the server. Check your connection and try again."));
      form.setFieldValue("password", "");
    } finally {
      setSubmitting(false);
    }
  });

  const checkCaps = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  return (
    <Box mih="100dvh" style={{ display: "flex", background: "var(--app-bg)" }}>
      {/* brand panel (md and up) */}
      <Box
        visibleFrom="md"
        w="44%"
        maw={620}
        p={48}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(160deg, var(--mantine-primary-color-light) 0%, var(--app-surface) 70%)",
          borderRight: "1px solid var(--app-border)",
        }}
      >
        <Logo />
        <Stack gap="xl" maw={420}>
          <Title order={1} fz={30} lh={1.2}>
            Your company's data, organised and in one place.
          </Title>
          <Stack gap="md" component="ul" p={0} m={0} style={{ listStyle: "none" }}>
            {FEATURES.map(({ icon: Icon, text }) => (
              <Group key={text} gap="sm" wrap="nowrap" component="li">
                <ThemeIcon variant="light" size={32} radius="md" aria-hidden>
                  <Icon size={18} stroke={1.75} />
                </ThemeIcon>
                <Text size="sm">{text}</Text>
              </Group>
            ))}
          </Stack>
        </Stack>
        <Group gap={6}>
          <IconBuilding size={14} opacity={0.6} />
          <Text size="xs" c="dimmed">
            Accounts are created by your administrator.
          </Text>
        </Group>
      </Box>

      {/* sign-in form */}
      <Center style={{ flex: 1 }} p={{ base: "md", sm: "xl" }}>
        <Box w="100%" maw={380} component="main">
          <Box hiddenFrom="md" mb="xl">
            <Logo />
          </Box>
          <Stack gap={4} mb="lg">
            <Title order={2}>Sign in</Title>
            <Text size="sm" c="dimmed">
              Welcome back. Enter your details to continue.
            </Text>
          </Stack>

          <form onSubmit={submit} noValidate>
            <Stack gap="md">
              {error && (
                <Alert color="red" icon={<IconAlertCircle size={16} />} role="alert">
                  {error}
                </Alert>
              )}
              <TextInput
                label="Username"
                leftSection={<IconUser size={16} />}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                size="md"
                {...form.getInputProps("username")}
              />
              <PasswordInput
                label="Password"
                leftSection={<IconLock size={16} />}
                autoComplete="current-password"
                size="md"
                onKeyUp={checkCaps}
                onKeyDown={checkCaps}
                description={capsLock ? "Caps Lock is on" : undefined}
                inputWrapperOrder={["label", "input", "description", "error"]}
                styles={{ description: { color: "var(--mantine-color-orange-text)" } }}
                visibilityToggleButtonProps={{ "aria-label": "Show or hide password" }}
                {...form.getInputProps("password")}
              />
              <Button type="submit" loading={submitting} fullWidth size="md" mt="xs">
                Sign in
              </Button>
            </Stack>
          </form>
          <Text size="sm" ta="center" mt="xl">
            <Anchor href="/forgot-password">Forgot your password?</Anchor>
          </Text>
        </Box>
      </Center>
    </Box>
  );
}
