import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type MantineThemeOverride,
} from "@mantine/core";

// Design tokens. See UI_GUIDELINES.md before changing anything here.

// Brand accent (indigo). Shade 6 on white = 6.3:1 contrast (WCAG AA).
const indigo: MantineColorsTuple = [
  "#eef2ff",
  "#e0e7ff",
  "#c7d2fe",
  "#a5b4fc",
  "#818cf8",
  "#6366f1",
  "#4f46e5",
  "#4338ca",
  "#3730a3",
  "#312e81",
];

// Accent colours a user can pick under Appearance.
export const ACCENTS = {
  indigo: "Indigo",
  blue: "Blue",
  teal: "Teal",
  violet: "Violet",
} as const;
export type Accent = keyof typeof ACCENTS;

// Shade of each accent whose filled buttons pass 4.5:1 with white text.
const ACCENT_SHADE: Record<Accent, 6 | 8 | 9> = { indigo: 6, violet: 6, blue: 8, teal: 9 };

export const buildTheme = (accent: Accent = "indigo"): MantineThemeOverride =>
  createTheme({
    primaryColor: accent,
    primaryShade: { light: ACCENT_SHADE[accent], dark: ACCENT_SHADE[accent] },
    colors: { indigo },
    fontFamily: "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontFamilyMonospace: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    headings: {
      fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
      fontWeight: "600",
      sizes: {
        h1: { fontSize: "1.75rem", lineHeight: "1.25" },
        h2: { fontSize: "1.375rem", lineHeight: "1.3" },
        h3: { fontSize: "1.125rem", lineHeight: "1.35" },
        h4: { fontSize: "1rem", lineHeight: "1.4" },
      },
    },
    defaultRadius: "md",
    radius: { xs: "4px", sm: "6px", md: "8px", lg: "12px", xl: "16px" },
    cursorType: "pointer",
    focusRing: "auto",
    respectReducedMotion: true,
    autoContrast: true,
    shadows: {
      xs: "0 1px 2px rgb(16 24 40 / 0.05)",
      sm: "0 1px 3px rgb(16 24 40 / 0.08), 0 1px 2px rgb(16 24 40 / 0.04)",
      md: "0 4px 12px -2px rgb(16 24 40 / 0.10), 0 2px 4px -2px rgb(16 24 40 / 0.06)",
      lg: "0 12px 24px -4px rgb(16 24 40 / 0.12), 0 4px 8px -4px rgb(16 24 40 / 0.06)",
      xl: "0 24px 48px -12px rgb(16 24 40 / 0.20)",
    },
    components: {
      Button: { defaultProps: { size: "sm" }, styles: { root: { fontWeight: 500 } } },
      ActionIcon: { defaultProps: { variant: "subtle", color: "gray", size: "lg" } },
      TextInput: { defaultProps: { size: "sm" } },
      PasswordInput: { defaultProps: { size: "sm" } },
      NumberInput: { defaultProps: { size: "sm" } },
      Textarea: { defaultProps: { size: "sm", autosize: true, minRows: 3 } },
      // clear buttons need an accessible name
      Select: {
        defaultProps: {
          size: "sm",
          checkIconPosition: "right",
          comboboxProps: { shadow: "md" },
          clearButtonProps: { "aria-label": "Clear" },
        },
      },
      MultiSelect: {
        defaultProps: { size: "sm", comboboxProps: { shadow: "md" }, clearButtonProps: { "aria-label": "Clear" } },
      },
      DateInput: {
        defaultProps: { size: "sm", valueFormat: "DD MMM YYYY", clearButtonProps: { "aria-label": "Clear date" } },
      },
      DatePickerInput: {
        defaultProps: { size: "sm", valueFormat: "DD MMM YYYY", clearButtonProps: { "aria-label": "Clear dates" } },
      },
      Card: { defaultProps: { withBorder: true, radius: "lg", padding: "lg", shadow: "none" } },
      Badge: {
        defaultProps: { variant: "light", radius: "sm" },
        styles: { root: { textTransform: "none", fontWeight: 500, letterSpacing: 0 } },
      },
      Modal: {
        defaultProps: { radius: "lg", centered: true, overlayProps: { backgroundOpacity: 0.4, blur: 2 } },
      },
      Drawer: { defaultProps: { position: "right", overlayProps: { backgroundOpacity: 0.3 } } },
      Menu: { defaultProps: { shadow: "md", radius: "md", withinPortal: true } },
      Popover: { defaultProps: { shadow: "md", radius: "md", withinPortal: true } },
      Tooltip: { defaultProps: { withArrow: true, openDelay: 300, fz: "xs" } },
      Table: { defaultProps: { verticalSpacing: "xs", horizontalSpacing: "md", highlightOnHover: true } },
      NavLink: { styles: { root: { borderRadius: "var(--mantine-radius-md)" } } },
      Notification: { defaultProps: { radius: "md", withBorder: true } },
      Kbd: { defaultProps: { size: "xs" } },
      Skeleton: { defaultProps: { radius: "sm" } },
    },
  });

// App-level CSS variables (use these instead of hard-coded colours):
//   --app-bg         page background (behind cards)
//   --app-surface    cards, header, sidebar
//   --app-border     hairline borders
//   --app-muted      subtle fills (table header, hovers)
// Text colour of "light" badges/alerts/buttons. Mantine's default (shade 6)
// fails WCAG AA on the tinted background for most colours; these values were
// computed to reach ≥ 4.5:1 (light mode) — warm colours need custom darks.
const LIGHT_VARIANT_TEXT = (theme: Parameters<CSSVariablesResolver>[0]): Record<string, string> => ({
  blue: theme.colors.blue[9],
  cyan: theme.colors.cyan[9],
  teal: theme.colors.teal[9],
  red: theme.colors.red[9],
  pink: theme.colors.pink[8],
  grape: theme.colors.grape[8],
  violet: theme.colors.violet[7],
  indigo: theme.colors.indigo[6],
  gray: theme.colors.gray[7],
  green: "#277c38",
  lime: "#4a760a",
  yellow: "#ad5900",
  orange: "#c3410e",
});

export const cssVariablesResolver: CSSVariablesResolver = (theme) => ({
  variables: {
    "--app-header-height": "56px",
  },
  light: {
    "--app-bg": "#f7f8fa",
    "--app-surface": theme.white,
    "--app-border": theme.colors.gray[2],
    "--app-muted": theme.colors.gray[0],
    // secondary text: 4.9:1 on white (Mantine's default gray.6 is only 3.3:1)
    "--mantine-color-dimmed": "#667085",
    "--mantine-color-placeholder": "#667085",
    // field errors and red text: 5.9:1 on white (default red.6 is 3.3:1)
    "--mantine-color-error": theme.colors.red[9],
    ...Object.fromEntries(
      Object.entries(LIGHT_VARIANT_TEXT(theme)).map(([c, value]) => [`--mantine-color-${c}-light-color`, value])
    ),
  },
  dark: {
    "--app-bg": theme.colors.dark[8],
    "--app-surface": theme.colors.dark[7],
    "--app-border": theme.colors.dark[5],
    "--app-muted": theme.colors.dark[6],
    // 6:1 on the dark surface (default dark.2 is 4:1)
    "--mantine-color-dimmed": "#a3a3ab",
    "--mantine-color-placeholder": "#a3a3ab",
    "--mantine-color-error": theme.colors.red[4],
    // links and text-style buttons: a light accent shade reads on dark surfaces
    "--mantine-color-anchor": theme.colors[theme.primaryColor][3],
    // dark mode: shade 3 reaches ≥ 4.5:1 on every tint
    ...Object.fromEntries(Object.keys(LIGHT_VARIANT_TEXT(theme)).map((c) => [`--mantine-color-${c}-light-color`, theme.colors[c][3]])),
  },
});
