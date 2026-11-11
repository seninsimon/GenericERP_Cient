// Types and helpers for working with a table's schema on the record pages.

export type ColumnType =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "date"
  | "boolean"
  | "relation"
  | "user"
  | "department"
  | "choice"
  | "autonumber"
  | "formula"
  | "rollup"
  | "image"
  | "images"
  | "file"
  | "files";

// An option of a "choice" column. Records store the label.
export interface ChoiceOption {
  id?: string;
  label: string;
  color: string;
  // an approval step: only these roles may choose it (admins always may)
  roles?: string[];
}

// May this user choose this option? (approval steps)
export const canChoose = (option: ChoiceOption, user: { role: { _id: string; isAdmin: boolean } }) =>
  !option.roles?.length || user.role.isAdmin || option.roles.includes(user.role._id);

export type RollupConfig = {
  from: string;
  via: string;
  fn: "count" | "sum" | "avg" | "min" | "max";
  field?: string;
  where?: { column: string; in?: string[]; notIn?: string[] };
  type?: "number" | "date";
};

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
  // a link whose records are edited inside the linked record's form (lines)
  inline?: boolean;
  options?: ChoiceOption[];
  // "autonumber" columns: INV-0001, INV-0002, ... ({YYYY} = the year)
  autonumber?: { prefix: string };
  // "formula" columns: `type` is the kind of result, worked out by the server
  formula?: { expression: string; type?: "number" | "text" | "date" | "boolean" };
  // "rollup" columns: a total over records of `from` linking here through `via`
  rollup?: RollupConfig;
  // "today" (dates), "$me" (users), "$mine" (departments) or a fixed value
  default?: unknown;
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
  // own: the role limits this table to the user's own records
  permissions?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean; own?: boolean };
  unassignedCount?: number;
}

export type RecordRow = Record<string, unknown> & { _id: string };

// the server can sort these types (typed sort expression / index)
export const SORTABLE_TYPES = ["text", "textarea", "number", "date", "boolean", "autonumber", "formula", "rollup"];

// What a column's values look like: a formula's are of its result type.
export const valueType = (column: { type: string; formula?: { type?: string }; rollup?: { type?: string } }) =>
  column.type === "formula"
    ? (column.formula?.type ?? "text")
    : column.type === "rollup"
      ? (column.rollup?.type ?? "number")
      : column.type;

// Columns whose values come from the server (never typed in a form).
export const SERVER_TYPES = ["autonumber", "formula", "rollup"];
// ...and single choices, in their options' order
export const isSortable = (column: RecordColumn) =>
  SORTABLE_TYPES.includes(column.type) || (column.type === "choice" && !column.multiple);

// The colour of a choice value; grey for values whose option was removed.
export const choiceOption = (column: { options?: ChoiceOption[] }, label: string) =>
  column.options?.find((o) => o.label === label);
// these take the whole row in forms and detail views
export const FULL_WIDTH_TYPES = ["textarea", "richtext", "images", "files"];
export const FILE_TYPES = ["image", "images", "file", "files"];
export const IMAGE_TYPES = ["image", "images"];
const TITLE_TYPES = ["text", "autonumber", "textarea"];

export const columnLabel = (column: RecordColumn) => column.label || column.name;

// The column that names a record (first visible text column, else the first column).
export const primaryColumn = (columns: RecordColumn[]) =>
  // a text column names a record best; a reference number when there's none
  columns.find((c) => c.showInTable !== false && c.type === "text") ??
  columns.find((c) => c.showInTable !== false && TITLE_TYPES.includes(c.type)) ??
  columns.find((c) => c.showInTable !== false) ??
  columns[0];

// What to call a record on a card or calendar entry: its title, plus who or
// what it's about (the first link, e.g. the patient) when that's different:
// "10:30 · Anu Thomas". `row` is a list row (links already as names).
export const cardTitle = (columns: RecordColumn[], row: Record<string, unknown>) => {
  const primary = primaryColumn(columns);
  const parts: string[] = [];
  const text = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v)).trim();
  if (primary) parts.push(text(row[primary.name]));
  const about = columns.find((c) => c !== primary && (c.type === "relation" || c.type === "user") && c.showInTable !== false && text(row[c.name]));
  if (about && primary?.type !== "relation") parts.push(text(row[about.name]));
  return parts.filter(Boolean).join(" · ") || "Untitled";
};

// Readable title for a record (used in page headers).
export const recordTitle = (columns: RecordColumn[], record: Record<string, unknown> | undefined) => {
  if (!record) return "Record";
  // text columns first ("Anu Thomas"), then a reference number ("INV-0004")
  const titled = [...columns.filter((c) => c.type === "text"), ...columns.filter((c) => TITLE_TYPES.includes(c.type) && c.type !== "text")];
  for (const column of titled) {
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

const todayIso = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Starting values for a new record: column defaults, then anything given in
// the address (?project=<id>, used by "Add" links on related records).
export function newRecordValues(
  columns: RecordColumn[],
  user: { _id: string; departments: { _id: string }[] },
  search: string
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const wrap = (column: RecordColumn, v: unknown) => (column.multiple ? [v] : v);
  for (const column of columns) {
    const d = column.default;
    if (d === undefined || d === null) continue;
    if (d === "today") values[column.name] = todayIso();
    else if (d === "$me") values[column.name] = wrap(column, user._id);
    else if (d === "$mine") {
      if (user.departments.length === 1) values[column.name] = wrap(column, user.departments[0]._id);
    } else values[column.name] = d;
  }
  const params = new URLSearchParams(search);
  for (const column of columns) {
    const raw = params.get(column.name);
    if (raw === null || FILE_TYPES.includes(column.type)) continue;
    values[column.name] =
      column.type === "number"
        ? Number(raw)
        : column.type === "boolean"
          ? raw === "true"
          : column.multiple
            ? raw.split(",").filter(Boolean)
            : raw;
  }
  return values;
}

export const httpStatus = (error: unknown) =>
  (error as { response?: { status?: number } } | null)?.response?.status;
