import { useState } from "react";
import { Alert, Button, FileInput, Group, List, Modal, Select, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconFileTypeCsv, IconInfoCircle } from "@tabler/icons-react";

import { errorMessage, startImport, type Job } from "../../api/api";
import type { TableSchemaInfo } from "./schema";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB, same limit as the API

// Upload a CSV into a table; the import runs as a background job.
export function ImportCsvModal({
  opened,
  onClose,
  table,
  title,
  schema,
  onStarted,
}: {
  opened: boolean;
  onClose: () => void;
  table: string;
  title: string;
  schema: TableSchemaInfo;
  onStarted: (job: Job) => void;
}) {
  const fullScreen = useMediaQuery("(max-width: 36em)");
  const [file, setFile] = useState<File | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const departments = (schema.allowedDepartments ?? []).map((d) => ({ value: d._id, label: d.name }));
  const showDepartment = schema.byDepartment !== false && departments.length > 1;
  const departmentRequired = showDepartment;

  const close = () => {
    setFile(null);
    setDepartmentId(null);
    setError(null);
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (!file) return setError("Choose a CSV file.");
    if (file.size > MAX_SIZE) return setError("The file is larger than 20 MB. Split it into smaller files.");
    if (departmentRequired && !departmentId) return setError("Choose who can see the imported records.");

    setSubmitting(true);
    try {
      const { data } = await startImport(table, file, departmentId);
      onStarted(data.job);
      close();
    } catch (err) {
      setError(errorMessage(err, "Couldn't start the import."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title={`Import records into ${title}`} size="lg" fullScreen={fullScreen}>
      <Stack>
        <FileInput
          label="CSV file"
          description="Up to 20 MB. The import runs in the background."
          placeholder="Choose a .csv file"
          accept=".csv,text/csv"
          leftSection={<IconFileTypeCsv size={16} />}
          value={file}
          onChange={setFile}
          clearable
          withAsterisk
          error={error && !file ? error : undefined}
        />

        {showDepartment && (
          <Select
            label="Visible to"
            description="Which department can see the imported records (rows with a “Visible to” column use that)"
            placeholder="Choose a department"
            data={departments}
            value={departmentId}
            onChange={setDepartmentId}
            withAsterisk
          />
        )}

        <Alert variant="light" color="gray" icon={<IconInfoCircle size={16} />} title="File format">
          <List size="xs" spacing={2}>
            <List.Item>First row: column labels (or names), the same as an export.</List.Item>
            {showDepartment && (
              <List.Item>
                Optional <b>Visible to</b> column with department names, separated by ; (e.g. Sales; Support).
              </List.Item>
            )}
            <List.Item>Linked records: their display name (or id).</List.Item>
            <List.Item>Several values (multiple links, images, files): separate with “;”.</List.Item>
            <List.Item>Yes/no fields: true/false, yes/no or 1/0.</List.Item>
          </List>
          <Text size="xs" mt={6}>
            Tip: export the table first to get a file with the right headers.
          </Text>
        </Alert>

        {error && file && (
          <Text size="sm" c="var(--mantine-color-error)" role="alert">
            {error}
          </Text>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting} disabled={!file}>
            Start import
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
