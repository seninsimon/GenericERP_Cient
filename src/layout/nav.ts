import {
  IconApps,
  IconBuilding,
  IconDatabaseCog,
  IconHistory,
  IconHome,
  IconShieldLock,
  IconTransfer,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";

// Navigation used by the sidebar, the command palette and breadcrumbs.

export type NavItem = { label: string; to: string; icon: Icon; description?: string };

export const MAIN_NAV: NavItem[] = [
  { label: "Home", to: "/", icon: IconHome, description: "Overview of your tables and activity" },
  { label: "Imports & exports", to: "/jobs", icon: IconTransfer, description: "CSV jobs and downloads" },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Apps", to: "/settings/apps", icon: IconApps, description: "Add ready-made tables: Projects, HR, CRM…" },
  { label: "Tables & columns", to: "/settings/tables", icon: IconDatabaseCog, description: "Create tables, edit columns" },
  { label: "Users", to: "/settings/users", icon: IconUsers, description: "Accounts, roles and departments" },
  { label: "Roles & permissions", to: "/settings/roles", icon: IconShieldLock, description: "What each role may do" },
  { label: "Departments", to: "/settings/departments", icon: IconBuilding, description: "Who sees which data" },
  { label: "Audit log", to: "/settings/audit", icon: IconHistory, description: "Who changed what, when" },
];

// URL of a table's record list / a record
export const tablePath = (table: string) => `/table/${encodeURIComponent(table)}`;
export const recordPath = (table: string, id: string) => `${tablePath(table)}/${encodeURIComponent(id)}`;
export const newRecordPath = (table: string) => `${tablePath(table)}/new`;
export const editRecordPath = (table: string, id: string) => `${recordPath(table, id)}/edit`;

// Readable name for a table identifier ("purchase_orders" -> "Purchase orders")
export const tableTitle = (name: string) => {
  const spaced = name.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
