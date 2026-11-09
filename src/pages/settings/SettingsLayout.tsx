import { Box, Tabs, Title } from "@mantine/core";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  IconBuilding,
  IconShieldLock,
  IconTable,
  IconUsers,
} from "@tabler/icons-react";

import { useCurrentUser } from "../../auth/AuthContext";

const TABS = [
  { value: "tables", label: "Tables", icon: IconTable },
  { value: "users", label: "Users", icon: IconUsers },
  { value: "roles", label: "Roles & permissions", icon: IconShieldLock },
  { value: "departments", label: "Departments", icon: IconBuilding },
];

// Settings area: admins only.
export default function SettingsLayout() {
  const { isAdmin } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAdmin) return <Navigate to="/" replace />;

  const active = location.pathname.split("/")[2] || "tables";

  return (
    <Box className="w-full px-6 py-6 max-w-7xl mx-auto">
      <Title order={2} mb="md">
        Settings
      </Title>

      <Tabs value={active} onChange={(v) => v && navigate(`/settings/${v}`)} mb="lg">
        <Tabs.List>
          {TABS.map(({ value, label, icon: Icon }) => (
            <Tabs.Tab key={value} value={value} leftSection={<Icon size={16} />}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <Outlet />
    </Box>
  );
}
