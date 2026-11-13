import { useState } from "react";
import { ActionIcon, Anchor, Avatar, Box, Button, Group, Menu, Stack, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDots, IconMessageCircle, IconPencil, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import api, { errorMessage } from "../../api/api";
import { useCurrentUser } from "../../auth/AuthContext";
import { Section } from "../../components/ui/Page";
import { initialsOf } from "../../layout/UserMenu";
import { formatDateTime, formatRelative } from "../../lib/format";
import { MentionInput } from "../chat/MentionInput";
import { MessageText } from "../chat/MessageText";
import { useComments, type Comment } from "../chat/useChat";

// The conversation under a record. Hidden when an admin has switched comments off.
export function CommentsSection({ table, id }: { table: string; id: string }) {
  const { user, isAdmin } = useCurrentUser();
  const qc = useQueryClient();
  const { data: comments, isError } = useComments(table, id, true);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [sending, setSending] = useState(false);
  const base = `/table/${encodeURIComponent(table)}/${encodeURIComponent(id)}/comments`;
  const refresh = () => qc.invalidateQueries({ queryKey: ["comments", table, id] });

  if (isError || !comments) return null;

  const fail = (title: string) => (err: unknown) => notifications.show({ title, message: errorMessage(err), color: "red" });

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await api.post<{ _id: string; warning?: string | null }>(base, { body: text });
      setText("");
      if (data.warning) notifications.show({ message: data.warning, color: "yellow" });
      await refresh();
    } catch (err) {
      fail("Couldn't post the comment")(err);
    } finally {
      setSending(false);
    }
  };
  const saveEdit = (c: Comment) =>
    api
      .put(`${base}/${c._id}`, { body: editText })
      .then(() => {
        setEditing(null);
        return refresh();
      })
      .catch(fail("Couldn't save"));
  const remove = (c: Comment) => api.delete(`${base}/${c._id}`).then(refresh).catch(fail("Couldn't delete"));

  return (
    <Section title={comments.length ? `Comments (${comments.length})` : "Comments"}>
      <Stack gap="md">
        {comments.length === 0 && (
          <Group gap="xs" c="dimmed">
            <IconMessageCircle size={18} stroke={1.5} />
            <Text size="sm">No comments yet. Ask a question or give an update; type @ to bring someone in.</Text>
          </Group>
        )}
        {comments.map((c) => {
          const mine = c.userId === user._id;
          return (
            <Group key={c._id} gap="sm" align="flex-start" wrap="nowrap">
              <Avatar size={32} radius="xl" color="initials" name={c.name}>
                {initialsOf(c.name)}
              </Avatar>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Group gap="xs" align="baseline" justify="space-between" wrap="nowrap">
                  <Group gap="xs" align="baseline">
                    <Text size="sm" fw={600}>
                      {c.name}
                    </Text>
                    <Tooltip label={formatDateTime(c.createdAt)}>
                      <Text size="xs" c="dimmed">
                        {formatRelative(c.createdAt)}
                        {c.editedAt ? " · edited" : ""}
                      </Text>
                    </Tooltip>
                  </Group>
                  {(mine || isAdmin) && editing !== c._id && (
                    <Menu position="bottom-end">
                      <Menu.Target>
                        <ActionIcon size="sm" variant="subtle" color="gray" aria-label={`Options for ${c.name}'s comment`}>
                          <IconDots size={14} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {mine && (
                          <Menu.Item
                            leftSection={<IconPencil size={14} />}
                            onClick={() => {
                              setEditing(c._id);
                              setEditText(c.body);
                            }}
                          >
                            Edit
                          </Menu.Item>
                        )}
                        <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => remove(c)}>
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  )}
                </Group>
                {editing === c._id ? (
                  <Stack gap={4} mt={4}>
                    <MentionInput value={editText} onChange={setEditText} onSubmit={() => saveEdit(c)} autoFocus />
                    <Group gap="xs">
                      <Button size="xs" onClick={() => saveEdit(c)} disabled={!editText.trim()}>
                        Save
                      </Button>
                      <Anchor size="xs" component="button" onClick={() => setEditing(null)}>
                        Cancel
                      </Anchor>
                    </Group>
                  </Stack>
                ) : (
                  <MessageText body={c.body} />
                )}
              </Box>
            </Group>
          );
        })}
        <Group gap="xs" align="flex-end" wrap="nowrap">
          <MentionInput value={text} onChange={setText} onSubmit={send} placeholder="Write a comment… (@ to mention)" />
          <Button onClick={send} loading={sending} disabled={!text.trim()}>
            Post
          </Button>
        </Group>
      </Stack>
    </Section>
  );
}
