import { readJson } from "./storage";

// Sounds and desktop notifications:
//  - a chime (and desktop pop-ups) for what other people do that needs you
//    (the bell, direct messages, mentions);
//  - short action sounds for your own saves, deletes and errors.
// Each is switched on and off per device in My profile → Alerts (stored with
// the other preferences, "erp:preferences").

type AlertPrefs = { sound?: boolean; desktopAlerts?: boolean; actionSounds?: boolean };
const prefs = (): AlertPrefs => readJson<AlertPrefs>("erp:preferences", {});
export const soundOn = () => prefs().sound !== false; // on unless switched off
export const actionSoundsOn = () => prefs().actionSounds !== false;
export const desktopOn = () => prefs().desktopAlerts === true && desktopPermission() === "granted";

/* ---------------- the sound ---------------- */

// A soft two-note chime, made here (no sound file). Browsers only allow
// sound after the person has interacted with the page once; until then
// nothing plays.
let audio: AudioContext | null = null;
let lastDing = 0;

const context = () => {
  if (!audio) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audio = new Ctx();
  }
  return audio;
};

// unlock audio on the first click or key press (browser autoplay rules)
if (typeof window !== "undefined") {
  const unlock = () => {
    void context()?.resume();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

type Note = { freq: number; at: number; length: number; type?: OscillatorType; volume?: number };
function play(notes: Note[]) {
  const ctx = context();
  if (!ctx || ctx.state !== "running") return;
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;
    const t = ctx.currentTime + n.at;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(n.volume ?? 0.12, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + n.length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + n.length + 0.05);
  }
}

// Short sounds for your own actions: saved/added (a soft rising pop),
// deleted (a soft falling tone), failed (a low double tone).
export type ActionSound = "success" | "delete" | "error";
let lastAction = 0;
export function playAction(kind: ActionSound, force = false) {
  if (!force && !actionSoundsOn()) return;
  const now = Date.now();
  if (!force && now - lastAction < 400) return;
  lastAction = now;
  if (kind === "success") play([{ freq: 660, at: 0, length: 0.12, volume: 0.08 }, { freq: 990, at: 0.07, length: 0.18, volume: 0.08 }]);
  else if (kind === "delete") play([{ freq: 620, at: 0, length: 0.14, volume: 0.08 }, { freq: 410, at: 0.09, length: 0.22, volume: 0.08 }]);
  else play([{ freq: 220, at: 0, length: 0.13, type: "triangle", volume: 0.1 }, { freq: 196, at: 0.16, length: 0.2, type: "triangle", volume: 0.1 }]);
}

// The confirmations the app already shows decide the sound: green/teal =
// done, red = failed; "deleted"/"removed" in the text = the delete sound.
// Blue pop-ups (someone else's activity) have their own chime.
const text = (v: unknown) => (typeof v === "string" ? v : "");
export function soundForToast(data: { color?: string; title?: unknown; message?: unknown }) {
  const color = data.color ?? "";
  if (color === "red") playAction("error");
  else if (color === "green" || color === "teal") playAction(/delet|remov/i.test(`${text(data.title)} ${text(data.message)}`) ? "delete" : "success");
}

export function playChime(force = false) {
  if (!force && !soundOn()) return;
  const now = Date.now();
  if (!force && now - lastDing < 1500) return; // several events at once: one chime
  lastDing = now;
  play([
    { freq: 880, at: 0, length: 0.35 }, // A5
    { freq: 1318.5, at: 0.12, length: 0.45 }, // E6
  ]);
}

/* ---------------- desktop notifications ---------------- */

export type DesktopSupport = "ok" | "unsupported" | "insecure";
export const desktopSupport = (): DesktopSupport =>
  typeof window === "undefined" || !("Notification" in window) ? "unsupported" : !window.isSecureContext ? "insecure" : "ok";
export const desktopPermission = (): NotificationPermission | "unsupported" =>
  desktopSupport() === "ok" ? Notification.permission : "unsupported";

export async function askDesktopPermission(): Promise<NotificationPermission | "unsupported"> {
  if (desktopSupport() !== "ok") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

const icon = () => document.querySelector<HTMLLinkElement>("link[rel='icon']")?.href;

// Only when Zenin isn't in front: when it is, the in-app pop-up is enough.
export function showDesktop(title: string, body: string, onClick?: () => void, force = false) {
  if (!force && (!desktopOn() || (document.visibilityState === "visible" && document.hasFocus()))) return;
  if (desktopPermission() !== "granted") return;
  try {
    const n = new Notification(title, { body, icon: icon(), tag: `${title}|${body}` });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
  } catch {
    // some browsers only allow notifications from a service worker: skip
  }
}

// One alert: the chime, and a desktop notification when Zenin is in the background
export function alertPerson(title: string, body: string, onClick?: () => void) {
  playChime();
  showDesktop(title, body, onClick);
}
