import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  FileButton,
  Group,
  Image,
  Loader,
  Menu,
  Modal,
  MultiSelect,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconDots,
  IconHash,
  IconMessageCircle,
  IconMoodSmile,
  IconPaperclip,
  IconPencil,
  IconPhone,
  IconPlus,
  IconSearch,
  IconSend,
  IconTrash,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import api, { errorMessage, getUserOptions, uploadFiles } from "../api/api";
import { useCurrentUser } from "../auth/AuthContext";
import { EmptyState } from "../components/ui/EmptyState";
import { Page } from "../components/ui/Page";
import { MentionInput } from "../features/chat/MentionInput";
import { MessageText } from "../features/chat/MessageText";
import { REACTIONS, useChatOverview, useMessages, type ChatChannel, type ChatMessage } from "../features/chat/useChat";
import { initialsOf } from "../layout/UserMenu";
import { formatDateTime } from "../lib/format";

const FILE_BASE = import.meta.env.VITE_FILE_BASE_URL ?? "";
const fileUrl = (url: string) => (url.startsWith("/uploads/") ? `${FILE_BASE}${url}` : url);
const isImage = (name: string) => /\.(png|jpe?g|gif|webp)$/i.test(name);

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
};

/* ---------------- the conversation list ---------------- */

function ChannelRow({ c, active, onOpen }: { c: ChatChannel; active: boolean; onOpen: () => void }) {
  const unread = c.kind === "everyone" || c.kind === "department" ? c.mentions || c.unread : c.unread;
  return (
    <UnstyledButton
      onClick={onOpen}
      px="sm"
      py={6}
      aria-current={active ? "page" : undefined}
      style={{ borderRadius: 8, background: active ? "var(--mantine-primary-color-light)" : undefined, display: "block", width: "100%" }}
    >
      <Group gap="xs" wrap="nowrap">
        {c.kind === "dm" ? (
          <Avatar size={24} radius="xl" color="initials" name={c.name}>
            {initialsOf(c.name)}
          </Avatar>
        ) : c.kind === "group" ? (
          <IconUsers size={18} color="var(--mantine-color-dimmed)" />
        ) : (
          <IconHash size={18} color="var(--mantine-color-dimmed)" />
        )}
        <Text size="sm" fw={c.unread ? 700 : 400} truncate style={{ flex: 1 }} c={c.kind === "dm" && c.otherActive === false ? "dimmed" : undefined}>
          {c.name}
        </Text>
        {c.mentions > 0 ? (
          <Badge size="sm" color="red" variant="filled" circle={c.mentions < 10}>
            {c.mentions}
          </Badge>
        ) : unread > 0 && c.kind !== "everyone" && c.kind !== "department" ? (
          <Badge size="sm" variant="filled" circle={unread < 10}>
            {unread}
          </Badge>
        ) : null}
      </Group>
    </UnstyledButton>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Stack gap={2}>
      <Group justify="space-between" px="sm" mt="sm" mb={2}>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
          {title}
        </Text>
        {action}
      </Group>
      {children}
    </Stack>
  );
}

function SearchBox({ onOpen }: { onOpen: (channel: string) => void }) {
  const [q, setQ] = useState("");
  const [debounced] = useDebouncedValue(q, 300);
  const { data: results = [] } = useQuery({
    queryKey: ["chatSearch", debounced],
    queryFn: async () => (await api.get<ChatMessage[]>("/chat/search", { params: { q: debounced } })).data,
    enabled: debounced.trim().length >= 2,
  });
  return (
    <Box pos="relative">
      <TextInput size="xs" placeholder="Search messages" leftSection={<IconSearch size={14} />} value={q} onChange={(e) => setQ(e.currentTarget.value)} aria-label="Search messages" />
      {debounced.trim().length >= 2 && q && (
        <Paper shadow="md" withBorder p={4} pos="absolute" top="110%" left={0} right={0} style={{ zIndex: 30, maxHeight: 320, overflow: "auto" }}>
          {results.length ? (
            results.map((m) => (
              <UnstyledButton
                key={m._id}
                onClick={() => {
                  onOpen(m.channelId);
                  setQ("");
                }}
                p="xs"
                style={{ display: "block", width: "100%", borderRadius: 6 }}
              >
                <Text size="xs" c="dimmed">
                  {m.name} · {dayLabel(m.createdAt)}
                </Text>
                <Text size="sm" lineClamp={2}>
                  {m.body}
                </Text>
              </UnstyledButton>
            ))
          ) : (
            <Text size="sm" c="dimmed" p="xs">
              Nothing found
            </Text>
          )}
        </Paper>
      )}
    </Box>
  );
}

/* ---------------- new conversation ---------------- */

function PeoplePicker({ value, onChange, multiple }: { value: string[]; onChange: (v: string[]) => void; multiple?: boolean }) {
  const [search, setSearch] = useState("");
  const { user } = useCurrentUser();
  const { data: people = [] } = useQuery({
    queryKey: ["chatPeople", search],
    queryFn: async () => (await getUserOptions({ search, limit: 30 })).data,
  });
  const data = people.filter((p) => p.value !== user._id).map((p) => ({ value: p.value, label: p.label }));
  return multiple ? (
    <MultiSelect label="People" data={data} value={value} onChange={onChange} searchable searchValue={search} onSearchChange={setSearch} placeholder="Type a name" nothingFoundMessage="No one found" />
  ) : (
    <Select label="Person" data={data} value={value[0] ?? null} onChange={(v) => onChange(v ? [v] : [])} searchable searchValue={search} onSearchChange={setSearch} placeholder="Type a name" nothingFoundMessage="No one found" />
  );
}

/* ---------------- one message ---------------- */

function MessageItem({ m, first, onEdit }: { m: ChatMessage; first: boolean; onEdit: (m: ChatMessage) => void }) {
  const { user, isAdmin } = useCurrentUser();
  const qc = useQueryClient();
  const mine = m.userId === user._id;
  const refresh = () => qc.invalidateQueries({ queryKey: ["chatMessages", m.channelId] });
  const react = (emoji: string) => api.post(`/chat/messages/${m._id}/reactions`, { emoji }).then(refresh);
  const remove = () => api.delete(`/chat/messages/${m._id}`).then(refresh).catch((e) => notifications.show({ title: "Couldn't delete", message: errorMessage(e), color: "red" }));
  const [hover, setHover] = useState(false);

  return (
    <Group
      gap="sm"
      wrap="nowrap"
      align="flex-start"
      px="md"
      py={first ? 6 : 2}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative", background: hover ? "var(--mantine-color-default-hover)" : undefined }}
    >
      <Box w={36} style={{ flexShrink: 0 }}>
        {first ? (
          <Avatar size={36} radius="xl" color="initials" name={m.name}>
            {initialsOf(m.name)}
          </Avatar>
        ) : (
          hover && (
            <Text size="10px" c="dimmed" ta="right" mt={4}>
              {time(m.createdAt)}
            </Text>
          )
        )}
      </Box>
      <Box style={{ flex: 1, minWidth: 0 }}>
        {first && (
          <Group gap="xs" align="baseline">
            <Text size="sm" fw={700}>
              {m.name}
            </Text>
            <Tooltip label={formatDateTime(m.createdAt)}>
              <Text size="xs" c="dimmed">
                {time(m.createdAt)}
              </Text>
            </Tooltip>
          </Group>
        )}
        {m.deleted ? (
          <Text size="sm" c="dimmed" fs="italic">
            This message was deleted
          </Text>
        ) : m.kind === "call" ? (
          <Paper withBorder radius="md" p="sm" maw={360} mt={2}>
            <Group gap="sm" wrap="nowrap">
              <IconVideo size={20} color="var(--mantine-primary-color-filled)" />
              <Text size="sm" style={{ flex: 1 }}>
                {mine ? "You" : m.name} started a call
              </Text>
              <Button size="xs" component="a" href={m.body} target="_blank" rel="noopener noreferrer" leftSection={<IconPhone size={14} />}>
                Join
              </Button>
            </Group>
          </Paper>
        ) : (
          <>
            {m.body && <MessageText body={m.body} />}
            {m.attachments.map((a) =>
              isImage(a.name) ? (
                <Anchor key={a.url} href={fileUrl(a.url)} target="_blank" rel="noopener noreferrer">
                  <Image src={fileUrl(a.url)} alt={a.name} maw={280} mah={220} fit="contain" radius="md" mt={4} />
                </Anchor>
              ) : (
                <Group key={a.url} gap={6} mt={4}>
                  <IconPaperclip size={14} />
                  <Anchor href={fileUrl(a.url)} target="_blank" rel="noopener noreferrer" size="sm">
                    {a.name}
                  </Anchor>
                </Group>
              )
            )}
            {m.editedAt && (
              <Text size="xs" c="dimmed">
                (edited)
              </Text>
            )}
          </>
        )}
        {m.reactions.length > 0 && (
          <Group gap={4} mt={4}>
            {m.reactions.map((r) => (
              <Button
                key={r.emoji}
                size="compact-xs"
                radius="xl"
                variant={r.mine ? "light" : "default"}
                onClick={() => react(r.emoji)}
                aria-label={`${r.emoji} ${r.count}${r.mine ? ", yours" : ""}`}
              >
                {r.emoji} {r.count}
              </Button>
            ))}
          </Group>
        )}
      </Box>
      {hover && !m.deleted && (
        <Paper withBorder shadow="xs" radius="md" p={2} style={{ position: "absolute", right: 16, top: -10 }}>
          <Group gap={0}>
            {REACTIONS.slice(0, 3).map((e) => (
              <ActionIcon key={e} variant="subtle" color="gray" onClick={() => react(e)} aria-label={`React ${e}`}>
                {e}
              </ActionIcon>
            ))}
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" aria-label="More reactions">
                  <IconMoodSmile size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Group gap={2} p={4}>
                  {REACTIONS.map((e) => (
                    <ActionIcon key={e} variant="subtle" color="gray" onClick={() => react(e)} aria-label={`React ${e}`}>
                      {e}
                    </ActionIcon>
                  ))}
                </Group>
              </Menu.Dropdown>
            </Menu>
            {(mine || isAdmin) && (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" aria-label="Message options">
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {mine && m.kind === "text" && (
                    <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => onEdit(m)}>
                      Edit
                    </Menu.Item>
                  )}
                  <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={remove}>
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Paper>
      )}
    </Group>
  );
}

/* ---------------- one conversation ---------------- */

function Conversation({ channel, onBack }: { channel: ChatChannel; onBack?: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useMessages(channel._id);
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [hasOlder, setHasOlder] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<{ url: string; name: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const messages = useMemo(() => [...older, ...(data?.messages ?? [])], [older, data]);
  const more = hasOlder ?? data?.more ?? false;
  const lastId = data?.messages.at(-1)?._id;

  // read up to the newest, and keep the newest in view
  useEffect(() => {
    if (!lastId) return;
    void api.post(`/chat/${channel._id}/read`, { lastId }).then(() => {
      qc.invalidateQueries({ queryKey: ["chat"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    });
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight });
  }, [lastId, channel._id, qc]);

  const loadOlder = async () => {
    const first = messages[0]?._id;
    if (!first) return;
    const res = (await api.get<{ messages: ChatMessage[]; more: boolean }>(`/chat/${channel._id}/messages`, { params: { before: first, limit: 60 } })).data;
    setOlder((o) => [...res.messages, ...o]);
    setHasOlder(res.more);
  };

  const send = async () => {
    if (sending || (!text.trim() && !files.length)) return;
    setSending(true);
    try {
      if (editing) {
        await api.put(`/chat/messages/${editing._id}`, { body: text });
        setEditing(null);
      } else {
        await api.post(`/chat/${channel._id}/messages`, { body: text, attachments: files });
      }
      setText("");
      setFiles([]);
      await qc.invalidateQueries({ queryKey: ["chatMessages", channel._id] });
    } catch (err) {
      notifications.show({ title: "Couldn't send", message: errorMessage(err), color: "red" });
    } finally {
      setSending(false);
    }
  };
  const startCall = async () => {
    try {
      const { data: r } = await api.post<{ url: string }>(`/chat/${channel._id}/messages`, { call: true });
      window.open(r.url, "_blank", "noopener");
      await qc.invalidateQueries({ queryKey: ["chatMessages", channel._id] });
    } catch (err) {
      notifications.show({ title: "Couldn't start the call", message: errorMessage(err), color: "red" });
    }
  };
  const attach = async (picked: File[]) => {
    if (!picked.length) return;
    try {
      const { data: up } = await uploadFiles(picked);
      setFiles((f) => [...f, ...(up as { url: string; name: string }[])].slice(0, 10));
    } catch (err) {
      notifications.show({ title: "Couldn't attach", message: errorMessage(err), color: "red" });
    }
  };
  const leave = async () => {
    await api.delete(`/chat/${channel._id}/membership`);
    await qc.invalidateQueries({ queryKey: ["chat"] });
    onBack?.();
  };

  const title = channel.kind === "dm" ? channel.name : channel.kind === "group" ? channel.name : `#${channel.name}`;
  const placeholder = channel.kind === "dm" ? `Message ${channel.name}` : `Message ${title}`;

  return (
    <Stack gap={0} h="100%">
      <Group justify="space-between" px="md" py="sm" style={{ borderBottom: "1px solid var(--app-border)" }} wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          {onBack && (
            <ActionIcon variant="subtle" onClick={onBack} aria-label="Back to conversations">
              <IconArrowLeft size={18} />
            </ActionIcon>
          )}
          <Text fw={700} truncate>
            {title}
          </Text>
          {channel.kind === "group" && (
            <Text size="xs" c="dimmed">
              {channel.memberCount} people
            </Text>
          )}
        </Group>
        <Group gap={4} wrap="nowrap">
          <Tooltip label="Start a video call">
            <ActionIcon variant="default" onClick={startCall} aria-label="Start a call">
              <IconVideo size={18} />
            </ActionIcon>
          </Tooltip>
          {channel.kind === "group" && (
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="default" aria-label="Group options">
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item color="red" onClick={leave}>
                  Leave the group
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>

      <ScrollArea style={{ flex: 1 }} viewportRef={viewport} type="auto">
        {isLoading ? (
          <Center h={200}>
            <Loader size="sm" />
          </Center>
        ) : messages.length ? (
          <Stack gap={0} py="sm">
            {more && (
              <Center py="xs">
                <Button size="xs" variant="subtle" onClick={loadOlder}>
                  Load earlier messages
                </Button>
              </Center>
            )}
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
              const first = newDay || !prev || prev.userId !== m.userId || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60_000;
              return (
                <Box key={m._id}>
                  {newDay && (
                    <Group gap="xs" px="md" my="sm">
                      <Box style={{ flex: 1, borderTop: "1px solid var(--app-border)" }} />
                      <Text size="xs" c="dimmed" fw={600}>
                        {dayLabel(m.createdAt)}
                      </Text>
                      <Box style={{ flex: 1, borderTop: "1px solid var(--app-border)" }} />
                    </Group>
                  )}
                  <MessageItem
                    m={m}
                    first={first}
                    onEdit={(msg) => {
                      setEditing(msg);
                      setText(msg.body);
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        ) : (
          <EmptyState
            icon={<IconMessageCircle size={26} stroke={1.5} />}
            title={channel.kind === "dm" ? `This is the start of your conversation with ${channel.name}` : `Welcome to ${title}`}
            description="Say hello 👋 Type @ to mention someone, or paste a link to a record to share it."
          />
        )}
      </ScrollArea>

      <Box px="md" py="sm" style={{ borderTop: "1px solid var(--app-border)" }}>
        {editing && (
          <Group justify="space-between" mb={4}>
            <Text size="xs" c="dimmed">
              Editing your message
            </Text>
            <Anchor
              size="xs"
              component="button"
              onClick={() => {
                setEditing(null);
                setText("");
              }}
            >
              Cancel
            </Anchor>
          </Group>
        )}
        {files.length > 0 && (
          <Group gap={6} mb={6}>
            {files.map((f) => (
              <Badge key={f.url} variant="default" rightSection={<UnstyledButton aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y.url !== f.url))}>×</UnstyledButton>}>
                {f.name}
              </Badge>
            ))}
          </Group>
        )}
        <Group gap="xs" align="flex-end" wrap="nowrap">
          {!editing && (
            <FileButton onChange={attach} multiple>
              {(props) => (
                <ActionIcon {...props} variant="default" size="lg" aria-label="Attach files">
                  <IconPaperclip size={18} />
                </ActionIcon>
              )}
            </FileButton>
          )}
          <MentionInput value={text} onChange={setText} onSubmit={send} placeholder={placeholder} autoFocus />
          <ActionIcon size="lg" onClick={send} loading={sending} disabled={!text.trim() && !files.length} aria-label="Send">
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </Box>
    </Stack>
  );
}

/* ---------------- the page ---------------- */

export default function ChatPage() {
  const { isAdmin } = useCurrentUser();
  const qc = useQueryClient();
  const narrow = useMediaQuery("(max-width: 48em)");
  const [params, setParams] = useSearchParams();
  const { data, isLoading } = useChatOverview();
  const [dialog, setDialog] = useState<"dm" | "group" | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  const channels = useMemo(() => data?.channels ?? [], [data]);
  const everyone = channels.find((c) => c.kind === "everyone");
  const selectedId = params.get("c") ?? (narrow ? null : (everyone?._id ?? null));
  const selected = channels.find((c) => c._id === selectedId) ?? null;
  const open = (id: string) => setParams({ c: id });

  if (isLoading) {
    return (
      <Page title="Chat">
        <Center h={300}>
          <Loader />
        </Center>
      </Page>
    );
  }
  if (!data?.enabled) {
    return (
      <Page title="Chat" breadcrumbs={[{ label: "Chat" }]}>
        <EmptyState
          icon={<IconMessageCircle size={26} stroke={1.5} />}
          title="Team chat is switched off"
          description={isAdmin ? "Switch it on for everyone in Administration → Chat." : "Ask an admin to switch it on."}
          action={
            isAdmin ? (
              <Button component={Link} to="/settings/chat">
                Chat settings
              </Button>
            ) : undefined
          }
        />
      </Page>
    );
  }

  const start = async () => {
    try {
      const res =
        dialog === "dm"
          ? await api.post<{ _id: string }>("/chat/dm", { userId: picked[0] })
          : await api.post<{ _id: string }>("/chat/groups", { name: groupName, userIds: picked });
      await qc.invalidateQueries({ queryKey: ["chat"] });
      setDialog(null);
      setPicked([]);
      setGroupName("");
      open(res.data._id);
    } catch (err) {
      notifications.show({ title: "Couldn't start the conversation", message: errorMessage(err), color: "red" });
    }
  };

  const mine = channels.filter((c) => c.kind === "everyone" || (c.kind === "department" && c.mine));
  const others = channels.filter((c) => c.kind === "department" && !c.mine);
  const groups = channels.filter((c) => c.kind === "group");
  const dms = channels.filter((c) => c.kind === "dm");

  const list = (
    <Stack gap={0} h="100%">
      <Stack gap="xs" p="sm" style={{ borderBottom: "1px solid var(--app-border)" }}>
        <Group justify="space-between">
          <Text fw={700} size="lg">
            Chat
          </Text>
          {data.directMessages && (
            <Menu position="bottom-end">
              <Menu.Target>
                <Button size="xs" leftSection={<IconPlus size={14} />}>
                  New
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconMessageCircle size={14} />} onClick={() => setDialog("dm")}>
                  Message someone
                </Menu.Item>
                <Menu.Item leftSection={<IconUsers size={14} />} onClick={() => setDialog("group")}>
                  New group
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
        <SearchBox onOpen={open} />
      </Stack>
      <ScrollArea style={{ flex: 1 }} px={4} pb="sm">
        <Section title="Channels">
          {mine.map((c) => (
            <ChannelRow key={c._id} c={c} active={c._id === selectedId} onOpen={() => open(c._id)} />
          ))}
        </Section>
        {groups.length > 0 && (
          <Section title="Groups">
            {groups.map((c) => (
              <ChannelRow key={c._id} c={c} active={c._id === selectedId} onOpen={() => open(c._id)} />
            ))}
          </Section>
        )}
        {data.directMessages && (
          <Section
            title="Direct messages"
            action={
              <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setDialog("dm")} aria-label="Message someone">
                <IconPlus size={14} />
              </ActionIcon>
            }
          >
            {dms.length ? (
              dms.map((c) => <ChannelRow key={c._id} c={c} active={c._id === selectedId} onOpen={() => open(c._id)} />)
            ) : (
              <Text size="xs" c="dimmed" px="sm">
                No conversations yet
              </Text>
            )}
          </Section>
        )}
        {others.length > 0 && (
          <Section title="Other departments">
            {others.map((c) => (
              <ChannelRow key={c._id} c={c} active={c._id === selectedId} onOpen={() => open(c._id)} />
            ))}
          </Section>
        )}
      </ScrollArea>
    </Stack>
  );

  return (
    <Page title={selected ? (selected.kind === "dm" ? selected.name : `#${selected.name}`) : "Chat"} breadcrumbs={[{ label: "Chat" }]} width="full">
      <Paper
        withBorder
        radius="lg"
        style={{ display: "flex", height: "calc(100dvh - var(--app-header-height) - 3.5rem)", minHeight: 420, overflow: "hidden" }}
      >
        {(!narrow || !selected) && (
          <Box w={narrow ? "100%" : 280} style={{ borderRight: narrow ? undefined : "1px solid var(--app-border)", flexShrink: 0 }}>
            {list}
          </Box>
        )}
        {selected && (
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Conversation key={selected._id} channel={selected} onBack={narrow ? () => setParams({}) : undefined} />
          </Box>
        )}
      </Paper>

      <Modal opened={dialog !== null} onClose={() => setDialog(null)} title={dialog === "dm" ? "Message someone" : "New group"}>
        <Stack>
          {dialog === "group" && <TextInput label="Group name" placeholder="e.g. Release crew" value={groupName} onChange={(e) => setGroupName(e.currentTarget.value)} data-autofocus />}
          <PeoplePicker value={picked} onChange={setPicked} multiple={dialog === "group"} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={start} disabled={!picked.length || (dialog === "group" && !groupName.trim())}>
              {dialog === "dm" ? "Open conversation" : "Create group"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Page>
  );
}
