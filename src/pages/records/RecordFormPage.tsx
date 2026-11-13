import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Grid, Group, MultiSelect, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { IconDeviceFloppy, IconPointFilled } from "@tabler/icons-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { errorMessage, uploadFiles } from "../../api/api";
import { fieldErrorsOf, useCreateRecord, useRecord, useUpdateRecord } from "../../api/reactQueryHooks/useRecords";
import { useSchema } from "../../api/reactQueryHooks/useTables";
import { useCurrentUser } from "../../auth/AuthContext";
import { Page, PageHeader, Section } from "../../components/ui/Page";
import { confirmDanger } from "../../components/ui/confirm";
import { recordPath, tablePath, tableTitle } from "../../layout/nav";
import { FieldInput } from "../../features/records/fields/FieldInput";
import { FileInputArea } from "../../features/records/fields/FileInputArea";
import { NoTableAccess, RecordNotFound } from "../../features/records/states";
import { useLineItems } from "../../features/records/lineItems";
import { LineItemsGrid } from "../../features/records/LineItemsGrid";
import { useSavePreview } from "../../features/records/usePreview";
import {
  columnLabel,
  FILE_TYPES,
  FULL_WIDTH_TYPES,
  httpStatus,
  isMissing,
  newRecordValues,
  SERVER_TYPES,
  recordTitle,
  type TableSchemaInfo,
} from "../../features/records/schema";

type Values = Record<string, unknown>;
type Snapshot = { values: Values; departmentIds: string[]; files: Record<string, string[]> };

const asUrls = (value: unknown): string[] =>
  (Array.isArray(value) ? value : value ? [value] : []).filter((v): v is string => typeof v === "string");

export default function RecordFormPage() {
  const { table = "", id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const title = tableTitle(table);
  const listPath = tablePath(table);

  const schemaQuery = useSchema(table);
  const schema = schemaQuery.data as TableSchemaInfo | undefined;
  const recordQuery = useRecord(table, id);
  const record = recordQuery.data;
  const create = useCreateRecord(table);
  const update = useUpdateRecord(table);
  const queryClient = useQueryClient();
  // an invoice's lines etc., edited here and saved with the record
  const lineItems = useLineItems(table, editing ? id : undefined);

  const columns = useMemo(() => schema?.columns ?? [], [schema]);
  const fileColumns = useMemo(() => columns.filter((c) => FILE_TYPES.includes(c.type)), [columns]);

  /* ---------- department ---------- */
  // any of the table's departments (a project for Engineering and Design);
  // the server makes sure one of them is the user's own
  const departmentOptions = useMemo(
    () => (schema?.departments ?? []).map((d) => ({ value: d._id, label: d.name })),
    [schema]
  );
  // "Visible to" is only asked when the table has several departments: with
  // one the record goes there automatically, with none it's admins-only
  const showDepartment = departmentOptions.length > 1;

  /* ---------- form state ---------- */
  const [values, setValues] = useState<Values>({});
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [existingFiles, setExistingFiles] = useState<Record<string, string[]>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState<Snapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const linesWhere = useRef<ReturnType<typeof lineItems.changes>["where"]>({});
  const saved = useRef(false);

  // initialise once the schema (and the record, when editing) are loaded
  useEffect(() => {
    if (!schema || initial || (editing && !record)) return;
    const prefill = (location.state as { prefill?: Values; departmentIds?: string[] } | null) ?? {};
    // editing: the record; duplicating: the copy; new: defaults + ?column=value
    const source: Values = editing
      ? record!
      : (prefill.prefill ?? newRecordValues(schema.columns, user, location.search));

    const nextValues: Values = {};
    const nextFiles: Record<string, string[]> = {};
    for (const column of schema.columns) {
      if (FILE_TYPES.includes(column.type)) nextFiles[column.name] = asUrls(source[column.name]);
      // a copy gets its own number (formulas are worked out again anyway)
      else if (SERVER_TYPES.includes(column.type) && !editing) continue;
      else if (source[column.name] !== undefined) nextValues[column.name] = source[column.name];
    }
    // editing: as saved; a copy, or a record added from a related list: the
    // same departments (those of this table); new: the user's one department
    const onTable = new Set((schema.departments ?? []).map((d) => d._id));
    const mine = schema.allowedDepartments ?? [];
    const inherited = (prefill.departmentIds ?? []).filter((d) => onTable.has(d));
    const nextDepartments = editing
      ? ((record!._departmentIds as string[] | undefined) ?? [record!._departmentId as string | null].filter((d): d is string => Boolean(d)))
      : inherited.length
        ? inherited
        : mine.length === 1
          ? [mine[0]._id]
          : [];

    setValues(nextValues);
    setExistingFiles(nextFiles);
    setDepartmentIds(nextDepartments);
    setInitial({ values: nextValues, departmentIds: nextDepartments, files: nextFiles });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, record, editing, initial, location.state]);

  const dirty =
    Boolean(initial) &&
    (JSON.stringify(values) !== JSON.stringify(initial!.values) ||
      [...departmentIds].sort().join() !== [...initial!.departmentIds].sort().join() ||
      JSON.stringify(existingFiles) !== JSON.stringify(initial!.files) ||
      Object.values(pendingFiles).some((files) => files.length > 0) ||
      lineItems.dirty);

  // formulas, totals and line amounts, worked out live by the server
  const preview = useSavePreview({
    table,
    id: editing ? id : undefined,
    columns,
    values,
    departmentIds,
    lineItems,
    enabled: Boolean(initial) && Boolean(editing ? schema?.permissions?.edit : schema?.permissions?.create),
  });

  // warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (saved.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const clearError = (name: string) =>
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  /* ---------- errors: scroll to and focus the first one ---------- */
  const focusFirstError = useCallback(
    (fieldErrors: Record<string, string>) => {
      const order = ["_departmentId", ...columns.map((c) => c.name)];
      const first = order.find((name) => fieldErrors[name]);
      if (!first) return;
      requestAnimationFrame(() => {
        const wrapper = document.getElementById(first === "_departmentId" ? "field-_departmentId" : `wrap-${first}`);
        wrapper?.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable = wrapper?.querySelector<HTMLElement>("input, textarea, [contenteditable='true'], button");
        focusable?.focus({ preventScroll: true });
      });
    },
    [columns]
  );

  /* ---------- save ---------- */
  const save = async () => {
    if (!schema || saving) return;

    // same rules as the API: required fields, and a department when one must be chosen
    const missing: Record<string, string> = {};
    for (const column of columns) {
      const value = FILE_TYPES.includes(column.type)
        ? [...(existingFiles[column.name] ?? []), ...(pendingFiles[column.name] ?? [])]
        : values[column.name];
      if (column.required && isMissing(column, value)) missing[column.name] = `${columnLabel(column)} is required`;
    }
    if (showDepartment && !departmentIds.length) missing._departmentId = "Choose who can see this record";
    if (Object.keys(missing).length) {
      setErrors(missing);
      focusFirstError(missing);
      return;
    }
    setErrors({});
    setSaving(true);

    let stage: "upload" | "save" = "upload";
    try {
      const payload: Values = { ...values };
      // auto-numbers and formulas come from the server
      for (const column of columns) if (SERVER_TYPES.includes(column.type)) delete payload[column.name];
      for (const column of fileColumns) {
        let urls = existingFiles[column.name] ?? [];
        const pending = pendingFiles[column.name] ?? [];
        if (pending.length) {
          const { data } = await uploadFiles(pending);
          urls = [...urls, ...data.map((f: { url: string }) => f.url)];
        }
        payload[column.name] = column.type === "image" || column.type === "file" ? (urls[0] ?? null) : urls;
      }
      if (showDepartment || !editing) payload._departmentIds = departmentIds;
      const lines = lineItems.changes();
      if (lines.payload) payload._children = lines.payload;
      linesWhere.current = lines.where;

      stage = "save";
      saved.current = true;
      // after saving: the lines and the totals over them changed
      const refreshLines = () => {
        notifications.hide("line-errors");
        if (!lines.payload) return;
        void queryClient.invalidateQueries({ queryKey: ["lines"] });
        void queryClient.invalidateQueries({ queryKey: ["related"] });
      };
      if (editing) {
        await update.mutateAsync({ id: id!, data: payload });
        refreshLines();
        navigate(recordPath(table, id!), { replace: true });
      } else {
        const res = await create.mutateAsync(payload);
        refreshLines();
        navigate(recordPath(table, res.data.insertedId), { replace: true });
      }
    } catch (err) {
      saved.current = false;
      const fieldErrors = fieldErrorsOf(err);
      if (fieldErrors) {
        // "lines.create.1.qty" belong to the line grid, the rest to the fields above
        const own = Object.fromEntries(Object.entries(fieldErrors).filter(([k]) => !k.includes(".")));
        if (lineItems.showErrors(fieldErrors, linesWhere.current) && !Object.keys(own).length) {
          notifications.show({
            id: "line-errors",
            title: "Check the lines",
            message: errorMessage(err).replace(/^Check the lines: /, ""),
            color: "red",
          });
        }
        setErrors(own);
        focusFirstError(own);
      } else if (stage === "upload") {
        // save errors are notified by the mutation hooks
        notifications.show({ title: "Couldn't upload the files", message: errorMessage(err), color: "red" });
      }
    } finally {
      setSaving(false);
    }
  };

  const leave = () => navigate(editing ? recordPath(table, id!) : listPath);
  const cancel = () => {
    if (!dirty) return leave();
    confirmDanger({
      title: "Discard changes?",
      message: "Your changes to this record haven't been saved.",
      confirmLabel: "Discard changes",
      onConfirm: leave,
    });
  };

  // Ctrl/⌘+S saves (also while typing in a field)
  useHotkeys([["mod+S", () => void save()]], []);
  // Esc leaves when there's nothing to lose (not while typing)
  useHotkeys([["Escape", () => !dirty && leave()]]);

  /* ---------- states ---------- */
  if (schemaQuery.isError && httpStatus(schemaQuery.error) === 404) return <NoTableAccess table={title} />;
  if (editing && recordQuery.isError && httpStatus(recordQuery.error) === 404) {
    return <RecordNotFound table={title} title={title} listPath={listPath} />;
  }

  const name = editing ? recordTitle(columns, record) : "";
  const heading = editing ? `Edit ${name}` : `New record in ${title}`;
  const ready = Boolean(schema && initial);
  const noPermission = schema && !(editing ? schema.permissions?.edit : schema.permissions?.create);


  const breadcrumbs = [
    { label: "Tables" },
    { label: title, to: listPath },
    ...(editing ? [{ label: name || "…", to: recordPath(table, id!) }, { label: "Edit" }] : [{ label: "New record" }]),
  ];

  return (
    <Page title={heading} breadcrumbs={breadcrumbs} width="narrow">
      <PageHeader
        title={ready ? heading : <Skeleton h={28} w={240} />}
        description={editing ? undefined : "Fill in the details below. Fields marked * are required."}
      />

      {noPermission ? (
        <Text c="dimmed">You don't have permission to {editing ? "edit records in" : "add records to"} this table.</Text>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Stack gap="lg">
            <Section>
              {!ready ? (
                <Grid gutter="lg">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Grid.Col key={i} span={{ base: 12, md: 6 }}>
                      <Stack gap={6}>
                        <Skeleton h={12} w={90} />
                        <Skeleton h={36} />
                      </Stack>
                    </Grid.Col>
                  ))}
                </Grid>
              ) : (
                <Grid gutter="lg">
                  {showDepartment && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <MultiSelect
                        id="field-_departmentId"
                        label="Visible to"
                        description="Which departments can see this record"
                        placeholder={departmentIds.length ? undefined : "Choose departments"}
                        data={departmentOptions}
                        value={departmentIds}
                        onChange={(v) => {
                          setDepartmentIds(v);
                          clearError("_departmentId");
                        }}
                        clearable={false}
                        withAsterisk
                        error={errors._departmentId}
                      />
                    </Grid.Col>
                  )}
                  {/* keep the department on its own row */}
                  {showDepartment && <Grid.Col span={6} visibleFrom="md" aria-hidden />}

                  {columns.map((column) => (
                    <Grid.Col
                      key={column.name}
                      id={`wrap-${column.name}`}
                      span={{ base: 12, md: FULL_WIDTH_TYPES.includes(column.type) ? 12 : 6 }}
                    >
                      {FILE_TYPES.includes(column.type) ? (
                        <FileInputArea
                          id={`field-${column.name}`}
                          column={column}
                          existing={existingFiles[column.name] ?? []}
                          pending={pendingFiles[column.name] ?? []}
                          error={errors[column.name]}
                          onAdd={(files) => {
                            const single = column.type === "image" || column.type === "file";
                            if (single) setExistingFiles((prev) => ({ ...prev, [column.name]: [] }));
                            setPendingFiles((prev) => ({
                              ...prev,
                              [column.name]: single ? files.slice(0, 1) : [...(prev[column.name] ?? []), ...files],
                            }));
                            clearError(column.name);
                          }}
                          onRemoveExisting={(url) =>
                            setExistingFiles((prev) => ({
                              ...prev,
                              [column.name]: (prev[column.name] ?? []).filter((u) => u !== url),
                            }))
                          }
                          onRemovePending={(index) =>
                            setPendingFiles((prev) => ({
                              ...prev,
                              [column.name]: (prev[column.name] ?? []).filter((_, i) => i !== index),
                            }))
                          }
                        />
                      ) : (
                        <FieldInput
                          column={column}
                          value={
                            (column.type === "formula" || column.type === "rollup") && preview.value(column.name) !== undefined
                              ? preview.value(column.name)
                              : values[column.name]
                          }
                          onChange={(v) => setValue(column.name, v)}
                          error={errors[column.name]}
                        />
                      )}
                    </Grid.Col>
                  ))}
                </Grid>
              )}
            </Section>

            {lineItems.groups.map((group) => (
              <Section key={group.table} title={tableTitle(group.table)} padding={0}>
                <LineItemsGrid group={group} items={lineItems} live={preview.lineValues(group.table, group.lines)} />
              </Section>
            ))}

            {/* sticky action bar */}
            <Paper
              withBorder
              radius="lg"
              shadow="md"
              px="md"
              py="sm"
              pos="sticky"
              bottom={16}
              style={{ zIndex: 5, background: "var(--app-surface)" }}
            >
              <Group justify="space-between" gap="sm" wrap="wrap">
                <Box aria-live="polite">
                  {dirty ? (
                    <Group gap={4} wrap="nowrap">
                      <IconPointFilled size={12} color="var(--mantine-color-orange-6)" aria-hidden />
                      <Text size="sm" c="dimmed">
                        Unsaved changes
                      </Text>
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed" visibleFrom="xs">
                      Press Ctrl+S to save
                    </Text>
                  )}
                </Box>
                <Group gap="xs" ml="auto">
                  <Button variant="default" onClick={cancel} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={saving} disabled={!ready} leftSection={<IconDeviceFloppy size={16} />}>
                    {editing ? "Save changes" : "Create record"}
                  </Button>
                </Group>
              </Group>
            </Paper>
          </Stack>
        </form>
      )}
    </Page>
  );
}
