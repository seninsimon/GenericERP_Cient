import { useState } from "react";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  NumberInput,
  PasswordInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconSend } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api, { errorMessage } from "../../api/api";
import { EmptyState } from "../../components/ui/EmptyState";
import { Page, PageHeader, Section } from "../../components/ui/Page";
import { useCurrentUser } from "../../auth/AuthContext";
import { formatDateTime, formatRelative } from "../../lib/format";

type Settings = {
  enabled: boolean;
  provider: "gmail" | "smtp";
  host: string;
  port: number;
  user: string;
  hasPassword: boolean;
  fromName: string;
  fromAddress: string;
  appUrl: string;
  timeZone: string;
  summaryHour: number;
};
type Overview = {
  settings: Settings;
  ready: boolean;
  sentLast24h: number;
  queued: number;
  failed: number;
  recent: { _id: string; to: string; kind: string; subject: string; status: string; attempts: number; error: string | null; createdAt: string; sentAt: string | null }[];
};

const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }));
const ZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Australia/Sydney", "UTC"];
const STATUS: Record<string, { label: string; color: string }> = {
  sent: { label: "Sent", color: "green" },
  queued: { label: "Waiting", color: "blue" },
  failed: { label: "Failed", color: "red" },
};
const GMAIL_DAILY_LIMIT = 500;

export default function EmailSettingsPage() {
  const qc = useQueryClient();
  const { user: me } = useCurrentUser();
  const { data, isLoading } = useQuery({
    queryKey: ["email"],
    queryFn: async () => (await api.get<Overview>("/email")).data,
    refetchInterval: 15_000,
  });
  // the form: what's saved, with the admin's edits on top; links default to
  // the address in use now
  const [edits, setEdits] = useState<Partial<Settings & { pass: string }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const form = data ? { ...data.settings, pass: "", appUrl: data.settings.appUrl || window.location.origin, ...edits } : null;

  const save = useMutation({
    mutationFn: async (f: Settings & { pass: string }) => (await api.put("/email", f)).data,
    onSuccess: () => {
      setErrors({});
      setEdits({}); // the saved settings again (the password field empties)
      qc.invalidateQueries({ queryKey: ["email"] });
      notifications.show({ title: "Email settings saved", message: "Send yourself a test email to check them", color: "green" });
    },
    onError: (err: { response?: { data?: { errors?: Record<string, string> } } }) => {
      setErrors(err.response?.data?.errors ?? {});
      notifications.show({ title: "Couldn't save", message: errorMessage(err), color: "red" });
    },
  });
  const test = useMutation({
    mutationFn: async () => (await api.post<{ message: string }>("/email/test")).data,
    onSuccess: (r) => notifications.show({ title: "Test email sent", message: `${r.message}. Check the inbox (and spam folder).`, color: "green" }),
    onError: (err) => notifications.show({ title: "The test email didn't go", message: errorMessage(err), color: "red", autoClose: false }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["email"] }),
  });

  const set = <K extends keyof Settings | "pass">(key: K, value: (Settings & { pass: string })[K]) => setEdits((e) => ({ ...e, [key]: value }));

  if (isLoading || !data || !form) {
    return (
      <Page title="Email" breadcrumbs={[{ label: "Administration" }, { label: "Email" }]}>
        <PageHeader title="Email" />
      </Page>
    );
  }
  const gmail = form.provider === "gmail";
  const s = data.settings;

  return (
    <Page title="Email" breadcrumbs={[{ label: "Administration" }, { label: "Email" }]}>
      <PageHeader
        title="Email"
        description="Notifications, password links and the morning summary, by email. People choose how often in My profile."
        meta={
          data.ready ? (
            <Badge color="green" variant="light">
              On: sending as {s.fromAddress}
            </Badge>
          ) : (
            <Badge color="gray" variant="light">
              Off
            </Badge>
          )
        }
      />
      <Stack gap="lg">
        {data.ready && (
          <SimpleGrid cols={{ base: 1, xs: 3 }}>
            <Stat label="Sent in the last 24 hours" value={data.sentLast24h} hint={gmail ? `Gmail allows about ${GMAIL_DAILY_LIMIT} a day` : undefined} warn={gmail && data.sentLast24h > GMAIL_DAILY_LIMIT * 0.8} />
            <Stat label="Waiting to be sent" value={data.queued} />
            <Stat label="Failed (last 7 days)" value={data.failed} warn={data.failed > 0} />
          </SimpleGrid>
        )}

        <Section
          title="Settings"
          actions={
            <Group gap="xs">
              <Tooltip label={me.email ? `To ${me.email}` : "Add your email address in My profile first"}>
                <Button variant="default" leftSection={<IconSend size={16} />} onClick={() => test.mutate()} loading={test.isPending} disabled={!data.ready || !me.email}>
                  Send a test email
                </Button>
              </Tooltip>
              <Button onClick={() => save.mutate(form)} loading={save.isPending}>
                Save
              </Button>
            </Group>
          }
        >
          <Stack gap="md">
            <Switch label="Send emails" description="Off: notifications stay in the bell only" checked={form.enabled} onChange={(e) => set("enabled", e.currentTarget.checked)} />
            <SegmentedControl
              aria-label="Mail service"
              value={form.provider}
              onChange={(v) => set("provider", v as Settings["provider"])}
              data={[
                { value: "gmail", label: "Gmail" },
                { value: "smtp", label: "Other mail server" },
              ]}
              style={{ alignSelf: "flex-start" }}
            />
            {gmail ? (
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label="Gmail address" placeholder="you@gmail.com" value={form.user} onChange={(e) => set("user", e.currentTarget.value)} error={errors.user} />
                <PasswordInput
                  label="App password"
                  description={
                    <>
                      Not your Gmail password: a 16-letter{" "}
                      <Anchor href="https://myaccount.google.com/apppasswords" target="_blank" inherit>
                        app password
                      </Anchor>{" "}
                      (needs 2-Step Verification)
                    </>
                  }
                  placeholder={s.hasPassword ? "Saved: leave empty to keep it" : "abcd efgh ijkl mnop"}
                  value={form.pass}
                  onChange={(e) => set("pass", e.currentTarget.value)}
                  error={errors.pass}
                  autoComplete="new-password"
                />
              </SimpleGrid>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label="Mail server" placeholder="smtp.example.com" value={form.host} onChange={(e) => set("host", e.currentTarget.value)} error={errors.host} />
                <NumberInput label="Port" description="587 (STARTTLS) or 465 (SSL)" value={form.port} onChange={(v) => set("port", Number(v) || 587)} />
                <TextInput label="Login" value={form.user} onChange={(e) => set("user", e.currentTarget.value)} error={errors.user} />
                <PasswordInput
                  label="Password"
                  placeholder={s.hasPassword ? "Saved: leave empty to keep it" : undefined}
                  value={form.pass}
                  onChange={(e) => set("pass", e.currentTarget.value)}
                  error={errors.pass}
                  autoComplete="new-password"
                />
                <TextInput label="Send from (address)" placeholder="erp@example.com" value={form.fromAddress} onChange={(e) => set("fromAddress", e.currentTarget.value)} error={errors.fromAddress} />
              </SimpleGrid>
            )}
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Sender name" description="Shown in people's inbox" value={form.fromName} onChange={(e) => set("fromName", e.currentTarget.value)} />
              <TextInput
                label="Links in emails go to"
                description="The address people open Zenin ERP at"
                value={form.appUrl}
                onChange={(e) => set("appUrl", e.currentTarget.value)}
                error={errors.appUrl}
              />
              <Select label="Morning summary at" description="Due tasks, tomorrow's appointments, overdue invoices…" data={HOURS} value={String(form.summaryHour)} onChange={(v) => set("summaryHour", Number(v ?? 8))} allowDeselect={false} />
              <Select label="Time zone" data={[...new Set([form.timeZone, ...ZONES])]} value={form.timeZone} onChange={(v) => set("timeZone", v ?? "Asia/Kolkata")} searchable allowDeselect={false} error={errors.timeZone} />
            </SimpleGrid>
            {/^https?:\/\/[^/]*trycloudflare\.com/.test(form.appUrl) && (
              <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
                This free public address changes whenever the server restarts, so links in older emails stop working. Use the office address, or a
                named tunnel with your own domain.
              </Alert>
            )}
          </Stack>
        </Section>

        <Section title="Recent emails" description="The last 50. Failed ones were tried 4 times." padding={0}>
          {data.recent.length ? (
            <Table.ScrollContainer minWidth={640}>
              <Table verticalSpacing="xs" fz="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>When</Table.Th>
                    <Table.Th>To</Table.Th>
                    <Table.Th>Subject</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.recent.map((r) => (
                    <Table.Tr key={r._id}>
                      <Table.Td>
                        <Tooltip label={formatDateTime(r.createdAt)}>
                          <Text span size="sm" c="dimmed">
                            {formatRelative(r.createdAt)}
                          </Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>{r.to}</Table.Td>
                      <Table.Td>{r.subject}</Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Badge color={STATUS[r.status]?.color ?? "gray"} variant="light">
                            {STATUS[r.status]?.label ?? r.status}
                          </Badge>
                          {r.error && r.status !== "sent" && (
                            <Text size="xs" c="dimmed">
                              {r.error}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          ) : (
            <EmptyState compact title="No emails yet" description="They show up here as they're sent." />
          )}
        </Section>
      </Stack>
    </Page>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: number; hint?: string; warn?: boolean }) {
  return (
    <Stack gap={2} p="md" style={{ border: "1px solid var(--app-border)", borderRadius: "var(--mantine-radius-lg)", background: "var(--app-surface)" }}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fz={26} fw={600} className="tabular-nums" c={warn ? "var(--mantine-color-orange-text)" : undefined}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Stack>
  );
}
