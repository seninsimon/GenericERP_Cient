// Types and helpers for working with a table's schema on the record pages.

export type ColumnType =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "date"
  | "boolean"
  | "relation"
  | "image"
  | "images"
  | "file"
  | "files";

export interface RecordColumn {
  _id?: string;
  name: string;
  label?: string;
  type: ColumnType | string;
  showInTable?: boolean;
  required?: boolean;
  indexed?: boolean;
  ref?: string | null;
  multiple?: boolean;
  displayField?: string;
}

export interface Department {
  _id: string;
  name: string;
}

export interface TableSchemaInfo {
  tableName: string;
  columns: RecordColumn[];
  departments?: Department[];
  allowedDepartments?: Department[];
  permissions?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  unassignedCount?: number;
}

export type RecordRow = Record<string, unknown> & { _id: string };

// the server can sort these types (typed sort expression / index)
export const SORTABLE_TYPES = ["text", "textarea", "number", "date", "boolean"];
// these take the whole row in forms and detail views
export const FULL_WIDTH_TYPES = ["textarea", "richtext", "images", "files"];
export const FILE_TYPES = ["image", "images", "file", "files"];
export const IMAGE_TYPES = ["image", "images"];
const TITLE_TYPES = ["text", "textarea"];

export const columnLabel = (column: RecordColumn) => column.label || column.name;

// The column that names a record (first visible text column, else the first column).
export const primaryColumn = (columns: RecordColumn[]) =>
  columns.find((c) => c.showInTable !== false && TITLE_TYPES.includes(c.type)) ??
  columns.find((c) => c.showInTable !== false) ??
  columns[0];

// Readable title for a record (used in page headers).
export const recordTitle = (columns: RecordColumn[], record: Record<string, unknown> | undefined) => {
  if (!record) return "Record";
  for (const column of columns.filter((c) => TITLE_TYPES.includes(c.type))) {
    const value = record[column.name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const first = columns.find((c) => ["number", "date"].includes(c.type) && record[c.name] != null);
  return first ? String(record[first.name]) : "Record";
};

export const isMissing = (column: RecordColumn, value: unknown) => {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (column.type === "richtext" && typeof value === "string") {
    return !value.replace(/<[^>]*>|&nbsp;/g, "").trim();
  }
  return false;
};

export const httpStatus = (error: unknown) =>
  (error as { response?: { status?: number } } | null)?.response?.status;
