import { useEffect, useState, type ReactNode } from "react";
import { Alert, Anchor, Box, Button, Center, Group, Loader, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title } from "@mantine/core";
import { IconAlertCircle, IconCircleCheck, IconLock, IconUser } from "@tabler/icons-react";
import { useSearchParams } from "react-router-dom";

import api, { errorMessage } from "../api/api";

// Public pages (no sign-in): "Forgot password?" and the "set your password"
// link from a welcome or reset email.

function Shell({ title, intro, children, back = true }: { title: string; intro?: ReactNode; children: ReactNode; back?: boolean }) {
  return (
    <Center mih="100dvh" p="md" style={{ background: "var(--app-bg)" }}>
      <Box w="100%" maw={400} component="main">
        <Group gap={10} wrap="nowrap" mb="xl">
          <ThemeIcon size={36} radius="md" variant="filled" aria-hidden>
            <Text fw={800} fz={18} c="white">
              Z
            </Text>
          </ThemeIcon>
          <Text fw={700} fz="lg" lh={1}>
            Zenin ERP
          </Text>
        </Group>
        <Stack gap={4} mb="lg">
          <Title order={2}>{title}</Title>
          {intro && (
            <Text size="sm" c="dimmed">
              {intro}
            </Text>
          )}
        </Stack>
        {children}
        {back && (
          <Text size="sm" ta="center" mt="xl">
            <Anchor href="/">Back to sign in</Anchor>
          </Text>
        )}
      </Box>
    </Center>
  );
}

export function ForgotPasswordPage() {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return setError("Enter your username or email address");
    setSending(true);
    setError(null);
    try {
      const { data } = await api.post<{ message: string }>("/auth/forgot", { login: value.trim() });
      setDone(data.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Shell title="Forgot your password?" intro="We'll email you a link to choose a new one.">
      {done ? (
        <Alert color="green" icon={<IconCircleCheck size={16} />} role="status">
          {done}
        </Alert>
      ) : (
        <form onSubmit={submit} noValidate>
          <Stack gap="md">
            {error && (
              <Alert color="red" icon={<IconAlertCircle size={16} />} role="alert">
                {error}
              </Alert>
            )}
            <TextInput
              label="Username or email address"
              leftSection={<IconUser size={16} />}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              size="md"
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
            />
            <Button type="submit" loading={sending} fullWidth size="md">
              Email me a link
            </Button>
          </Stack>
        </form>
      )}
    </Shell>
  );
}

export function SetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [owner, setOwner] = useState<{ username: string; fullName: string; purpose: string } | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .get<{ username: string; fullName: string; purpose: string }>("/auth/password-link", { params: { token } })
      .then((r) => setOwner(r.data))
      .catch(() => setOwner(null));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repeat) return setError("The two passwords don't match");
    setSaving(true);
    setError(null);
    try {
      await api.post("/auth/set-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (owner === undefined) {
    return (
      <Center mih="100dvh">
        <Loader />
      </Center>
    );
  }
  if (owner === null) {
    return (
      <Shell title="This link doesn't work any more">
        <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
          It has expired or was already used. Ask for a new one with{" "}
          <Anchor href="/forgot-password" inherit>
            Forgot your password?
          </Anchor>
        </Alert>
      </Shell>
    );
  }
  const first = (owner.fullName || owner.username).split(/\s+/)[0];
  return (
    <Shell
      back={!done}
      title={owner.purpose === "invite" ? `Welcome, ${first}` : "Choose a new password"}
      intro={
        <>
          Your username is <b>{owner.username}</b>. Choose a password you don't use anywhere else.
        </>
      }
    >
      {done ? (
        <Stack>
          <Alert color="green" icon={<IconCircleCheck size={16} />} role="status">
            Your password is set.
          </Alert>
          <Button component="a" href="/" size="md">
            Sign in
          </Button>
        </Stack>
      ) : (
        <form onSubmit={submit} noValidate>
          <Stack gap="md">
            {error && (
              <Alert color="red" icon={<IconAlertCircle size={16} />} role="alert">
                {error}
              </Alert>
            )}
            <PasswordInput
              label="New password"
              description="At least 8 characters"
              leftSection={<IconLock size={16} />}
              autoComplete="new-password"
              autoFocus
              size="md"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              visibilityToggleButtonProps={{ "aria-label": "Show or hide password" }}
            />
            <PasswordInput
              label="Type it again"
              leftSection={<IconLock size={16} />}
              autoComplete="new-password"
              size="md"
              value={repeat}
              onChange={(e) => setRepeat(e.currentTarget.value)}
              visibilityToggleButtonProps={{ "aria-label": "Show or hide password" }}
            />
            <Button type="submit" loading={saving} fullWidth size="md">
              Set my password
            </Button>
          </Stack>
        </form>
      )}
    </Shell>
  );
}
