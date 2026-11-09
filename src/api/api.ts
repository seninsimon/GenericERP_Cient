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

export const getTableData = (
  table: string,
  params: {
    page: number;
    limit: number;
    search?: string;
    sort?: string;
    order?: "asc" | "desc";
  }
) => api.get(`/table/${table}`, { params });

export const insertData = (table: string, data: any) =>
  api.post(`/table/${table}`, data);


// [{ value: id, label: display name }] for relation dropdowns
export const getRelationOptions = (table: string, displayField?: string) =>
  api.get<{ value: string; label: string }[]>(`/table/${table}/options`, {
    params: displayField ? { displayField } : {},
  });

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