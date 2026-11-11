import axios from "axios";

// const api = axios.create({
//   baseURL: "https://monospermous-watchfully-luetta.ngrok-free.dev/api",
//   headers: {
//     "ngrok-skip-browser-warning": "true"
//   }
// });

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // send the session cookie (also needed cross-origin from the Vite dev server)
  withCredentials: true,
  // the API rejects state-changing requests without this header (CSRF guard)
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

// When the session expires, tell the app so it can show the login page.
export const SESSION_EXPIRED_EVENT = "erp:session-expired";

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? "";
    // /auth/me and /auth/login handle their own 401s
    if (error.response?.status === 401 && !url.startsWith("/auth/")) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

// Server's error message for a failed request, if any.
export const errorMessage = (error: any, fallback = "Something went wrong") =>
  error?.response?.data?.message || fallback;

// ---------------- auth ----------------

export const login = (username: string, password: string) =>
  api.post("/auth/login", { username, password });

export const logout = () => api.post("/auth/logout");

export const getMe = () => api.get("/auth/me");

export const updateProfile = (data: { fullName?: string; email?: string; phone?: string }) =>
  api.put("/auth/profile", data);

export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
  api.put("/auth/password", data);

export const getTables = () => api.get("/schema");

export const getSchema = (table: string) =>
  api.get(`/schema/${table}`);

export const createTable = (data: any) =>
  api.post("/schema", data);

// drops the table with all its records and uploaded files (admins)
export const deleteTable = (table: string) =>
  api.delete(`/schema/${encodeURIComponent(table)}`);

export const addColumn = (table: string, data: any) =>
  api.post(`/schema/${table}/column`, data);

export const deleteColumn = (table: string, column: string) =>
  api.delete(`/schema/${table}/column/${column}`);

export const updateColumn = (table: string, name: string, data: any) =>
  api.put(`/schema/${table}/column/${name}`, data);


//tables

// One page of records. Rows are keyed by column NAME and include
// _createdAt/_updatedAt (and _department/_departmentId when relevant).
// `filters` = column filters (see components/data-table/FilterBar).
export type ListFilter = { field: string; op: string; value?: unknown; value2?: unknown };

export const getTableData = (
  table: string,
  params: {
    page: number;
    limit: number;
    search?: string;
    sort?: string;
    order?: "asc" | "desc";
    filters?: ListFilter[];
  }
) => {
  const { filters, ...rest } = params;
  // only field/op/value(2) go to the server (chips may carry display labels)
  const clean = filters?.map(({ field, op, value, value2 }) => ({ field, op, value, value2 }));
  return api.get(`/table/${encodeURIComponent(table)}`, {
    params: { ...rest, ...(clean?.length ? { filters: JSON.stringify(clean) } : {}) },
  });
};

export const bulkDeleteRecords = (table: string, ids: string[]) =>
  api.post<{ message: string; deleted: number; notFound: number }>(
    `/table/${encodeURIComponent(table)}/bulk-delete`,
    { ids }
  );

export const insertData = (table: string, data: any) =>
  api.post(`/table/${table}`, data);


export type RelationOption = { value: string; label: string };

// [{ value: id, label: display name }] for relation dropdowns.
// `ids` resolves exactly those records; otherwise up to `limit` matches of `search`.
export const getRelationOptions = (
  table: string,
  opts: { search?: string; limit?: number; ids?: string[]; displayField?: string } = {}
) => {
  const params: Record<string, string | number> = {};
  if (opts.search) params.search = opts.search;
  if (opts.limit) params.limit = opts.limit;
  if (opts.ids?.length) params.ids = opts.ids.join(",");
  if (opts.displayField) params.displayField = opts.displayField;
  return api.get<RelationOption[]>(`/table/${encodeURIComponent(table)}/options`, { params });
};

export type UserOption = { value: string; label: string; username: string; isActive: boolean };

// People for "User" columns and filters (any logged-in user; names only).
// `ids` resolves exactly those users (deleted ones come back as "Deleted user");
// otherwise up to `limit` active users matching `search`.
export const getUserOptions = (opts: { search?: string; limit?: number; ids?: string[] } = {}) => {
  const params: Record<string, string | number> = {};
  if (opts.search) params.search = opts.search;
  if (opts.limit) params.limit = opts.limit;
  if (opts.ids?.length) params.ids = opts.ids.join(",");
  return api.get<UserOption[]>("/users/options", { params });
};

// Every department, for "Department" columns and filters (any logged-in user; names only).
export const getDepartmentOptions = () => api.get<{ value: string; label: string }[]>("/departments/options");

export const getSingleData = (table: string, id: string) =>
  api.get(`/table/${table}/${id}`);

export const updateData = (table: string, id: string, data: any) =>
  api.put(`/table/${table}/${id}`, data);

export const deleteData = (table: string, id: string) =>
  api.delete(`/table/${table}/${id}`);


export const uploadFiles = (files: File[]) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  return api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const updateTableSettings = (table: string, data: any) =>
  api.put(`/schema/${table}`, data);

// move every record without a department into departmentId (admins)
export const assignUnassignedRecords = (table: string, departmentId: string) =>
  api.put(`/schema/${table}/unassigned`, { departmentId });

// public "is the server up" check
export const getHealth = () => api.get("/health");

// CPU / RAM / disk (admins only)
export const getSystemHealth = () => api.get("/system-health");


export default api;

// ---------------- audit log ----------------

export type AuditEntry = {
  _id: string;
  at: string;
  userId: string | null;
  username: string | null;
  action: string;
  entity: string;
  tableName: string | null;
  recordId: string | null;
  changes: any;
  ip: string | null;
};

export type AuditQuery = {
  tableName?: string;
  recordId?: string;
  userId?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type Paged<T> = { data: T[]; total: number; page: number; limit: number };

const dropEmpty = (params: Record<string, any>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));

export const getAuditLog = (query: AuditQuery) =>
  api.get<Paged<AuditEntry>>("/audit", { params: dropEmpty(query) });

// ---------------- background jobs (CSV import / export) ----------------

export type JobStatus = "queued" | "running" | "done" | "failed";

export type Job = {
  _id: string;
  type: "export" | "import";
  tableName: string;
  status: JobStatus;
  progress: number;
  result: null | {
    rows?: number;
    inserted?: number;
    failed?: number;
    errors?: { row: number; message: string }[];
  };
  error: string | null;
  hasFile: boolean;
  fileName: string | null;
  userId: string;
  username: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

// Export the whole table, or only what matches `view` (current search + filters).
export const startExport = (table: string, view?: { search?: string; filters?: ListFilter[] }) =>
  api.post<{ job: Job }>(`/table/${encodeURIComponent(table)}/export`, {
    search: view?.search || undefined,
    filters: view?.filters?.map(({ field, op, value, value2 }) => ({ field, op, value, value2 })),
  });

export const startImport = (table: string, file: File, departmentId?: string | null) => {
  const formData = new FormData();
  formData.append("file", file);
  if (departmentId) formData.append("departmentId", departmentId);
  return api.post<{ job: Job }>(`/table/${encodeURIComponent(table)}/import`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getJobs = (page = 1, limit = 25) =>
  api.get<Paged<Job>>("/jobs", { params: { page, limit } });

export const getJob = (id: string) => api.get<Job>(`/jobs/${id}`);

// plain link: the session cookie authenticates GET downloads
export const jobDownloadUrl = (id: string) =>
  `${import.meta.env.VITE_API_BASE_URL}/jobs/${id}/download`;
