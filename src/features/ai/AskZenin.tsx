import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ActionIcon, Anchor, Badge, Box, Button, Drawer, Group, Loader, Paper, ScrollArea, Stack, Text, Textarea, Tooltip, UnstyledButton } from "@mantine/core";
import { IconArrowUp, IconRefresh, IconSparkles } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api, { errorMessage } from "../../api/api";
import { useCurrentUser } from "../../auth/AuthContext";

// Ask Zenin: questions about your records, answered by the AI an admin chose
// (Administration → AI). It sees only what you can see, and only reads. The
// conversation stays in this browser tab.

type Turn = { role: "user" | "assistant"; content: string; error?: boolean };

const SUGGESTIONS = ["What's assigned to me?", "What was added this week?", "What's due in the next 7 days?"];

// sessionStorage can be missing or blocked: the conversation then just isn't kept on reload
const storageKey = (userId: string) => `askZenin:${userId}`;
const load = (userId: string): Turn[] => {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey(userId)) ?? "[]") as Turn[];
  } catch {
    return [];
  }
};
const store = (userId: string, turns: Turn[]) => {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(turns.slice(-30)));
  } catch {
    // not kept
  }
};

/* ---------------- the answer's text ---------------- */

// A small part of Markdown: [links](/table/…), **bold**, and "- " lists.
// Only links inside Zenin become links.
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\((\/[^)\s]*)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <Anchor key={`${key}-${i++}`} component={Link} to={m[2]} inherit fw={500}>
          {m[1]}
        </Anchor>
      );
    } else {
      out.push(<strong key={`${key}-${i++}`}>{m[3]}</strong>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Answer({ text }: { text: string }) {
  const blocks: { list: boolean; lines: string[] }[] = [];
  for (const line of text.split("\n")) {
    const item = /^\s*[-*]\s+(.*)$/.exec(line);
    const list = Boolean(item);
    const content = item ? item[1] : line;
    const prev = blocks.at(-1);
    if (prev && prev.list === list && (list || content.trim())) prev.lines.push(content);
    else if (content.trim() || list) blocks.push({ list, lines: [content] });
  }
  return (
    <Stack gap={6}>
      {blocks.map((b, i) =>
        b.list ? (
          <Box key={i} component="ul" m={0} pl={20}>
            {b.lines.map((l, j) => (
              <Text key={j} component="li" size="sm">
                {inline(l, `${i}-${j}`)}
              </Text>
            ))}
          </Box>
        ) : (
          <Text key={i} size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {b.lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && "\n"}
                {inline(l, `${i}-${j}`)}
              </Fragment>
            ))}
          </Text>
        )
      )}
    </Stack>
  );
}

/* ---------------- the drawer ---------------- */

function Conversation({ onNavigate }: { onNavigate: () => void }) {
  const { user } = useCurrentUser();
  const [turns, setTurns] = useState<Turn[]>(() => load(user._id));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    store(user._id, turns);
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: "smooth" });
  }, [turns, user._id]);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setText("");
    setBusy(true);
    try {
      const history = next.filter((t) => !t.error).map(({ role, content }) => ({ role, content }));
      const { data } = await api.post<{ answer: string }>("/ai/ask", { turns: history });
      setTurns((t) => [...t, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setTurns((t) => [...t, { role: "assistant", content: errorMessage(err), error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap={0} h="100%">
      <ScrollArea style={{ flex: 1 }} viewportRef={viewport} px="md" type="auto">
        {turns.length === 0 ? (
          <Stack gap="sm" py="md">
            <Text size="sm">Ask about your records in plain words. I'll look them up and link to what I find.</Text>
            <Text size="xs" c="dimmed">
              I only see what you can see, and I can't change anything yet.
            </Text>
            <Stack gap={6} mt="xs">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="light" size="xs" justify="flex-start" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </Stack>
          </Stack>
        ) : (
          <Stack gap="md" py="md" onClick={(e) => (e.target as HTMLElement).closest("a[href^='/']") && onNavigate()}>
            {turns.map((t, i) =>
              t.role === "user" ? (
                <Paper key={i} bg="var(--mantine-primary-color-light)" radius="lg" px="sm" py={6} ml="xl" style={{ alignSelf: "flex-end" }}>
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                    {t.content}
                  </Text>
                </Paper>
              ) : t.error ? (
                <Text key={i} size="sm" c="red">
                  {t.content}
                </Text>
              ) : (
                <Answer key={i} text={t.content} />
              )
            )}
            {busy && (
              <Group gap="xs">
                <Loader size="xs" type="dots" />
                <Text size="xs" c="dimmed">
                  Looking it up…
                </Text>
              </Group>
            )}
          </Stack>
        )}
      </ScrollArea>
      <Box p="md" style={{ borderTop: "1px solid var(--app-border)" }}>
        <Group gap="xs" align="flex-end" wrap="nowrap">
          <Textarea
            style={{ flex: 1 }}
            autosize
            minRows={1}
            maxRows={5}
            maxLength={2000}
            placeholder="Ask a question…"
            aria-label="Your question"
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(text);
              }
            }}
            data-autofocus
          />
          <ActionIcon size="lg" onClick={() => send(text)} loading={busy} disabled={!text.trim()} aria-label="Ask">
            <IconArrowUp size={18} />
          </ActionIcon>
        </Group>
        <Group justify="space-between" mt={6}>
          <Text size="xs" c="dimmed">
            AI can make mistakes. Check before relying on it.
          </Text>
          {turns.length > 0 && (
            <UnstyledButton onClick={() => setTurns([])} disabled={busy} aria-label="New conversation">
              <Group gap={4}>
                <IconRefresh size={12} />
                <Text size="xs" c="dimmed">
                  New
                </Text>
              </Group>
            </UnstyledButton>
          )}
        </Group>
      </Box>
    </Stack>
  );
}

// The Ask button in the top bar (only for people it's switched on for).
export function AskZenin() {
  const [opened, setOpened] = useState(false);
  const { data } = useQuery({
    queryKey: ["askAvailable"],
    queryFn: async () => (await api.get<{ available: boolean }>("/ai/assistant")).data,
    staleTime: 60_000,
  });
  if (!data?.available) return null;
  return (
    <>
      <Tooltip label="Ask Zenin (AI)">
        <ActionIcon aria-label="Ask Zenin" onClick={() => setOpened(true)}>
          <IconSparkles size={18} />
        </ActionIcon>
      </Tooltip>
      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        position="right"
        size="md"
        title={
          <Group gap="xs">
            <IconSparkles size={18} />
            <Text fw={700}>Ask Zenin</Text>
            <Badge size="xs" variant="light" color="violet">
              AI · Beta
            </Badge>
          </Group>
        }
        styles={{ content: { display: "flex", flexDirection: "column" }, body: { flex: 1, padding: 0, minHeight: 0 } }}
      >
        <Conversation onNavigate={() => setOpened(false)} />
      </Drawer>
    </>
  );
}
