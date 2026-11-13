import { useState } from "react";
import { ActionIcon, Anchor, Avatar, FileButton, Indicator, Stack, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCamera } from "@tabler/icons-react";

import { errorMessage, updateProfile, uploadFiles } from "../../api/api";
import { useCurrentUser } from "../../auth/AuthContext";
import { initialsOf } from "../../layout/UserMenu";
import { fileUrl } from "../../lib/format";
import { resizeImage } from "../../lib/images";

// My profile: your picture (shown in the top bar). Made into a 256 px square
// in the browser, so it uploads fast and stays small.
export function ProfilePicture({ size = 72 }: { size?: number }) {
  const { user, refresh } = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const name = user.fullName || user.username;

  const save = async (avatarUrl: string, message: string) => {
    await updateProfile({ avatarUrl });
    await refresh();
    notifications.show({ message, color: "green" });
  };
  const pick = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const small = await resizeImage(file, { size: 256, square: true });
      const { data } = await uploadFiles([small]);
      await save((data as { url: string }[])[0].url, "Picture updated");
    } catch (err) {
      notifications.show({ title: "Couldn't change the picture", message: errorMessage(err), color: "red" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap={4} align="center" style={{ flexShrink: 0 }}>
      <FileButton onChange={pick} accept="image/png,image/jpeg,image/webp,image/gif">
        {(props) => (
          <Indicator
            position="bottom-end"
            offset={8}
            size={26}
            withBorder
            label={
              <Tooltip label="Change picture">
                <ActionIcon {...props} size={26} radius="xl" variant="filled" loading={busy} aria-label="Change picture">
                  <IconCamera size={14} />
                </ActionIcon>
              </Tooltip>
            }
            styles={{ indicator: { padding: 0, background: "transparent" } }}
          >
            <Avatar
              {...props}
              component="button"
              size={size}
              radius="xl"
              color="initials"
              name={name}
              src={user.avatarUrl ? fileUrl(user.avatarUrl) : undefined}
              alt={name}
              style={{ cursor: "pointer" }}
            >
              {initialsOf(name)}
            </Avatar>
          </Indicator>
        )}
      </FileButton>
      {user.avatarUrl && (
        <Anchor component="button" size="xs" c="dimmed" disabled={busy} onClick={() => save("", "Picture removed")}>
          Remove
        </Anchor>
      )}
    </Stack>
  );
}
