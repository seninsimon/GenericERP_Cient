import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Group, Input, Stack, Text, Textarea, UnstyledButton } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";

import { checkFormula, errorMessage } from "../../api/api";
import { useSchema } from "../../api/reactQueryHooks/useTables";
import { columnLabel, type RecordColumn, type TableSchemaInfo } from "../../features/records/schema";
import { formatDate, formatNumber } from "../../lib/format";

// Columns a formula can use
const USABLE = ["text", "textarea", "number", "date", "boolean", "autonumber", "formula"];
const KIND: Record<string, string> = { number: "a number", text: "text", date: "a date", boolean: "yes / no" };

const showSample = (type: string, value: unknown) =>
  value === null || value === undefined || value === ""
    ? "empty"
    : type === "number"
      ? formatNumber(value)
      : type === "date"
        ? formatDate(value)
        : type === "boolean"
          ? value
            ? "Yes"
            : "No"
          : `"${String(value)}"`;

// The "Formula" field in the column settings: the expression, buttons that
// insert a field, and a live check (is it valid, what does it give on the
// latest record) as you type.
export function FormulaEditor({
  table,
  columnName,
  value,
  onChange,
  error,
}: {
  table: string;
  columnName?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const schema = useSchema(table).data as TableSchemaInfo | undefined;
  const usable = (schema?.columns ?? []).filter(
    (c: RecordColumn) => c.name !== columnName && (USABLE.includes(c.type) || (c.type === "choice" && !c.multiple))
  );

  const [debounced] = useDebouncedValue(value, 500);
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    let active = true;
    if (!debounced.trim()) return;
    checkFormula(table, debounced, columnName)
      .then(({ data }) => {
        if (!active) return;
        const sample = data.hasRecords ? ` On the latest record: ${showSample(data.type, data.sample)}.` : "";
        setCheck({ ok: true, text: `Gives ${KIND[data.type] ?? data.type}.${sample}` });
      })
      .catch((err) => active && setCheck({ ok: false, text: errorMessage(err, "This formula has a problem") }));
    return () => {
      active = false;
    };
  }, [debounced, table, columnName]);

  // put {field} where the cursor is, then the cursor right after it (set as
  // soon as the new text is on screen, before the next key press)
  const caret = useRef<number | null>(null);
  const insert = (name: string) => {
    const el = ref.current;
    const token = `{${name}}`;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    caret.current = start + token.length;
    onChange(value.slice(0, start) + token + value.slice(end));
  };
  useLayoutEffect(() => {
    if (caret.current === null || !ref.current) return;
    ref.current.focus();
    ref.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [value]);

  return (
    <Stack gap={6}>
      <Textarea
        ref={ref}
        label="Formula"
        withAsterisk
        description="Use {field} for a field, + − * / and ROUND, MIN, MAX, ABS, IF, DAYS, ADD_DAYS, CONCAT, BLANK"
        placeholder="e.g. {basic} + {allowances} - {deductions}"
        autosize
        minRows={2}
        maxRows={6}
        styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        error={error}
      />
      {usable.length > 0 && (
        <Input.Wrapper label="Insert a field" labelProps={{ size: "xs", c: "dimmed", fw: 500 }}>
          <Group gap={6} mt={4}>
            {usable.map((c) => (
              <UnstyledButton
                key={c.name}
                onClick={() => insert(c.name)}
                px={8}
                py={2}
                fz="xs"
                style={{ border: "1px solid var(--app-border)", borderRadius: "var(--mantine-radius-sm)" }}
                aria-label={`Insert ${columnLabel(c)}`}
              >
                {columnLabel(c)}
              </UnstyledButton>
            ))}
          </Group>
        </Input.Wrapper>
      )}
      <Text size="xs" c="dimmed">
        Examples: <code>{"{qty} * {rate}"}</code> · <code>{"DAYS({to}, {from}) + 1"}</code> ·{" "}
        <code>{'IF({stock} < {reorder_level}, "Low", "")'}</code>
      </Text>
      {check && value.trim() && !error && (
        <Group gap={6} wrap="nowrap" align="flex-start">
          {check.ok ? (
            <IconCircleCheck size={16} color="var(--mantine-color-teal-6)" style={{ flexShrink: 0, marginTop: 2 }} />
          ) : (
            <IconAlertCircle size={16} color="var(--mantine-color-error)" style={{ flexShrink: 0, marginTop: 2 }} />
          )}
          <Text size="sm" c={check.ok ? undefined : "var(--mantine-color-error)"}>
            {check.text}
          </Text>
        </Group>
      )}
    </Stack>
  );
}
