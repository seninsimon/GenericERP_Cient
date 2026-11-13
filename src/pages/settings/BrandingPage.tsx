import { useState } from "react";
import { Anchor, Box, Button, FileButton, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUpload } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import api, { errorMessage, uploadFiles } from "../../api/api";
import { BrandMark } from "../../components/ui/BrandMark";
import { Page, PageHeader, Section } from "../../components/ui/Page";
import { useBranding } from "../../lib/branding";
import { resizeImage } from "../../lib/images";

// Administration → Branding: the name and logo people see on the sign-in
// page, in the sidebar, the browser tab and emails.
export default function BrandingPage() {
  const qc = useQueryClient();
  const { name, logo } = useBranding();
  const [edit, setEdit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = edit ?? name;

  const save = async (body: { name?: string; logoUrl?: string }, message: string) => {
    setSaving(true);
    try {
      await api.put("/branding", body);
      await qc.invalidateQueries({ queryKey: ["branding"] });
      setEdit(null);
      setError(null);
      notifications.show({ message, color: "green" });
    } catch (err) {
      const fieldError = (err as { response?: { data?: { errors?: { name?: string } } } }).response?.data?.errors?.name;
      if (fieldError) setError(errorMessage(err));
      else notifications.show({ title: "Couldn't save", message: errorMessage(err), color: "red" });
    } finally {
      setSaving(false);
    }
  };
  const upload = async (file: File | null) => {
    if (!file) return;
    setSaving(true);
    try {
      const small = await resizeImage(file, { size: 512, square: false });
      const { data } = await uploadFiles([small]);
      setSaving(false);
      await save({ logoUrl: (data as { url: string }[])[0].url }, "Logo updated");
    } catch (err) {
      setSaving(false);
      notifications.show({ title: "Couldn't upload the logo", message: errorMessage(err), color: "red" });
    }
  };

  return (
    <Page title="Branding" breadcrumbs={[{ label: "Administration" }, { label: "Branding" }]} width="wide">
      <PageHeader title="Branding" description="Your organization's name and logo: on the sign-in page, in the sidebar, the browser tab and emails." />
      <Stack gap="lg">
        <Section title="Name">
          <Group align="flex-start" maw={560} wrap="nowrap">
            <TextInput
              style={{ flex: 1 }}
              aria-label="Name"
              placeholder="e.g. Acme Works"
              value={value}
              maxLength={40}
              error={error}
              onChange={(e) => {
                setEdit(e.currentTarget.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && value.trim() && value !== name && save({ name: value }, "Name saved")}
            />
            <Button onClick={() => save({ name: value }, "Name saved")} loading={saving} disabled={!value.trim() || value.trim() === name}>
              Save
            </Button>
          </Group>
        </Section>

        <Section title="Logo" description="A square or wide image, PNG, JPG, WebP or SVG. Without one, the name's first letter is shown.">
          <Group gap="md">
            <FileButton onChange={upload} accept="image/png,image/jpeg,image/webp,image/svg+xml">
              {(props) => (
                <Button {...props} variant="default" leftSection={<IconUpload size={16} />} loading={saving}>
                  {logo ? "Change logo" : "Upload logo"}
                </Button>
              )}
            </FileButton>
            {logo && (
              <Anchor component="button" size="sm" c="red" onClick={() => save({ logoUrl: "" }, "Logo removed")} disabled={saving}>
                Remove logo
              </Anchor>
            )}
          </Group>
        </Section>

        <Section title="Preview">
          <Group gap="xl" align="flex-start">
            <Stack gap={6}>
              <Text size="xs" c="dimmed">
                Sidebar
              </Text>
              <Paper withBorder radius="md" p="md" w={260}>
                <BrandMark size={30} />
              </Paper>
            </Stack>
            <Stack gap={6}>
              <Text size="xs" c="dimmed">
                Sign-in page
              </Text>
              <Paper withBorder radius="md" p="lg" w={300}>
                <BrandMark size={36} nameSize="lg" />
                <Box mt="md" h={8} w="60%" bg="var(--app-border)" style={{ borderRadius: 4 }} />
                <Box mt={8} h={8} w="40%" bg="var(--app-border)" style={{ borderRadius: 4 }} />
              </Paper>
            </Stack>
          </Group>
        </Section>
      </Stack>
    </Page>
  );
}
