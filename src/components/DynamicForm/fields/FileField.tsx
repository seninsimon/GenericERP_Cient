import { Stack, FileInput, Image, Group, Text, ActionIcon, Paper, Box, ScrollArea } from "@mantine/core";
import { IconTrash, IconEye, IconFile, IconPhoto, IconX } from "@tabler/icons-react";

export default function FileField({
  column,
  isView,
  FILE_BASE_URL,
  existingFiles,
  pendingFiles,
  onFileSelect,
  removeExisting,
  removePending,
  error,
}: any) {

  const existing = existingFiles[column.name] || [];
  const pending = pendingFiles[column.name] || [];

  const isImage = column.type === "image" || column.type === "images";
  const isMultiple = column.type === "images" || column.type === "files";

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getFileName = (url: string) => {
    return url.split("/").pop() || 'file';
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  };

  return (
    <Stack gap="md">
      {!isView && (
        <FileInput
          label={column.label}
          withAsterisk={Boolean(column.required)}
          error={error}
        //   description={isMultiple ? `Upload ${column.type === 'images' ? 'images' : 'files'}` : undefined}
          placeholder={`Click to upload ${isMultiple ? 'multiple files' : 'a file'}`}
          multiple={isMultiple}
          accept={isImage ? "image/*" : "*"}
          onChange={(files) => files && onFileSelect(column.name, files)}
          clearable
          size="sm"
          styles={{
            input: {
              '&:hover': {
                borderColor: 'var(--mantine-color-blue-5)',
              },
            },
          }}
        />
      )}

      {/* Existing Files */}
      {existing.length > 0 && (
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={500} c="dimmed">
              Uploaded {isImage ? 'Images' : 'Files'} ({existing.length})
            </Text>
          </Group>
          
          <ScrollArea
            type="auto"
            offsetScrollbars
            scrollbarSize={6}
            style={{ width: '100%' }}
          >
            <Group gap="md" align="stretch" wrap="nowrap" style={{ minWidth: 'min-content', paddingBottom: 4 }}>
              {existing.map((url: string) => {
                const fullUrl = `${FILE_BASE_URL}${encodeURI(url)}`;
                const fileName = getFileName(url);
                const fileExtension = getFileExtension(fileName);

                return (
                  <Paper
                    key={url}
                    shadow="xs"
                    p="xs"
                    radius="md"
                    withBorder
                    style={{
                      width: isImage ? 150 : 220,
                      flexShrink: 0,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 'var(--mantine-shadow-md)',
                      },
                    }}
                  >
                    <Stack gap="xs">
                      {/* Preview */}
                      <Box
                        style={{
                          height: isImage ? 110 : 80,
                          backgroundColor: 'var(--mantine-color-gray-0)',
                          borderRadius: 'var(--mantine-radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {isImage ? (
                          <Image
                            src={fullUrl}
                            h={110}
                            w="auto"
                            fit="cover"
                            fallbackSrc="https://placehold.co/150x110?text=No+Image"
                          />
                        ) : (
                          <Box style={{ textAlign: 'center' }}>
                            <IconFile size={36} color="var(--mantine-color-blue-5)" stroke={1.5} />
                            <Text size="xs" fw={500} c="blue" mt={4}>
                              {fileExtension}
                            </Text>
                          </Box>
                        )}
                      </Box>

                      {/* File Info */}
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="xs" truncate fw={500}>
                            {fileName}
                          </Text>
                        </Box>

                        <Group gap={4} wrap="nowrap">
                          <ActionIcon
                            component="a"
                            href={fullUrl}
                            target="_blank"
                            variant="subtle"
                            color="blue"
                            size="sm"
                          >
                            <IconEye size={14} />
                          </ActionIcon>

                          {!isView && (
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              size="sm"
                              onClick={() => removeExisting(column.name, url)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Group>
                    </Stack>
                  </Paper>
                );
              })}
            </Group>
          </ScrollArea>
        </Stack>
      )}

      {/* Pending Files */}
      {pending.length > 0 && (
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={500} c="dimmed">
              New {isImage ? 'Images' : 'Files'} to Upload ({pending.length})
            </Text>
          </Group>
          
          <ScrollArea
            type="auto"
            offsetScrollbars
            scrollbarSize={6}
            style={{ width: '100%' }}
          >
            <Group gap="md" align="stretch" wrap="nowrap" style={{ minWidth: 'min-content', paddingBottom: 4 }}>
              {pending.map((file: File, i: number) => {
                const isImageFile = file.type.startsWith('image/');
                const fileExtension = file.name.split('.').pop()?.toUpperCase() || 'FILE';

                return (
                  <Paper
                    key={`${file.name}-${i}`}
                    shadow="xs"
                    p="xs"
                    radius="md"
                    withBorder
                    style={{
                      width: isImage ? 150 : 220,
                      flexShrink: 0,
                      border: '1px solid var(--mantine-color-blue-2)',
                      backgroundColor: 'var(--mantine-color-blue-0)',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Stack gap="xs">
                      {/* Preview */}
                      <Box
                        style={{
                          height: isImage ? 110 : 80,
                          backgroundColor: 'white',
                          borderRadius: 'var(--mantine-radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        {isImageFile ? (
                          <Image
                            src={URL.createObjectURL(file)}
                            h={110}
                            w="auto"
                            fit="cover"
                            fallbackSrc="https://placehold.co/150x110?text=Preview"
                          />
                        ) : (
                          <Box style={{ textAlign: 'center' }}>
                            <IconFile size={36} color="var(--mantine-color-blue-5)" stroke={1.5} />
                            <Text size="xs" fw={500} c="blue" mt={4}>
                              {fileExtension}
                            </Text>
                          </Box>
                        )}
                      </Box>

                      {/* File Info */}
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="xs" truncate fw={500}>
                            {file.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {formatFileSize(file.size)}
                          </Text>
                        </Box>

                        {!isView && (
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            size="sm"
                            onClick={() => removePending(column.name, i)}
                          >
                            <IconX size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Stack>
                  </Paper>
                );
              })}
            </Group>
          </ScrollArea>
        </Stack>
      )}

      {/* Empty State */}
      {existing.length === 0 && pending.length === 0 && !isView && (
        <Paper
          p="xl"
          radius="md"
          withBorder
          style={{
            border: '2px dashed var(--mantine-color-gray-3)',
            textAlign: 'center',
          }}
        >
          <Stack gap="xs" align="center">
            <IconPhoto size={40} color="var(--mantine-color-gray-5)" stroke={1.5} />
            <Text size="sm" c="dimmed">
              No {isImage ? 'images' : 'files'} uploaded yet
            </Text>
            <Text size="xs" c="dimmed">
              Click the upload button above to add {isMultiple ? 'some' : 'a'} {isImage ? 'images' : 'files'}
            </Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}