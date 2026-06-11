"use client";

// Shared rich-text editor (#033, #101): TipTap, no toolbar — formatting via
// keyboard shortcuts + markdown-style input rules (which also work on mobile).
// Used by both the Today journal and Notes. Feature set per #101.
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

export type EditorValue = { json: JSONContent; text: string };

export function Editor({
  content,
  placeholder = "",
  editable = true,
  onChange,
  onUploadImage,
}: {
  content?: JSONContent | null;
  placeholder?: string;
  editable?: boolean;
  onChange?: (value: EditorValue) => void;
  // Provided by the slice that owns Storage (#050). When set, pasted/dropped
  // images are uploaded and inserted; otherwise they're ignored.
  onUploadImage?: (file: File) => Promise<string>;
}) {
  const editor = useEditor({
    immediatelyRender: false, // required under Next SSR
    editable,
    content: content ?? undefined,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: { class: "notes-editor focus:outline-none" },
    },
    onUpdate: ({ editor }) => {
      onChange?.({ json: editor.getJSON(), text: editor.getText() });
    },
  });

  async function handleFiles(files: FileList | null) {
    if (!editor || !onUploadImage || !files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const url = await onUploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        // Best-effort: a failed upload shouldn't break the editor (#050). The
        // upload helper throws a friendly message (too large / not an image).
        console.error("image upload failed", err);
      }
    }
  }

  return (
    <div
      onPaste={(e) => {
        const files = e.clipboardData?.files;
        if (files?.length && onUploadImage) {
          e.preventDefault();
          void handleFiles(files);
        }
      }}
      onDrop={(e) => {
        const files = e.dataTransfer?.files;
        if (files?.length && onUploadImage) {
          e.preventDefault();
          void handleFiles(files);
        }
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
