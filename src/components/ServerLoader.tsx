// components/ServerLoader.tsx
import { useEffect, useState } from "react";
import { Center, Loader, Text, Stack, Progress } from "@mantine/core";
import { getHealth } from "../api/api";

export default function ServerLoader({ children }: any) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    let interval: any;

    const startChecking = async () => {
      // Fake progress animation
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 1000);

      try {
        await getHealth(); // your backend ping
        setProgress(100);
        setTimeout(() => setLoading(false), 500);
      } catch {
        console.log("Waiting for backend...");
      } finally {
        clearInterval(interval);
      }
    };

    startChecking();

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Center style={{ height: "100vh", flexDirection: "column" }}>
        <Stack align="center" >
          <Loader size="lg" />
          <Text size="lg" fw={500}>
            Server is waking up...
          </Text>
          <Text size="sm" c="dimmed">
            This may take up to 1–2 minutes (Render cold start)
          </Text>
          <Progress value={progress} style={{ width: 250 }} />
          <Text size="sm">{progress}%</Text>
        </Stack>
      </Center>
    );
  }

  return children;
}