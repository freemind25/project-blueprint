/**
 * Tauri Desktop Bridge — typed wrappers for Rust backend commands.
 * Only active when running inside Tauri (window.__TAURI__ exists).
 * Falls back to no-op in web mode.
 */

interface DocumentText {
  filename: string;
  text: string;
  word_count: number;
  char_count: number;
}

interface BatchResult {
  documents: DocumentText[];
  total_files: number;
  total_words: number;
  errors: Array<{ filename: string; error: string }>;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(`Tauri command "${cmd}" called in web mode`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

/**
 * Read a single document file (.txt, .md, .docx, .odt, etc.) and extract text.
 */
export async function readDocument(path: string): Promise<DocumentText> {
  return invoke<DocumentText>("read_document", { path });
}

/**
 * Batch read multiple documents at once.
 */
export async function batchReadDocuments(paths: string[]): Promise<BatchResult> {
  return invoke<BatchResult>("batch_read_documents", { paths });
}

/**
 * Recursively scan a directory for all supported document files.
 */
export async function scanDirectory(path: string): Promise<string[]> {
  return invoke<string[]>("scan_directory", { path });
}

/**
 * Save text content to a file.
 */
export async function saveDocument(path: string, content: string): Promise<void> {
  return invoke<void>("save_document", { path, content });
}

/**
 * Open a native file picker for one or more files.
 * Returns selected file paths or empty array if cancelled.
 */
export async function pickFiles(multiple: boolean = false): Promise<string[]> {
  if (!isTauri()) return [];
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({ multiple, filters: [
    { name: "Documents", extensions: ["txt", "md", "docx", "odt", "pdf", "csv", "rtf", "tex", "html"] },
    { name: "All Files", extensions: ["*"] },
  ]});
  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
}

/**
 * Open a native folder picker.
 * Returns selected folder path or null if cancelled.
 */
export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  return (await open({ directory: true })) as string | null;
}

/**
 * Check if running in Tauri desktop mode.
 */
export { isTauri };