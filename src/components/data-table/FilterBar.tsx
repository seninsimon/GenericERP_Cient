import { useEffect, useMemo, useState } from "react";
import {
  Button,
  CloseButton,
  Group,
  Menu,
  MultiSelect,
  NumberInput,
  Paper,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDebouncedValue } from "@mantine/hooks";
import { IconFilter, IconPlus } from "@tabler/icons-react";
import { formatDate, formatNumber } from "../../lib/format";

// Column filters shown as chips ("Price ≥ 100 ×") with an "Add filter" menu.
// The filter shape matches the API's ?filters= parameter.

export type FilterKind = "text" | "number" | "date" | "boolean" | "relation" | "file" | "department";

export interface Filter {
  field: string;
  op: string;
  value?: unknown;
  value2?: unknown;
  // display names for relation/department ids (UI only)
  labels?: string[];
}

export interface FilterField {
  name: string;
  label: string;
  kind: FilterKind;
  // department: fixed options
  options?: { value: string; label: string }[];
  // relation: search the linked table
  loadOptions?: (search: string) => Promise<{ value: string; label: string }[]>;
}

const OPS: Record<FilterKind, { value: string; label: string; needs: 0 | 1 | 2 }[]> = {
  text: [
    { value: "contains", label: "contains", needs: 1 },
    { value: "notContains", label: "doesn't contain", needs: 1 },
    { value: "eq", label: "is", needs: 1 },
    { value: "neq", label: "is not", needs: 1 },
    { value: "isEmpty", label: "is empty", needs: 0 },
    { value: "isNotEmpty", label: "is not empty", needs: 0 },
  ],
  number: [
    { value: "eq", label: "=", needs: 1 },
    { value: "neq", label: "≠", needs: 1 },
    { value: "gt", label: ">", needs: 1 },
    { value: "gte", label: "≥", needs: 1 },
    { value: "lt", label: "<", needs: 1 },
    { value: "lte", label: "≤", needs: 1 },
    { value: "between", label: "between", needs: 2 },
    { value: "isEmpty", label: "is empty", needs: 0 },
    { value: "isNotEmpty", label: "is not empty", needs: 0 },
  ],
  date: [
    { value: "eq", label: "is on", needs: 1 },
    { value: "before", label: "is before", needs: 1 },
    { value: "after", label: "is after", needs: 1 },
    { value: "between", label: "is between", needs: 2 },
    { value: "isEmpty", label: "is empty", needs: 0 },
    { value: "isNotEmpty", label: "is not empty", needs: 0 },
  ],
  boolean: [
    { value: "isTrue", label: "is yes", needs: 0 },
    { value: "isFalse", label: "is no", needs: 0 },
    { value: "isEmpty", label: "is empty", needs: 0 },
  ],
  relation: [
    { value: "in", label: "is any of", needs: 1 },
    { value: "isEmpty", label: "is empty", needs: 0 },
    { value: "isNotEmpty", label: "is not empty", needs: 0 },
  ],
  file: [
    { value: "isNotEmpty", label: "has a file", needs: 0 },
    { value: "isEmpty", label: "has no file", needs: 0 },
  ],
  department: [
    { value: "in", label: "is any of", needs: 1 },
    { value: "isEmpty", label: "is admins only", needs: 0 },
  ],
};

const opInfo = (kind: FilterKind, op: string) => OPS[kind].find((o) => o.value === op) ?? OPS[kind][0];

const isComplete = (field: FilterField, f: Filter) => {
  const needs = opInfo(field.kind, f.op).needs;
  const filled = (v: unknown) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length);
  return needs === 0 || (filled(f.value) && (needs === 1 || filled(f.value2)));
};

// "Price ≥ 100", "Due is between 1 Jan 2026 and 31 Mar 2026", "Owner is Ann, Bob"
function describe(field: FilterField, f: Filter) {
  const op = opInfo(field.kind, f.op);
  const show = (v: unknown) =>
    field.kind === "date" ? formatDate(v) : field.kind === "number" ? formatNumber(v) : String(v);
  let value = "";
  if (op.needs === 2) value = `${show(f.value)} and ${show(f.value2)}`;
  else if (op.needs === 1) value = Array.isArray(f.value) ? (f.labels ?? f.value).join(", ") : show(f.value);
  return { field: field.label, op: op.label, value };
}

/* ---------------- editor for one filter ---------------- */

function FilterEditor({
  field,
  initial,
  onApply,
  onCancel,
}: {
  field: FilterField;
  initial: Filter;
  onApply: (f: Filter) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Filter>(initial);
  const op = opInfo(field.kind, draft.op);
  const set = (patch: Partial<Filter>) => setDraft((d) => ({ ...d, ...patch }));

  // relation search
  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search, 250);
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    (initial.value as string[] | undefined)?.map((v, i) => ({ value: v, label: initial.labels?.[i] ?? v })) ?? []
  );
  useEffect(() => {
    if (field.kind !== "relation" || !field.loadOptions) return;
    let active = true;
    field.loadOptions(debounced).then((found) => {
      if (!active) return;
      setOptions((prev) => {
        const selected = new Set((draft.value as string[] | undefined) ?? []);
        const keep = prev.filter((o) => selected.has(o.value));
        const merged = new Map([...keep, ...found].map((o) => [o.value, o]));
        return [...merged.values()];
      });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, field]);

  const listOptions = field.kind === "department" ? (field.options ?? []) : options;

  const valueInput = () => {
    if (op.needs === 0) return null;
    switch (field.kind) {
      case "number":
        return (
          <Group grow gap="xs">
            <NumberInput
              aria-label="Value"
              value={(draft.value as number) ?? ""}
              onChange={(v) => set({ value: v === "" ? undefined : v })}
              autoFocus
            />
            {op.needs === 2 && (
              <NumberInput
                aria-label="and"
                value={(draft.value2 as number) ?? ""}
                onChange={(v) => set({ value2: v === "" ? undefined : v })}
              />
            )}
          </Group>
        );
      case "date":
        return (
          <Group grow gap="xs">
            <DateInput
              aria-label="Date"
              value={(draft.value as string) ?? null}
              onChange={(v) => set({ value: v ?? undefined })}
              clearable
              popoverProps={{ withinPortal: false }}
            />
            {op.needs === 2 && (
              <DateInput
                aria-label="and"
                value={(draft.value2 as string) ?? null}
                onChange={(v) => set({ value2: v ?? undefined })}
                clearable
                popoverProps={{ withinPortal: false }}
              />
            )}
          </Group>
        );
      case "relation":
      case "department":
        return (
          <MultiSelect
            aria-label="Values"
            data={listOptions}
            value={(draft.value as string[]) ?? []}
            onChange={(ids) =>
              set({
                value: ids,
                labels: ids.map((id) => listOptions.find((o) => o.value === id)?.label ?? id),
              })
            }
            searchable
            searchValue={field.kind === "relation" ? search : undefined}
            onSearchChange={field.kind === "relation" ? setSearch : undefined}
            filter={field.kind === "relation" ? ({ options: o }) => o : undefined}
            placeholder="Choose…"
            nothingFoundMessage="No matches"
            comboboxProps={{ withinPortal: false }}
            autoFocus
          />
        );
      default:
        return (
          <TextInput
            aria-label="Value"
            value={(draft.value as string) ?? ""}
            onChange={(e) => set({ value: e.currentTarget.value })}
            onKeyDown={(e) => e.key === "Enter" && isComplete(field, draft) && onApply(draft)}
            autoFocus
          />
        );
    }
  };

  return (
    <Stack gap="xs" w={300}>
      <Text size="sm" fw={600}>
        {field.label}
      </Text>
      <Select
        aria-label="Condition"
        data={OPS[field.kind].map(({ value, label }) => ({ value, label }))}
        value={draft.op}
        onChange={(v) => v && set({ op: v })}
        allowDeselect={false}
        comboboxProps={{ withinPortal: false }}
      />
      {valueInput()}
      <Group justify="flex-end" gap="xs" mt={4}>
        <Button variant="default" size="xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="xs" disabled={!isComplete(field, draft)} onClick={() => onApply(draft)}>
          Apply
        </Button>
      </Group>
    </Stack>
  );
}

/* ---------------- the bar ---------------- */

export function FilterBar({
  fields,
  value,
  onChange,
}: {
  fields: FilterField[];
  value: Filter[];
  onChange: (filters: Filter[]) => void;
}) {
  const byName = useMemo(() => new Map(fields.map((f) => [f.name, f])), [fields]);
  // index of the filter being edited; -1 = new filter; null = none
  const [editing, setEditing] = useState<{ index: number; draft: Filter } | null>(null);
  const active = value.filter((f) => byName.has(f.field));

  const apply = (index: number, filter: Filter) => {
    const next = [...active];
    if (index === -1) next.push(filter);
    else next[index] = filter;
    onChange(next);
    setEditing(null);
  };

  const editor = (index: number) =>
    editing && editing.index === index && byName.get(editing.draft.field) ? (
      <FilterEditor
        field={byName.get(editing.draft.field)!}
        initial={editing.draft}
        onApply={(f) => apply(index, f)}
        onCancel={() => setEditing(null)}
      />
    ) : null;

  return (
    <Group gap={6} wrap="wrap">
      {active.map((filter, index) => {
        const field = byName.get(filter.field)!;
        const text = describe(field, filter);
        return (
          <Popover
            key={`${filter.field}-${index}`}
            opened={editing?.index === index}
            onChange={(o) => !o && setEditing(null)}
            position="bottom-start"
            trapFocus
            withRoles={false}
          >
            <Popover.Target>
              <Paper
                withBorder
                radius="xl"
                px={10}
                py={4}
                bg="var(--mantine-primary-color-light)"
                style={{ borderColor: "var(--mantine-primary-color-light-hover)" }}
              >
                <Group gap={6} wrap="nowrap">
                  <UnstyledButton
                    aria-haspopup="dialog"
                    aria-expanded={editing?.index === index}
                    onClick={() => setEditing({ index, draft: filter })}
                    aria-label={`Edit filter: ${text.field} ${text.op} ${text.value}`}
                    fz="sm"
                    maw={300}
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    <Text span fw={600} inherit>
                      {text.field}
                    </Text>{" "}
                    <Text span inherit fw={400}>
                      {text.op}
                    </Text>{" "}
                    {text.value}
                  </UnstyledButton>
                  <CloseButton
                    size="xs"
                    aria-label={`Remove filter on ${text.field}`}
                    onClick={() => onChange(active.filter((_, i) => i !== index))}
                  />
                </Group>
              </Paper>
            </Popover.Target>
            <Popover.Dropdown>{editor(index)}</Popover.Dropdown>
          </Popover>
        );
      })}

      <Popover
        opened={editing?.index === -1}
        onChange={(o) => !o && setEditing(null)}
        position="bottom-start"
        trapFocus
        withRoles={false}
      >
        <Popover.Target>
          <div>
            <Menu position="bottom-start" withinPortal>
              <Menu.Target>
                <Button
                  variant={active.length ? "subtle" : "default"}
                  leftSection={active.length ? <IconPlus size={14} /> : <IconFilter size={14} />}
                >
                  {active.length ? "Add filter" : "Filter"}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Filter by</Menu.Label>
                <ScrollArea.Autosize mah={320} type="auto">
                  {fields.map((field) => (
                    <Menu.Item
                      key={field.name}
                      onClick={() => setEditing({ index: -1, draft: { field: field.name, op: OPS[field.kind][0].value } })}
                    >
                      {field.label}
                    </Menu.Item>
                  ))}
                </ScrollArea.Autosize>
              </Menu.Dropdown>
            </Menu>
          </div>
        </Popover.Target>
        <Popover.Dropdown>{editor(-1)}</Popover.Dropdown>
      </Popover>

      {active.length > 1 && (
        <Button variant="subtle" color="gray" onClick={() => onChange([])}>
          Clear all
        </Button>
      )}
    </Group>
  );
}
