import { Fragment, useMemo, useState } from "react";
import { ActionIcon, Box, Collapse, Group, Kbd, Menu, NavLink, Popover, ScrollArea, SimpleGrid, Skeleton, Stack, Text, TextInput, Tooltip, UnstyledButton } from "@mantine/core";
import {
  IconChevronDown,
  IconLayoutGrid,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSearch,
  IconSelector,
  IconSettings,
  IconTable,
} from "@tabler/icons-react";
import { spotlight } from "@mantine/spotlight";
import { NavLink as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { useCurrentUser } from "../auth/AuthContext";
import { AppIcon } from "../features/apps/AppIcon";
import { appPath, useAppMenu, useCurrentApp, type LauncherApp, type MenuTable } from "../features/apps/appMenu";
import { usePreferences } from "../lib/preferences";
import { ADMIN_NAV, MAIN_NAV, tablePath, tableTitle, type NavItem } from "./nav";
import classes from "./Sidebar.module.css";
import { BrandMark } from "../components/ui/BrandMark";
import { useBranding } from "../lib/branding";

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

// An app in the sidebar list (Home, settings): its coloured icon and name.
function AppItem({ app, collapsed, onNavigate }: { app: LauncherApp; collapsed: boolean; onNavigate: () => void }) {
  if (collapsed) {
    return (
      <Tooltip label={app.name} position="right" withArrow={false} openDelay={0}>
        <UnstyledButton component={RouterLink} to={appPath(app.key)} onClick={onNavigate} aria-label={app.name} className={classes.railLink}>
          <AppIcon name={app.icon} size={30} />
        </UnstyledButton>
      </Tooltip>
    );
  }
  return (
    <NavLink
      component={RouterLink}
      to={appPath(app.key)}
      label={app.name}
      leftSection={<AppIcon name={app.icon} size={26} />}
      onClick={onNavigate}
      className={classes.appLink}
    />
  );
}

// The app launcher: every app as a coloured tile, like a phone's home screen.
function AppGrid({ apps, current, onPick }: { apps: LauncherApp[]; current: string | null; onPick: (to: string) => void }) {
  const { isAdmin } = useCurrentUser();
  const [query, setQuery] = useState("");
  const shown = query ? apps.filter((a) => a.name.toLowerCase().includes(query.toLowerCase())) : apps;
  return (
    <Stack gap="xs">
      {apps.length > 9 && (
        <TextInput size="xs" placeholder="Find an app" leftSection={<IconSearch size={14} />} value={query} onChange={(e) => setQuery(e.currentTarget.value)} data-autofocus aria-label="Find an app" />
      )}
      <SimpleGrid cols={3} spacing={4} verticalSpacing={4}>
        {shown.map((a) => (
          <UnstyledButton
            key={a.key}
            className={classes.appTile}
            data-active={a.key === current || undefined}
            aria-current={a.key === current ? "page" : undefined}
            onClick={() => onPick(appPath(a.key))}
          >
            <AppIcon name={a.icon} size={40} />
            <Text size="xs" fw={500} ta="center" lineClamp={2} lh={1.25}>
              {a.name}
            </Text>
          </UnstyledButton>
        ))}
      </SimpleGrid>
      {!shown.length && (
        <Text size="xs" c="dimmed" ta="center" py="sm">
          No app called "{query}"
        </Text>
      )}
      <Group justify="space-between" pt={6} className={classes.gridFooter}>
        <UnstyledButton className={classes.gridLink} onClick={() => onPick("/")}>
          <IconLayoutGrid size={14} /> Home
        </UnstyledButton>
        {isAdmin && (
          <UnstyledButton className={classes.gridLink} onClick={() => onPick("/settings/apps")}>
            <IconSettings size={14} /> Manage apps
          </UnstyledButton>
        )}
      </Group>
    </Stack>
  );
}

// The current app at the top of its menu; opens the launcher to switch apps.
function AppSwitcher({ app, apps, collapsed, onNavigate }: { app: LauncherApp; apps: LauncherApp[]; collapsed: boolean; onNavigate: () => void }) {
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const go = (to: string) => {
    setOpened(false);
    navigate(to);
    onNavigate();
  };
  return (
    <Popover opened={opened} onChange={setOpened} position={collapsed ? "right-start" : "bottom-start"} width={300} shadow="md" withinPortal trapFocus>
      <Popover.Target>
        {collapsed ? (
          <Tooltip label={`${app.name}: switch app`} position="right" withArrow={false} disabled={opened}>
            <UnstyledButton className={classes.railLink} aria-label={`${app.name}: switch app`} aria-expanded={opened} onClick={() => setOpened((o) => !o)}>
              <AppIcon name={app.icon} size={30} variant="filled" />
            </UnstyledButton>
          </Tooltip>
        ) : (
          <UnstyledButton className={classes.appSwitcher} aria-label={`${app.name}: switch app`} aria-expanded={opened} onClick={() => setOpened((o) => !o)}>
            <Group gap={10} wrap="nowrap">
              <AppIcon name={app.icon} size={32} variant="filled" />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} size="sm" truncate lh={1.2}>
                  {app.name}
                </Text>
                <Text size="xs" c="dimmed" lh={1.2}>
                  Switch app
                </Text>
              </Box>
              <IconSelector size={16} color="var(--mantine-color-dimmed)" />
            </Group>
          </UnstyledButton>
        )}
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <AppGrid apps={apps} current={app.key} onPick={go} />
      </Popover.Dropdown>
    </Popover>
  );
}

// Administration (admins): folds away, so the sidebar is about the work.
// Open on settings pages; otherwise as the admin last left it.
function AdminSection({ collapsed, isActive, onNavigate }: { collapsed: boolean; isActive: (to: string) => boolean; onNavigate: () => void }) {
  const { adminOpen, setPreference } = usePreferences();
  const location = useLocation();
  const navigate = useNavigate();
  const inSettings = location.pathname.startsWith("/settings");
  const open = adminOpen || inSettings;

  if (collapsed) {
    // icon rail: one gear, the pages in a menu beside it
    return (
      <>
        <Box className={classes.divider} />
        <Menu position="right-start" width={240} shadow="md" withinPortal>
          <Menu.Target>
            <UnstyledButton className={classes.railLink} aria-label="Administration" data-active={inSettings || undefined}>
              <IconSettings size={20} stroke={1.75} />
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Administration</Menu.Label>
            {ADMIN_NAV.map((item) => (
              <Menu.Item
                key={item.to}
                leftSection={<item.icon size={16} stroke={1.75} />}
                onClick={() => {
                  navigate(item.to);
                  onNavigate();
                }}
                fw={isActive(item.to) ? 600 : undefined}
              >
                {item.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </>
    );
  }
  return (
    <>
      <UnstyledButton
        className={classes.sectionToggle}
        onClick={() => setPreference("adminOpen", !open)}
        aria-expanded={open}
        disabled={inSettings}
      >
        <span>Administration</span>
        {!inSettings && <IconChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 150ms" }} />}
      </UnstyledButton>
      <Collapse in={open}>
        <Stack gap={2}>
          {ADMIN_NAV.map((item) => (
            <Item key={item.to} item={item} collapsed={false} active={isActive(item.to)} onNavigate={onNavigate} />
          ))}
        </Stack>
      </Collapse>
    </>
  );
}

export default function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const { isAdmin } = useCurrentUser();
  const { name: brand } = useBranding();
  const { setPreference } = usePreferences();
  const location = useLocation();
  const { apps, appOfTable, appMode, isLoading } = useAppMenu();
  const current = useCurrentApp(apps, appOfTable);

  // What the menu lists:
  //  - few apps: every table, grouped by app (no headings with just one)
  //  - many apps, inside one: that app's tables, then the ones it also uses
  //  - many apps, elsewhere (Home, settings): the apps
  const app = appMode ? current : null;
  const showApps = appMode && !app;
  const groups = useMemo(() => {
    // finding a table by name is the search's job (Ctrl K)
    const pick = (name: string, tables: MenuTable[]) => ({ name, tables });
    if (app) return [pick("", app.tables), pick("Also used", app.alsoUsed)].filter((g) => g.tables.length);
    if (showApps) return [];
    return apps.map((a) => pick(a.name, a.tables)).filter((g) => g.tables.length);
  }, [apps, app, showApps]);
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
        <UnstyledButton component={RouterLink} to="/" onClick={onNavigate} aria-label={`${brand} home`} style={{ minWidth: 0 }}>
          <BrandMark size={30} showName={!collapsed} />
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
          {showApps && apps.map((a) => <AppItem key={a.key} app={a} collapsed={collapsed} onNavigate={onNavigate} />)}
          {!app && !showApps && !grouped && <SectionLabel collapsed={collapsed}>Tables</SectionLabel>}
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
              No tables yet
            </Text>
          )}

          {isAdmin && <AdminSection collapsed={collapsed} isActive={isActive} onNavigate={onNavigate} />}
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
