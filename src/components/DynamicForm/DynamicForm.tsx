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
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { IconArrowLeft, IconDeviceFloppy } from "@tabler/icons-react";

import {
  useSchema,
  useSingleData,
  useInsertData,
  useUpdateData,
} from "../../api/reactQueryHooks/useTables";

import { getRelationOptions, uploadFiles } from "../../api/api";
import FieldRenderer from "./FieldRenderer";
import { confirmAction } from "../../utils/confirmModal";

const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL;

export default function DynamicForm({ table }: any) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isEdit = location.pathname.includes("/edit/");
  const isView = location.pathname.includes("/view/");

  const [form, setForm] = useState<any>({});
  const [relations, setRelations] = useState<any>({});
  const [pendingFiles, setPendingFiles] = useState<any>({});
  const [existingFiles, setExistingFiles] = useState<any>({});

  const { data: schema, isLoading } = useSchema(table);
  const { data: singleData } = useSingleData(table, id || "");

  const insertMutation = useInsertData(table);
  const updateMutation = useUpdateData(table);

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

  /* ---------------- RELATIONS ---------------- */
  useEffect(() => {
    if (!schema) return;

    const loadRelations = async () => {
      const rels: any = {};

      for (const col of schema.columns) {
        if (col.type === "relation" && col.ref) {
          const res = await getRelationOptions(col.ref, col.displayField);
          rels[col.name] = res.data ?? [];
        }
      }

      setRelations(rels);
    };

    loadRelations();
  }, [schema]);

  /* ---------------- HANDLERS ---------------- */
  const handleChange = (name: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (name: string, files: File[] | File) => {
    const arr = Array.isArray(files) ? files : [files];

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
  const submit = async () => {
    try {
      let payload = { ...form };

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
    } catch {
      notifications.show({
        title: "Error",
        message: "Something went wrong",
        color: "red",
      });
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

          <Box>
            <Title order={4}>
              {isEdit ? "Edit" : isView ? "View" : "New"} {table}
            </Title>
            <Text size="xs" c="dimmed">
              Manage record details
            </Text>
          </Box>
        </Group>
      </Paper>

      {/* FORM */}
      <Stack w="100%" pt="md" gap="md">
        <Paper withBorder radius="md" p="md">
          <Grid gutter="md">
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
                  relations={relations}
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

          {!isView && (
            <Button
              loading={
                insertMutation.isPending || updateMutation.isPending
              }
              onClick={() => confirmAction("Save changes?", submit)}
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