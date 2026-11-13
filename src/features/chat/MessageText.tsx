import { Fragment } from "react";
import { Anchor, Group, Paper, Text, ThemeIcon } from "@mantine/core";
import { IconTable } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getSingleData } from "../../api/api";
import { useCurrentUser } from "../../auth/AuthContext";
import { recordPath, tableTitle } from "../../layout/nav";
import { useSchema } from "../../api/reactQueryHooks/useTables";
import { recordTitle, type RecordColumn } from "../records/schema";

// A message's text: @mentions highlighted (yours stronger), links clickable,
// and links to a record in Zenin shown as a small card under the text.

const RECORD_LINK = /\/table\/([\w-]+)\/([\w-]{8,})(?:[/?#][^\s]*)?$/;
const TOKEN = /(https?:\/\/[^\s<]+|@[A-Za-z0-9._-]{3,50})/g;

const recordOf = (url: string) => {
  try {
    const u = new URL(url);
    if (u.origin !== window.location.origin) return null;
    const m = RECORD_LINK.exec(u.pathname);
    return m && m[2] !== "new" ? { table: m[1], id: m[2] } : null;
  } catch {
    return null;
  }
};

export function MessageText({ body }: { body: string }) {
  const { user } = useCurrentUser();
  // just a link to a record: the card alone says it better than the long address
  const only = recordOf(body.trim());
  if (only && !/\s/.test(body.trim())) return <RecordCard table={only.table} id={only.id} />;
  const records: { table: string; id: string }[] = [];
  const parts = body.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    if (part.startsWith("@")) {
      const me = part.slice(1).toLowerCase() === user.username.toLowerCase();
      return (
        <Text key={i} span fw={600} c={me ? undefined : "var(--mantine-primary-color-filled)"} bg={me ? "var(--mantine-color-yellow-light)" : undefined} px={me ? 2 : 0} style={{ borderRadius: 4 }}>
          {part}
        </Text>
      );
    }
    const rec = recordOf(part);
    if (rec && records.length < 3) records.push(rec);
    return (
      <Anchor key={i} href={part} target={rec ? undefined : "_blank"} rel="noopener noreferrer" inherit>
        {part}
      </Anchor>
    );
  });
  return (
    <>
      <Text size="sm" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {parts}
      </Text>
      {records.map((r) => (
        <RecordCard key={`${r.table}/${r.id}`} table={r.table} id={r.id} />
      ))}
    </>
  );
}

// A linked record: its name and table (only if you can see it).
function RecordCard({ table, id }: { table: string; id: string }) {
  const schema = useSchema(table);
  const { data, isError } = useQuery({
    queryKey: ["singleData", table, id],
    queryFn: async () => (await getSingleData(table, id)).data as Record<string, unknown>,
    retry: false,
    staleTime: 60_000,
  });
  const columns = ((schema.data as { columns?: RecordColumn[] } | undefined)?.columns ?? []) as RecordColumn[];
  const inner = (
    <Group gap="sm" wrap="nowrap">
      <ThemeIcon variant="light" size={30} radius="md" aria-hidden>
        <IconTable size={16} />
      </ThemeIcon>
      <div style={{ minWidth: 0 }}>
        <Text size="sm" fw={600} truncate>
          {isError ? "A record you can't open" : data ? recordTitle(columns, data) : "…"}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {tableTitle(table)}
        </Text>
      </div>
    </Group>
  );
  const style = { display: "block", textDecoration: "none", color: "inherit" } as const;
  return isError ? (
    <Paper withBorder radius="md" p="xs" mt={6} maw={420} style={style}>
      {inner}
    </Paper>
  ) : (
    <Paper withBorder radius="md" p="xs" mt={6} maw={420} component={Link} to={recordPath(table, id)} style={style}>
      {inner}
    </Paper>
  );
}
