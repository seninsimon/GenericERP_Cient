import { useEffect } from "react";
import { Box, Input } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { columnLabel, type RecordColumn } from "../schema";

// Rich-text editor for forms.
export function RichTextInput({
  id,
  column,
  value,
  onChange,
  error,
}: {
  id: string;
  column: RecordColumn;
  value: unknown;
  onChange: (html: string) => void;
  error?: string;
}) {
  const html = typeof value === "string" ? value : "";
  const editor = useEditor({
    extensions: [StarterKit],
    content: html,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    editorProps: { attributes: { "aria-label": columnLabel(column), id } },
  });

  // load the record's content once it arrives
  useEffect(() => {
    if (editor && html !== editor.getHTML() && !(html === "" && editor.isEmpty)) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [html, editor]);

  return (
    <Input.Wrapper label={columnLabel(column)} withAsterisk={Boolean(column.required)} error={error}>
      <RichTextEditor
        editor={editor}
        mt={4}
        style={error ? { borderColor: "var(--mantine-color-error)" } : undefined}
      >
        <RichTextEditor.Toolbar sticky stickyOffset="var(--app-header-height)">
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
            <RichTextEditor.Strikethrough />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content mih={160} />
      </RichTextEditor>
    </Input.Wrapper>
  );
}

// Read-only rendering of stored rich text. Goes through the editor, which only
// keeps formatting it knows, so stored HTML can never run scripts.
export function RichTextView({ html }: { html: string }) {
  const editor = useEditor({ extensions: [StarterKit], content: html, editable: false });

  useEffect(() => {
    if (editor && html !== editor.getHTML()) editor.commands.setContent(html, { emitUpdate: false });
  }, [html, editor]);

  return (
    <Box className="rich-text-view" fz="sm">
      <RichTextEditor editor={editor} withTypographyStyles styles={{ root: { border: 0 }, content: { background: "transparent" } }}>
        <RichTextEditor.Content p={0} />
      </RichTextEditor>
    </Box>
  );
}
