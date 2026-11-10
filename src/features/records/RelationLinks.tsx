import { Anchor, Skeleton, Text } from "@mantine/core";
import { Link } from "react-router-dom";

import { useRelationNames } from "../../api/reactQueryHooks/useRecords";
import { EMPTY } from "../../components/ui/FieldValue";
import { recordPath } from "../../layout/nav";
import type { RecordColumn } from "./schema";

// Linked records on the detail page: names, as links when the user can open
// the linked table.
export function RelationLinks({
  column,
  value,
  canOpen,
}: {
  column: RecordColumn;
  value: unknown;
  canOpen: boolean;
}) {
  const ids = (Array.isArray(value) ? value : value ? [value] : []).map(String).filter(Boolean);
  const { data, isLoading } = useRelationNames(column.ref, ids, column.displayField);

  if (!ids.length) return EMPTY;
  if (isLoading) return <Skeleton h={20} w={120} />;

  const names = new Map((data ?? []).map((o) => [o.value, o.label]));
  // comma-separated, so several linked names don't run together
  return (
    <Text component="div" size="sm" style={{ overflowWrap: "anywhere" }}>
      {ids.map((id, i) => {
        const name = names.get(id);
        const separator = i < ids.length - 1 ? ", " : "";
        if (!name) {
          return (
            <Text key={id} span c="dimmed" inherit>
              Unavailable record{separator}
            </Text>
          );
        }
        return (
          <span key={id}>
            {canOpen && column.ref ? (
              <Anchor component={Link} to={recordPath(column.ref, id)} inherit>
                {name}
              </Anchor>
            ) : (
              name
            )}
            {separator}
          </span>
        );
      })}
    </Text>
  );
}
