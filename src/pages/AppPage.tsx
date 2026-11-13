import { Box, Button, SimpleGrid, Skeleton, Stack, Title } from "@mantine/core";
import { IconApps } from "@tabler/icons-react";
import { Link, useParams } from "react-router-dom";

import { EmptyState } from "../components/ui/EmptyState";
import { Page, PageHeader } from "../components/ui/Page";
import { AppDashboards } from "../features/AppDashboards";
import { AppIcon } from "../features/apps/AppIcon";
import { useAppMenu } from "../features/apps/appMenu";
import { TableCard } from "../features/TableCard";

const GRID = { base: 1, xs: 2, md: 3, lg: 4 };

// One app (from the launcher on Home): its counts and its tables. The sidebar
// shows just this app's menu meanwhile.
export default function AppPage() {
  const { appKey = "" } = useParams();
  const { apps, isLoading } = useAppMenu();
  const app = apps.find((a) => a.key === appKey);

  if (isLoading) {
    return (
      <Page title="App" width="wide">
        <Skeleton h={40} w={260} mb="xl" />
        <SimpleGrid cols={GRID} spacing="md">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} h={124} radius="lg" />
          ))}
        </SimpleGrid>
      </Page>
    );
  }
  if (!app) {
    return (
      <Page title="App not found" breadcrumbs={[{ label: "Home", to: "/" }, { label: "App" }]} width="wide">
        <EmptyState
          icon={<IconApps size={26} stroke={1.5} />}
          title="This app isn't available"
          description="It may have been removed, or you don't have access to its tables."
          action={
            <Button component={Link} to="/">
              Back to Home
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <Page title={app.name} breadcrumbs={[{ label: "Home", to: "/" }, { label: app.name }]} width="wide">
      <PageHeader title={app.name} description={app.description} icon={<AppIcon name={app.icon} size={40} />} />
      <Stack gap="xl">
        <AppDashboards launcher={app.key} />
        <Box>
          <Title order={4} mb="sm">
            Tables
          </Title>
          <SimpleGrid cols={GRID} spacing="md">
            {app.tables.map((t) => (
              <TableCard key={t.tableName} table={t} />
            ))}
          </SimpleGrid>
        </Box>
        {app.alsoUsed.length > 0 && (
          <Box>
            <Title order={4} mb={4}>
              Also used
            </Title>
            <Title order={6} fw={400} c="dimmed" mb="sm">
              Tables from other apps that {app.name} links to
            </Title>
            <SimpleGrid cols={GRID} spacing="md">
              {app.alsoUsed.map((t) => (
                <TableCard key={t.tableName} table={t} />
              ))}
            </SimpleGrid>
          </Box>
        )}
      </Stack>
    </Page>
  );
}
