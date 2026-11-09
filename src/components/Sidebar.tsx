import { Stack, Button, Loader, ScrollArea, Text } from "@mantine/core";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTables } from "../api/reactQueryHooks/useTables";
import { useCurrentUser } from "../auth/AuthContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const { table } = useParams();
  const location = useLocation();
  const { isAdmin } = useCurrentUser();

  // the API only returns tables this user may access
  const { data: tables = [], isLoading } = useTables();

  const isSettingsActive = location.pathname.startsWith("/settings");

  if (isLoading) {
    return (
      <Stack p="md">
        <Loader size="sm" />
      </Stack>
    );
  }


  const visibleTables = tables.filter(
    (t: any) => t.showInMenu !== false
  );

  return (
    <ScrollArea type="scroll">
      <Stack
        p="sm"
        gap="xs"
        style={{
          borderRight: "2px solid #E5E7EB",
        }}
        h="100vh"
      >
        {/* SETTINGS (admins only) */}
        {isAdmin && (
          <Button
            variant={isSettingsActive ? "filled" : "subtle"}
            onClick={() => navigate("/settings")}
          >
            Settings
          </Button>
        )}

        {/* DYNAMIC TABLES */}
        {visibleTables.map((t: any) => {
          const isActive = table === t.tableName;

          return (
            <Button
              key={t.tableName}
              variant={isActive ? "filled" : "subtle"}
              onClick={() => navigate(`/table/${t.tableName}`)}
              fullWidth
            >
              {t.tableName}
            </Button>
          );
        })}

        {!isAdmin && !visibleTables.length && (
          <Text size="sm" c="dimmed" ta="center" mt="md">
            No tables available
          </Text>
        )}
      </Stack>
    </ScrollArea>
  );
}
