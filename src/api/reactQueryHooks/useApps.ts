import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import api, { errorMessage } from "../api";

/* ---------------- types (match the backend API, src/apps) ---------------- */

export type AppInfo = {
  key: string;
  name: string;
  description: string;
  icon: string;
  group: string;
  needs: string[];
  tables: { key: string; label: string; description: string }[];
  installed: { version: number; installedAt: string; tables: string[]; sampleRecords: number } | null;
};

export type BundleInfo = { key: string; name: string; description: string; icon: string; apps: string[] };

export type InstallOptions = {
  tables?: Record<string, boolean>;
  departmentIds?: string[];
  sampleData?: boolean;
  conflicts?: Record<string, "new" | "use">;
  // an organization type's starter departments, as edited (created or reused by name)
  departments?: string[];
};

export type PlannedTable = {
  key: string;
  app: string;
  label: string;
  description: string;
  action: "create" | "reuse" | "use" | "skip";
  tableName: string | null;
  optional: boolean;
  links: { column: string; to: string; toLabel: string }[];
  dropped: string[];
  conflict: { existing: string; choice: "new" | "use" } | null;
};

export type InstallPlan = {
  apps: { key: string; name: string; status: "install" | "installed"; pulledIn: boolean }[];
  tables: PlannedTable[];
  roles: { name: string; level: string; action: "create" | "extend"; tables: string[] }[];
  departments: { name: string; exists: boolean }[];
  hasSample: boolean;
};

export type InstallResult = {
  apps: string[];
  tables: { key: string; tableName: string; label: string; action: string }[];
  sampleRecords: number;
};

/* ---------------- hooks ---------------- */

export const useApps = () =>
  useQuery({
    queryKey: ["apps"],
    queryFn: async () => (await api.get<{ apps: AppInfo[]; bundles: BundleInfo[]; aiDrafts: boolean; aiName: string | null }>("/apps")).data,
  });

// What installing would do; refreshed whenever the choices change.
// draft: an app drafted with AI (sent instead of app keys)
export const useInstallPlan = (apps: string[] | null, options: InstallOptions, draft?: unknown) =>
  useQuery({
    queryKey: ["appPlan", apps, options, draft ?? null],
    queryFn: async () => (await api.post<InstallPlan>("/apps/plan", { apps, options, draft })).data,
    enabled: Boolean(apps?.length || draft),
    placeholderData: (previous) => previous,
  });

// apps change tables, roles and the sidebar
const refreshAll = (qc: ReturnType<typeof useQueryClient>) => {
  for (const key of ["apps", "tables", "schema", "roles", "users", "appAccessOptions", "tableData", "related"]) qc.invalidateQueries({ queryKey: [key] });
};

const fail = (title: string) => (error: unknown) =>
  notifications.show({ title, message: errorMessage(error), color: "red" });

export const useInstallApps = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { apps: string[]; options: InstallOptions; draft?: unknown }) =>
      (await api.post<InstallResult>("/apps/install", input)).data,
    onSuccess: () => refreshAll(qc),
    onError: fail("Couldn't add the app"),
  });
};

// "Describe your organization": the AI drafts an app (nothing is created yet)
export const useDraftApp = () =>
  useMutation({
    mutationFn: async (description: string) =>
      (await api.post<{ draft: unknown; app: { key: string; name: string; description: string } }>("/apps/draft", { description }, { timeout: 180_000 }))
        .data,
    onError: fail("Couldn't draft the app"),
  });

export const useUninstallApp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => (await api.delete<{ removedTables: string[] }>(`/apps/${key}`)).data,
    onSuccess: (data) => {
      refreshAll(qc);
      notifications.show({
        title: "App removed",
        message: `Deleted ${data.removedTables.length} table${data.removedTables.length === 1 ? "" : "s"}`,
        color: "green",
      });
    },
    onError: fail("Couldn't remove the app"),
  });
};

export const useRemoveSample = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => (await api.delete<{ removed: number }>(`/apps/${key}/sample`)).data,
    onSuccess: (data) => {
      refreshAll(qc);
      notifications.show({ title: "Sample records removed", message: `${data.removed} removed`, color: "green" });
    },
    onError: fail("Couldn't remove the sample records"),
  });
};
