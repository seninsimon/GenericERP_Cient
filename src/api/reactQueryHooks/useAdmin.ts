import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import api, { errorMessage } from "../api";

/* ---------------- types (match the backend API) ---------------- */

export type TablePermission = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  // only records they created, or where they're picked in a User column
  own?: boolean;
};

export type PermissionMap = Record<string, TablePermission>;

export type DepartmentRef = { _id: string; name: string };

export type Department = {
  _id: string;
  name: string;
  description: string;
  userCount: number;
  tableCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Role = {
  _id: string;
  name: string;
  description: string;
  isAdmin: boolean;
  permissions: PermissionMap;
  // an app's role ("Projects · Manager"): comes and goes with the app
  appKey?: string | null;
  appLevel?: string | null;
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

// "App access" on a person: an app (as in the launcher) and the levels it offers
export type AppAccessOption = {
  key: string;
  name: string;
  icon: string;
  levels: { level: string; label: string; description: string }[];
};

export type User = {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: { _id: string; name: string; isAdmin: boolean; permissions: PermissionMap };
  departments: DepartmentRef[];
  // app -> level: { projects: "manager", company: "staff" }
  appAccess?: Record<string, string>;
};

export type UserInput = {
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  roleId?: string;
  departmentIds?: string[];
  isActive?: boolean;
  // app -> level, or null for no access (apps left out keep theirs)
  appAccess?: Record<string, string | null>;
  // new people: their entry in the People directory too (when it's installed)
  addToDirectory?: boolean;
};

export type RoleInput = {
  name?: string;
  description?: string;
  permissions?: PermissionMap;
};

export type DepartmentInput = {
  name?: string;
  description?: string;
};

/* ---------------- helpers ---------------- */

const notifySuccess = (title: string, message: string) =>
  notifications.show({ title, message, color: "green" });

const notifyError = (title: string) => (error: any) =>
  notifications.show({ title, message: errorMessage(error), color: "red" });

/* ---------------- users ---------------- */

export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UserInput) =>
      (await api.post<{ message: string; user: User; directory: { table: string; id: string } | null }>("/users", data)).data,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
      if (res.directory) {
        qc.invalidateQueries({ queryKey: ["tableData", res.directory.table] });
        qc.invalidateQueries({ queryKey: ["tile"] });
      }
      notifySuccess(
        "Person added",
        res.directory ? "Their login and their entry in the People directory are ready" : "Their login is ready"
      );
    },
    onError: notifyError("Couldn't add the person"),
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UserInput }) =>
      (await api.put<{ message: string; user: User }>(`/users/${id}`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
      notifySuccess("User updated", "Changes saved");
    },
    onError: notifyError("Could not update user"),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
      notifySuccess("User deleted", "The user account was deleted");
    },
    onError: notifyError("Could not delete user"),
  });
};

export const useAppAccessOptions = () =>
  useQuery({
    queryKey: ["appAccessOptions"],
    queryFn: async () => (await api.get<AppAccessOption[]>("/users/app-access")).data,
  });

/* ---------------- roles ---------------- */

export const useRoles = () =>
  useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get<Role[]>("/roles")).data,
  });

export const useCreateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RoleInput) =>
      (await api.post<{ message: string; role: Role }>("/roles", data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      notifySuccess("Role created", "The role was created");
    },
    onError: notifyError("Could not create role"),
  });
};

export const useUpdateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoleInput }) =>
      (await api.put<{ message: string; role: Role }>(`/roles/${id}`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      notifySuccess("Role updated", "Changes saved");
    },
    onError: notifyError("Could not update role"),
  });
};

export const useDeleteRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/roles/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      notifySuccess("Role deleted", "The role was deleted");
    },
    onError: notifyError("Could not delete role"),
  });
};

/* ---------------- departments ---------------- */

const invalidateDepartmentViews = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["departments"] });
  qc.invalidateQueries({ queryKey: ["users"] });
  qc.invalidateQueries({ queryKey: ["tables"] });
  qc.invalidateQueries({ queryKey: ["schema"] });
};

export const useDepartments = () =>
  useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await api.get<Department[]>("/departments")).data,
  });

export const useCreateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: DepartmentInput) =>
      (await api.post<{ message: string; department: Department }>("/departments", data)).data,
    onSuccess: () => {
      invalidateDepartmentViews(qc);
      notifySuccess("Department created", "The department was created");
    },
    onError: notifyError("Could not create department"),
  });
};

export const useUpdateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DepartmentInput }) =>
      (await api.put<{ message: string; department: Department }>(`/departments/${id}`, data))
        .data,
    onSuccess: () => {
      invalidateDepartmentViews(qc);
      notifySuccess("Department updated", "Changes saved");
    },
    onError: notifyError("Could not update department"),
  });
};

export const useDeleteDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/departments/${id}`)).data,
    onSuccess: () => {
      invalidateDepartmentViews(qc);
      notifySuccess("Department deleted", "The department was deleted");
    },
    onError: notifyError("Could not delete department"),
  });
};
