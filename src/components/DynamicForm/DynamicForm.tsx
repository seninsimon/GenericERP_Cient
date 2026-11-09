import { useEffect, useState } from "react";
import {
  Stack,
  Loader,
  Group,
  Button,
  Paper,
  Title,
  Flex,
  Text,
  ActionIcon,
  Grid,
  Box,
  Select,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { IconArrowLeft, IconDeviceFloppy, IconHistory } from "@tabler/icons-react";

import {
  useSchema,
  useSingleData,
  useInsertData,
  useUpdateData,
} from "../../api/reactQueryHooks/useTables";

import { errorMessage, uploadFiles } from "../../api/api";
import { useCurrentUser } from "../../auth/AuthContext";
import FieldRenderer from "./FieldRenderer";
import RecordHistory from "./RecordHistory";
import { confirmAction } from "../../utils/confirmModal";

const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL;

const FILE_TYPES = ["image", "images", "file", "files"];

// Same rule as the API: null, "" and [] are missing; false is a value.
const isMissing = (col: any, value: any) => {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") {
    if (col.type === "richtext" || col.type === "richText") {
      return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
    }
    return value.trim() === "";
  }
  return false;
};

export default function DynamicForm({ table }: any) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isEdit = location.pathname.includes("/edit/");
  const isView = location.pathname.includes("/view/");

  const [form, setForm] = useState<any>({});
  // per-field validation messages (client-side or from the API's 400 `errors`)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<any>({});
  const [existingFiles, setExistingFiles] = useState<any>({});

  const { data: schema, isLoading } = useSchema(table);
  const { data: singleData } = useSingleData(table, id || "");

  const insertMutation = useInsertData(table);
  const updateMutation = useUpdateData(table);

  const { isAdmin } = useCurrentUser();
  const permissions = schema?.permissions ?? {};
  const canSave = isEdit ? permissions.edit : !isView && permissions.create;

  /* ---------------- DEPARTMENT ---------------- */
  // departments this user may file the record under (from the API)
  const departmentOptions = (schema?.allowedDepartments ?? []).map((d: any) => ({
    value: d._id,
    label: d.name,
  }));
  // users with a single department don't need to pick; admins always see it
  const showDepartment =
    departmentOptions.length > 1 || (isAdmin && departmentOptions.length > 0);

  // new record + exactly one department: preselect it
  useEffect(() => {
    if (!isEdit && !isView && departmentOptions.length === 1) {
      setForm((prev: any) =>
        prev._departmentId ? prev : { ...prev, _departmentId: departmentOptions[0].value }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, isEdit, isView]);

  /* ---------------- INIT DATA ---------------- */
  useEffect(() => {
    if (!singleData || !schema) return;

    const normalized: any = { ...singleData };
    const existing: any = {};

    schema.columns.forEach((col: any) => {
      if (col.type === "relation") {
        if (col.multiple && Array.isArray(normalized[col.name])) {
          normalized[col.name] = normalized[col.name].map((v: any) =>
            typeof v === "object" ? v._id : v
          );
        }

        if (!col.multiple && normalized[col.name]) {
          normalized[col.name] =
            typeof normalized[col.name] === "object"
              ? normalized[col.name]._id
              : normalized[col.name];
        }
      }

      if (["image", "images", "file", "files"].includes(col.type)) {
        existing[col.name] = Array.isArray(normalized[col.name])
          ? normalized[col.name]
          : normalized[col.name]
          ? [normalized[col.name]]
          : [];
      }
    });

    setForm(normalized);
    setExistingFiles(existing);
  }, [singleData, schema]);

  /* ---------------- HANDLERS ---------------- */
  const clearFieldError = (name: string) =>
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  const handleChange = (name: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  const handleFileSelect = (name: string, files: File[] | File) => {
    const arr = Array.isArray(files) ? files : [files];
    clearFieldError(name);

    setPendingFiles((prev: any) => ({
      ...prev,
      [name]: [...(prev[name] || []), ...arr],
    }));
  };

  const removeExisting = (field: string, url: string) => {
    setExistingFiles((prev: any) => ({
      ...prev,
      [field]: prev[field].filter((f: string) => f !== url),
    }));
  };

  const removePending = (field: string, index: number) => {
    setPendingFiles((prev: any) => ({
      ...prev,
      [field]: prev[field].filter((_: any, i: number) => i !== index),
    }));
  };

  /* ---------------- SUBMIT ---------------- */
  // value of a column as it will be submitted (files: kept + newly picked)
  const effectiveValue = (col: any) => {
    if (FILE_TYPES.includes(col.type)) {
      const files = [...(existingFiles[col.name] || []), ...(pendingFiles[col.name] || [])];
      return files.length ? files : null;
    }
    return form[col.name];
  };

  const validateRequired = () => {
    const errors: Record<string, string> = {};
    for (const col of schema.columns) {
      if (col.required && isMissing(col, effectiveValue(col))) {
        errors[col.name] = `${col.label || col.name} is required`;
      }
    }
    if (showDepartment && !isAdmin && !form._departmentId) {
      errors._departmentId = "Choose which department this record belongs to";
    }
    return errors;
  };

  // check required fields first, so the confirmation only shows for a valid form
  const requestSave = () => {
    const missing = validateRequired();
    if (Object.keys(missing).length) {
      setFieldErrors(missing);
      notifications.show({
        title: "Missing required fields",
        message: "Fill in the highlighted fields",
        color: "red",
      });
      return;
    }
    setFieldErrors({});
    confirmAction("Save changes?", submit);
  };

  const submit = async () => {

    let stage = "upload";
    try {
      const payload = { ...form };

      for (const col of schema.columns) {
        if (["image", "images", "file", "files"].includes(col.type)) {
          const field = col.name;

          let finalFiles = [...(existingFiles[field] || [])];

          if (pendingFiles[field]) {
            const res = await uploadFiles(pendingFiles[field]);
            const urls = res.data.map((f: any) => f.url);
            finalFiles = [...finalFiles, ...urls];
          }

          payload[field] =
            col.type === "image" || col.type === "file"
              ? finalFiles[0] || null
              : finalFiles;
        }
      }

      stage = "save";
      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: payload });
      } else {
        await insertMutation.mutateAsync(payload);
      }

      notifications.show({
        title: "Success",
        message: "Saved successfully",
        color: "green",
      });

      navigate(`/table/${table}`);
    } catch (err: any) {
      // per-field messages from the API (the hooks already show the general message)
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        setFieldErrors(serverErrors);
      }
      // save errors are already shown by the mutation hooks
      if (stage === "upload") {
        notifications.show({
          title: "Upload failed",
          message: errorMessage(err),
          color: "red",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <Flex justify="center" align="center" h="100vh">
        <Loader />
      </Flex>
    );
  }

  if (!schema) return null;

  return (
    <Box mih="100vh" pb={80}>
      {/* HEADER */}
      <Paper 
      
      >
        <Group>
          <ActionIcon
            variant="subtle"
            onClick={() => navigate(`/table/${table}`)}
          >
            <IconArrowLeft size={16} />
          </ActionIcon>

          <Box style={{ flex: 1 }}>
            <Title order={4}>
              {isEdit ? "Edit" : isView ? "View" : "New"} {table}
            </Title>
            <Text size="xs" c="dimmed">
              Manage record details
            </Text>
          </Box>

          {(isEdit || isView) && id && (
            <Button
              variant="light"
              size="xs"
              leftSection={<IconHistory size={14} />}
              onClick={() => setHistoryOpen(true)}
            >
              History
            </Button>
          )}
        </Group>
      </Paper>

      {(isEdit || isView) && id && (
        <RecordHistory
          opened={historyOpen}
          onClose={() => setHistoryOpen(false)}
          table={table}
          recordId={id}
          columns={schema.columns}
        />
      )}

      {/* FORM */}
      <Stack w="100%" pt="md" gap="md">
        <Paper withBorder radius="md" p="md">
          <Grid gutter="md">
            {showDepartment && (
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Select
                  label="Department"
                  placeholder={isAdmin ? "Unassigned (admins only)" : "Choose a department"}
                  data={departmentOptions}
                  value={form._departmentId ?? null}
                  onChange={(v) => handleChange("_departmentId", v)}
                  disabled={isView}
                  clearable={isAdmin}
                  required={!isAdmin}
                  error={fieldErrors._departmentId}
                />
              </Grid.Col>
            )}
            {schema.columns.map((col: any) => (
              <Grid.Col
                key={col.name}
                span={{
                  base: 12,
                  sm:
                    col.type === "textarea" || col.type === "richtext"
                      ? 12
                      : 6,
                  md:
                    col.type === "textarea" || col.type === "richtext"
                      ? 12
                      : 4,
                }}
              >
                <FieldRenderer
                  column={col}
                  value={
                    form[col.name] ??
                    (col.type === "relation"
                      ? col.multiple
                        ? []
                        : null
                      : "")
                  }
                  error={fieldErrors[col.name]}
                  isView={isView}
                  FILE_BASE_URL={FILE_BASE_URL}
                  onChange={handleChange}
                  onFileSelect={handleFileSelect}
                  existingFiles={existingFiles}
                  pendingFiles={pendingFiles}
                  removeExisting={removeExisting}
                  removePending={removePending}
                />
              </Grid.Col>
            ))}
          </Grid>
        </Paper>
      </Stack>

      {/* FOOTER */}
      <Paper
        
        p="sm"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backdropFilter: "blur(6px)",
          borderTop: "1px solid #E5E7EB",
        }}
      >
        <Flex justify="flex-end" gap="sm" mx="auto">
          <Button variant="subtle"  onClick={() => navigate(`/table/${table}`)}>
            Cancel
          </Button>

          {canSave && (
            <Button
              loading={
                insertMutation.isPending || updateMutation.isPending
              }
              onClick={requestSave}
              leftSection={<IconDeviceFloppy size={14} />}
            >
              {isEdit ? "Update" : "Save"}
            </Button>
          )}
        </Flex>
      </Paper>
    </Box>
  );
}