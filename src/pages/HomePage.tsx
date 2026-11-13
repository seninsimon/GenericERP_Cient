import {
  Anchor,
  Box,
  Button,
  Group,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconApps,
  IconBuilding,
  IconCircleCheck,
  IconCircleDashed,
  IconDatabaseCog,
  IconFileExport,
  IconFileImport,
  IconLock,
  IconPlus,
  IconShieldLock,
  IconUsers,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Link } from "react-router-dom";

import { getAuditLog, getJobs } from "../api/api";
import { useDepartments, useRoles, useUsers } from "../api/reactQueryHooks/useAdmin";
import { useTables } from "../api/reactQueryHooks/useTables";
import { useCurrentUser } from "../auth/AuthContext";
import { JobStatusBadge, jobResultSummary } from "../components/JobStatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { AppDashboards } from "../features/AppDashboards";
import { TableCard, type TableInfo } from "../features/TableCard";
import { AppCard } from "../features/apps/AppCard";
import { useAppMenu } from "../features/apps/appMenu";
import { Page, Section } from "../components/ui/Page";
import { tableTitle } from "../layout/nav";
import { formatDateTime, formatRelative } from "../lib/format";
import { ActionBadge, describeEntry } from "../utils/auditFormat";


const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/* ---------------- admin: getting started ---------------- */

function GetStarted({ tableCount }: { tableCount: number }) {
  const { data: departments = [], isLoading: l1 } = useDepartments();
  const { data: roles = [], isLoading: l2 } = useRoles();
  const { data: users = [], isLoading: l3 } = useUsers();
  if (l1 || l2 || l3) return null;

  const steps = [
    { done: departments.length > 0, label: "Create departments", to: "/settings/departments", icon: IconBuilding },
    { done: tableCount > 0, label: "Add apps (or create your own tables)", to: "/settings/apps", icon: IconApps },
    { done: roles.some((r) => !r.isAdmin), label: "Create a role with table permissions", to: "/settings/roles", icon: IconShieldLock },
    { done: users.length > 1, label: "Add users and assign departments", to: "/settings/users", icon: IconUsers },
  ];
  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  return (
    <Section
      title="Get started"
      description={`${completed} of ${steps.length} steps done. Set these up so your team can start working.`}
    >
      <Progress value={(completed / steps.length) * 100} size="sm" mb="md" aria-label="Setup progress" />
      <Stack gap={4}>
        {steps.map((step) => (
          <Group key={step.to} justify="space-between" wrap="nowrap" py={6}>
            <Group gap="sm" wrap="nowrap">
              {step.done ? (
                <IconCircleCheck size={20} color="var(--mantine-color-teal-6)" aria-label="Done" />
              ) : (
                <IconCircleDashed size={20} color="var(--mantine-color-dimmed)" aria-label="Not done" />
              )}
              <Text size="sm" td={step.done ? "line-through" : undefined} c={step.done ? "dimmed" : undefined}>
                {step.label}
              </Text>
            </Group>
            {!step.done && (
              <Button component={Link} to={step.to} size="xs" variant="light">
                Set up
              </Button>
            )}
          </Group>
        ))}
      </Stack>
    </Section>
  );
}

/* ---------------- admin: recent activity ---------------- */

function RecentActivity() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit", "recent"],
    queryFn: async () => (await getAuditLog({ limit: 8 })).data,
  });

  return (
    <Section
      title="Recent activity"
      actions={
        <Anchor component={Link} to="/settings/audit" size="sm">
          View all
        </Anchor>
      }
      padding={0}
    >
      {isLoading ? (
        <Stack p="lg" gap="sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} h={18} />
          ))}
        </Stack>
      ) : !data?.data.length ? (
        <EmptyState compact title="No activity yet" />
      ) : (
        <Stack gap={0}>
          {data.data.map((entry) => (
            <Group
              key={entry._id}
              justify="space-between"
              wrap="nowrap"
              px="lg"
              py="sm"
              gap="sm"
              style={{ borderBottom: "1px solid var(--app-border)" }}
            >
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <ActionBadge action={entry.action} />
                <Text size="sm" truncate>
                  <Text span fw={500} inherit>
                    {entry.username ?? "System"}
                  </Text>{" "}
                  <Text span c="dimmed" inherit>
                    · {describeEntry(entry)}
                  </Text>
                </Text>
              </Group>
              <Tooltip label={formatDateTime(entry.at)}>
                <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                  {formatRelative(entry.at)}
                </Text>
              </Tooltip>
            </Group>
          ))}
        </Stack>
      )}
    </Section>
  );
}

/* ---------------- recent jobs ---------------- */

function RecentJobs() {
  const { data, isLoading } = useQuery({
    queryKey: ["jobs", "recent"],
    queryFn: async () => (await getJobs(1, 5)).data,
  });

  return (
    <Section
      title="Recent imports & exports"
      actions={
        <Anchor component={Link} to="/jobs" size="sm">
          View all
        </Anchor>
      }
      padding={0}
    >
      {isLoading ? (
        <Stack p="lg" gap="sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} h={18} />
          ))}
        </Stack>
      ) : !data?.data.length ? (
        <EmptyState
          compact
          icon={<IconFileExport size={20} stroke={1.5} />}
          title="No imports or exports yet"
          description="Use Import or Export on any table."
        />
      ) : (
        <Stack gap={0}>
          {data.data.map((job) => (
            <Group
              key={job._id}
              justify="space-between"
              wrap="nowrap"
              px="lg"
              py="sm"
              gap="sm"
              style={{ borderBottom: "1px solid var(--app-border)" }}
            >
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                {job.type === "import" ? (
                  <IconFileImport size={18} aria-label="Import" />
                ) : (
                  <IconFileExport size={18} aria-label="Export" />
                )}
                <Box style={{ minWidth: 0 }}>
                  <Text size="sm" fw={500} truncate>
                    {tableTitle(job.tableName)}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {jobResultSummary(job) || formatRelative(job.createdAt)}
                  </Text>
                </Box>
              </Group>
              <JobStatusBadge status={job.status} />
            </Group>
          ))}
        </Stack>
      )}
    </Section>
  );
}

/* ---------------- page ---------------- */

export default function HomePage() {
  const { user, isAdmin } = useCurrentUser();
  const { data: tables = [], isLoading } = useTables();
  const { apps, appMode } = useAppMenu();
  const firstName = (user.fullName || user.username).split(/\s+/)[0];
  const visible = (tables as (TableInfo & { showInMenu?: boolean })[]).filter((t) => t.showInMenu !== false);

  return (
    <Page title="Home" breadcrumbs={[{ label: "Home" }]} width="wide">
      <Stack gap={4} mb="xl">
        <Title order={2}>
          {greeting()}, {firstName}
        </Title>
        <Text c="dimmed" size="sm">
          {dayjs().format("dddd, D MMMM YYYY")}
        </Text>
      </Stack>

      <Stack gap="xl">
        {isAdmin && !isLoading && <GetStarted tableCount={tables.length} />}
        {appMode ? (
          // many apps: Home is the launcher; each app's page has its counts
          <Box>
            <Title order={4} mb="sm">
              Your apps
            </Title>
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="md">
              {apps.map((app) => (
                <AppCard key={app.key} app={app} />
              ))}
            </SimpleGrid>
          </Box>
        ) : (
          <>
        {/* the installed apps' counts: open tasks, overdue invoices, … */}
        <AppDashboards />

        <Box>
          <Group justify="space-between" mb="sm">
            <Title order={4}>Your tables</Title>
            {isAdmin && (
              <Anchor component={Link} to="/settings/tables" size="sm">
                Manage tables
              </Anchor>
            )}
          </Group>
          {isLoading ? (
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="md">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} h={124} radius="lg" />
              ))}
            </SimpleGrid>
          ) : visible.length ? (
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="md">
              {visible.map((t) => (
                <TableCard key={t.tableName} table={t} />
              ))}
            </SimpleGrid>
          ) : (
            <Box bg="var(--app-surface)" style={{ border: "1px solid var(--app-border)", borderRadius: "var(--mantine-radius-lg)" }}>
              {isAdmin ? (
                <EmptyState
                  icon={<IconDatabaseCog size={26} stroke={1.5} />}
                  title="No tables yet"
                  description="Pick your kind of organization to get ready-made, connected tables, or build your own."
                  action={
                    <Group gap="xs" justify="center">
                      <Button component={Link} to="/settings/tables" variant="default" leftSection={<IconPlus size={16} />}>
                        Create a table
                      </Button>
                      <Button component={Link} to="/settings/apps" leftSection={<IconApps size={16} />}>
                        Pick your organization
                      </Button>
                    </Group>
                  }
                />
              ) : (
                <EmptyState
                  icon={<IconLock size={26} stroke={1.5} />}
                  title="You don't have access to any tables yet"
                  description="Ask an administrator to give your role access and assign you a department."
                />
              )}
            </Box>
          )}
        </Box>
          </>
        )}

        <SimpleGrid cols={{ base: 1, lg: isAdmin ? 2 : 1 }} spacing="lg">
          {isAdmin && <RecentActivity />}
          <RecentJobs />
        </SimpleGrid>
      </Stack>
    </Page>
  );
}
