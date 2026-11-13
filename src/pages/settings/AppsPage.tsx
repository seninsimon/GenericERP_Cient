import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  Group,
  Modal,
  Radio,
  SimpleGrid,
  Skeleton,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconArrowRight,
  IconCheck,
  IconSparkles,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { useDepartments } from "../../api/reactQueryHooks/useAdmin";
import {
  useApps,
  useDraftApp,
  useInstallApps,
  useInstallPlan,
  useRemoveSample,
  useUninstallApp,
  type AppInfo,
  type InstallOptions,
} from "../../api/reactQueryHooks/useApps";
import { Page, PageHeader, Section } from "../../components/ui/Page";
import { tablePath, tableTitle } from "../../layout/nav";
import { AppIcon } from "../../features/apps/AppIcon";
import { formatDate } from "../../lib/format";

/* ---------------- install preview ---------------- */

type Target = { title: string; apps: string[]; draft?: unknown };

function InstallDrawer({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const navigate = useNavigate();
  const narrow = useMediaQuery("(max-width: 48em)");
  const { data: departments = [] } = useDepartments();
  const [tables, setTables] = useState<Record<string, boolean>>({});
  const [conflicts, setConflicts] = useState<Record<string, "new" | "use">>({});
  const [sampleData, setSampleData] = useState(false);
  // an organization type's starter departments, as edited (null = as suggested)
  const [starter, setStarter] = useState<string[] | null>(null);
  const install = useInstallApps();

  const { data: plan, isLoading, error } = useInstallPlan(target?.apps ?? null, { tables, conflicts }, target?.draft);
  // the tables are shared with every department, so switching one to
  // "each department only its own" later just works
  const shareWith = departments.map((d) => d._id);
  const starterNames = starter ?? plan?.departments.map((d) => d.name) ?? [];
  const options: InstallOptions = { tables, conflicts, departmentIds: shareWith, sampleData, departments: starterNames };

  const reset = () => {
    setTables({});
    setConflicts({});
    setSampleData(false);
    setStarter(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const pulledIn = plan?.apps.filter((a) => a.pulledIn && a.status === "install") ?? [];
  const already = plan?.apps.filter((a) => a.status === "installed" && !a.pulledIn) ?? [];
  const nothingToDo = plan && plan.apps.every((a) => a.status === "installed");

  const submit = async () => {
    if (!target) return;
    const result = await install.mutateAsync({ apps: target.apps, options, draft: target.draft });
    notifications.show({
      title: `${target.title} added`,
      message: `${result.tables.map((t) => tableTitle(t.tableName)).join(", ")}${result.sampleRecords ? `, with ${result.sampleRecords} sample records` : ""}`,
      color: "green",
    });
    const first = result.tables.find((t) => t.action === "create");
    close();
    if (first) navigate(tablePath(first.tableName));
  };

  return (
    <Drawer
      opened={Boolean(target)}
      onClose={close}
      position="right"
      size={narrow ? "100%" : "lg"}
      title={target ? `Add ${target.title}` : ""}
    >
      {!plan && isLoading ? (
        <Stack>
          <Skeleton h={60} />
          <Skeleton h={60} />
          <Skeleton h={60} />
        </Stack>
      ) : error ? (
        <Alert color="red">Couldn't prepare this app. Try again.</Alert>
      ) : plan ? (
        <Stack gap="lg">
          {pulledIn.length > 0 && (
            <Text size="sm">
              Also adds <b>{pulledIn.map((a) => a.name).join(", ")}</b>, which {pulledIn.length === 1 ? "it builds" : "they build"} on.
            </Text>
          )}
          {already.length > 0 && (
            <Text size="sm" c="dimmed">
              Already added: {already.map((a) => a.name).join(", ")}.
            </Text>
          )}

          <Stack gap="xs">
            <Text fw={600} size="sm">
              Tables
            </Text>
            {plan.tables.map((t) => (
              <Card key={t.key} withBorder padding="sm" radius="md">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  {t.action === "reuse" ? (
                    <div>
                      <Text size="sm" fw={500}>
                        {t.label}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Already there: uses your {tableTitle(t.tableName ?? "")} table
                      </Text>
                    </div>
                  ) : t.optional ? (
                    <Checkbox
                      // the click shows at once; the preview below catches up
                      checked={tables[t.key] ?? t.action !== "skip"}
                      onChange={(e) => setTables((prev) => ({ ...prev, [t.key]: e.currentTarget.checked }))}
                      label={
                        <Text size="sm" fw={500}>
                          {t.label}
                        </Text>
                      }
                      description={t.description}
                    />
                  ) : (
                    // the app's main table: always added, so no checkbox to wonder about
                    <Group gap={10} wrap="nowrap" align="flex-start">
                      <IconCheck size={18} color="var(--mantine-color-teal-6)" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
                      <div>
                        <Text size="sm" fw={500}>
                          {t.label}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {t.description}
                        </Text>
                      </div>
                    </Group>
                  )}
                  {t.action !== "skip" && t.action !== "reuse" && t.links.length > 0 && (
                    <Text size="xs" c="dimmed" ta="right" style={{ flexShrink: 0 }}>
                      {t.links.map((l) => `${l.column} → ${l.toLabel}`).join(" · ")}
                    </Text>
                  )}
                </Group>
                {t.action !== "skip" && t.dropped.length > 0 && (
                  <Text size="xs" c="var(--mantine-color-orange-light-color)" mt={6}>
                    Without the tables you left out, it won't have: {t.dropped.join(", ")}
                  </Text>
                )}
                {t.conflict && (
                  <Radio.Group
                    mt="sm"
                    value={t.conflict.choice}
                    onChange={(v) => setConflicts((prev) => ({ ...prev, [t.key]: v as "new" | "use" }))}
                    label={<Text size="xs">You already have a table called “{tableTitle(t.conflict.existing)}”.</Text>}
                  >
                    <Stack gap={6} mt={6}>
                      <Radio size="xs" value="new" label={`Create a new one (${tableTitle(t.tableName && t.conflict.choice === "new" ? t.tableName : `${t.conflict.existing}_2`)})`} />
                      <Radio size="xs" value="use" label="Use mine (adds the columns it lacks, changes nothing else)" />
                    </Stack>
                  </Radio.Group>
                )}
              </Card>
            ))}
          </Stack>

          {plan.departments.length > 0 && (
            <TagsInput
              label="Departments"
              description="Created for you (ones you already have are reused). Rename or remove any; you can change them later too."
              value={starterNames}
              onChange={setStarter}
              placeholder={starterNames.length ? undefined : "Type a name and press Enter"}
              clearable
            />
          )}

          {plan.roles.length > 0 && (
            <Stack gap={4}>
              <Text fw={600} size="sm">
                Who can use it
              </Text>
              <Text size="sm" c="dimmed">
                Afterwards, give people access on their page under <b>Users</b>: <b>Staff</b> for everyday work (personal
                records like leave only their own) or <b>Manager</b> for everything, including approvals.
              </Text>
            </Stack>
          )}

          {plan.hasSample && (
            <Checkbox
              checked={sampleData}
              onChange={(e) => setSampleData(e.currentTarget.checked)}
              label="Add a few sample records to try it out"
              description="You can remove just the samples later, on this page"
            />
          )}

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} loading={install.isPending} disabled={Boolean(nothingToDo)}>
              {nothingToDo ? "Already added" : "Add"}
            </Button>
          </Group>
        </Stack>
      ) : null}
    </Drawer>
  );
}

/* ---------------- remove ---------------- */

function RemoveAppModal({ app, onClose }: { app: AppInfo | null; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const uninstall = useUninstallApp();
  const close = () => {
    setTyped("");
    onClose();
  };
  return (
    <Modal opened={Boolean(app)} onClose={close} title={`Remove ${app?.name ?? ""}`}>
      {app && (
        <Stack>
          <Text size="sm">
            This deletes the tables it added ({app.installed?.tables.map(tableTitle).join(", ") || "none"}) <b>with all their records</b>. It
            can't be undone. Its roles stay.
          </Text>
          <TextInput
            label={`Type "${app.name}" to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.currentTarget.value)}
            data-autofocus
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button
              color="red"
              disabled={typed.trim() !== app.name}
              loading={uninstall.isPending}
              onClick={() => uninstall.mutateAsync(app.key).then(close, () => {})}
            >
              Remove app
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

/* ---------------- page ---------------- */

export default function AppsPage() {
  const { data, isLoading } = useApps();
  const [target, setTarget] = useState<Target | null>(null);
  const [description, setDescription] = useState("");
  const draftApp = useDraftApp();
  // failures are shown by the hook (a notification)
  const draft = () =>
    draftApp.mutateAsync(description.trim()).then(
      (result) => setTarget({ title: result.app.name, apps: [], draft: result.draft }),
      () => {}
    );
  const [removing, setRemoving] = useState<AppInfo | null>(null);
  const removeSample = useRemoveSample();

  const apps = useMemo(() => data?.apps ?? [], [data]);
  const installed = apps.filter((a) => a.installed);
  const available = apps.filter((a) => !a.installed);
  const bundles = data?.bundles ?? [];

  const bundleSection = (
    <Section
      title="Start from your organization"
      description="A set of apps that fit together. You'll see everything before anything is added."
    >
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {bundles.map((b) => {
          const done = b.apps.every((k) => apps.find((a) => a.key === k)?.installed);
          return (
            <Card key={b.key} withBorder radius="md" padding="md">
              <Stack gap="sm" h="100%">
                <AppIcon name={b.icon} />
                <div>
                  <Text fw={600}>{b.name}</Text>
                  <Text size="sm" c="dimmed">
                    {b.description}
                  </Text>
                </div>
                <Group mt="auto">
                  {done ? (
                    <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>
                      Added
                    </Badge>
                  ) : (
                    <Button size="xs" variant="light" rightSection={<IconArrowRight size={14} />} onClick={() => setTarget({ title: b.name, apps: [b.key] })}>
                      Set up
                    </Button>
                  )}
                </Group>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
    </Section>
  );

  return (
    <Page title="Manage apps" breadcrumbs={[{ label: "Administration" }, { label: "Manage apps" }]} width="wide">
      <PageHeader
        title="Manage apps"
        description="Ready-made, connected tables for the work you do. Everything an app adds is yours to change afterwards."
      />
      {isLoading ? (
        <Skeleton h={240} radius="lg" />
      ) : (
        <Stack gap="lg">
          {!installed.length && bundleSection}

          <Section
            title="Describe your organization"
            description="Not in the list? Say what you do in a sentence or two, and AI drafts the tables. You'll see them before anything is added, and can change everything afterwards."
          >
            {data?.aiDrafts ? (
              <Stack gap="sm">
                <Textarea
                  aria-label="Your organization"
                  placeholder="e.g. We're a 12-person dental clinic with two branches. We book appointments, keep treatment notes and bill patients."
                  autosize
                  minRows={2}
                  maxRows={5}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                />
                <Group>
                  <Button
                    leftSection={<IconSparkles size={16} />}
                    onClick={draft}
                    loading={draftApp.isPending}
                    disabled={description.trim().length < 10}
                  >
                    Draft tables
                  </Button>
                  {draftApp.isPending && (
                    <Text size="sm" c="dimmed">
                      Drafting… this can take up to a minute.
                    </Text>
                  )}
                </Group>
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                To turn this on, add an Anthropic API key to the server's settings (<code>ANTHROPIC_API_KEY</code> in <code>.env</code>).
              </Text>
            )}
          </Section>

          {available.length > 0 && (
            <Section title="Apps">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {available.map((app) => (
                  <Card key={app.key} withBorder radius="md" padding="md">
                    <Stack gap="sm" h="100%">
                      <Group gap="sm" wrap="nowrap">
                        <AppIcon name={app.icon} />
                        <Text fw={600}>{app.name}</Text>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {app.description}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {app.tables.map((t) => t.label).join(" · ")}
                      </Text>
                      <Group mt="auto">
                        <Button size="xs" variant="light" onClick={() => setTarget({ title: app.name, apps: [app.key] })}>
                          Add
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </Section>
          )}

          {installed.length > 0 && (
            <Section title="Added" description="Apps you've added. Their tables are in the sidebar, grouped by app." padding="md">
              <Stack gap="sm">
                {installed.map((app) => (
                  <Group key={app.key} justify="space-between" wrap="wrap" gap="sm">
                    <Group gap="sm" wrap="nowrap">
                      <AppIcon name={app.icon} size={32} />
                      <div>
                        <Text fw={500}>{app.name}</Text>
                        <Text size="xs" c="dimmed">
                          Added {formatDate(app.installed!.installedAt)} · {app.installed!.tables.map(tableTitle).join(", ") || "uses existing tables"}
                        </Text>
                      </div>
                    </Group>
                    <Group gap="xs">
                      {app.installed!.sampleRecords > 0 && (
                        <Button size="xs" variant="default" loading={removeSample.isPending && removeSample.variables === app.key} onClick={() => removeSample.mutate(app.key)}>
                          Remove {app.installed!.sampleRecords} sample records
                        </Button>
                      )}
                      <Button size="xs" variant="subtle" color="red" onClick={() => setRemoving(app)}>
                        Remove app
                      </Button>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Section>
          )}

          {installed.length > 0 && bundles.some((b) => !b.apps.every((k) => apps.find((a) => a.key === k)?.installed)) && bundleSection}
        </Stack>
      )}

      <InstallDrawer target={target} onClose={() => setTarget(null)} />
      <RemoveAppModal app={removing} onClose={() => setRemoving(null)} />
    </Page>
  );
}
