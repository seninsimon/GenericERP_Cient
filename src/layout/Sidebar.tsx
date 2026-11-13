import { Fragment, useMemo, useState } from "react";
import {
  ActionIcon,
  Box,
  Group,
  Kbd,
  Menu,
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
  IconLayoutGrid,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSearch,
  IconSelector,
  IconTable,
} from "@tabler/icons-react";
import { spotlight } from "@mantine/spotlight";
import { NavLink as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { useCurrentUser } from "../auth/AuthContext";
import { AppIcon } from "../features/apps/AppIcon";
import { appIcon } from "../features/apps/appIcons";
import { appPath, useAppMenu, useCurrentApp, type LauncherApp, type MenuTable } from "../features/apps/appMenu";
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

// The current app at the top of its menu; opens a list to switch apps.
function AppSwitcher({ app, apps, collapsed, onNavigate }: { app: LauncherApp; apps: LauncherApp[]; collapsed: boolean; onNavigate: () => void }) {
  const navigate = useNavigate();
  const go = (to: string) => {
    navigate(to);
    onNavigate();
  };
  return (
    <Menu position={collapsed ? "right-start" : "bottom-start"} width={260} shadow="md" withinPortal>
      <Menu.Target>
        {collapsed ? (
          <UnstyledButton className={classes.railLink} aria-label={`${app.name}: switch app`}>
            <AppIcon name={app.icon} size={30} />
          </UnstyledButton>
        ) : (
          <UnstyledButton className={classes.appSwitcher} aria-label={`${app.name}: switch app`}>
            <Group gap={10} wrap="nowrap">
              <AppIcon name={app.icon} size={30} />
              <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
                {app.name}
              </Text>
              <IconSelector size={16} color="var(--mantine-color-dimmed)" />
            </Group>
          </UnstyledButton>
        )}
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconLayoutGrid size={16} />} onClick={() => go("/")}>
          All apps
        </Menu.Item>
        <Menu.Divider />
        {apps.map((a) => {
          const I = appIcon(a.icon);
          return (
            <Menu.Item
              key={a.key}
              leftSection={<I size={16} stroke={1.75} />}
              onClick={() => go(appPath(a.key))}
              fw={a.key === app.key ? 600 : undefined}
            >
              {a.name}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}

export default function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const { isAdmin } = useCurrentUser();
  const { setPreference } = usePreferences();
  const location = useLocation();
  const { apps, appOfTable, appMode, isLoading } = useAppMenu();
  const current = useCurrentApp(apps, appOfTable);
  const [query, setQuery] = useState("");

  // What the menu lists:
  //  - few apps: every table, grouped by app (no headings with just one)
  //  - many apps, inside one: that app's tables, then the ones it also uses
  //  - many apps, elsewhere (Home, settings): the apps
  const app = appMode ? current : null;
  const showApps = appMode && !app;
  const groups = useMemo(() => {
    const match = (t: MenuTable) => !query || t.tableName.toLowerCase().includes(query.toLowerCase());
    const pick = (name: string, tables: MenuTable[]) => ({ name, tables: tables.filter(match) });
    if (app) return [pick("", app.tables), pick("Also used", app.alsoUsed)].filter((g) => g.tables.length);
    if (showApps) return [];
    return apps.map((a) => pick(a.name, a.tables)).filter((g) => g.tables.length);
  }, [apps, app, showApps, query]);
  const listed = app ? app.tables.length + app.alsoUsed.length : showApps ? 0 : apps.reduce((n, a) => n + a.tables.length, 0);
  const grouped = !app && groups.length > 1;

  const badges = useMemo(
    () => railBadges(apps.flatMap((a) => a.tables).map((t) => tableTitle(t.tableName))),
    [apps]
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

          {app && <AppSwitcher app={app} apps={apps} collapsed={collapsed} onNavigate={onNavigate} />}
          {showApps && <SectionLabel collapsed={collapsed}>Apps</SectionLabel>}
          {showApps &&
            apps.map((a) => (
              <Item
                key={a.key}
                item={{ label: a.name, to: appPath(a.key), icon: appIcon(a.icon) }}
                collapsed={collapsed}
                active={false}
                onNavigate={onNavigate}
              />
            ))}
          {!app && !showApps && !grouped && <SectionLabel collapsed={collapsed}>Tables</SectionLabel>}
          {!collapsed && listed >= SHOW_FILTER_FROM && (
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
                <Fragment key={group.name || "app"}>
                  {(grouped || group.name === "Also used") && <SectionLabel collapsed={collapsed}>{group.name}</SectionLabel>}
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
          {!isLoading && !showApps && !groups.length && !collapsed && (
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
