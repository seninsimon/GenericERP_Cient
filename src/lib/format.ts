import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// One place for how values are written in the UI (see UI_GUIDELINES.md §6).

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 });
const compactFormat = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

export const formatNumber = (value: unknown): string => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? numberFormat.format(n) : String(value ?? "");
};

export const formatCompact = (n: number) => compactFormat.format(n);

// 12 Mar 2026
export const formatDate = (value: unknown): string => {
  if (!value) return "";
  const d = dayjs(value as string);
  return d.isValid() ? d.format("DD MMM YYYY") : String(value);
};

// 12 Mar 2026, 14:05
export const formatDateTime = (value: unknown): string => {
  if (!value) return "";
  const d = dayjs(value as string);
  return d.isValid() ? d.format("DD MMM YYYY, HH:mm") : String(value);
};

// "3 minutes ago"
export const formatRelative = (value: unknown): string => {
  if (!value) return "";
  const d = dayjs(value as string);
  return d.isValid() ? d.fromNow() : "";
};

// Uploaded file URLs look like /uploads/<timestamp>-<id>-<name>
export const fileNameFromUrl = (url: string): string => {
  const last = decodeURIComponent(url.split("/").pop() ?? url);
  return last.replace(/^\d+-[0-9a-f]{8}-/, "");
};

export const fileUrl = (url: string) => `${import.meta.env.VITE_FILE_BASE_URL ?? ""}${encodeURI(url)}`;

// Plain text from stored rich-text HTML.
export const htmlToText = (html: unknown): string =>
  typeof html === "string"
    ? html
        .replace(/<(br|\/p|\/h\d|\/li)\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim()
    : "";

export const isEmptyValue = (value: unknown) =>
  value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${formatNumber(count)} ${count === 1 ? singular : plural}`;
