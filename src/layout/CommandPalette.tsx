import { useMemo } from "react";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { Spotlight, type SpotlightActionGroupData } from "@mantine/spotlight";
import { IconLogout, IconMoon, IconPlus, IconSearch, IconTable, IconUser } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { useTables } from "../api/reactQueryHooks/useTables";
import { useCurrentUser } from "../auth/AuthContext";
import { ADMIN_NAV, MAIN_NAV, newRecordPath, tablePath, tableTitle } from "./nav";

// Ctrl/⌘ + K: jump to any table or page, create a record, change theme.
export default function CommandPalette() {
  const navigate = useNavigate();
  const { isAdmin, logout } = useCurrentUser();
  const { data: tables = [] } = useTables();
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light");

  const actions = useMemo<SpotlightActionGroupData[]>(() => {
    const list = tables as { tableName: string; permissions?: { create?: boolean } }[];
    const groups: SpotlightActionGroupData[] = [
      {
        group: "Tables",
        actions: list.map((t) => ({
          id: `table:${t.tableName}`,
          label: tableTitle(t.tableName),
          description: "Open table",
          keywords: [t.tableName],
          leftSection: <IconTable size={18} stroke={1.5} />,
          onClick: () => navigate(tablePath(t.tableName)),
        })),
      },
      {
        group: "Create",
        actions: list
          .filter((t) => t.permissions?.create)
          .map((t) => ({
            id: `new:${t.tableName}`,
            label: `New record in ${tableTitle(t.tableName)}`,
            keywords: ["new", "add", "create", t.tableName],
            leftSection: <IconPlus size={18} stroke={1.5} />,
            onClick: () => navigate(newRecordPath(t.tableName)),
          })),
      },
      {
        group: "Go to",
        actions: [
          ...MAIN_NAV,
          { label: "My profile", to: "/profile", icon: IconUser, description: "Your details and password" },
          ...(isAdmin ? ADMIN_NAV : []),
        ].map((item) => ({
          id: `nav:${item.to}`,
          label: item.label,
          description: item.description,
          leftSection: <item.icon size={18} stroke={1.5} />,
          onClick: () => navigate(item.to),
        })),
      },
      {
        group: "Preferences",
        actions: [
          {
            id: "theme",
            label: computed === "dark" ? "Switch to light mode" : "Switch to dark mode",
            keywords: ["theme", "dark", "light", "appearance"],
            leftSection: <IconMoon size={18} stroke={1.5} />,
            onClick: () => setColorScheme(computed === "dark" ? "light" : "dark"),
          },
          {
            id: "logout",
            label: "Sign out",
            leftSection: <IconLogout size={18} stroke={1.5} />,
            onClick: () => {
              navigate("/");
              logout();
            },
          },
        ],
      },
    ];
    return groups.filter((g) => g.actions.length);
  }, [tables, isAdmin, navigate, computed, setColorScheme, logout]);

  return (
    <Spotlight
      actions={actions}
      shortcut={["mod + K"]}
      nothingFound="Nothing found"
      highlightQuery
      limit={12}
      scrollable
      maxHeight={420}
      searchProps={{ leftSection: <IconSearch size={18} stroke={1.5} />, placeholder: "Search tables, pages, actions…" }}
    />
  );
}
