import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Content */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-50 w-full max-w-2xl max-h-[85vh] mx-4 rounded-xl border border-border bg-card shadow-2xl animate-scale-in flex flex-col",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface DialogHeaderProps {
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
}

export function DialogHeader({ title, onClose, children }: DialogHeaderProps) {
  return (
    <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-border shrink-0">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {children && <p className="text-sm text-muted-foreground mt-0.5">{children}</p>}
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-y-auto px-6 py-4 space-y-5 text-sm text-foreground/90", className)}>
      {children}
    </div>
  );
}