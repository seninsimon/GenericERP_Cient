import { Button, Center, Loader, Stack, Switch, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api, { errorMessage } from "../../api/api";
import { Page, PageHeader, Section } from "../../components/ui/Page";

type ChatSettings = { teamChat: boolean; directMessages: boolean; comments: boolean };

// Administration → Chat: three switches, saved as you flip them.
export default function ChatSettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["chatSettings"],
    queryFn: async () => (await api.get<ChatSettings>("/chat/settings")).data,
  });
  const save = useMutation({
    mutationFn: async (patch: Partial<ChatSettings>) => (await api.put<{ settings: ChatSettings }>("/chat/settings", patch)).data.settings,
    onSuccess: (settings) => {
      qc.setQueryData(["chatSettings"], settings);
      qc.invalidateQueries({ queryKey: ["chat"] });
      qc.invalidateQueries({ queryKey: ["comments"] });
      notifications.show({ message: "Chat settings saved", color: "green" });
    },
    onError: (err) => notifications.show({ title: "Couldn't save", message: errorMessage(err), color: "red" }),
  });

  return (
    <Page title="Chat" breadcrumbs={[{ label: "Administration" }, { label: "Chat" }]} width="wide">
      <PageHeader
        title="Chat"
        description="Talk where the work is. Chat messages aren't emailed; comment mentions follow each person's email choice."
        actions={
          data?.teamChat ? (
            <Button variant="default" component={Link} to="/chat">
              Open chat
            </Button>
          ) : undefined
        }
      />
      {!data ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : (
        <Section title="Settings">
          <Stack gap="lg">
            <Switch
              label="Comments on records"
              description="A conversation under every record. Type @ to bring someone in; only people who can see the record are told."
              checked={data.comments}
              onChange={(e) => save.mutate({ comments: e.currentTarget.checked })}
            />
            <Switch
              label="Team chat"
              description="An #everyone channel plus one channel per department, ready-made. Admins can read department channels."
              checked={data.teamChat}
              onChange={(e) => save.mutate({ teamChat: e.currentTarget.checked })}
            />
            <Switch
              label="Direct messages and groups"
              description="Private conversations between people. Not even admins can read them."
              checked={data.directMessages}
              disabled={!data.teamChat}
              onChange={(e) => save.mutate({ directMessages: e.currentTarget.checked })}
            />
            <Text size="xs" c="dimmed">
              Video calls open in Jitsi Meet (free, in the browser): anyone with the call link can join, so share it only in the conversation.
            </Text>
          </Stack>
        </Section>
      )}
    </Page>
  );
}
