import {
  IconAlignLeft,
  IconBuilding,
  IconCalendar,
  IconFile,
  IconFiles,
  IconHash,
  IconLink,
  IconPhoto,
  IconSelector,
  IconLibraryPhoto,
  IconTextSize,
  IconToggleLeft,
  IconTypography,
  IconUser,
  type Icon,
} from "@tabler/icons-react";

// Column types an admin can choose, with the icon and one-line description
// shown in the "Add column" type picker.
export type ColumnTypeInfo = {
  value: string;
  label: string;
  description: string;
  icon: Icon;
  group: "Basic" | "Content" | "Links & media";
};

export const columnTypes: ColumnTypeInfo[] = [
  { value: "text", label: "Text", description: "A short line of text, like a name or code", icon: IconTypography, group: "Basic" },
  { value: "number", label: "Number", description: "Quantities, prices, scores", icon: IconHash, group: "Basic" },
  { value: "date", label: "Date", description: "A calendar date", icon: IconCalendar, group: "Basic" },
  { value: "boolean", label: "Yes / No", description: "A checkbox: done, paid, active", icon: IconToggleLeft, group: "Basic" },
  { value: "choice", label: "Choice", description: "Pick from a list: status, priority, category", icon: IconSelector, group: "Basic" },
  { value: "textarea", label: "Long text", description: "Several lines of plain text", icon: IconAlignLeft, group: "Content" },
  { value: "richtext", label: "Rich text", description: "Formatted text with headings and lists", icon: IconTextSize, group: "Content" },
  { value: "relation", label: "Link to table", description: "Points to records in another table", icon: IconLink, group: "Links & media" },
  { value: "user", label: "User", description: "A person with a login: owner, assignee, approver", icon: IconUser, group: "Links & media" },
  { value: "department", label: "Department", description: "One of your departments: team, cost centre", icon: IconBuilding, group: "Links & media" },
  { value: "image", label: "Image", description: "One picture", icon: IconPhoto, group: "Links & media" },
  { value: "images", label: "Images", description: "A gallery of pictures", icon: IconLibraryPhoto, group: "Links & media" },
  { value: "file", label: "File", description: "One attachment", icon: IconFile, group: "Links & media" },
  { value: "files", label: "Files", description: "Several attachments", icon: IconFiles, group: "Links & media" },
];

export const columnTypeInfo = (type: string): ColumnTypeInfo =>
  columnTypes.find((t) => t.value === type || (type === "richText" && t.value === "richtext")) ?? {
    value: type,
    label: type,
    description: "",
    icon: IconTypography,
    group: "Basic",
  };

// column types that can get a database index for fast sorting ("Indexed")
export const INDEXABLE_TYPES = ["text", "textarea", "number", "date", "boolean"];

export const INDEXED_HELP =
  "Adds a database index so sorting by this column stays fast on large tables. Available for text, long text, number, date and yes/no columns.";

// "Order date" -> "order_date": a safe column name suggested from the label
export const slugify = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

// Problems to show before saving (the API checks the same).
export const optionsError = (options: { label: string }[]) => {
  const labels = options.map((o) => o.label.trim().toLowerCase());
  if (!labels.filter(Boolean).length) return "Add at least one option";
  if (labels.some((l) => !l)) return "Every option needs a name";
  if (new Set(labels).size !== labels.length) return "Each option can only be listed once";
  return null;
};
