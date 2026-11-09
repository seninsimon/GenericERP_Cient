export const columnTypes = [
  { value: "text", label: "Text", group: "Basic Types" },
  { value: "number", label: "Number", group: "Basic Types" },
  { value: "date", label: "Date", group: "Basic Types" },
  { value: "relation", label: "Relation", group: "Advanced Types" },
  { value: "image", label: "Single Image", group: "Media Types" },
  { value: "images", label: "Multiple Images", group: "Media Types" },
  { value: "file", label: "Single File", group: "Media Types" },
  { value: "files", label: "Multiple Files", group: "Media Types" },
  { value: "richtext", label: "Rich Text", group: "Advanced Types" },
  { value: "textarea", label: "Text Area", group: "Advanced Types" },
];

// column types that can get a database index for fast sorting ("Indexed")
export const INDEXABLE_TYPES = ["text", "textarea", "number", "date", "boolean"];

export const INDEXED_HELP =
  "Adds a database index so sorting by this column stays fast on large tables. Available for text, text area, number, date and boolean columns.";
