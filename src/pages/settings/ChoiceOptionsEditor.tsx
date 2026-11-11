import { useState } from "react";
import {
  ActionIcon,
  Button,
  ColorSwatch,
  Group,
  Input,
  MultiSelect,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconLock, IconLockOpen, IconPlus, IconX } from "@tabler/icons-react";

import { useRoles } from "../../api/reactQueryHooks/useAdmin";

import type { ChoiceOption } from "../../features/records/schema";

// Same list as the API (CHOICE_COLORS in src/schema/columns.ts). New options
// take the next unused colour, so nobody has to pick colours.
const CHOICE_COLORS = [
  "blue", "green", "orange", "red", "grape", "teal", "yellow", "pink", "indigo", "cyan", "lime", "violet", "gray",
];

const nextColor = (options: ChoiceOption[]) =>
  CHOICE_COLORS.find((c) => !options.some((o) => o.color === c)) ?? CHOICE_COLORS[options.length % CHOICE_COLORS.length];

function ColorPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  const [opened, setOpened] = useState(false);
  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" withinPortal={false} shadow="md">
      <Popover.Target>
        <UnstyledButton aria-label={`Colour of ${label}`} onClick={() => setOpened((o) => !o)} p={4}>
          <ColorSwatch color={`var(--mantine-color-${value}-filled)`} size={18} />
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <SimpleGrid cols={7} spacing={6}>
          {CHOICE_COLORS.map((c) => (
            <UnstyledButton
              key={c}
              aria-label={c}
              onClick={() => {
                onChange(c);
                setOpened(false);
              }}
            >
              <ColorSwatch color={`var(--mantine-color-${c}-filled)`} size={22}>
                {c === value && <Text c="white" size="xs" fw={700}>✓</Text>}
              </ColorSwatch>
            </UnstyledButton>
          ))}
        </SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  );
}

// "Who can choose this": an approval step (e.g. only managers can set Approved)
function WhoCanChoose({ label, value, onChange }: { label: string; value: string[]; onChange: (roles: string[]) => void }) {
  const { data: roles = [] } = useRoles();
  const [opened, setOpened] = useState(false);
  const limited = value.length > 0;
  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" width={280} shadow="md" withinPortal={false}>
      <Popover.Target>
        <Tooltip label={limited ? "Only some roles can choose it" : "Who can choose this"}>
          <ActionIcon
            variant={limited ? "light" : "subtle"}
            color={limited ? undefined : "gray"}
            aria-label={`Who can choose ${label || "this option"}`}
            onClick={() => setOpened((o) => !o)}
          >
            {limited ? <IconLock size={16} /> : <IconLockOpen size={16} />}
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <MultiSelect
          label={`Who can choose “${label || "this"}”`}
          description="An approval step. Leave empty: anyone who can edit. Admins always can."
          data={roles.filter((r) => !r.isAdmin).map((r) => ({ value: r._id, label: r.name }))}
          value={value}
          onChange={onChange}
          placeholder={value.length ? undefined : "Anyone"}
          comboboxProps={{ withinPortal: false }}
          clearable
        />
      </Popover.Dropdown>
    </Popover>
  );
}

// The option list of a "Choice" column: add (Enter, or paste several lines),
// rename, recolour, reorder, remove.
export function ChoiceOptionsEditor({
  value,
  onChange,
  error,
  editing,
}: {
  value: ChoiceOption[];
  onChange: (options: ChoiceOption[]) => void;
  error?: string;
  // editing an existing column: explain what renames and removals do
  editing?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  const has = (label: string, except?: number) =>
    value.some((o, i) => i !== except && o.label.trim().toLowerCase() === label.trim().toLowerCase());

  const addLabels = (labels: string[]) => {
    const next = [...value];
    for (const raw of labels) {
      const label = raw.trim();
      if (!label || next.some((o) => o.label.toLowerCase() === label.toLowerCase())) continue;
      // an id from the start, so renames can be followed (e.g. by the default value)
      next.push({ id: Math.random().toString(36).slice(2, 10), label, color: nextColor(next) });
    }
    onChange(next);
  };

  const addDraft = () => {
    const label = draft.trim();
    if (!label) return;
    if (has(label)) {
      setDraftError("Already in the list");
      return;
    }
    addLabels([label]);
    setDraft("");
    setDraftError(null);
  };

  const update = (index: number, patch: Partial<ChoiceOption>) =>
    onChange(value.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  const move = (index: number, by: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  };

  return (
    <Input.Wrapper
      label="Options"
      withAsterisk
      description={
        editing
          ? "Renaming an option updates the records that use it. Removed options stay on old records."
          : "The order here is the order in lists, filters and sorting."
      }
      error={error}
    >
      <Stack gap={6} mt={6}>
        {value.map((option, index) => (
          <Group key={option.id ?? `new-${index}`} gap={6} wrap="nowrap">
            <ColorPicker value={option.color} onChange={(color) => update(index, { color })} label={option.label} />
            <TextInput
              flex={1}
              size="sm"
              aria-label={`Option ${index + 1}`}
              value={option.label}
              onChange={(e) => update(index, { label: e.currentTarget.value })}
              error={!option.label.trim() ? "Enter a name" : has(option.label, index) ? "Listed twice" : undefined}
            />
            <Tooltip label="Move up">
              <ActionIcon variant="subtle" color="gray" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                <IconArrowUp size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Move down">
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Move down"
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
              >
                <IconArrowDown size={16} />
              </ActionIcon>
            </Tooltip>
            <WhoCanChoose
              label={option.label}
              value={option.roles ?? []}
              onChange={(roles) => update(index, { roles: roles.length ? roles : undefined })}
            />
            <Tooltip label="Remove">
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Remove ${option.label || "option"}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <IconX size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ))}

        <Group gap={6} wrap="nowrap" align="flex-start">
          <TextInput
            flex={1}
            size="sm"
            aria-label="New option"
            placeholder={value.length ? "Add another option" : "e.g. To do (press Enter to add)"}
            value={draft}
            error={draftError}
            onChange={(e) => {
              setDraft(e.currentTarget.value);
              setDraftError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDraft();
              }
            }}
            // pasting a list ("To do, Doing, Done" or one per line) adds them all
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              const parts = text.split(/\r?\n|,|;/).map((p) => p.trim()).filter(Boolean);
              if (parts.length > 1) {
                e.preventDefault();
                addLabels(parts);
              }
            }}
          />
          <Button variant="default" leftSection={<IconPlus size={16} />} onClick={addDraft} disabled={!draft.trim()}>
            Add
          </Button>
        </Group>

      </Stack>
    </Input.Wrapper>
  );
}
