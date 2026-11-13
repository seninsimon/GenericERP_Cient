import {
  IconApps,
  IconBuilding,
  IconDatabaseCog,
  IconHistory,
  IconHome,
  IconMail,
  IconMessages,
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
  { label: "Manage apps", to: "/settings/apps", icon: IconApps, description: "Add or remove ready-made apps: Projects, HR, CRM…" },
  { label: "Tables & columns", to: "/settings/tables", icon: IconDatabaseCog, description: "Create tables, edit columns" },
  { label: "Users", to: "/settings/users", icon: IconUsers, description: "Accounts, roles and departments" },
  { label: "Email", to: "/settings/email", icon: IconMail, description: "Send notifications and password links by email" },
  { label: "Chat", to: "/settings/chat", icon: IconMessages, description: "Team chat and comments on records" },
  { label: "Roles & permissions", to: "/settings/roles", icon: IconShieldLock, description: "What each role may do" },
  { label: "Departments", to: "/settings/departments", icon: IconBuilding, description: "Who sees which data" },
  { label: "Audit log", to: "/settings/audit", icon: IconHistory, description: "Who changed what, when" },
];

// URL of a table's record list / a record
export const tablePath = (table: string) => `/table/${encodeURIComponent(table)}`;
export const recordPath = (table: string, id: string) => `${tablePath(table)}/${encodeURIComponent(id)}`;
// Where a notification leads: a record, or a chat conversation.
export const noticePath = (table: string, id: string) => (table === "__chat" ? `/chat?c=${encodeURIComponent(id)}` : recordPath(table, id));
export const newRecordPath = (table: string) => `${tablePath(table)}/new`;
export const editRecordPath = (table: string, id: string) => `${recordPath(table, id)}/edit`;

// Readable name for a table identifier ("purchase_orders" -> "Purchase orders")
export const tableTitle = (name: string) => {
  const spaced = name.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
