import { useState } from "react";
import { ActionIcon, Button, Group, Modal, Select, Stack, Switch, Text, TextInput, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBolt, IconPencil, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api, { errorMessage } from "../../api/api";
import { Section } from "../../components/ui/Page";
import { EmptyState } from "../../components/ui/EmptyState";
import { columnLabel, type RecordColumn } from "../../features/records/schema";

type Trigger = { when: "created" } | { when: "changed"; column: string; to?: string };
type Action = { do: "set"; column: string; value: unknown } | { do: "notify"; who: string; message?: string };
type Automation = { _id: string; name: string; trigger: Trigger; actions: Action[]; enabled: boolean };

const CREATOR = "$creator";
const SETTABLE = ["text", "textarea", "number", "date", "boolean", "choice", "user"];
// what "set" can put into a field of each type, besides a typed value
const SPECIAL: Record<string, { value: string; label: string }> = {
  date: { value: "today", label: "Today" },
  user: { value: "$me", label: "The person who made the change" },
};

// One automation as a sentence: "When Status becomes Approved → set Approved on to today, tell the person who created it"
function sentence(a: Pick<Automation, "trigger" | "actions">, columns: RecordColumn[]) {
  const name = (n: string) => {
    const c = columns.find((x) => x.name === n);
    return c ? columnLabel(c) : n;
  };
  const when =
    a.trigger.when === "created"
      ? "When a record is added"
      : `When ${name(a.trigger.column)} ${a.trigger.to ? `becomes ${a.trigger.to}` : "changes"}`;
  const then = a.actions.map((x) =>
    x.do === "notify"
      ? `tell ${x.who === CREATOR ? "the person who created it" : `the person in ${name(x.who)}`}${x.message ? ` “${x.message}”` : ""}`
      : `set ${name(x.column)} to ${x.value === "today" ? "today" : x.value === "$me" ? "the person who made the change" : String(x.value)}`
  );
  return `${when} → ${then.join(", ")}`;
}

function ActionRow({
  action,
  columns,
  onChange,
  onRemove,
}: {
  action: Action;
  columns: RecordColumn[];
  onChange: (a: Action) => void;
  onRemove?: () => void;
}) {
  const people = columns.filter((c) => c.type === "user");
  const settable = columns.filter((c) => SETTABLE.includes(c.type));
  const target = action.do === "set" ? columns.find((c) => c.name === action.column) : undefined;
  return (
    <Group gap="xs" align="flex-end" wrap="nowrap">
      <Select
        label="Then"
        data={[
          { value: "notify", label: "Tell someone" },
          { value: "set", label: "Set a field" },
        ]}
        value={action.do}
        onChange={(v) => onChange(v === "set" ? { do: "set", column: "", value: null } : { do: "notify", who: CREATOR })}
        allowDeselect={false}
        w={140}
      />
      {action.do === "notify" ? (
        <>
          <Select
            label="Who"
            data={[
              { value: CREATOR, label: "The person who created it" },
              ...people.map((c) => ({ value: c.name, label: `The person in ${columnLabel(c)}` })),
            ]}
            value={action.who}
            onChange={(v) => onChange({ ...action, who: v ?? CREATOR })}
            allowDeselect={false}
            w={200}
          />
          <TextInput
            label="Message (optional)"
            placeholder="e.g. Your leave was approved"
            value={action.message ?? ""}
            onChange={(e) => onChange({ ...action, message: e.currentTarget.value })}
            style={{ flex: 1 }}
          />
        </>
      ) : (
        <>
          <Select
            label="Field"
            placeholder="Choose"
            data={settable.map((c) => ({ value: c.name, label: columnLabel(c) }))}
            value={action.column || null}
            onChange={(v) => {
              const col = columns.find((c) => c.name === v);
              onChange({ do: "set", column: v ?? "", value: col && SPECIAL[col.type] ? SPECIAL[col.type].value : null });
            }}
            w={170}
          />
          {target && SPECIAL[target.type] ? (
            <TextInput label="To" value={SPECIAL[target.type].label} readOnly variant="filled" style={{ flex: 1 }} />
          ) : target?.type === "choice" ? (
            <Select
              label="To"
              data={(target.options ?? []).map((o) => o.label)}
              value={typeof action.value === "string" ? action.value : null}
              onChange={(v) => onChange({ ...action, value: v })}
              style={{ flex: 1 }}
            />
          ) : target?.type === "boolean" ? (
            <Select
              label="To"
              data={[
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ]}
              value={action.value === true ? "true" : action.value === false ? "false" : null}
              onChange={(v) => onChange({ ...action, value: v === "true" })}
              style={{ flex: 1 }}
            />
          ) : (
            <TextInput
              label="To"
              value={action.value == null ? "" : String(action.value)}
              onChange={(e) =>
                onChange({ ...action, value: target?.type === "number" ? Number(e.currentTarget.value) : e.currentTarget.value })
              }
              disabled={!target}
              style={{ flex: 1 }}
            />
          )}
        </>
      )}
      {onRemove && (
        <ActionIcon variant="subtle" color="gray" mb={4} aria-label="Remove this step" onClick={onRemove}>
          <IconX size={16} />
        </ActionIcon>
      )}
    </Group>
  );
}

function AutomationModal({
  table,
  columns,
  editing,
  opened,
  onClose,
}: {
  table: string;
  columns: RecordColumn[];
  editing: Automation | null;
  opened: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [trigger, setTrigger] = useState<Trigger>(editing?.trigger ?? { when: "created" });
  const [actions, setActions] = useState<Action[]>(editing?.actions ?? [{ do: "notify", who: CREATOR }]);
  const [error, setError] = useState<string | null>(null);
  const watched = columns.filter((c) => !["formula", "rollup", "autonumber", "richtext", "image", "images", "file", "files"].includes(c.type));
  const watchedColumn = trigger.when === "changed" ? columns.find((c) => c.name === trigger.column) : undefined;

  const save = useMutation({
    mutationFn: async () => {
      const body = { name: editing?.name ?? "", trigger, actions, enabled: editing?.enabled ?? true };
      return editing ? api.put(`/schema/${table}/automations/${editing._id}`, body) : api.post(`/schema/${table}/automations`, body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["automations", table] });
      notifications.show({ title: "Automation saved", message: sentence({ trigger, actions }, columns), color: "green" });
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  return (
    <Modal opened={opened} onClose={onClose} title={editing ? "Edit automation" : "New automation"} size="xl">
      <Stack>
        <Group gap="xs" align="flex-end" wrap="wrap">
          <Select
            label="When"
            data={[
              { value: "created", label: "A record is added" },
              ...watched.map((c) => ({ value: c.name, label: `${columnLabel(c)} changes` })),
            ]}
            value={trigger.when === "created" ? "created" : trigger.column}
            onChange={(v) => setTrigger(!v || v === "created" ? { when: "created" } : { when: "changed", column: v })}
            allowDeselect={false}
            w={240}
          />
          {watchedColumn?.type === "choice" && trigger.when === "changed" && (
            <Select
              label="To"
              data={[{ value: "", label: "Any value" }, ...(watchedColumn.options ?? []).map((o) => ({ value: o.label, label: o.label }))]}
              value={trigger.to ?? ""}
              onChange={(v) => setTrigger({ ...trigger, to: v || undefined })}
              allowDeselect={false}
              w={180}
            />
          )}
        </Group>
        {actions.map((a, i) => (
          <ActionRow
            key={i}
            action={a}
            columns={columns}
            onChange={(next) => setActions((prev) => prev.map((x, j) => (j === i ? next : x)))}
            onRemove={actions.length > 1 ? () => setActions((prev) => prev.filter((_, j) => j !== i)) : undefined}
          />
        ))}
        <Button
          variant="default"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() => setActions((prev) => [...prev, { do: "notify", who: CREATOR }])}
          style={{ alignSelf: "flex-start" }}
          disabled={actions.length >= 10}
        >
          Also do
        </Button>
        <Text size="sm" c="dimmed">
          {sentence({ trigger, actions }, columns)}
        </Text>
        {error && (
          <Text size="sm" c="var(--mantine-color-error)">
            {error}
          </Text>
        )}
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Save automation
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// Table settings: things that happen by themselves when records change.
export function AutomationsSection({ table, columns }: { table: string; columns: RecordColumn[] }) {
  const qc = useQueryClient();
  const { data: automations = [] } = useQuery({
    queryKey: ["automations", table],
    queryFn: async () => (await api.get<Automation[]>(`/schema/${table}/automations`)).data,
  });
  const [modal, setModal] = useState<{ editing: Automation | null } | null>(null);
  const toggle = useMutation({
    mutationFn: async (a: Automation) => api.put(`/schema/${table}/automations/${a._id}`, { ...a, enabled: !a.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations", table] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/schema/${table}/automations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations", table] }),
  });

  return (
    <Section
      title="Automations"
      description="Things that happen by themselves when records change, like telling someone their leave was approved."
      actions={
        <Button variant="default" leftSection={<IconPlus size={16} />} onClick={() => setModal({ editing: null })}>
          Add automation
        </Button>
      }
      padding="md"
    >
      {automations.length ? (
        <Stack gap="xs">
          {automations.map((a) => (
            <Group key={a._id} justify="space-between" wrap="nowrap" gap="sm">
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <IconBolt size={16} color="var(--mantine-color-yellow-6)" style={{ flexShrink: 0 }} />
                <Text size="sm" c={a.enabled ? undefined : "dimmed"} td={a.enabled ? undefined : "line-through"}>
                  {sentence(a, columns)}
                </Text>
              </Group>
              <Group gap={4} wrap="nowrap">
                <Tooltip label={a.enabled ? "On" : "Off"}>
                  <Switch checked={a.enabled} onChange={() => toggle.mutate(a)} aria-label="On" size="sm" />
                </Tooltip>
                <ActionIcon variant="subtle" color="gray" aria-label="Edit" onClick={() => setModal({ editing: a })}>
                  <IconPencil size={16} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" aria-label="Delete" onClick={() => remove.mutate(a._id)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
        </Stack>
      ) : (
        <EmptyState compact title="No automations yet" description="For example: when Status becomes Approved, tell the person who asked." />
      )}
      {modal && (
        <AutomationModal
          key={modal.editing?._id ?? "new"}
          table={table}
          columns={columns}
          editing={modal.editing}
          opened
          onClose={() => setModal(null)}
        />
      )}
    </Section>
  );
}
