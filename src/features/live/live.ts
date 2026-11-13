import { useEffect, useMemo, useSyncExternalStore } from "react";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { recordPath } from "../../layout/nav";

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
      notifications.show({
        title: n.title,
        message: n.table && n.id ? "Click to open" : "",
        color: "blue",
        style: n.table && n.id ? { cursor: "pointer" } : undefined,
        onClick: () => {
          if (n.table && n.id) navigate(recordPath(n.table, n.id));
        },
      });
    });
    source.addEventListener("change", (e) => {
      const c = JSON.parse((e as MessageEvent).data) as Omit<LiveChange, "at">;
      if (c.by === meId) return; // your own changes are already on screen
      push({ ...c, at: Date.now() });
      qc.invalidateQueries({ queryKey: ["tile"] }); // dashboard counts
    });
    // (re)connected: catch up on anything missed meanwhile
    source.onopen = () => qc.invalidateQueries({ queryKey: ["notifications"] });
    return () => source.close();
  }, [qc, navigate, meId]);
}
