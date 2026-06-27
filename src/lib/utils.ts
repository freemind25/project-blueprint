import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// HTML escaping — échappe &, <, >, ", ' pour insertion safe dans du HTML.
// ---------------------------------------------------------------------------
export const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ---------------------------------------------------------------------------
// Download helper — télécharge un Blob sous un nom de fichier donné.
// ---------------------------------------------------------------------------
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Print helper — ouvre une popup avec du HTML et déclenche l'impression.
// ---------------------------------------------------------------------------
export function printHTML(html: string) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

// ---------------------------------------------------------------------------
// Text splitting — découpe un texte en phrases (FR + EN).
// ---------------------------------------------------------------------------
export function splitSentences(text: string): string[] {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
}
