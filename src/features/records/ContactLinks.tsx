import { Fragment } from "react";
import { ActionIcon, Anchor, Button, Group, Tooltip } from "@mantine/core";
import { IconBrandWhatsapp, IconExternalLink, IconMail, IconPhone, IconWorld } from "@tabler/icons-react";

import { isMobile, phoneNumbers, telHref, urlHref, urlLabel, whatsappHref, type ContactKind } from "./contactValues";

// one line, cut with "…" (the whole value shows on hover)
const ONE_LINE = { display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" } as const;

// A phone number, email or link as something you can tap.
export function ContactValue({ kind, value }: { kind: ContactKind; value: string }) {
  if (kind === "email") {
    return (
      <Tooltip label={value} openDelay={400}>
        <Anchor href={`mailto:${value.trim()}`} size="sm" style={ONE_LINE}>
          {value}
        </Anchor>
      </Tooltip>
    );
  }
  if (kind === "url") {
    return (
      <Tooltip label={value} openDelay={400} maw={420} multiline style={{ overflowWrap: "anywhere" }}>
        <Anchor href={urlHref(value)} target="_blank" rel="noopener noreferrer" size="sm" style={{ display: "inline-flex", alignItems: "center", gap: 4, maxWidth: "100%" }}>
          <span style={ONE_LINE}>{urlLabel(value)}</span>
          <IconExternalLink size={12} style={{ flexShrink: 0 }} />
        </Anchor>
      </Tooltip>
    );
  }
  const numbers = phoneNumbers(value);
  return (
    <Group gap={6} wrap="wrap">
      {numbers.map((n, i) => (
        <Fragment key={`${n}-${i}`}>
          <Group gap={2} wrap="nowrap">
            <Anchor href={telHref(n)} size="sm" style={{ whiteSpace: "nowrap" }}>
              {n}
            </Anchor>
            {isMobile(n) && (
              <Tooltip label="WhatsApp">
                <ActionIcon component="a" href={whatsappHref(n)} target="_blank" rel="noopener noreferrer" size="sm" variant="subtle" color="green" aria-label={`WhatsApp ${n}`}>
                  <IconBrandWhatsapp size={15} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
          {i < numbers.length - 1 && <span aria-hidden style={{ color: "var(--mantine-color-dimmed)" }}>·</span>}
        </Fragment>
      ))}
    </Group>
  );
}

// The header's one-tap buttons
export function QuickActions({ contacts }: { contacts: Partial<Record<ContactKind | "whatsapp", string>> }) {
  const { phone, whatsapp, email, url } = contacts;
  if (!phone && !email && !url) return null;
  return (
    <Group gap="xs" wrap="wrap">
      {phone && (
        <Button component="a" href={telHref(phone)} size="xs" variant="light" leftSection={<IconPhone size={14} />}>
          Call
        </Button>
      )}
      {whatsapp && (
        <Button component="a" href={whatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer" size="xs" variant="light" color="green" leftSection={<IconBrandWhatsapp size={14} />}>
          WhatsApp
        </Button>
      )}
      {email && (
        <Button component="a" href={`mailto:${email}`} size="xs" variant="light" leftSection={<IconMail size={14} />}>
          Email
        </Button>
      )}
      {url && (
        <Button component="a" href={urlHref(url)} target="_blank" rel="noopener noreferrer" size="xs" variant="light" leftSection={<IconWorld size={14} />}>
          Website
        </Button>
      )}
    </Group>
  );
}
