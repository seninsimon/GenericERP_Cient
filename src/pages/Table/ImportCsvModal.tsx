import { useState } from "react";
import {
  Alert,
  Button,
  FileInput,
  Group,
  List,
  Modal,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { IconFileTypeCsv, IconInfoCircle } from "@tabler/icons-react";

import { errorMessage, startImport, type Job } from "../../api/api";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB, same limit as the API

// Upload a CSV into `table`; the import runs as a background job.
export default function ImportCsvModal({
  opened,
  onClose,
  table,
  schema,
  isAdmin,
  onStarted,
}: {
  opened: boolean;
  onClose: () => void;
  table: string;
  schema: any;
  isAdmin: boolean;
  onStarted: (job: Job) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const departments = (schema?.allowedDepartments ?? []).map((d: any) => ({
    value: d._id,
    label: d.name,
  }));
  const showDepartment = departments.length > 1;
  const departmentRequired = showDepartment && !isAdmin;

  const close = () => {
    setFile(null);
    setDepartmentId(null);
    setError(null);
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (!file) return setError("Choose a CSV file");
    if (file.size > MAX_SIZE) return setError("The file is larger than 20 MB");
    if (departmentRequired && !departmentId) return setError("Choose a department");

    setSubmitting(true);
    try {
      const { data } = await startImport(table, file, departmentId);
      onStarted(data.job);
      close();
    } catch (err) {
      setError(errorMessage(err, "Couldn't start the import"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title={`Import CSV into "${table}"`} size="lg">
      <Stack>
        <Alert color="blue" icon={<IconInfoCircle size={16} />} title="CSV format">
          <List size="xs" spacing={2}>
            <List.Item>First row: column labels (or column names), as in an export.</List.Item>
            <List.Item>
              Optional <b>Department</b> column with the department name; otherwise the
              department chosen below is used.
            </List.Item>
            <List.Item>Relations: the linked record's display name (or its id).</List.Item>
            <List.Item>Several values (multi-relations, images, files): separate with ";".</List.Item>
            <List.Item>Booleans: true/false, yes/no or 1/0.</List.Item>
          </List>
          <Text size="xs" mt={6}>
            Tip: export the table first to get a file with the right headers.
          </Text>
        </Alert>

        <FileInput
          label="CSV file"
          placeholder="Choose a .csv file"
          accept=".csv,text/csv"
          leftSection={<IconFileTypeCsv size={16} />}
          value={file}
          onChange={setFile}
          clearable
          withAsterisk
        />

        {showDepartment && (
          <Select
            label="Department"
            description="Used for rows without a Department column"
            placeholder={isAdmin ? "Unassigned (admins only)" : "Choose a department"}
            data={departments}
            value={departmentId}
            onChange={setDepartmentId}
            clearable={isAdmin}
            withAsterisk={departmentRequired}
          />
        )}

        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={close}>
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
