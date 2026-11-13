import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@fontsource-variable/inter";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/spotlight/styles.css";
import "./theme/global.css";

import App from "./App.tsx";
import { PreferencesProvider } from "./lib/preferences.tsx";
import { buildTheme, cssVariablesResolver } from "./theme/theme.ts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // coming back to the window shows current data (open forms keep your edits)
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 15_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <PreferencesProvider>
    {(prefs) => (
      <MantineProvider
        theme={buildTheme(prefs.accent)}
        cssVariablesResolver={cssVariablesResolver}
        defaultColorScheme="auto"
      >
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </MantineProvider>
    )}
  </PreferencesProvider>
);
