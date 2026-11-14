import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  Anchor,
  ActionIcon,
  Box,
  FileButton,
  Group,
  Image,
  Input,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconFile, IconPhoto, IconUpload, IconX } from "@tabler/icons-react";

import { fileNameFromUrl, fileUrl } from "../../../lib/format";
import { openFiles } from "../../files/viewerStore";
import { columnLabel, IMAGE_TYPES, type RecordColumn } from "../schema";

const bytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

// Upload area for image/file columns: click or drop files. Shows files already
// saved (`existing` URLs) and files chosen but not yet uploaded (`pending`).
export function FileInputArea({
  id,
  column,
  existing,
  pending,
  onAdd,
  onRemoveExisting,
  onRemovePending,
  error,
}: {
  id: string;
  column: RecordColumn;
  existing: string[];
  pending: File[];
  onAdd: (files: File[]) => void;
  onRemoveExisting: (url: string) => void;
  onRemovePending: (index: number) => void;
  error?: string;
}) {
  const isImage = IMAGE_TYPES.includes(column.type);
  const multiple = column.type === "images" || column.type === "files";
  const accept = isImage ? "image/*" : undefined;
  const [dragging, setDragging] = useState(false);

  // previews for chosen images (revoked when they change)
  const previews = useMemo(
    () => pending.map((f) => (isImage && f.type.startsWith("image/") ? URL.createObjectURL(f) : null)),
    [pending, isImage]
  );
  useEffect(() => () => previews.forEach((p) => p && URL.revokeObjectURL(p)), [previews]);

  const add = (files: File[]) => {
    const usable = isImage ? files.filter((f) => f.type.startsWith("image/")) : files;
    if (usable.length) onAdd(multiple ? usable : usable.slice(0, 1));
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    add(Array.from(e.dataTransfer.files));
  };

  const hasFiles = existing.length + pending.length > 0;
  const noun = isImage ? (multiple ? "images" : "an image") : multiple ? "files" : "a file";

  const tile = (key: string, name: string, preview: string | null, detail: string, onRemove: () => void, onOpen?: () => void) =>
    isImage ? (
      <Box key={key} pos="relative">
        <Image
          src={preview ?? undefined}
          alt={name}
          h={96}
          radius="md"
          fit="cover"
          onClick={onOpen}
          style={{ border: "1px solid var(--app-border)", cursor: onOpen ? "zoom-in" : undefined }}
        />
        <ActionIcon
          variant="default"
          size="sm"
          radius="xl"
          pos="absolute"
          top={6}
          right={6}
          aria-label={`Remove ${name}`}
          onClick={onRemove}
        >
          <IconX size={12} />
        </ActionIcon>
        <Text size="xs" c="dimmed" truncate mt={4}>
          {name}
        </Text>
      </Box>
    ) : (
      <Paper key={key} withBorder radius="md" px="sm" py={6}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <IconFile size={16} />
            <Box style={{ minWidth: 0 }}>
              {onOpen ? (
                <Anchor component="button" type="button" size="sm" onClick={onOpen} style={{ display: "block", maxWidth: "100%" }}>
                  <Text span size="sm" truncate>
                    {name}
                  </Text>
                </Anchor>
              ) : (
                <Text size="sm" truncate>
                  {name}
                </Text>
              )}
              {detail && (
                <Text size="xs" c="dimmed">
                  {detail}
                </Text>
              )}
            </Box>
          </Group>
          <ActionIcon size="sm" aria-label={`Remove ${name}`} onClick={onRemove}>
            <IconX size={14} />
          </ActionIcon>
        </Group>
      </Paper>
    );

  return (
    <Input.Wrapper id={id} label={columnLabel(column)} withAsterisk={Boolean(column.required)} error={error}>
      <Stack gap="sm" mt={4}>
        {(multiple || !hasFiles) && (
          <FileButton onChange={(f) => add(Array.isArray(f) ? f : f ? [f] : [])} accept={accept} multiple={multiple}>
            {(props) => (
              <UnstyledButton
                {...props}
                id={`${id}-upload`}
                aria-describedby={error ? `${id}-error` : undefined}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "18px 16px",
                  borderRadius: "var(--mantine-radius-md)",
                  border: `1px dashed ${
                    error
                      ? "var(--mantine-color-error)"
                      : dragging
                        ? "var(--mantine-primary-color-filled)"
                        : "var(--mantine-color-default-border)"
                  }`,
                  background: dragging ? "var(--mantine-primary-color-light)" : "var(--app-muted)",
                }}
              >
                <Group gap="sm" justify="center" wrap="nowrap">
                  <ThemeIcon variant="light" radius="xl" size={34} aria-hidden>
                    {isImage ? <IconPhoto size={18} /> : <IconUpload size={18} />}
                  </ThemeIcon>
                  <Box>
                    <Text size="sm" fw={500}>
                      Click to upload {noun}
                    </Text>
                    <Text size="xs" c="dimmed">
                      or drag and drop {multiple ? "them" : "it"} here
                    </Text>
                  </Box>
                </Group>
              </UnstyledButton>
            )}
          </FileButton>
        )}

        {hasFiles &&
          (isImage ? (
            <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing="sm">
              {existing.map((url, i) =>
                tile(url, fileNameFromUrl(url), fileUrl(url), "", () => onRemoveExisting(url), () => openFiles(existing.map((u) => ({ url: u })), i))
              )}
              {pending.map((file, i) =>
                tile(`p-${i}-${file.name}`, file.name, previews[i], bytes(file.size), () => onRemovePending(i))
              )}
            </SimpleGrid>
          ) : (
            <Stack gap={6}>
              {existing.map((url, i) =>
                tile(url, fileNameFromUrl(url), null, "Uploaded", () => onRemoveExisting(url), () => openFiles(existing.map((u) => ({ url: u })), i))
              )}
              {pending.map((file, i) =>
                tile(`p-${i}-${file.name}`, file.name, null, `${bytes(file.size)} · uploads when you save`, () =>
                  onRemovePending(i)
                )
              )}
            </Stack>
          ))}

        {!multiple && hasFiles && (
          <FileButton onChange={(f) => add(f ? [f] : [])} accept={accept}>
            {(props) => (
              <Tooltip label={`Replace ${noun}`}>
                <UnstyledButton {...props} fz="sm" c="var(--mantine-color-anchor)" w="fit-content">
                  Replace
                </UnstyledButton>
              </Tooltip>
            )}
          </FileButton>
        )}
      </Stack>
    </Input.Wrapper>
  );
}
