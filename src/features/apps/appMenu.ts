import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import { useTables } from "../../api/reactQueryHooks/useTables";

// The apps in the launcher and the sidebar. Each table belongs to one app
// (the server says which: an installed app, or its group like "Company");
// the tables you built yourself make up "My tables".

export type MenuTable = {
  tableName: string;
  showInMenu?: boolean;
  permissions?: { create?: boolean };
  app?: { key: string; name: string; icon: string; description: string } | null;
  columns?: { type: string; ref?: string | null }[];
};

export type LauncherApp = {
  key: string;
  name: string;
  icon: string;
  description: string;
  tables: MenuTable[]; // in the menu
  alsoUsed: MenuTable[]; // other apps' tables this one links to (HR -> People)
};

export const MY_TABLES = { key: "my-tables", name: "My tables", icon: "IconTable", description: "Tables you built yourself" };

// From this many apps on, the sidebar shows one app at a time. Below it,
// every table is listed (grouped by app), as before: no extra click for
// small setups.
export const APP_MODE_FROM = 3;

export const appPath = (key: string) => `/apps/${encodeURIComponent(key)}`;

export function useAppMenu() {
  const { data, isLoading } = useTables();
  const menu = useMemo(() => {
    const all = (data ?? []) as MenuTable[];
    const appOf = (t: MenuTable) => t.app ?? MY_TABLES;
    const byKey = new Map<string, LauncherApp>();
    const appOfTable = new Map<string, string>();
    for (const t of all) {
      const info = appOf(t);
      appOfTable.set(t.tableName, info.key);
      if (!byKey.has(info.key)) byKey.set(info.key, { ...info, tables: [], alsoUsed: [] });
      if (t.showInMenu !== false) byKey.get(info.key)!.tables.push(t);
    }
    // "Also used": tables of other apps that this app's tables link to
    // (including its line tables, e.g. invoice lines -> products)
    const inMenu = new Map(all.filter((t) => t.showInMenu !== false).map((t) => [t.tableName, t]));
    for (const t of all) {
      const app = byKey.get(appOfTable.get(t.tableName)!)!;
      for (const c of t.columns ?? []) {
        if (c.type !== "relation" || !c.ref) continue;
        const target = inMenu.get(c.ref);
        if (!target || appOfTable.get(c.ref) === app.key || app.alsoUsed.includes(target)) continue;
        app.alsoUsed.push(target);
      }
    }
    // Company first, your own tables last, the rest by name
    const apps = [...byKey.values()]
      .filter((a) => a.tables.length)
      .sort((a, b) => {
        const rank = (x: LauncherApp) => (x.key === "company" ? 0 : x.key === MY_TABLES.key ? 2 : 1);
        return rank(a) - rank(b) || a.name.localeCompare(b.name);
      });
    return { apps, appOfTable, appMode: apps.length >= APP_MODE_FROM };
  }, [data]);
  return { ...menu, isLoading };
}

const LAST_APP = "zenin.lastApp";
const readLast = () => {
  try {
    return sessionStorage.getItem(LAST_APP);
  } catch {
    return null;
  }
};

// The app the current page belongs to (null on Home, settings, …). It follows
// the page: an app's page, or the app of the table being viewed. A table that
// the last app also uses (People, opened from HR) keeps you in that app.
export function useCurrentApp(apps: LauncherApp[], appOfTable: Map<string, string>): LauncherApp | null {
  const { pathname } = useLocation();
  const byKey = new Map(apps.map((a) => [a.key, a]));

  let current: LauncherApp | null = null;
  const appPage = pathname.match(/^\/apps\/([^/]+)/);
  const tablePage = pathname.match(/^\/table\/([^/]+)/);
  if (appPage) current = byKey.get(decodeURIComponent(appPage[1])) ?? null;
  else if (tablePage) {
    const table = decodeURIComponent(tablePage[1]);
    const last = byKey.get(readLast() ?? "");
    const keeps = last && (last.tables.some((t) => t.tableName === table) || last.alsoUsed.some((t) => t.tableName === table));
    current = keeps ? last : (byKey.get(appOfTable.get(table) ?? "") ?? null);
  }

  const key = current?.key ?? null;
  useEffect(() => {
    if (!key) return;
    try {
      sessionStorage.setItem(LAST_APP, key);
    } catch {
      // private mode: the app then simply follows the table
    }
  }, [key]);
  return current;
}

// The first breadcrumb on table pages: the app you're in ("HR & leave",
// linking to its page), or "Tables" when the sidebar lists every table.
export function useAppCrumb(): { label: string; to?: string } {
  const { apps, appOfTable, appMode } = useAppMenu();
  const current = useCurrentApp(apps, appOfTable);
  return appMode && current ? { label: current.name, to: appPath(current.key) } : { label: "Tables" };
}
