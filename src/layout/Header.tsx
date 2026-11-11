import { NotificationBell } from "./NotificationBell";
import {
  ActionIcon,
  Anchor,
  Box,
  Breadcrumbs,
  Burger,
  Group,
  Indicator,
  Text,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { spotlight } from "@mantine/spotlight";
import { IconChevronRight, IconMoon, IconSearch, IconSun, IconTransfer } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getJobs } from "../api/api";
import { useCurrentUser } from "../auth/AuthContext";
import { usePageMeta } from "../components/ui/Page";
import UserMenu from "./UserMenu";

// Shows a dot while any of my imports/exports is still running.
function JobsIndicator() {
  const { user } = useCurrentUser();
  const { data } = useQuery({
    queryKey: ["jobs", "indicator"],
    queryFn: async () => (await getJobs(1, 10)).data,
    refetchInterval: (q) =>
      q.state.data?.data.some((j) => j.userId === user._id && (j.status === "queued" || j.status === "running"))
        ? 3000
        : 30000,
  });
  const active = data?.data.filter((j) => j.userId === user._id && (j.status === "queued" || j.status === "running")).length ?? 0;

  return (
    <Tooltip label={active ? `${active} import/export running` : "Imports & exports"}>
      <Indicator disabled={!active} processing size={8} offset={6} color="blue">
        <ActionIcon component={Link} to="/jobs" aria-label={active ? `Imports & exports, ${active} running` : "Imports & exports"}>
          <IconTransfer size={18} />
        </ActionIcon>
      </Indicator>
    </Tooltip>
  );
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light");
  const next = computed === "dark" ? "light" : "dark";
  return (
    <Tooltip label={`Switch to ${next} mode`}>
      <ActionIcon onClick={() => setColorScheme(next)} aria-label={`Switch to ${next} mode`}>
        {computed === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}

export default function Header({ mobileOpened, toggleMobile }: { mobileOpened: boolean; toggleMobile: () => void }) {
  const { crumbs } = usePageMeta();

  return (
    <Group h="100%" px={{ base: "sm", sm: "lg" }} justify="space-between" wrap="nowrap" gap="sm">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
        <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
        <Box style={{ minWidth: 0 }} component="nav" aria-label="Breadcrumb">
          {/* phones: only the current page */}
          <Text fw={600} size="sm" truncate hiddenFrom="sm">
            {crumbs[crumbs.length - 1]?.label}
          </Text>
          <Breadcrumbs
            visibleFrom="sm"
            separator={<IconChevronRight size={14} opacity={0.5} />}
            separatorMargin={6}
            styles={{ root: { flexWrap: "nowrap" }, breadcrumb: { whiteSpace: "nowrap" } }}
          >
            {crumbs.map((crumb, i) =>
              crumb.to && i < crumbs.length - 1 ? (
                <Anchor key={i} component={Link} to={crumb.to} size="sm" c="dimmed" underline="hover">
                  {crumb.label}
                </Anchor>
              ) : (
                <Text key={i} size="sm" fw={600} truncate maw={360} aria-current={i === crumbs.length - 1 ? "page" : undefined}>
                  {crumb.label}
                </Text>
              )
            )}
          </Breadcrumbs>
        </Box>
      </Group>

      <Group gap={4} wrap="nowrap">
        <Tooltip label="Search (Ctrl K)">
          <ActionIcon hiddenFrom="sm" aria-label="Search" onClick={() => spotlight.open()}>
            <IconSearch size={18} />
          </ActionIcon>
        </Tooltip>
        <NotificationBell />
        <JobsIndicator />
        <ColorSchemeToggle />
        <UserMenu />
      </Group>
    </Group>
  );
}
