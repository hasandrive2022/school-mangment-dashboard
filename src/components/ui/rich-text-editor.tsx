"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Link, List, ListOrdered, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "বিবরণ লিখুন…",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value)
      editorRef.current.innerHTML = value;
  }, [value]);
  function command(name: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, commandValue);
    onChange(editorRef.current?.innerHTML ?? "");
  }
  return (
    <div className="rich-editor">
      <div className="rich-editor-toolbar" aria-label="বিবরণ formatting">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          title="Bold"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("bold")}
        >
          <Bold className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          title="Italic"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("italic")}
        >
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          title="Underline"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("underline")}
        >
          <Underline className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          title="Bullet list"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("insertUnorderedList")}
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          title="Numbered list"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("insertOrderedList")}
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          title="Link"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("createLink", window.prompt("লিংক URL") ?? "")}
        >
          <Link className="size-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        className="rich-editor-surface"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        role="textbox"
        aria-multiline="true"
      />
    </div>
  );
}
