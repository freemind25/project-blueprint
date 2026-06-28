/**
 * Web Worker pour le traitement de texte (Nettoyage + Humanisation).
 * Toute la logique vit dans des modules purs et testables (src/lib).
 * Le worker se contente d'orchestrer pour ne pas bloquer l'UI.
 */
import { performClean } from "@/lib/cleaner";
import { performHumanize, type HumanizeOptions } from "@/lib/humanizer";

const VALID_ACTIONS = new Set(["clean", "humanize"]);

self.onmessage = (e: MessageEvent) => {
  const data = e.data;

  // Validation minimale des messages entrants
  if (!data || typeof data !== "object") return;
  const { action, text } = data as Record<string, unknown>;
  if (typeof action !== "string" || !VALID_ACTIONS.has(action)) return;
  if (typeof text !== "string") return;

  if (action === "clean") {
    self.postMessage({ action: "clean", result: performClean(text) });
  } else if (action === "humanize") {
    self.postMessage({ action: "humanize", result: performHumanize(text, data.options as HumanizeOptions | undefined) });
  }
};
