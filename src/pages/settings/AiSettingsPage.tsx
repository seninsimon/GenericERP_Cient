import { useState } from "react";
import { Alert, Anchor, Badge, Button, Center, Collapse, Group, Loader, PasswordInput, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconPlugConnected } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api, { errorMessage } from "../../api/api";
import { confirmDanger } from "../../components/ui/confirm";
import { Page, PageHeader, Section } from "../../components/ui/Page";
import { FeaturesSection, LimitsSection, UsageSection, type AiFeatures, type AiLimits } from "./AiFeatureSections";

type Provider = "anthropic" | "gemini" | "openai";
type AiSettings = {
  provider: Provider;
  model: string;
  defaultModels: Record<Provider, string>;
  hasKey: Record<Provider, boolean>;
  ready: boolean;
  features: AiFeatures;
  limits: AiLimits;
  askRoles: string[];
};

const PROVIDERS: Record<Provider, { name: string; company: string; keyUrl: string; keyPage: string }> = {
  anthropic: { name: "Claude", company: "Anthropic", keyUrl: "https://console.anthropic.com/settings/keys", keyPage: "Anthropic Console → API keys" },
  gemini: { name: "Gemini", company: "Google", keyUrl: "https://aistudio.google.com/apikey", keyPage: "Google AI Studio → Get API key" },
  openai: { name: "ChatGPT", company: "OpenAI", keyUrl: "https://platform.openai.com/api-keys", keyPage: "OpenAI Platform → API keys" },
};

// Administration → AI (Beta): the provider and its key, the AI features, usage and limits.
export default function AiSettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["ai"], queryFn: async () => (await api.get<AiSettings>("/ai")).data });
  // the admin's edits on top of what's saved
  const [edits, setEdits] = useState<{ provider?: Provider; key?: string; model?: string }>({});
  const [advanced, setAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saved = (s: AiSettings) => {
    qc.setQueryData(["ai"], s);
    qc.invalidateQueries({ queryKey: ["apps"] });
    setEdits({});
    setErrors({});
  };
  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => (await api.put<{ settings: AiSettings }>("/ai", body)).data.settings,
    onSuccess: (s) => {
      saved(s);
      notifications.show({ message: s.ready ? "Saved. Press Test to check the key." : "Saved", color: "green" });
    },
    onError: (err: { response?: { data?: { errors?: Record<string, string> } } }) => {
      setErrors(err.response?.data?.errors ?? {});
      notifications.show({ title: "Couldn't save", message: errorMessage(err), color: "red" });
    },
  });
  const test = useMutation({
    mutationFn: async () => (await api.post<{ message: string }>("/ai/test")).data,
    onSuccess: (r) => notifications.show({ title: "Working ✓", message: r.message, color: "green" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["aiUsage"] }),
    onError: (err: { response?: { data?: { errors?: { detail?: string } } } }) =>
      notifications.show({
        title: "The test didn't work",
        message: [errorMessage(err), err.response?.data?.errors?.detail].filter(Boolean).join(" · "),
        color: "red",
        autoClose: false,
      }),
  });

  if (!data) {
    return (
      <Page title="AI" breadcrumbs={[{ label: "Administration" }, { label: "AI" }]} width="wide">
        <Center h={200}>
          <Loader />
        </Center>
      </Page>
    );
  }

  const provider = edits.provider ?? data.provider;
  const info = PROVIDERS[provider];
  const switching = provider !== data.provider;
  // a model belongs to its provider: switching starts from our pick
  const model = edits.model ?? (switching ? "" : data.model);
  const hasKey = data.hasKey[provider];
  const dirty = switching || Boolean(edits.key) || (edits.model !== undefined && edits.model !== data.model);
  const removeKey = () =>
    confirmDanger({
      title: `Remove the ${info.name} key?`,
      message: "Every AI feature stops until a key is added again.",
      confirmLabel: "Remove key",
      onConfirm: async () => {
        await save.mutateAsync({ provider, removeKey: true });
      },
    });

  return (
    <Page title="AI" breadcrumbs={[{ label: "Administration" }, { label: "AI" }]} width="wide">
      <PageHeader
        title={
          <Group gap="xs">
            AI
            <Badge variant="light" color="violet">
              Beta
            </Badge>
          </Group>
        }
        description={
          <>
            Choose the AI behind Zenin's AI features, such as drafting apps in <Anchor component={Link} to="/settings/apps">Manage apps</Anchor>. You pay the provider directly, per use.
          </>
        }
        meta={
          data.ready ? (
            <Badge color="green" variant="light">
              On: {PROVIDERS[data.provider].name}
            </Badge>
          ) : (
            <Badge color="gray" variant="light">
              Off: no key yet
            </Badge>
          )
        }
      />
      <Stack gap="lg">
        <Section
          title="Provider"
          actions={
            <Button
              variant="default"
              leftSection={<IconPlugConnected size={16} />}
              onClick={() => test.mutate()}
              loading={test.isPending}
              disabled={!data.ready || dirty}
              title={dirty ? "Save first" : undefined}
            >
              Test
            </Button>
          }
        >
          <Stack gap="lg" maw={560}>
            <SegmentedControl
              value={provider}
              onChange={(v) => setEdits({ provider: v as Provider })}
              data={(Object.keys(PROVIDERS) as Provider[]).map((p) => ({ value: p, label: `${PROVIDERS[p].name}${data.hasKey[p] ? " ✓" : ""}` }))}
              aria-label="Provider"
            />
            <PasswordInput
              label={`${info.name} API key`}
              description={
                <>
                  From {info.company}: <Anchor href={info.keyUrl} target="_blank" rel="noopener noreferrer" size="xs">{info.keyPage}</Anchor>. Saved once, never shown again.
                </>
              }
              placeholder={hasKey ? "Saved. Paste a new key to replace it" : "Paste the key"}
              value={edits.key ?? ""}
              onChange={(e) => setEdits((x) => ({ ...x, provider, key: e.currentTarget.value }))}
              error={errors.key}
              autoComplete="off"
            />
            <div>
              <Anchor component="button" size="sm" onClick={() => setAdvanced((a) => !a)}>
                {advanced ? "Hide advanced" : "Advanced"}
              </Anchor>
              <Collapse in={advanced}>
                <TextInput
                  mt="sm"
                  label="Model"
                  description="Leave empty to use our pick, which we keep up to date."
                  placeholder={data.defaultModels[provider]}
                  value={model}
                  onChange={(e) => setEdits((x) => ({ ...x, provider, model: e.currentTarget.value }))}
                  error={errors.model}
                />
              </Collapse>
            </div>
            <Group justify="space-between">
              {hasKey && !switching ? (
                <Anchor component="button" size="sm" c="red" onClick={removeKey}>
                  Remove key
                </Anchor>
              ) : (
                <span />
              )}
              <Group gap="xs">
                {dirty && (
                  <Button variant="default" onClick={() => setEdits({})}>
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={() => save.mutate({ provider, key: edits.key ?? "", model })}
                  loading={save.isPending}
                  disabled={!dirty || (!hasKey && !edits.key?.trim())}
                >
                  {switching ? `Use ${info.name}` : "Save"}
                </Button>
              </Group>
            </Group>
          </Stack>
        </Section>

        <FeaturesSection features={data.features} ready={data.ready} askRoles={data.askRoles} />
        <UsageSection provider={data.provider} />
        <LimitsSection key={JSON.stringify(data.limits)} limits={data.limits} />

        <Alert variant="light" color="blue" icon={<IconInfoCircle size={18} />} title="Good to know">
          <Stack gap={4}>
            <Text size="sm">
              When you use an AI feature, only what it needs is sent to {info.company}: for drafting, the description you type; for Ask Zenin, the question and the records found for it, which the person asking can already see.
            </Text>
            <Text size="sm">
              This is in Beta: the AI drafts, you decide. Every draft is checked and shown to you before anything is added, and you can change everything afterwards.
            </Text>
          </Stack>
        </Alert>
      </Stack>
    </Page>
  );
}
