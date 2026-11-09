import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconDeviceFloppy, IconKey, IconUser } from "@tabler/icons-react";

import { changePassword, errorMessage, updateProfile } from "../api/api";
import { useCurrentUser } from "../auth/AuthContext";

const MIN_PASSWORD = 8;

export default function ProfilePage() {
  const { user, refresh } = useCurrentUser();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profile = useForm({
    initialValues: { fullName: user.fullName, email: user.email, phone: user.phone },
    validate: {
      email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Invalid email address"),
    },
  });

  // keep the form in sync if the user record is refreshed
  useEffect(() => {
    profile.setValues({ fullName: user.fullName, email: user.email, phone: user.phone });
    profile.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.fullName, user.email, user.phone]);

  const password = useForm({
    initialValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    validate: {
      currentPassword: (v) => (v ? null : "Enter your current password"),
      newPassword: (v) =>
        v.length >= MIN_PASSWORD ? null : `At least ${MIN_PASSWORD} characters`,
      confirmPassword: (v, values) => (v === values.newPassword ? null : "Passwords don't match"),
    },
  });

  const saveProfile = profile.onSubmit(async (values) => {
    setSavingProfile(true);
    try {
      await updateProfile(values);
      await refresh();
      notifications.show({ title: "Profile updated", message: "Your details were saved", color: "green" });
    } catch (err) {
      notifications.show({ title: "Couldn't save profile", message: errorMessage(err), color: "red" });
    } finally {
      setSavingProfile(false);
    }
  });

  const savePassword = password.onSubmit(async ({ currentPassword, newPassword }) => {
    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      password.reset();
      notifications.show({
        title: "Password changed",
        message: "Other devices have been signed out",
        color: "green",
      });
    } catch (err) {
      notifications.show({ title: "Couldn't change password", message: errorMessage(err), color: "red" });
    } finally {
      setSavingPassword(false);
    }
  });

  return (
    <Box p="md" maw={900}>
      <Title order={2} mb="md">
        My profile
      </Title>

      <Card withBorder radius="md" p="lg" mb="lg">
        <Group mb="md">
          <IconUser size={22} />
          <Title order={4}>Account</Title>
        </Group>

        <Grid mb="md">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Text size="xs" c="dimmed">Username</Text>
            <Text fw={500}>{user.username}</Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Text size="xs" c="dimmed">Role</Text>
            <Badge color={user.role.isAdmin ? "red" : "blue"} variant="light">
              {user.role.name}
            </Badge>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Text size="xs" c="dimmed">Departments</Text>
            <Group gap={4}>
              {user.departments.length ? (
                user.departments.map((d) => (
                  <Badge key={d._id} variant="outline">{d.name}</Badge>
                ))
              ) : (
                <Text size="sm" c="dimmed">None</Text>
              )}
            </Group>
          </Grid.Col>
        </Grid>

        <Divider mb="md" />

        <form onSubmit={saveProfile}>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput label="Full name" {...profile.getInputProps("fullName")} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput label="Email" {...profile.getInputProps("email")} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput label="Phone" {...profile.getInputProps("phone")} />
            </Grid.Col>
          </Grid>
          <Group justify="flex-end" mt="md">
            <Button
              type="submit"
              loading={savingProfile}
              disabled={!profile.isDirty()}
              leftSection={<IconDeviceFloppy size={14} />}
            >
              Save details
            </Button>
          </Group>
        </form>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Group mb="md">
          <IconKey size={22} />
          <Title order={4}>Change password</Title>
        </Group>

        <form onSubmit={savePassword}>
          <Stack maw={400}>
            <PasswordInput
              label="Current password"
              autoComplete="current-password"
              {...password.getInputProps("currentPassword")}
            />
            <PasswordInput
              label="New password"
              description={`At least ${MIN_PASSWORD} characters`}
              autoComplete="new-password"
              {...password.getInputProps("newPassword")}
            />
            <PasswordInput
              label="Confirm new password"
              autoComplete="new-password"
              {...password.getInputProps("confirmPassword")}
            />
            <Group>
              <Button type="submit" loading={savingPassword}>
                Change password
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Box>
  );
}
