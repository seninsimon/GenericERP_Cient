import { ActionIcon, Button, Checkbox, Divider, Group, Popover, ScrollArea, SegmentedControl, Stack, Text, Tooltip } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import type { DataTableColumn, Density } from "./types";
import type { TablePrefs } from "./useTablePrefs";

// "View" menu: density and which columns are shown, in what order.
export function ViewOptions<T>({
  columns,
  isVisible,
  prefs,
  update,
  reset,
}: {
  columns: DataTableColumn<T>[];
  isVisible: (c: DataTableColumn<T>) => boolean;
  prefs: TablePrefs;
  update: (patch: Partial<TablePrefs>) => void;
  reset: () => void;
}) {
  const toggle = (column: DataTableColumn<T>, show: boolean) => {
    if (column.hiddenByDefault) {
      const shown = new Set(prefs.shown);
      if (show) shown.add(column.id);
      else shown.delete(column.id);
      update({ shown: [...shown] });
    } else {
      const hidden = new Set(prefs.hidden);
      if (show) hidden.delete(column.id);
      else hidden.add(column.id);
      update({ hidden: [...hidden] });
    }
  };

  const move = (index: number, delta: number) => {
    const order = columns.map((c) => c.id);
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    update({ order });
  };

  return (
    <Popover position="bottom-end" width={280}>
      <Popover.Target>
        <Tooltip label="View options">
          <ActionIcon variant="default" size="lg" aria-label="View options: density and columns">
            <IconAdjustmentsHorizontal size={18} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <Stack gap="sm">
          <div>
            <Text size="xs" fw={600} c="dimmed" mb={6}>
              Density
            </Text>
            <SegmentedControl
              fullWidth
              size="xs"
              value={prefs.density}
              onChange={(v) => update({ density: v as Density })}
              data={[
                { value: "compact", label: "Compact" },
                { value: "comfortable", label: "Comfortable" },
              ]}
            />
          </div>
          <Divider />
          <div>
            <Text size="xs" fw={600} c="dimmed" mb={6}>
              Columns
            </Text>
            <ScrollArea.Autosize mah={280} type="auto">
              <Stack gap={2}>
                {columns.map((column, index) => (
                  <Group key={column.id} justify="space-between" wrap="nowrap" gap={4}>
                    <Checkbox
                      size="xs"
                      label={column.header}
                      checked={isVisible(column)}
                      disabled={column.hideable === false}
                      onChange={(e) => toggle(column, e.currentTarget.checked)}
                      styles={{ label: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 } }}
                    />
                    <Group gap={0} wrap="nowrap">
                      <ActionIcon
                        size="sm"
                        aria-label={`Move ${column.header} up`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <IconChevronUp size={14} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        aria-label={`Move ${column.header} down`}
                        disabled={index === columns.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <IconChevronDown size={14} />
                      </ActionIcon>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          </div>
          <Button variant="subtle" color="gray" size="xs" onClick={reset}>
            Reset to default
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
