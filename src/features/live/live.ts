import { useEffect, useMemo, useSyncExternalStore } from "react";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { noticePath } from "../../layout/nav";
import { alertPerson } from "../../lib/alerts";
import type { ChatOverview } from "../chat/useChat";

// Live updates (GET /api/events, Server-Sent Events). The bell and its pop-up
// are instant. Open lists and records don't redraw by themselves (rows moving
// under your mouse is worse than a moment's delay): they show "Hana changed
// this · Refresh". Dashboards' counts update quietly.

export type LiveChange = { table: string; id: string | null; by: string; byName: string; deleted: boolean; at: number };

// changes by other people, kept for the open screens to ask about
let changes: LiveChange[] = [];
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const push = (c: LiveChange) => {
  changes = [...changes.slice(-199), c];
  listeners.forEach((l) => l());
};

// Changes by others to this table (or this record) since `since`.
export function useLiveChanges(table: string, since: number, id?: string): LiveChange[] {
  const all = useSyncExternalStore(subscribe, () => changes);
  return useMemo(
    () => all.filter((c) => c.table === table && c.at > since && (!id || c.id === id || c.id === null)),
    [all, table, since, id]
  );
}

// One connection per browser tab, opened once signed in (AppLayout).
export function useLiveConnection(meId: string) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource(`${import.meta.env.VITE_API_BASE_URL}/events`, { withCredentials: true });
    source.addEventListener("notification", (e) => {
      const n = JSON.parse((e as MessageEvent).data) as { title: string; table: string | null; id: string | null };
      qc.invalidateQueries({ queryKey: ["notifications"] });
      // the bell only gets what others did that concerns you: chime / desktop
      alertPerson(n.title, n.table && n.id ? "Click to open" : "", n.table && n.id ? () => navigate(noticePath(n.table!, n.id!)) : undefined);
      notifications.show({
        title: n.title,
        message: n.table && n.id ? "Click to open" : "",
        color: "blue",
        style: n.table && n.id ? { cursor: "pointer" } : undefined,
        onClick: () => {
          if (n.table && n.id) navigate(noticePath(n.table, n.id));
        },
      });
    });
    source.addEventListener("change", (e) => {
      const c = JSON.parse((e as MessageEvent).data) as Omit<LiveChange, "at">;
      if (c.by === meId) return; // your own changes are already on screen
      push({ ...c, at: Date.now() });
      qc.invalidateQueries({ queryKey: ["tile"] }); // dashboard counts
    });
    source.addEventListener("chat", (e) => {
      const c = JSON.parse((e as MessageEvent).data) as { channel: string; by: string; change: string };
      qc.invalidateQueries({ queryKey: ["chatMessages", c.channel] });
      if (c.by === meId) return;
      qc.invalidateQueries({ queryKey: ["chat"] }); // unread counts
      // a new message in a direct message or group: chime / desktop, unless
      // you're looking at that conversation (mentions in channels come through
      // the bell; busy channels stay quiet)
      if (c.change !== "message") return;
      const channel = qc.getQueryData<ChatOverview>(["chat"])?.channels.find((ch) => ch._id === c.channel);
      if (!channel || (channel.kind !== "dm" && channel.kind !== "group")) return;
      const open = window.location.pathname === "/chat" && new URLSearchParams(window.location.search).get("c") === c.channel;
      if (open && document.visibilityState === "visible" && document.hasFocus()) return;
      alertPerson(
        channel.kind === "dm" ? `New message from ${channel.name}` : `New message in ${channel.name}`,
        "Click to open the conversation",
        () => navigate(`/chat?c=${encodeURIComponent(c.channel)}`)
      );
    });
    source.addEventListener("comment", (e) => {
      const c = JSON.parse((e as MessageEvent).data) as { table: string; id: string };
      qc.invalidateQueries({ queryKey: ["comments", c.table, c.id] });
    });
    // (re)connected: catch up on anything missed meanwhile
    source.onopen = () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["chat"] });
    };
    return () => source.close();
  }, [qc, navigate, meId]);
}
