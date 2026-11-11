import { Fragment, useMemo, useState } from "react";
import {
  ActionIcon,
  Box,
  Group,
  Kbd,
  NavLink,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSearch,
  IconTable,
} from "@tabler/icons-react";
import { spotlight } from "@mantine/spotlight";
import { NavLink as RouterLink, useLocation } from "react-router-dom";

import { useTables } from "../api/reactQueryHooks/useTables";
import { useCurrentUser } from "../auth/AuthContext";
import { usePreferences } from "../lib/preferences";
import { ADMIN_NAV, MAIN_NAV, tablePath, tableTitle, type NavItem } from "./nav";
import classes from "./Sidebar.module.css";

const SHOW_FILTER_FROM = 8; // tables

// Short, unique 2-letter badges for tables in the icon rail, so 18 tables
// aren't 18 identical icons ("Companies" -> "Co", "Contacts" -> "Cn").
function railBadges(titles: string[]): Map<string, string> {
  const used = new Set<string>();
  const result = new Map<string, string>();
  for (const title of titles) {
    const letters = title.replace(/[^A-Za-z0-9]/g, "");
    const first = (letters[0] ?? "?").toUpperCase();
    let badge = "";
    for (const ch of letters.slice(1)) {
      const candidate = first + ch.toLowerCase();
      if (!used.has(candidate)) {
        badge = candidate;
        break;
      }
    }
    if (!badge) badge = first + String(used.size);
    used.add(badge);
    result.set(title, badge);
  }
  return result;
}

function Item({
  item,
  collapsed,
  active,
  onNavigate,
  badge,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate: () => void;
  // rail only: show this short text instead of the icon
  badge?: string;
}) {
  // Icon rail: a square, centred icon button (NavLink keeps an empty label
  // area beside its icon, which pushes the icon off-centre).
  if (collapsed) {
    return (
      <Tooltip label={item.label} position="right" withArrow={false} openDelay={0}>
        <UnstyledButton
          component={RouterLink}
          to={item.to}
          onClick={onNavigate}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
          data-active={active || undefined}
          className={classes.railLink}
        >
          {badge ? (
            <span className={classes.railBadge} aria-hidden>
              {badge}
            </span>
          ) : (
            <item.icon size={20} stroke={1.75} />
          )}
        </UnstyledButton>
      </Tooltip>
    );
  }

  return (
    <NavLink
      component={RouterLink}
      to={item.to}
      label={item.label}
      leftSection={<item.icon size={18} stroke={1.75} />}
      active={active}
      onClick={onNavigate}
      className={classes.link}
    />
  );
}

function SectionLabel({ children, collapsed }: { children: string; collapsed: boolean }) {
  return collapsed ? (
    <Box className={classes.divider} />
  ) : (
    <Text className={classes.sectionLabel}>{children}</Text>
  );
}

export default function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const { isAdmin } = useCurrentUser();
  const { setPreference } = usePreferences();
  const location = useLocation();
  const { data: tables = [], isLoading } = useTables();
  const [query, setQuery] = useState("");

  const menuTables = useMemo(
    () =>
      (tables as { tableName: string; showInMenu?: boolean; group?: string | null }[])
        .filter((t) => t.showInMenu !== false)
        .filter((t) => !query || t.tableName.toLowerCase().includes(query.toLowerCase())),
    [tables, query]
  );

  // tables an app made are grouped under it ("Company", "Projects", ...), your
  // own tables under "Tables" (last). With only one group there are no headings.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, typeof menuTables>();
    for (const t of menuTables) {
      const name = t.group ?? "";
      if (!byGroup.has(name)) {
        byGroup.set(name, []);
        if (name) order.push(name);
      }
      byGroup.get(name)!.push(t);
    }
    const sorted = [...order.filter((g) => g === "Company"), ...order.filter((g) => g !== "Company")];
    if (byGroup.has("")) sorted.push("");
    return sorted.map((name) => ({ name: name || "Tables", tables: byGroup.get(name)! }));
  }, [menuTables]);
  const grouped = groups.length > 1;

  const badges = useMemo(
    () => railBadges((tables as { tableName: string }[]).map((t) => tableTitle(t.tableName))),
    [tables]
  );

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Stack h="100%" gap={0}>
      {/* brand + collapse */}
      <Group h="var(--app-header-height)" px={collapsed ? 0 : "md"} justify={collapsed ? "center" : "space-between"} wrap="nowrap" className={classes.brandRow}>
        <UnstyledButton component={RouterLink} to="/" onClick={onNavigate} aria-label="Zenin ERP home">
          <Group gap={10} wrap="nowrap">
            <ThemeIcon size={30} radius="md" variant="filled" aria-hidden>
              <Text fw={800} fz={15} c="white">
                Z
              </Text>
            </ThemeIcon>
            {!collapsed && (
              <Text fw={700} fz="md" lh={1}>
                Zenin ERP
              </Text>
            )}
          </Group>
        </UnstyledButton>
        {!collapsed && (
          <Tooltip label="Collapse sidebar">
            <ActionIcon
              visibleFrom="sm"
              aria-label="Collapse sidebar"
              onClick={() => setPreference("sidebarCollapsed", true)}
            >
              <IconLayoutSidebarLeftCollapse size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {/* search / command palette */}
      <Box px={collapsed ? 8 : "sm"} pt="sm" pb={4}>
        {collapsed ? (
          <Tooltip label="Search (Ctrl K)" position="right">
            <UnstyledButton className={`${classes.railLink} ${classes.railSearch}`} aria-label="Search" onClick={() => spotlight.open()}>
              <IconSearch size={18} />
            </UnstyledButton>
          </Tooltip>
        ) : (
          <UnstyledButton className={classes.searchButton} onClick={() => spotlight.open()} aria-label="Search and commands">
            <Group gap={8} wrap="nowrap">
              <IconSearch size={15} />
              <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                Search…
              </Text>
              <Kbd>Ctrl K</Kbd>
            </Group>
          </UnstyledButton>
        )}
      </Box>

      <ScrollArea style={{ flex: 1 }} px={collapsed ? 8 : "sm"} type="hover" component="nav" aria-label="Main">
        <Stack gap={collapsed ? 4 : 2} py="xs" align={collapsed ? "center" : "stretch"}>
          {MAIN_NAV.map((item) => (
            <Item key={item.to} item={item} collapsed={collapsed} active={isActive(item.to)} onNavigate={onNavigate} />
          ))}

          {!grouped && <SectionLabel collapsed={collapsed}>Tables</SectionLabel>}
          {!collapsed && tables.length >= SHOW_FILTER_FROM && (
            <TextInput
              size="xs"
              placeholder="Filter tables"
              aria-label="Filter tables"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              mb={4}
              mt={grouped ? "xs" : 0}
            />
          )}
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} h={collapsed ? 40 : 32} w={collapsed ? 40 : undefined} radius="md" />
              ))
            : groups.map((group) => (
                <Fragment key={group.name}>
                  {grouped && <SectionLabel collapsed={collapsed}>{group.name}</SectionLabel>}
                  {group.tables.map((t) => (
                    <Item
                      key={t.tableName}
                      item={{ label: tableTitle(t.tableName), to: tablePath(t.tableName), icon: IconTable }}
                      badge={badges.get(tableTitle(t.tableName))}
                      collapsed={collapsed}
                      active={isActive(tablePath(t.tableName))}
                      onNavigate={onNavigate}
                    />
                  ))}
                </Fragment>
              ))}
          {!isLoading && !menuTables.length && !collapsed && (
            <Text size="xs" c="dimmed" px="sm" py={4}>
              {query ? "No tables match" : "No tables yet"}
            </Text>
          )}

          {isAdmin && (
            <>
              <SectionLabel collapsed={collapsed}>Administration</SectionLabel>
              {ADMIN_NAV.map((item) => (
                <Item key={item.to} item={item} collapsed={collapsed} active={isActive(item.to)} onNavigate={onNavigate} />
              ))}
            </>
          )}
        </Stack>
      </ScrollArea>

      {collapsed && (
        <Box p={8} className={classes.footer}>
          <Tooltip label="Expand sidebar" position="right">
            <UnstyledButton
              className={classes.railLink}
              aria-label="Expand sidebar"
              onClick={() => setPreference("sidebarCollapsed", false)}
            >
              <IconLayoutSidebarLeftExpand size={20} stroke={1.75} />
            </UnstyledButton>
          </Tooltip>
        </Box>
      )}
    </Stack>
  );
}
