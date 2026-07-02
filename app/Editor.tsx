"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Markdown } from "tiptap-markdown";

// tiptap-markdown does not ship storage typings for TipTap v3, so wrap the read here
function getMarkdown(editor: TiptapEditor): string {
  return (editor.storage as any).markdown.getMarkdown() as string;
}

export interface EditorHandle {
  insertImageFromFile: (file: File) => Promise<void>;
}

interface EditorProps {
  // Initial markdown content (changes when switching notes)
  value: string;
  // Identifies the current note; switching resets the editor content
  noteId: string | null;
  // Called on content changes with the latest markdown
  onChange: (markdown: string) => void;
  // Uploads an image and returns an accessible URL
  uploadImage: (file: File) => Promise<string | null>;
  editable?: boolean;
}

// A single gutter entry: the line number and the vertical offset (px) at which
// its corresponding top-level block starts, so numbers align with tall blocks
// (images, headings, code) just like a code editor's gutter.
interface LineMark {
  n: number;
  top: number;
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { value, noteId, onChange, uploadImage, editable = true },
  ref
) {
  // Avoid treating programmatic content updates as user edits (which would save)
  const settingContent = useRef(false);
  const uploadRef = useRef(uploadImage);
  uploadRef.current = uploadImage;

  // Wraps the scroll area so we can position the gutter next to the content.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<LineMark[]>([{ n: 1, top: 0 }]);

  const editor = useEditor({
    // Must disable immediate rendering under Next.js SSR to avoid hydration mismatch
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        linkify: true,
        breaks: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
      handlePaste(_view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              void insertImage(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop(_view, event) {
        const files = (event as DragEvent).dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imgs = Array.from(files).filter((f) =>
          f.type.startsWith("image/")
        );
        if (imgs.length === 0) return false;
        event.preventDefault();
        imgs.forEach((f) => void insertImage(f));
        return true;
      },
    },
    onUpdate({ editor }) {
      recomputeLines();
      if (settingContent.current) return;
      const md = getMarkdown(editor);
      onChange(md);
    },
  });

  // Measure each top-level block and record its top offset for the gutter.
  const recomputeLines = useCallback(() => {
    const wrap = wrapRef.current;
    const inner = wrap?.querySelector<HTMLElement>(".editor-inner");
    const pm = wrap?.querySelector<HTMLElement>(".tiptap-editor");
    if (!wrap || !inner || !pm) return;
    const blocks = Array.from(pm.children) as HTMLElement[];
    if (blocks.length === 0) {
      setLines([{ n: 1, top: 0 }]);
      return;
    }
    // Measure each block's top relative to .editor-inner (the gutter's
    // positioning context) via bounding rects, so numbers stay aligned
    // regardless of padding, margins, or the scroll position.
    const baseTop = inner.getBoundingClientRect().top;
    const marks = blocks.map((el, i) => ({
      n: i + 1,
      top: Math.round(el.getBoundingClientRect().top - baseTop),
    }));
    setLines(marks);
  }, []);

  // Upload and insert an image node at the cursor
  async function insertImage(file: File) {
    const url = await uploadRef.current(file);
    if (!url || !editor) return;
    editor.chain().focus().setImage({ src: url }).run();
  }

  useImperativeHandle(ref, () => ({
    insertImageFromFile: insertImage,
  }));

  // Reset editor content when switching notes or when external content changes
  // (does not trigger onChange / save)
  useEffect(() => {
    if (!editor) return;
    const current = getMarkdown(editor);
    if (current === value) return;
    settingContent.current = true;
    editor.commands.setContent(value || "", { emitUpdate: false });
    settingContent.current = false;
    // noteId dependency: force sync when switching notes; value changes
    // (e.g. cleared on create) also sync
  }, [editor, noteId, value]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  // Recompute line marks after content loads and whenever the editor resizes
  // (e.g. an image finishes loading and changes a block's height).
  useEffect(() => {
    if (!editor) return;
    recomputeLines();
    const wrap = wrapRef.current;
    const pm = wrap?.querySelector<HTMLElement>(".tiptap-editor");
    if (!pm || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recomputeLines());
    ro.observe(pm);
    return () => ro.disconnect();
  }, [editor, noteId, value, recomputeLines]);

  return (
    <div className="editor-wrap" ref={wrapRef}>
      <div className="editor-inner">
        <div className="line-gutter" aria-hidden="true">
          {lines.map((l) => (
            <span key={l.n} className="line-no" style={{ top: l.top }}>
              {l.n}
            </span>
          ))}
        </div>
        <EditorContent editor={editor} className="editor-content" />
      </div>
    </div>
  );
});

export default Editor;
