/**
 * Web Worker pour le traitement de texte (Nettoyage + Humanisation).
 * Toute la logique vit dans des modules purs et testables (src/lib).
 * Le worker se contente d'orchestrer pour ne pas bloquer l'UI.
 */
import { performClean } from "@/lib/cleaner";
import { performHumanize, type HumanizeOptions } from "@/lib/humanizer";

self.onmessage = (e: MessageEvent) => {
  const { action, text, options } = e.data as {
    action: "clean" | "humanize";
    text: string;
    options?: HumanizeOptions;
  };

  if (action === "clean") {
    self.postMessage({ action: "clean", result: performClean(text) });
  } else if (action === "humanize") {
    self.postMessage({ action: "humanize", result: performHumanize(text, options) });
  }
};
