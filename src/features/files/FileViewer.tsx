import { useEffect, useState } from "react";
import { ActionIcon, Box, Button, Center, Group, Loader, Modal, ScrollArea, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconChevronLeft, IconChevronRight, IconDownload, IconFile, IconX } from "@tabler/icons-react";

import { closeFiles, downloadFile, fetchBlob, kindOf, nameOf, showFile, srcOf, useViewerState, type ViewerFile } from "./viewerStore";

// The in-app file viewer: images large with previous / next, PDFs inside the
// app, video and audio players, text files as text, and a download for
// anything else. Mounted once (AppLayout); opened with openFiles().

const MAX_TEXT = 500_000; // characters shown of a text file

// PDFs and text are fetched with the sign-in cookie and shown from memory:
// opening the raw upload in a tab is blocked by its security header.
function useBlobContent(file: ViewerFile, as: "url" | "text" | null) {
  const [result, setResult] = useState<{ key: string; url?: string; text?: string; error?: string } | null>(null);
  const key = `${as}:${file.url}`;
  useEffect(() => {
    if (!as) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    fetchBlob(file.url)
      .then(async (blob) => {
        if (cancelled) return;
        if (as === "url") {
          objectUrl = URL.createObjectURL(blob);
          setResult({ key, url: objectUrl });
        } else {
          const text = await blob.text();
          if (!cancelled) setResult({ key, text: text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}\n…` : text });
        }
      })
      .catch((err: Error) => !cancelled && setResult({ key, error: err.message }));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.url, as, key]);
  return result?.key === key ? result : null;
}

function Preview({ file }: { file: ViewerFile }) {
  const name = nameOf(file);
  const kind = kindOf(name);
  const blob = useBlobContent(file, kind === "pdf" ? "url" : kind === "text" ? "text" : null);
  const [broken, setBroken] = useState<string | null>(null);

  if (kind === "image") {
    return broken === file.url ? (
      <NoPreview name={name} file={file} message="This picture couldn't be loaded." />
    ) : (
      <Center h="100%">
        <img
          src={srcOf(file.url)}
          alt={name}
          onError={() => setBroken(file.url)}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", borderRadius: 6 }}
        />
      </Center>
    );
  }
  if (kind === "video") {
    return (
      <Center h="100%">
        <video src={srcOf(file.url)} controls style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
      </Center>
    );
  }
  if (kind === "audio") {
    return (
      <Center h="100%">
        <audio src={srcOf(file.url)} controls style={{ width: "min(480px, 100%)" }} />
      </Center>
    );
  }
  if (kind === "pdf" || kind === "text") {
    if (!blob) {
      return (
        <Center h="100%">
          <Loader />
        </Center>
      );
    }
    if (blob.error) return <NoPreview name={name} file={file} message={blob.error} />;
    if (kind === "pdf") return <iframe src={blob.url} title={name} style={{ width: "100%", height: "100%", border: 0, borderRadius: 6, background: "white" }} />;
    return (
      <ScrollArea h="100%" type="auto">
        <Box component="pre" m={0} p="md" fz="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--mantine-font-family-monospace)" }}>
          {blob.text}
        </Box>
      </ScrollArea>
    );
  }
  const ext = name.split(".").pop()?.toUpperCase();
  return <NoPreview name={name} file={file} message={ext && ext !== name.toUpperCase() ? `There's no preview for ${ext} files.` : "There's no preview for this file."} />;
}

function NoPreview({ name, file, message }: { name: string; file: ViewerFile; message: string }) {
  return (
    <Center h="100%">
      <Stack align="center" gap="sm" maw={360} ta="center">
        <ThemeIcon size={56} radius="xl" variant="light" color="gray">
          <IconFile size={28} />
        </ThemeIcon>
        <Text fw={600} style={{ overflowWrap: "anywhere" }}>
          {name}
        </Text>
        <Text size="sm" c="dimmed">
          {message}
        </Text>
        <DownloadButton file={file} variant="filled" />
      </Stack>
    </Center>
  );
}

function DownloadButton({ file, variant = "default" }: { file: ViewerFile; variant?: "default" | "filled" }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="xs"
      variant={variant}
      leftSection={<IconDownload size={14} />}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadFile(file);
        } catch (err) {
          notifications.show({ title: "Couldn't download", message: (err as Error).message, color: "red" });
        } finally {
          setBusy(false);
        }
      }}
    >
      Download
    </Button>
  );
}

export function FileViewer() {
  const state = useViewerState();
  const phone = useMediaQuery("(max-width: 48em)");
  const many = (state?.files.length ?? 0) > 1;

  // ← / → between files
  useEffect(() => {
    if (!state || state.files.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") showFile(state.index - 1);
      if (e.key === "ArrowRight") showFile(state.index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  const file = state?.files[state.index];
  return (
    <Modal
      opened={Boolean(state)}
      onClose={closeFiles}
      fullScreen={phone}
      size="min(1100px, 94vw)"
      centered
      withCloseButton={false}
      padding={0}
      radius="md"
      zIndex={400}
    >
      {file && state && (
        <Stack gap={0} h={phone ? "100dvh" : "86vh"}>
          <Group justify="space-between" wrap="nowrap" px="md" py="sm" style={{ borderBottom: "1px solid var(--app-border)" }}>
            <Box style={{ minWidth: 0 }}>
              <Text fw={600} size="sm" truncate>
                {nameOf(file)}
              </Text>
              {many && (
                <Text size="xs" c="dimmed">
                  {state.index + 1} of {state.files.length}
                </Text>
              )}
            </Box>
            <Group gap="xs" wrap="nowrap">
              <DownloadButton file={file} />
              <ActionIcon variant="subtle" color="gray" onClick={closeFiles} aria-label="Close">
                <IconX size={18} />
              </ActionIcon>
            </Group>
          </Group>
          <Box pos="relative" style={{ flex: 1, minHeight: 0 }} p={kindOf(nameOf(file)) === "text" ? 0 : "md"} bg="var(--app-bg)">
            <Preview key={file.url} file={file} />
            {many && (
              <>
                <Tooltip label="Previous (←)">
                  <ActionIcon size="xl" radius="xl" variant="default" pos="absolute" left={12} top="50%" style={{ transform: "translateY(-50%)", boxShadow: "var(--mantine-shadow-sm)" }} onClick={() => showFile(state.index - 1)} aria-label="Previous file">
                    <IconChevronLeft size={22} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Next (→)">
                  <ActionIcon size="xl" radius="xl" variant="default" pos="absolute" right={12} top="50%" style={{ transform: "translateY(-50%)", boxShadow: "var(--mantine-shadow-sm)" }} onClick={() => showFile(state.index + 1)} aria-label="Next file">
                    <IconChevronRight size={22} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
          </Box>
        </Stack>
      )}
    </Modal>
  );
}
