import { useState } from "react";
import { Anchor, Badge, Button, Group, MultiSelect, NumberInput, Paper, SegmentedControl, SimpleGrid, Stack, Switch, Table, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api, { errorMessage } from "../../api/api";
import { useRoles } from "../../api/reactQueryHooks/useAdmin";
import { Section } from "../../components/ui/Page";

// Administration → AI: the features, what they cost, and the limits.
// workspace/AI_FEATURES_PLAN.md

export type AiFeatures = { draftApps: boolean; askZenin: boolean };
export type AiLimits = { monthlyUsd: number | null; perPersonDaily: number | null };

type Totals = { requests: number; failed: number; inputTokens: number; outputTokens: number; costUsd: number; unpriced: number };
type Usage = {
  month: Totals;
  lastMonth: Totals;
  byFeature: { feature: string; requests: number; costUsd: number }[];
  byPerson: { userId: string | null; name: string; requests: number; costUsd: number }[];
};

const FEATURES: { key: keyof AiFeatures; label: string; description: string }[] = [
  { key: "draftApps", label: "Draft apps", description: "Manage apps → Describe your organization: the AI drafts tables from a sentence or two." },
  {
    key: "askZenin",
    label: "Ask Zenin",
    description: "An assistant in the top bar that answers questions about records. It sees only what the person asking can see, and only reads.",
  },
];
const FEATURE_NAMES: Record<string, string> = { draftApps: "Draft apps", askZenin: "Ask Zenin", test: "Test" };
const BILLING: Record<string, { label: string; url: string }> = {
  anthropic: { label: "Anthropic Console → Billing", url: "https://console.anthropic.com/settings/billing" },
  gemini: { label: "Google AI Studio → Usage & billing", url: "https://aistudio.google.com/usage" },
  openai: { label: "OpenAI Platform → Usage", url: "https://platform.openai.com/usage" },
};

const money = (usd: number) => (usd === 0 ? "$0" : usd < 0.01 ? "< $0.01" : `$${usd.toFixed(2)}`);
const tokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

function useSaveAi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => (await api.put("/ai", body)).data.settings,
    onSuccess: (s) => {
      qc.setQueryData(["ai"], s);
      qc.invalidateQueries({ queryKey: ["apps"] });
      qc.invalidateQueries({ queryKey: ["askAvailable"] });
      notifications.show({ message: "Saved", color: "green" });
    },
    onError: (err) => notifications.show({ title: "Couldn't save", message: errorMessage(err), color: "red" }),
  });
}

/* ---------------- features ---------------- */

export function FeaturesSection({ features, ready, askRoles }: { features: AiFeatures; ready: boolean; askRoles: string[] }) {
  const save = useSaveAi();
  return (
    <Section title="Features" description={ready ? "Switched off means gone from everyone's screens." : "Add a key first: without one, every AI feature is off."}>
      <Stack gap="md">
        {FEATURES.map((f) => (
          <Switch
            key={f.key}
            label={
              <Group gap={6}>
                {f.label}
                <Badge size="xs" variant="light" color="violet">
                  AI · Beta
                </Badge>
              </Group>
            }
            description={f.description}
            checked={ready && features[f.key]}
            disabled={!ready || save.isPending}
            onChange={(e) => save.mutate({ features: { [f.key]: e.currentTarget.checked } })}
          />
        ))}
        {ready && features.askZenin && <AskWho askRoles={askRoles} />}
      </Stack>
    </Section>
  );
}

// Ask Zenin: everyone, or only some roles (admins always may)
function AskWho({ askRoles }: { askRoles: string[] }) {
  const save = useSaveAi();
  const { data: roles = [] } = useRoles();
  const [some, setSome] = useState(askRoles.length > 0);
  const options = roles.filter((r) => !r.isAdmin).map((r) => ({ value: r._id, label: r.name }));
  return (
    <Stack gap="xs" pl={54} maw={560}>
      <Text size="sm" fw={500}>
        Who can use Ask Zenin
      </Text>
      <SegmentedControl
        size="xs"
        value={some ? "some" : "everyone"}
        onChange={(v) => {
          setSome(v === "some");
          if (v === "everyone" && askRoles.length) save.mutate({ askRoles: [] });
        }}
        data={[
          { value: "everyone", label: "Everyone" },
          { value: "some", label: "Only these roles" },
        ]}
        aria-label="Who can use Ask Zenin"
        style={{ alignSelf: "flex-start" }}
      />
      {some && (
        <MultiSelect
          aria-label="Roles that can use Ask Zenin"
          placeholder={askRoles.length ? undefined : "Choose roles (admins always can)"}
          data={options}
          value={askRoles}
          onChange={(v) => save.mutate({ askRoles: v })}
          searchable
        />
      )}
      {some && !askRoles.length && (
        <Text size="xs" c="dimmed">
          Until you choose a role, everyone can use it.
        </Text>
      )}
    </Stack>
  );
}

/* ---------------- usage ---------------- */

function Stat({ label, t, hint }: { label: string; t: Totals; hint?: string }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Text size="xs" c="dimmed" fw={500}>
        {label}
      </Text>
      <Text fz={26} fw={700} mt={2}>
        ≈ {money(t.costUsd)}
      </Text>
      <Text size="xs" c="dimmed">
        {t.requests} {t.requests === 1 ? "request" : "requests"}
        {t.failed ? ` (${t.failed} failed)` : ""} · {tokens(t.inputTokens)} in · {tokens(t.outputTokens)} out
      </Text>
      {hint && (
        <Text size="xs" c="orange.7" mt={4}>
          {hint}
        </Text>
      )}
    </Paper>
  );
}

export function UsageSection({ provider }: { provider: string }) {
  const { data } = useQuery({
    queryKey: ["aiUsage"],
    queryFn: async () => (await api.get<Usage>("/ai/usage")).data,
    refetchInterval: 60_000,
  });
  const billing = BILLING[provider];
  return (
    <Section
      title="Usage"
      description={
        <>
          Estimates (≈) at the provider's standard prices. The real bill is on{" "}
          <Anchor href={billing.url} target="_blank" rel="noopener noreferrer" inherit>
            {billing.label}
          </Anchor>
          . What people ask isn't kept.
        </>
      }
    >
      {!data ? (
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      ) : (
        <Stack gap="lg">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Stat
              label="This month"
              t={data.month}
              hint={data.month.unpriced ? `${data.month.unpriced} on a model whose price isn't known: not in the estimate` : undefined}
            />
            <Stat label="Last month" t={data.lastMonth} />
          </SimpleGrid>
          {data.month.requests > 0 && (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <UsageTable title="By feature, this month" rows={data.byFeature.map((r) => ({ key: r.feature, name: FEATURE_NAMES[r.feature] ?? r.feature, ...r }))} />
              <UsageTable title="By person, this month (top 10)" rows={data.byPerson.map((r) => ({ key: r.userId ?? "none", ...r }))} />
            </SimpleGrid>
          )}
        </Stack>
      )}
    </Section>
  );
}

function UsageTable({ title, rows }: { title: string; rows: { key: string; name: string; requests: number; costUsd: number }[] }) {
  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        {title}
      </Text>
      <Table striped={false} verticalSpacing={6}>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.key}>
              <Table.Td>{r.name}</Table.Td>
              <Table.Td ta="right" c="dimmed">
                {r.requests}
              </Table.Td>
              <Table.Td ta="right" w={90}>
                ≈ {money(r.costUsd)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

/* ---------------- limits ---------------- */

export function LimitsSection({ limits }: { limits: AiLimits }) {
  const save = useSaveAi();
  const [edits, setEdits] = useState<Partial<AiLimits>>({});
  const form = { ...limits, ...edits };
  const dirty = form.monthlyUsd !== limits.monthlyUsd || form.perPersonDaily !== limits.perPersonDaily;
  const value = (v: string | number) => (v === "" || v === 0 ? null : Number(v));
  return (
    <Section title="Limits" description="Optional. Empty means no limit.">
      <Stack gap="md" maw={560}>
        <NumberInput
          label="Monthly limit (estimated spend)"
          description="AI features pause when this month's estimate reaches it. Admins get a bell at 80% and 100%. It starts again on the 1st."
          prefix="$"
          placeholder="No limit"
          min={0}
          decimalScale={2}
          value={form.monthlyUsd ?? ""}
          onChange={(v) => setEdits((e) => ({ ...e, monthlyUsd: value(v) }))}
        />
        <NumberInput
          label="Requests per person per day"
          description="For everyone but admins."
          placeholder="No limit"
          min={0}
          allowDecimal={false}
          value={form.perPersonDaily ?? ""}
          onChange={(v) => setEdits((e) => ({ ...e, perPersonDaily: value(v) }))}
        />
        <Group justify="flex-end" gap="xs">
          {dirty && (
            <Button variant="default" onClick={() => setEdits({})}>
              Cancel
            </Button>
          )}
          <Button
            disabled={!dirty}
            loading={save.isPending}
            onClick={() => save.mutate({ limits: form }, { onSuccess: () => setEdits({}) })}
          >
            Save limits
          </Button>
        </Group>
      </Stack>
    </Section>
  );
}
