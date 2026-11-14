import { useSyncExternalStore } from "react";

import { fileNameFromUrl, fileUrl } from "../../lib/format";

// Opening files in the in-app viewer (FileViewer, mounted once in AppLayout):
// openFiles([...], index) from anywhere: record fields, lists, chat, forms.

export type ViewerFile = { url: string; name?: string };
type State = { files: ViewerFile[]; index: number } | null;

let state: State = null;
const listeners = new Set<() => void>();
const set = (next: State) => {
  state = next;
  listeners.forEach((l) => l());
};

export const openFiles = (files: ViewerFile[], index = 0) => {
  if (files.length) set({ files, index: Math.min(Math.max(index, 0), files.length - 1) });
};
export const closeFiles = () => set(null);
export const showFile = (index: number) => state && set({ ...state, index: (index + state.files.length) % state.files.length });

export const useViewerState = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => state
  );

export type FileKind = "image" | "pdf" | "video" | "audio" | "text" | "other";
export const nameOf = (f: ViewerFile) => f.name || fileNameFromUrl(f.url);
export const kindOf = (name: string): FileKind => {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["mp4", "webm", "mov", "m4v", "ogv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) return "audio";
  if (["txt", "csv", "json", "md", "log", "xml", "tsv"].includes(ext)) return "text";
  return "other";
};
// stored uploads ("/uploads/…") live on the API; anything else is used as is
export const srcOf = (url: string) => (url.startsWith("/uploads/") ? fileUrl(url) : url);

// The file's bytes, with the sign-in cookie (uploads need it)
export async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(srcOf(url), { credentials: "include" });
  if (!res.ok) throw new Error(res.status === 404 ? "This file isn't there any more." : "Couldn't open the file.");
  return res.blob();
}

// Save to the computer under its real name (works across origins, unlike <a download>)
export async function downloadFile(f: ViewerFile) {
  const blob = await fetchBlob(f.url);
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = nameOf(f);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
