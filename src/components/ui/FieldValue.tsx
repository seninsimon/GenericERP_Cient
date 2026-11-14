import { Anchor, Avatar, Badge, Group, Text, Tooltip, UnstyledButton } from "@mantine/core";
import type { MouseEvent } from "react";
import { IconCheck, IconFile, IconMinus, IconX } from "@tabler/icons-react";
import {
  fileNameFromUrl,
  fileUrl,
  formatDate,
  formatNumber,
  htmlToText,
  isEmptyValue,
} from "../../lib/format";
import { openFiles } from "../../features/files/viewerStore";

// Renders any record value by its column type, the same way everywhere.
// `variant="table"` = compact single line, `variant="detail"` = full value.

export type ColumnLike = {
  name: string;
  type: string;
  label?: string;
  multiple?: boolean;
  options?: { label: string; color: string }[];
  formula?: { type?: string };
  rollup?: { type?: string };
};

export const EMPTY = (
  <Text span c="dimmed" aria-label="empty">
    —
  </Text>
);

export function FieldValue({
  column,
  value,
  variant = "table",
}: {
  column: ColumnLike;
  value: unknown;
  variant?: "table" | "detail";
}) {
  if (isEmptyValue(value)) return EMPTY;
  const table = variant === "table";
  // a formula shows like its result: a number, date, yes/no or text
  // formulas and totals show like their result: a number, date, yes/no or text
  if (column.type === "formula" || column.type === "rollup") {
    const type = column.type === "formula" ? (column.formula?.type ?? "text") : (column.rollup?.type ?? "number");
    return <FieldValue column={{ ...column, type }} value={value} variant={variant} />;
  }

  switch (column.type) {
    case "number":
      return (
        <Text span inherit className="tabular-nums">
          {formatNumber(value)}
        </Text>
      );

    case "boolean":
      return value === true || value === "true" ? (
        <Badge color="teal" leftSection={<IconCheck size={12} />} aria-label="Yes">
          Yes
        </Badge>
      ) : value === false || value === "false" ? (
        <Badge color="gray" leftSection={<IconX size={12} />} aria-label="No">
          No
        </Badge>
      ) : (
        <IconMinus size={14} aria-label="empty" />
      );

    case "date":
      return (
        <Text span inherit className="tabular-nums">
          {formatDate(value)}
        </Text>
      );

    // names (lists resolve relations and users on the server)
    case "relation":
    case "user":
    case "department": {
      const items = (Array.isArray(value) ? value : [value]).map(String).filter(Boolean);
      if (table) {
        // plain text reads better than tiny truncated chips in a cell
        const text = items.join(", ");
        return items.length > 1 ? (
          <Tooltip label={text} multiline maw={320} openDelay={400}>
            <Text span inherit>
              {text}
            </Text>
          </Tooltip>
        ) : (
          <Text span inherit>
            {text}
          </Text>
        );
      }
      return (
        <Group gap={4} wrap={table ? "nowrap" : "wrap"}>
          {items.map((item, i) => (
            <Badge key={`${item}-${i}`} variant="default" maw={220}>
              {item}
            </Badge>
          ))}
        </Group>
      );
    }

    case "choice": {
      const items = (Array.isArray(value) ? value : [value]).map(String).filter(Boolean);
      const shown = table ? items.slice(0, 3) : items;
      return (
        <Group gap={4} wrap={table ? "nowrap" : "wrap"}>
          {shown.map((item, i) => {
            const option = column.options?.find((o) => o.label === item);
            return (
              <Tooltip key={`${item}-${i}`} label="This option was removed" disabled={Boolean(option)}>
                <Badge color={option?.color ?? "gray"} variant="light" maw={220}>
                  {item}
                </Badge>
              </Tooltip>
            );
          })}
          {items.length > shown.length && (
            <Text span size="xs" c="dimmed">
              +{items.length - shown.length}
            </Text>
          )}
        </Group>
      );
    }

    case "image":
    case "images": {
      const urls = (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === "string");
      const size = table ? 28 : 96;
      // a click opens the viewer (and doesn't also open the row in a list)
      const open = (i: number) => (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openFiles(urls.map((url) => ({ url })), i);
      };
      return (
        <Group gap={table ? 4 : "sm"} wrap={table ? "nowrap" : "wrap"}>
          {urls.slice(0, table ? 3 : 12).map((url, i) => (
            <UnstyledButton key={url} onClick={open(i)} aria-label={`View ${fileNameFromUrl(url)}`} style={{ borderRadius: 6, cursor: "zoom-in", lineHeight: 0 }}>
              <img
                src={fileUrl(url)}
                alt={fileNameFromUrl(url)}
                loading="lazy"
                style={{ width: size, height: size, objectFit: "cover", borderRadius: table ? 4 : 8, border: "1px solid var(--app-border)", display: "block" }}
              />
            </UnstyledButton>
          ))}
          {urls.length > (table ? 3 : 12) && (
            <UnstyledButton onClick={open(table ? 3 : 12)} aria-label="View more pictures">
              <Avatar size={size} radius="sm">
                +{urls.length - (table ? 3 : 12)}
              </Avatar>
            </UnstyledButton>
          )}
        </Group>
      );
    }

    case "file":
    case "files": {
      const urls = (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === "string");
      const open = (i: number) => (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openFiles(urls.map((url) => ({ url })), i);
      };
      if (table) {
        return (
          <Anchor component="button" type="button" onClick={open(0)} size="sm" c="inherit" style={{ maxWidth: "100%" }}>
            <Group gap={4} wrap="nowrap">
              <IconFile size={14} />
              <Text span size="sm" truncate>
                {urls.length === 1 ? fileNameFromUrl(urls[0]) : `${urls.length} files`}
              </Text>
            </Group>
          </Anchor>
        );
      }
      return (
        <Group gap="xs" wrap="wrap">
          {urls.map((url, i) => (
            <Anchor key={url} component="button" type="button" onClick={open(i)} size="sm">
              <Group gap={4} wrap="nowrap">
                <IconFile size={14} />
                {fileNameFromUrl(url)}
              </Group>
            </Anchor>
          ))}
        </Group>
      );
    }

    case "richtext":
      // tables get plain text; detail views render the HTML with a read-only editor
      return (
        <Text span inherit lineClamp={table ? 1 : undefined}>
          {htmlToText(value)}
        </Text>
      );

    default:
      return (
        <Text span inherit lineClamp={table ? 1 : undefined} style={{ whiteSpace: table ? undefined : "pre-wrap" }}>
          {String(value)}
        </Text>
      );
  }
}
