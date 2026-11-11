import { Badge, Group, Skeleton } from "@mantine/core";

import { useDepartmentOptions } from "../../api/reactQueryHooks/useRecords";
import { EMPTY } from "../../components/ui/FieldValue";

// "Department" column values on the detail page.
export function DepartmentNames({ value }: { value: unknown }) {
  const ids = (Array.isArray(value) ? value : value ? [value] : []).map(String).filter(Boolean);
  const { data, isLoading } = useDepartmentOptions();
  if (!ids.length) return EMPTY;
  if (isLoading) return <Skeleton h={20} w={100} />;
  const names = new Map((data ?? []).map((o) => [o.value, o.label]));
  return (
    <Group gap={4} wrap="wrap">
      {ids.map((id) => (
        <Badge key={id} variant="default" c={names.has(id) ? undefined : "dimmed"}>
          {names.get(id) ?? "Deleted department"}
        </Badge>
      ))}
    </Group>
  );
}
