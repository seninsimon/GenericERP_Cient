import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Box, Button, Center, Group, Progress, Stack, Text, ThemeIcon } from "@mantine/core";
import { getHealth } from "../api/api";

const SLOW_AFTER_MS = 15_000;

// Splash shown until the API answers. Retries automatically with backoff
// (3 s → 10 s); after ~15 s it explains and offers "Retry now".
export default function ServerLoader({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delay = useRef(3000);

  const check = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    setChecking(true);
    try {
      await getHealth();
      setReady(true);
    } catch {
      timer.current = setTimeout(check, delay.current);
      delay.current = Math.min(delay.current * 1.5, 10_000);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => {
      clearTimeout(slowTimer);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [check]);

  if (ready) return <>{children}</>;

  return (
    <Center mih="100dvh" bg="var(--app-bg)" p="md">
      <Stack align="center" gap="lg" maw={360} w="100%" role="status" aria-live="polite">
        <Group gap={10}>
          <ThemeIcon size={40} radius="md" variant="filled" aria-hidden>
            <Text fw={800} fz={20} c="white">
              Z
            </Text>
          </ThemeIcon>
          <Text fw={700} fz="xl">
            Zenin ERP
          </Text>
        </Group>
        <Box w="100%">
          <Progress value={100} animated size="xs" aria-label="Connecting" />
        </Box>
        <Text size="sm" c="dimmed" ta="center">
          Connecting…
        </Text>
        {slow && (
          <Stack align="center" gap="xs">
            <Text size="sm" c="dimmed" ta="center">
              This is taking longer than usual. The server may be starting up or unreachable. We'll keep trying.
            </Text>
            <Button variant="default" size="xs" loading={checking} onClick={() => {
              delay.current = 3000;
              check();
            }}>
              Retry now
            </Button>
          </Stack>
        )}
      </Stack>
    </Center>
  );
}
