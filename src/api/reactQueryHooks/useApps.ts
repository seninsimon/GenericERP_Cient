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
  roles: { name: string; action: "create" | "extend"; tables: string[] }[];
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
    queryFn: async () => (await api.get<{ apps: AppInfo[]; bundles: BundleInfo[] }>("/apps")).data,
  });

// What installing would do; refreshed whenever the choices change.
export const useInstallPlan = (apps: string[] | null, options: InstallOptions) =>
  useQuery({
    queryKey: ["appPlan", apps, options],
    queryFn: async () => (await api.post<InstallPlan>("/apps/plan", { apps, options })).data,
    enabled: Boolean(apps?.length),
    placeholderData: (previous) => previous,
  });

// apps change tables, roles and the sidebar
const refreshAll = (qc: ReturnType<typeof useQueryClient>) => {
  for (const key of ["apps", "tables", "schema", "roles", "tableData", "related"]) qc.invalidateQueries({ queryKey: [key] });
};

const fail = (title: string) => (error: unknown) =>
  notifications.show({ title, message: errorMessage(error), color: "red" });

export const useInstallApps = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { apps: string[]; options: InstallOptions }) =>
      (await api.post<InstallResult>("/apps/install", input)).data,
    onSuccess: () => refreshAll(qc),
    onError: fail("Couldn't add the app"),
  });
};

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
