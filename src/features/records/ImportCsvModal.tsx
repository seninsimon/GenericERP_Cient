import { useState } from "react";
import { Accordion, Alert, Badge, Button, FileInput, Group, Modal, Select, Stack, Table, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconDownload, IconFileTypeCsv, IconInfoCircle } from "@tabler/icons-react";

import { errorMessage, startImport, type Job } from "../../api/api";
import { tableTitle } from "../../layout/nav";
import { columnLabel, type RecordColumn, type TableSchemaInfo } from "./schema";

// columns a file can fill (the server works out the others; files are uploaded in the form)
const IMPORTABLE = (c: RecordColumn) => !["formula", "rollup", "autonumber", "image", "images", "file", "files"].includes(c.type);

// What to put in a column, in a few words.
function hint(c: RecordColumn) {
  const several = c.multiple ? " (several: separate with ;)" : "";
  switch (c.type) {
    case "number":
      return "A number, like 1250.50";
    case "date":
      return "A date, like 2026-12-31";
    case "boolean":
      return "Yes or No";
    case "choice":
      return `One of: ${(c.options ?? []).map((o) => o.label).join(", ")}${several}`;
    case "user":
      return `A person's username or full name${several}`;
    case "relation":
      return `The name of a record in ${tableTitle(c.ref ?? "")}${several}`;
    case "department":
      return `A department name${several}`;
    default:
      return "Text";
  }
}

// A CSV with just the column headings, to fill in a spreadsheet.
function downloadTemplate(table: string, headers: string[]) {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const blob = new Blob(["\uFEFF" + headers.map(cell).join(",") + "\r\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${table}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
  const columns = schema.columns.filter(IMPORTABLE);
  const templateHeaders = [...columns.map((c) => columnLabel(c)), ...(showDepartment ? ["Visible to"] : [])];

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

        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Text size="sm" c="dimmed">
            Start from the template: it has the right columns. Fill it in Excel, LibreOffice or Google Sheets and save it as CSV.
          </Text>
          <Button variant="default" leftSection={<IconDownload size={16} />} onClick={() => downloadTemplate(table, templateHeaders)} style={{ flexShrink: 0 }}>
            Download template
          </Button>
        </Group>

        <Accordion variant="contained" radius="md">
          <Accordion.Item value="columns">
            <Accordion.Control>What goes in each column</Accordion.Control>
            <Accordion.Panel>
              <Table fz="sm" verticalSpacing={4}>
                <Table.Tbody>
                  {columns.map((c) => (
                    <Table.Tr key={c.name}>
                      <Table.Td style={{ whiteSpace: "nowrap", verticalAlign: "top" }}>
                        {columnLabel(c)}{" "}
                        {c.required && (
                          <Badge size="xs" variant="light" color="red">
                            Required
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td c="dimmed">{hint(c)}</Table.Td>
                    </Table.Tr>
                  ))}
                  {showDepartment && (
                    <Table.Tr>
                      <Table.Td>Visible to</Table.Td>
                      <Table.Td c="dimmed">Department names, separated by ; (e.g. Sales; Support)</Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="update">
            <Accordion.Control>Changing many records at once</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm">
                Export the table, change the file, and import it here. Rows that keep their <b>ID</b> update that record (only the
                columns in the file change). Rows without an ID are added as new. Changes from a file don't send notifications.
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <Alert variant="light" color="gray" icon={<IconInfoCircle size={16} />}>
          <Text size="xs">
            If some rows have problems, the good ones are still imported. You'll be told what to fix in each row, and you can download
            just those rows to correct them and import again.
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
