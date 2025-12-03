import { useState, useCallback } from "react";

interface CleaningResult {
  cleanedText: string;
  nbspCount: number;
  narrowNbspCount: number;
  totalCleaned: number;
}

export const useTextCleaner = () => {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCleaned, setIsCleaned] = useState(false);
  const [stats, setStats] = useState<CleaningResult | null>(null);

  const loadFile = useCallback((content: string, name: string) => {
    setText(content);
    setFileName(name);
    setIsCleaned(false);
    setStats(null);
  }, []);

  const cleanText = useCallback((inputText: string): CleaningResult => {
    // U+00A0 - Non-breaking space
    const nbsp = /\u00A0/g;
    // U+202F - Narrow non-breaking space
    const narrowNbsp = /\u202F/g;

    const nbspMatches = inputText.match(nbsp) || [];
    const narrowNbspMatches = inputText.match(narrowNbsp) || [];

    const nbspCount = nbspMatches.length;
    const narrowNbspCount = narrowNbspMatches.length;

    // Replace with normal space
    const cleanedText = inputText.replace(nbsp, " ").replace(narrowNbsp, " ");

    return {
      cleanedText,
      nbspCount,
      narrowNbspCount,
      totalCleaned: nbspCount + narrowNbspCount,
    };
  }, []);

  const performClean = useCallback(() => {
    if (!text) return;

    setIsProcessing(true);
    
    // Simulate processing time for UX
    setTimeout(() => {
      const result = cleanText(text);
      setText(result.cleanedText);
      setStats(result);
      setIsCleaned(true);
      setIsProcessing(false);
    }, 300);
  }, [text, cleanText]);

  const clearAll = useCallback(() => {
    setText("");
    setFileName(null);
    setIsCleaned(false);
    setStats(null);
  }, []);

  const downloadFile = useCallback(() => {
    if (!text) return;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const outputName = fileName
      ? fileName.replace(".txt", "_nettoyé.txt")
      : "texte_nettoyé.txt";
    
    link.href = url;
    link.download = outputName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [text, fileName]);

  const copyToClipboard = useCallback(async () => {
    if (!text) return false;
    
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, [text]);

  return {
    text,
    setText,
    fileName,
    isProcessing,
    isCleaned,
    stats,
    loadFile,
    performClean,
    clearAll,
    downloadFile,
    copyToClipboard,
  };
};
