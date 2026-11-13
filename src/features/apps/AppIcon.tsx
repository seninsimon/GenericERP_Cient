import { ThemeIcon } from "@mantine/core";
import { IconApps } from "@tabler/icons-react";

import { appColor, ICONS } from "./appIcons";

export function AppIcon({ name, size = 40, variant = "light" }: { name: string; size?: number; variant?: "light" | "filled" }) {
  const I = ICONS[name] ?? IconApps;
  return (
    <ThemeIcon variant={variant} color={appColor(name)} size={size} radius="md" aria-hidden>
      <I size={size * 0.55} stroke={1.75} />
    </ThemeIcon>
  );
}
