import type { RecordColumn } from "./schema";

// Recognising phone numbers, emails and web links in a record's text values,
// so the record page can make them tappable (call, WhatsApp, email, open).
// By the value itself, helped by the column's name ("Phone", "Website").

export type ContactKind = "phone" | "email" | "url";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_WITH_SCHEME = /^(https?:\/\/|www\.)\S+$/i;
const DOMAIN = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/;
const PHONE_CHARS = /^[+\d(][\d\s()+\-./;,]*$/;
const PHONE_HINT = /phone|mobile|whatsapp|contact\s*no|telephone|\btel\b|\bcell\b/i;
const URL_HINT = /website|\burl\b|\blink\b|\bsite\b/i;

const digitCount = (s: string) => s.replace(/\D/g, "").length;

export function contactKind(column: RecordColumn, value: unknown): ContactKind | null {
  if (column.type !== "text" || typeof value !== "string") return null;
  const v = value.trim();
  if (!v || v.length > 300) return null;
  const label = `${column.label ?? ""} ${column.name}`;
  if (EMAIL.test(v)) return "email";
  if (URL_WITH_SCHEME.test(v)) return "url";
  if (URL_HINT.test(label) && DOMAIN.test(v)) return "url";
  if (PHONE_CHARS.test(v) && digitCount(v) >= 7 && (PHONE_HINT.test(label) || v.startsWith("+"))) return "phone";
  return null;
}

// "(0487) 2322785; 7293915784" -> ["(0487) 2322785", "7293915784"]
export const phoneNumbers = (value: string) =>
  value
    .split(/[;,/]|\s{2,}/)
    .map((p) => p.trim())
    .filter((p) => digitCount(p) >= 7);

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

// WhatsApp only works on mobiles: an Indian mobile is 10 digits starting
// 6-9 (after a 0 or 91); numbers written with + are trusted as they are
export const isMobile = (phone: string) => {
  if (phone.trim().startsWith("+") && !phone.trim().startsWith("+91")) return true;
  let d = phone.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.length === 10 && /^[6-9]/.test(d);
};

// WhatsApp needs the country code; a 10-digit Indian number gets +91
export const whatsappHref = (phone: string) => {
  let n = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return `https://wa.me/${n}`;
  if (n.length === 11 && n.startsWith("0")) n = n.slice(1);
  if (n.length === 10) n = `91${n}`;
  return `https://wa.me/${n}`;
};

export const urlHref = (value: string) => (/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
export const urlLabel = (value: string) => value.trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

// The first phone / email / website on a record, for the header's quick actions
export function firstContacts(columns: RecordColumn[], record: Record<string, unknown>) {
  const found: Partial<Record<ContactKind | "whatsapp", string>> = {};
  for (const column of columns) {
    const kind = contactKind(column, record[column.name]);
    if (!kind) continue;
    const value = String(record[column.name]).trim();
    if (kind === "phone") {
      const numbers = phoneNumbers(value);
      found.phone ??= numbers[0] ?? value;
      found.whatsapp ??= numbers.find(isMobile);
    } else {
      found[kind] ??= value;
    }
  }
  return found;
}
