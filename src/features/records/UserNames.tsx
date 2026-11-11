import { Avatar, Group, Skeleton, Text } from "@mantine/core";

import { useUserNames } from "../../api/reactQueryHooks/useRecords";
import { EMPTY } from "../../components/ui/FieldValue";

// People on the detail page ("User" columns): avatar initials + name.
export function UserNames({ value }: { value: unknown }) {
  const ids = (Array.isArray(value) ? value : value ? [value] : []).map(String).filter(Boolean);
  const { data, isLoading } = useUserNames(ids);

  if (!ids.length) return EMPTY;
  if (isLoading) return <Skeleton h={22} w={120} />;

  const byId = new Map((data ?? []).map((o) => [o.value, o]));
  return (
    <Group gap="sm" wrap="wrap">
      {ids.map((id) => {
        const person = byId.get(id);
        const name = person?.label ?? "Deleted user";
        return (
          <Group key={id} gap={6} wrap="nowrap">
            <Avatar size={22} radius="xl" color="initials" name={name} />
            <Text size="sm" c={person?.isActive === false ? "dimmed" : undefined}>
              {name}
              {person && !person.isActive && person.username ? " (deactivated)" : ""}
            </Text>
          </Group>
        );
      })}
    </Group>
  );
}
