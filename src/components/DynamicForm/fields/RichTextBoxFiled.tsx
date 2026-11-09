import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Text } from "@mantine/core";

export default function RichTextField({ column, value, isView, onChange, error }: any) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editable: !isView,
    onUpdate: ({ editor }) => {
      onChange(column.name, editor.getHTML());
    },
  });

  // load the record's content once it arrives (edit/view pages fetch it async)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!isView);
  }, [editor, isView]);

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#1F2937]">
        {column.label}
        {column.required && !isView && <span style={{ color: "var(--mantine-color-red-6)" }}> *</span>}
      </label>

      {/* View mode also goes through the editor (read-only): it only renders
          formatting it knows, so stored HTML can't inject scripts. */}
      <RichTextEditor editor={editor}>
        {!isView && (
          <RichTextEditor.Toolbar>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.H1 />
            <RichTextEditor.H2 />
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
            <RichTextEditor.Link />
          </RichTextEditor.Toolbar>
        )}

        <RichTextEditor.Content
          style={{ minHeight: isView ? undefined : 150 }}
          bg={isView ? "#F9FAFB" : undefined}
        />
      </RichTextEditor>
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </div>
  );
}
