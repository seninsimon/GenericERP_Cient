import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Button, Center, Code, Collapse, Group, Stack, Text, ThemeIcon, Title, UnstyledButton } from "@mantine/core";
import { IconAlertTriangle, IconChevronDown, IconHome, IconRefresh } from "@tabler/icons-react";

type Props = { children: ReactNode };
type State = { error: Error | null; showDetails: boolean };

// Last-resort crash screen for render errors anywhere in the app.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    const { error, showDetails } = this.state;
    if (!error) return this.props.children;

    return (
      <Center mih="100dvh" bg="var(--app-bg)" p="md">
        <Stack align="center" gap="md" maw={480} w="100%" role="alert">
          <ThemeIcon size={52} radius="xl" variant="light" color="red" aria-hidden>
            <IconAlertTriangle size={26} stroke={1.5} />
          </ThemeIcon>
          <Title order={3} ta="center">
            Something went wrong
          </Title>
          <Text size="sm" c="dimmed" ta="center">
            An unexpected error stopped this page from loading. Reloading usually fixes it. Your saved data is safe.
          </Text>
          <Group gap="xs" justify="center">
            <Button variant="default" leftSection={<IconHome size={16} />} component="a" href="/">
              Go home
            </Button>
            <Button leftSection={<IconRefresh size={16} />} onClick={() => window.location.reload()}>
              Reload
            </Button>
          </Group>
          <Box w="100%">
            <UnstyledButton
              onClick={() => this.setState({ showDetails: !showDetails })}
              aria-expanded={showDetails}
              mx="auto"
              display="block"
            >
              <Group gap={4} justify="center">
                <Text size="xs" c="dimmed">
                  Technical details
                </Text>
                <IconChevronDown
                  size={14}
                  style={{ transform: showDetails ? "rotate(180deg)" : undefined, transition: "transform 150ms" }}
                />
              </Group>
            </UnstyledButton>
            <Collapse in={showDetails}>
              <Code block mt="xs" style={{ maxHeight: 240, overflow: "auto" }}>
                {error.message}
                {error.stack ? `\n\n${error.stack}` : ""}
              </Code>
            </Collapse>
          </Box>
        </Stack>
      </Center>
    );
  }
}
