import { Button, Group } from "@mantine/core";
import { IconArrowLeft, IconHome, IconMapPinOff } from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";

import { EmptyState } from "../components/ui/EmptyState";
import { Page } from "../components/ui/Page";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Page title="Page not found" breadcrumbs={[{ label: "Page not found" }]} width="narrow">
      <EmptyState
        icon={<IconMapPinOff size={26} stroke={1.5} />}
        title="Page not found"
        description="The page you're looking for doesn't exist, or you don't have access to it."
        action={
          <Group gap="xs" justify="center">
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate(-1)}>
              Go back
            </Button>
            <Button component={Link} to="/" leftSection={<IconHome size={16} />}>
              Go home
            </Button>
          </Group>
        }
      />
    </Page>
  );
}
