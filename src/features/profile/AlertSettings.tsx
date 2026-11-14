import { useState } from "react";
import { Alert, Button, Group, Stack, Switch, Text } from "@mantine/core";
import { IconBellRinging, IconInfoCircle } from "@tabler/icons-react";

import { Section } from "../../components/ui/Page";
import { askDesktopPermission, desktopPermission, desktopSupport, playAction, playChime, showDesktop } from "../../lib/alerts";
import { usePreferences } from "../../lib/preferences";

// My profile → Alerts: a chime and desktop notifications for things that need
// you (your bell, direct messages, mentions). Saved on this device.
export function AlertSettings() {
  const { sound, desktopAlerts, actionSounds, setPreference } = usePreferences();
  const support = desktopSupport();
  const [permission, setPermission] = useState(desktopPermission());
  const desktopActive = desktopAlerts && permission === "granted";

  const toggleDesktop = async (on: boolean) => {
    if (!on) {
      setPreference("desktopAlerts", false);
      return;
    }
    const result = await askDesktopPermission();
    setPermission(result);
    setPreference("desktopAlerts", result === "granted");
  };

  // each sound in turn, so people hear what they've switched on
  const test = () => {
    let at = 0;
    if (sound) {
      playChime(true);
      at += 900;
    }
    if (actionSounds) {
      setTimeout(() => playAction("success", true), at);
      setTimeout(() => playAction("delete", true), at + 600);
      setTimeout(() => playAction("error", true), at + 1200);
    }
    if (desktopActive) showDesktop("Zenin notifications work", "This is how a new message or request will look.", undefined, true);
  };

  return (
    <Section title="Sounds and alerts" description="Saved on this device.">
      <Stack gap="lg">
        <Switch
          label="Play a sound"
          description="A soft chime when something needs you: your bell, a direct message, a mention."
          checked={sound}
          onChange={(e) => setPreference("sound", e.currentTarget.checked)}
        />
        <Switch
          label="Sounds for my actions"
          description="A short sound when you save, add or delete something, and a low one if it didn't work."
          checked={actionSounds}
          onChange={(e) => setPreference("actionSounds", e.currentTarget.checked)}
        />
        <Stack gap={6}>
          <Switch
            label="Desktop notifications"
            description="A pop-up from your computer when Zenin is in the background. Clicking it opens the request or conversation."
            checked={desktopActive}
            disabled={support !== "ok" || permission === "denied"}
            onChange={(e) => void toggleDesktop(e.currentTarget.checked)}
          />
          {support === "insecure" && (
            <Alert variant="light" color="yellow" icon={<IconInfoCircle size={16} />} p="xs">
              <Text size="xs">Browsers only allow desktop notifications on a secure address (https://). Open Zenin through its https address to use them.</Text>
            </Alert>
          )}
          {support === "unsupported" && (
            <Text size="xs" c="dimmed">
              This browser doesn't support desktop notifications.
            </Text>
          )}
          {permission === "denied" && (
            <Alert variant="light" color="yellow" icon={<IconInfoCircle size={16} />} p="xs">
              <Text size="xs">
                Notifications are blocked for this site in your browser. Allow them in the browser's site settings (the icon left of the address), then reload.
              </Text>
            </Alert>
          )}
        </Stack>
        <Group>
          <Button variant="default" size="xs" leftSection={<IconBellRinging size={14} />} onClick={test} disabled={!sound && !actionSounds && !desktopActive}>
            Test
          </Button>
        </Group>
      </Stack>
    </Section>
  );
}
