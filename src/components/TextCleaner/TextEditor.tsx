import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  value,
  onChange,
  placeholder = "Collez ou tapez votre texte ici...",
  className,
  readOnly = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(300, textarea.scrollHeight)}px`;
    }
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={cn(
          "w-full min-h-[300px] p-6 rounded-2xl resize-none",
          "bg-card border border-border",
          "font-mono text-sm leading-relaxed text-foreground",
          "placeholder:text-muted-foreground/60",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
          "transition-all duration-200 ease-smooth",
          "shadow-inner-soft",
          readOnly && "bg-muted cursor-default"
        )}
        spellCheck={false}
      />
      
      {/* Character count */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/60 font-mono bg-card/80 px-2 py-1 rounded-md">
        {value.length.toLocaleString("fr-FR")} caractères
      </div>
    </div>
  );
};
