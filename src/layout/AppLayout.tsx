import { Suspense } from "react";
import { AppShell, Center, Loader } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { Outlet } from "react-router-dom";

import { PageMetaProvider } from "../components/ui/Page";
import { usePreferences } from "../lib/preferences";
import CommandPalette from "./CommandPalette";
import Header from "./Header";
import Sidebar from "./Sidebar";

const SIDEBAR_WIDTH = 248;
const RAIL_WIDTH = 64;

// App frame: sidebar (full / icon rail / mobile drawer) + top bar + page.
export default function AppLayout() {
  const { sidebarCollapsed } = usePreferences();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  // tablets get the rail by default; phones get a drawer
  const isTablet = useMediaQuery("(min-width: 48em) and (max-width: 75em)") ?? false;
  const collapsed = sidebarCollapsed || isTablet;

  return (
    <PageMetaProvider>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <AppShell
        // sidebar runs the full height; the top bar sits beside it
        layout="alt"
        header={{ height: 56 }}
        navbar={{
          width: { base: SIDEBAR_WIDTH, sm: collapsed ? RAIL_WIDTH : SIDEBAR_WIDTH },
          breakpoint: "sm",
          collapsed: { mobile: !mobileOpened },
        }}
        styles={{
          header: { background: "var(--app-surface)", borderColor: "var(--app-border)" },
          navbar: { background: "var(--app-surface)", borderColor: "var(--app-border)" },
          main: { background: "var(--app-bg)" },
        }}
        transitionDuration={150}
      >
        <AppShell.Header>
          <Header mobileOpened={mobileOpened} toggleMobile={toggleMobile} />
        </AppShell.Header>

        <AppShell.Navbar>
          {/* the drawer on phones always shows the full sidebar */}
          <Sidebar collapsed={collapsed && !mobileOpened} onNavigate={closeMobile} />
        </AppShell.Navbar>

        <AppShell.Main id="main" tabIndex={-1} style={{ outline: "none" }}>
          <Suspense
            fallback={
              <Center h={320}>
                <Loader />
              </Center>
            }
          >
            <Outlet />
          </Suspense>
        </AppShell.Main>
      </AppShell>
      <CommandPalette />
    </PageMetaProvider>
  );
}
