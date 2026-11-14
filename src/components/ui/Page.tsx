import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Box, Group, Stack, Text, Title } from "@mantine/core";
import { useBranding } from "../../lib/branding";

/* ------------------------------------------------------------------ */
/* Breadcrumbs: pages declare them, the header shows them.             */
/* ------------------------------------------------------------------ */

export type Crumb = { label: string; to?: string };

type PageMetaCtx = { crumbs: Crumb[]; setCrumbs: (c: Crumb[]) => void };
const PageMetaContext = createContext<PageMetaCtx>({ crumbs: [], setCrumbs: () => {} });

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  return <PageMetaContext.Provider value={{ crumbs, setCrumbs }}>{children}</PageMetaContext.Provider>;
}

export const usePageMeta = () => useContext(PageMetaContext);


/* ------------------------------------------------------------------ */
/* <Page>: every route renders inside one.                             */
/* ------------------------------------------------------------------ */

const WIDTHS = {
  // data tables use the whole width
  full: undefined,
  // settings, dashboards
  wide: 1200,
  // forms, record details, profile: easier to read
  narrow: 880,
} as const;

export function Page({
  title,
  breadcrumbs,
  width = "full",
  children,
}: {
  // browser tab title
  title: string;
  // shown in the top bar; the last item is the current page
  breadcrumbs?: Crumb[];
  width?: keyof typeof WIDTHS;
  children: ReactNode;
}) {
  const { setCrumbs } = usePageMeta();
  const crumbKey = JSON.stringify(breadcrumbs ?? [{ label: title }]);

  const { name: appName } = useBranding();
  useEffect(() => {
    document.title = `${title} · ${appName}`;
  }, [title, appName]);

  useEffect(() => {
    setCrumbs(JSON.parse(crumbKey));
  }, [crumbKey, setCrumbs]);

  return (
    <Box
      px={{ base: "md", sm: "lg", lg: "xl" }}
      py={{ base: "md", sm: "lg" }}
      maw={WIDTHS[width]}
      mx={width === "full" ? undefined : "auto"}
      w="100%"
    >
      {children}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* <PageHeader>: title, supporting text, primary actions.              */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  meta,
  actions,
  icon,
  below,
}: {
  title: ReactNode;
  description?: ReactNode;
  // anything under the title (badges, buttons): not wrapped in a paragraph
  below?: ReactNode;
  // small badges/info next to the title
  meta?: ReactNode;
  // buttons on the right; put the primary action LAST
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-start" gap="md" mb="lg" wrap="wrap">
      <Group gap="sm" align="flex-start" wrap="nowrap" style={{ minWidth: 0, flex: "1 1 280px" }}>
        {icon}
        <Stack gap={4} style={{ minWidth: 0 }}>
          <Group gap="xs" wrap="wrap">
            <Title order={2} style={{ overflowWrap: "anywhere" }}>
              {title}
            </Title>
            {meta}
          </Group>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
          {below}
        </Stack>
      </Group>
      {actions && (
        <Group gap="xs" wrap="wrap" justify="flex-end">
          {actions}
        </Group>
      )}
    </Group>
  );
}

/* ------------------------------------------------------------------ */
/* <Section>: titled card inside a page.                               */
/* ------------------------------------------------------------------ */

export function Section({
  title,
  description,
  actions,
  children,
  padding = "lg",
  danger,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  padding?: "md" | "lg" | 0;
  danger?: boolean;
}) {
  return (
    <Box
      component="section"
      bg="var(--app-surface)"
      style={{
        border: `1px solid ${danger ? "var(--mantine-color-red-4)" : "var(--app-border)"}`,
        borderRadius: "var(--mantine-radius-lg)",
      }}
    >
      {(title || actions) && (
        <Group
          justify="space-between"
          px="lg"
          py="md"
          gap="sm"
          wrap="wrap"
          style={{ borderBottom: "1px solid var(--app-border)" }}
        >
          <Stack gap={2}>
            {title && (
              <Title order={4} c={danger ? "var(--mantine-color-red-light-color)" : undefined}>
                {title}
              </Title>
            )}
            {description && (
              <Text size="sm" c="dimmed">
                {description}
              </Text>
            )}
          </Stack>
          {actions && <Group gap="xs">{actions}</Group>}
        </Group>
      )}
      <Box p={padding}>{children}</Box>
    </Box>
  );
}
