import { ActionIcon, Indicator, Tooltip } from "@mantine/core";
import { IconMessages } from "@tabler/icons-react";
import { Link } from "react-router-dom";

import { useChatOverview } from "./useChat";

// The chat icon in the top bar, with how many unread messages are waiting
// (direct messages, groups and mentions). Hidden while team chat is off.
export function ChatButton() {
  const { data } = useChatOverview();
  if (!data?.enabled) return null;
  const unread = data.unread;
  const label = unread ? `Chat, ${unread} unread` : "Chat";
  return (
    <Tooltip label={label}>
      <Indicator disabled={!unread} label={unread > 9 ? "9+" : unread} size={16} offset={6} color="red">
        <ActionIcon component={Link} to="/chat" aria-label={label}>
          <IconMessages size={18} />
        </ActionIcon>
      </Indicator>
    </Tooltip>
  );
}
