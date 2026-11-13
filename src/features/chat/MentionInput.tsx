import { useRef, useState, type KeyboardEvent } from "react";
import { Avatar, Group, Paper, Stack, Text, Textarea, UnstyledButton } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { getUserOptions } from "../../api/api";
import { initialsOf } from "../../layout/UserMenu";

// A text box where "@" suggests people (inserting "@username"). Enter sends,
// Shift+Enter starts a new line.
export function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null); // the word after "@", while choosing
  const [active, setActive] = useState(0);
  const { data: people = [] } = useQuery({
    queryKey: ["mentionPeople", query],
    queryFn: async () => (await getUserOptions({ search: query ?? "", limit: 6 })).data,
    enabled: query !== null,
    staleTime: 30_000,
  });
  const open = query !== null && people.length > 0;

  // "@ra|" -> look up "ra"
  const track = (text: string, caret: number) => {
    const m = /(^|\s)@([\w.-]{0,30})$/.exec(text.slice(0, caret));
    setQuery(m ? m[2] : null);
    setActive(0);
  };

  const pick = (username: string) => {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@([\w.-]{0,30})$/, `@${username} `);
    const next = before + value.slice(caret);
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i + (e.key === "ArrowDown" ? 1 : people.length - 1)) % people.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(people[active].username);
        return;
      }
      if (e.key === "Escape") {
        setQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div style={{ position: "relative", flex: 1 }}>
      {open && (
        <Paper shadow="md" withBorder p={4} style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 6, zIndex: 20, minWidth: 240 }} role="listbox" aria-label="People to mention">
          <Stack gap={0}>
            {people.map((p, i) => (
              <UnstyledButton
                key={p.value}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p.username);
                }}
                px="xs"
                py={6}
                style={{ borderRadius: 6, background: i === active ? "var(--mantine-primary-color-light)" : undefined }}
              >
                <Group gap="xs" wrap="nowrap">
                  <Avatar size={24} radius="xl" color="initials" name={p.label}>
                    {initialsOf(p.label)}
                  </Avatar>
                  <Text size="sm">{p.label}</Text>
                  <Text size="xs" c="dimmed">
                    @{p.username}
                  </Text>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </Paper>
      )}
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.currentTarget.value);
          track(e.currentTarget.value, e.currentTarget.selectionStart ?? e.currentTarget.value.length);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        placeholder={placeholder}
        autosize
        minRows={1}
        maxRows={8}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label={placeholder ?? "Message"}
      />
    </div>
  );
}
