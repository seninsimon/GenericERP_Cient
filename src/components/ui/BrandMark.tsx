import { useState } from "react";
import { Group, Image, Text, ThemeIcon, Tooltip } from "@mantine/core";

import { useBranding } from "../../lib/branding";

// The organization's logo and name (Administration → Branding). Without a
// logo: the name's first letter on the accent colour. A wide logo (a wordmark,
// which usually spells the name already) is shown alone, a bit larger.
export function BrandMark({ size = 30, showName = true, nameSize = "md" }: { size?: number; showName?: boolean; nameSize?: string }) {
  const { name, logo } = useBranding();
  const [wide, setWide] = useState<{ src: string; wide: boolean } | null>(null);
  const isWide = Boolean(logo && wide?.src === logo && wide.wide);

  const mark = logo ? (
    <Image
      src={logo}
      alt={isWide ? name : ""}
      h={isWide ? size * 1.15 : size}
      w="auto"
      maw={isWide ? size * 6 : size * 2}
      fit="contain"
      radius="sm"
      style={{ flexShrink: 0 }}
      onLoad={(e) => {
        const img = e.currentTarget;
        setWide({ src: logo, wide: img.naturalWidth / Math.max(1, img.naturalHeight) > 1.8 });
      }}
    />
  ) : (
    <ThemeIcon size={size} radius="md" variant="filled" aria-hidden style={{ flexShrink: 0 }}>
      <Text fw={800} fz={size * 0.5} c="white">
        {(name.trim()[0] ?? "Z").toUpperCase()}
      </Text>
    </ThemeIcon>
  );

  if (isWide) {
    return showName ? (
      <Tooltip label={name} openDelay={400}>
        {mark}
      </Tooltip>
    ) : (
      mark
    );
  }
  return (
    <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
      {mark}
      {showName && (
        <Text fw={700} fz={nameSize} lh={1.1} truncate>
          {name}
        </Text>
      )}
    </Group>
  );
}
