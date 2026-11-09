import { useState } from "react";
import {
  Alert,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertCircle, IconLock, IconUser } from "@tabler/icons-react";

import { errorMessage, login } from "../api/api";

export default function LoginPage({ onLoggedIn }: { onLoggedIn: (user: any) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setError(errorMessage(err, "Could not reach the server"));
      form.setFieldValue("password", "");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Center mih="100vh" bg="var(--mantine-color-gray-0)" p="md">
      <Paper withBorder shadow="sm" radius="md" p="xl" w="100%" maw={400}>
        <form onSubmit={submit}>
          <Stack>
            <div>
              <Title order={3}>ERP - Zenin</Title>
              <Text size="sm" c="dimmed">
                Sign in to continue
              </Text>
            </div>

            {error && (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                {error}
              </Alert>
            )}

            <TextInput
              label="Username"
              leftSection={<IconUser size={16} />}
              autoComplete="username"
              autoFocus
              {...form.getInputProps("username")}
            />
            <PasswordInput
              label="Password"
              leftSection={<IconLock size={16} />}
              autoComplete="current-password"
              {...form.getInputProps("password")}
            />

            <Button type="submit" loading={submitting} fullWidth mt="sm">
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
