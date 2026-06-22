import React, { useEffect, useCallback } from "react";
import { useTextCleaner } from "@/hooks/useTextCleaner";
import { useAIDetector } from "@/hooks/useAIDetector";
import { Header } from "./Header";
import { TextEditor } from "./TextEditor";
import { ActionBar } from "./ActionBar";

export const TextCleaner: React.FC = () => {
  const { 
    text, setText, performClean, performHumanize, clearAll, 
    isProcessing, isHumanizing, intensity, setIntensity 
  } = useTextCleaner();
  
  const { analyzeText } = useAIDetector();

  // Analyse en arrière-plan avec requestIdleCallback
  useEffect(() => {
    if (!text || text.length < 50) return;

    const win = window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback: (id: number) => void };
    const handle = win.requestIdleCallback(() => {
      const result = analyzeText(text);
      console.log("Background Analysis Result:", result);
      // Ici, on pourrait mettre à jour un état local pour afficher le score en temps réel
    }, { timeout: 2000 });

    return () => win.cancelIdleCallback(handle);
  }, [text, analyzeText]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Header />
      <TextEditor value={text} onChange={setText} />
      <ActionBar 
        onClean={performClean} 
        onHumanize={performHumanize} 
        onClear={clearAll}
        isProcessing={isProcessing}
        isHumanizing={isHumanizing}
      />
      {/* Autres composants de stats et d'analyse */}
    </div>
  );
};
