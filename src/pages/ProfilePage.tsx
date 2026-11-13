import { useEffect, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  CheckIcon,
  ColorSwatch,
  Group,
  PasswordInput,
  Progress,
  Radio,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  type MantineColorScheme,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";

import { changePassword, errorMessage, updateProfile } from "../api/api";
import { useCurrentUser } from "../auth/AuthContext";
import { Page, Section } from "../components/ui/Page";
import { initialsOf } from "../layout/UserMenu";
import { usePreferences } from "../lib/preferences";
import { formatDateTime } from "../lib/format";
import { ACCENTS, type Accent } from "../theme/theme";

const MIN_PASSWORD = 8;

// 0-4: length, mixed case, digits, symbols
function passwordStrength(value: string) {
  let score = 0;
  if (value.length >= MIN_PASSWORD) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value) && /[^a-zA-Z0-9]/.test(value)) score++;
  return score;
}
const STRENGTH = [
  { label: "Too short", color: "red" },
  { label: "Weak", color: "red" },
  { label: "Fair", color: "yellow" },
  { label: "Good", color: "teal" },
  { label: "Strong", color: "teal" },
];

export default function ProfilePage() {
  const { user, refresh } = useCurrentUser();
  const { accent, setPreference } = usePreferences();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const name = user.fullName || user.username;

  const profile = useForm({
    initialValues: { fullName: user.fullName, email: user.email, phone: user.phone },
    validate: {
      email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email address, e.g. name@company.com"),
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
      newPassword: (v) => (v.length >= MIN_PASSWORD ? null : `Use at least ${MIN_PASSWORD} characters`),
      confirmPassword: (v, values) => (v === values.newPassword ? null : "The passwords don't match"),
    },
  });

  const saveProfile = profile.onSubmit(async (values) => {
    setSavingProfile(true);
    try {
      await updateProfile(values);
      await refresh();
      notifications.show({ title: "Profile saved", message: "Your details were updated", color: "teal" });
    } catch (err) {
      notifications.show({ title: "Couldn't save your profile", message: errorMessage(err), color: "red" });
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
        message: "Your other devices have been signed out",
        color: "teal",
      });
    } catch (err) {
      const message = errorMessage(err);
      if (/current password/i.test(message)) password.setFieldError("currentPassword", message);
      else notifications.show({ title: "Couldn't change your password", message, color: "red" });
    } finally {
      setSavingPassword(false);
    }
  });

  const strength = passwordStrength(password.values.newPassword);

  return (
    <Page title="My profile" breadcrumbs={[{ label: "My profile" }]} width="narrow">
      {/* identity */}
      <Group gap="lg" mb="xl" wrap="nowrap" align="center">
        <Avatar size={72} radius="xl" color="initials" name={name}>
          {initialsOf(name)}
        </Avatar>
        <Stack gap={6} style={{ minWidth: 0 }}>
          <Title order={2} style={{ overflowWrap: "anywhere" }}>
            {name}
          </Title>
          <Group gap={6} wrap="wrap">
            <Text size="sm" c="dimmed">
              @{user.username}
            </Text>
            <Badge color={user.role.isAdmin ? "red" : "blue"}>{user.role.name}</Badge>
            {user.departments.map((d) => (
              <Badge key={d._id} variant="default">
                {d.name}
              </Badge>
            ))}
          </Group>
          {user.lastLoginAt && (
            <Text size="xs" c="dimmed">
              Last sign-in {formatDateTime(user.lastLoginAt)}
            </Text>
          )}
        </Stack>
      </Group>

      <Stack gap="lg">
        <Section title="Personal details" description="How you appear to others in the app.">
          <form onSubmit={saveProfile}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput label="Full name" autoComplete="name" {...profile.getInputProps("fullName")} />
              <TextInput label="Username" value={user.username} disabled description="Only an administrator can change it" />
              <TextInput label="Email" type="email" autoComplete="email" {...profile.getInputProps("email")} />
              <TextInput label="Phone" type="tel" autoComplete="tel" {...profile.getInputProps("phone")} />
            </SimpleGrid>
            <Group justify="flex-end" mt="lg" gap="xs">
              {profile.isDirty() && (
                <Button variant="default" onClick={() => profile.reset()}>
                  Discard
                </Button>
              )}
              <Button type="submit" loading={savingProfile} disabled={!profile.isDirty()}>
                Save changes
              </Button>
            </Group>
          </form>
        </Section>

        <Section title="Email" description="What you get by email: requests waiting for you, decisions on yours, things given to you.">
          {user.email ? (
            <Radio.Group
              value={user.emailPref ?? "now"}
              onChange={async (v) => {
                try {
                  await updateProfile({ emailPref: v as "now" | "daily" | "never" });
                  await refresh();
                  notifications.show({ title: "Saved", message: "Your email choice was updated", color: "teal" });
                } catch (err) {
                  notifications.show({ title: "Couldn't save", message: errorMessage(err), color: "red" });
                }
              }}
            >
              <Stack gap="sm">
                <Radio value="now" label="Right away" description="One email each time something needs you" />
                <Radio value="daily" label="Once a day" description="Everything in the morning summary" />
                <Radio value="never" label="Never" description="Only the bell in Zenin ERP (password emails still come)" />
              </Stack>
            </Radio.Group>
          ) : (
            <Text size="sm" c="dimmed">
              Add your email address above to get emails.
            </Text>
          )}
        </Section>

        <Section
          title="Password"
          description="Use at least 8 characters. A longer password with mixed case, numbers and symbols is stronger."
        >
          <form onSubmit={savePassword}>
            <Stack gap="md" maw={420}>
              <PasswordInput
                label="Current password"
                autoComplete="current-password"
                {...password.getInputProps("currentPassword")}
              />
              <Box>
                <PasswordInput
                  label="New password"
                  autoComplete="new-password"
                  {...password.getInputProps("newPassword")}
                />
                {password.values.newPassword && (
                  <Group gap="xs" mt={6} wrap="nowrap" aria-live="polite">
                    <Progress
                      value={(strength / 4) * 100}
                      color={STRENGTH[strength].color}
                      size="sm"
                      style={{ flex: 1 }}
                      aria-label="Password strength"
                    />
                    <Text size="xs" c="dimmed" w={64}>
                      {STRENGTH[strength].label}
                    </Text>
                  </Group>
                )}
              </Box>
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
        </Section>

        <Section title="Appearance" description="Saved on this device.">
          <Stack gap="lg">
            <Box>
              <Text size="sm" fw={500} mb={6} id="scheme-label">
                Colour scheme
              </Text>
              <SegmentedControl
                aria-labelledby="scheme-label"
                value={colorScheme}
                onChange={(v) => setColorScheme(v as MantineColorScheme)}
                data={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "auto", label: "System" },
                ]}
              />
            </Box>
            <Box>
              <Text size="sm" fw={500} mb={6} id="accent-label">
                Accent colour
              </Text>
              <Group gap="sm" role="radiogroup" aria-labelledby="accent-label">
                {(Object.keys(ACCENTS) as Accent[]).map((key) => (
                  <Stack key={key} gap={4} align="center">
                    <ColorSwatch
                      component="button"
                      type="button"
                      role="radio"
                      aria-checked={accent === key}
                      aria-label={ACCENTS[key]}
                      color={theme.colors[key][6]}
                      size={32}
                      onClick={() => setPreference("accent", key)}
                      style={{ color: "white", cursor: "pointer" }}
                    >
                      {accent === key && <CheckIcon size={12} />}
                    </ColorSwatch>
                    <Text size="xs" c="dimmed">
                      {ACCENTS[key]}
                    </Text>
                  </Stack>
                ))}
              </Group>
            </Box>
          </Stack>
        </Section>
      </Stack>
    </Page>
  );
}
