import { Center, Loader, Stack, Text, Title } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { Navigate } from "react-router-dom";

import { useCurrentUser } from "../auth/AuthContext";
import { useTables } from "../api/reactQueryHooks/useTables";

// Admins land on Settings; everyone else on the first table they can open.
export default function HomePage() {
  const { isAdmin, user } = useCurrentUser();
  const { data: tables = [], isLoading } = useTables();

  if (isAdmin) return <Navigate to="/settings" replace />;

  if (isLoading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  const first = tables.find((t: any) => t.showInMenu !== false);
  if (first) return <Navigate to={`/table/${first.tableName}`} replace />;

  return (
    <Center h={400}>
      <Stack align="center" gap="xs">
        <IconLock size={40} stroke={1.5} />
        <Title order={4}>Welcome, {user.fullName || user.username}</Title>
        <Text c="dimmed" ta="center" maw={420}>
          You don't have access to any tables yet. Ask an administrator to assign you
          a department and a role.
        </Text>
      </Stack>
    </Center>
  );
}
