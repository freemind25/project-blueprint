import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { addReference, removeReference, getCorpus, clearCorpus, getCorpusSize, analyzePlagiarism, type PlagiarismResult, type PlagiarismConfig, type ReferenceDocument } from "@/lib/plagiarism";

const CORPUS_KEY = "unrobot:plagiarism-corpus";
function loadCorpus(): ReferenceDocument[] {
  try { const s = localStorage.getItem(CORPUS_KEY); if (!s) return []; return (JSON.parse(s) as Array<Record<string, unknown>>).map(d => ({ ...d, signature: new Uint32Array(d.signature as number[]) })); } catch { return []; }
}
function saveCorpus(docs: ReferenceDocument[]) { try { localStorage.setItem(CORPUS_KEY, JSON.stringify(docs)); } catch { /* storage full */ } }

export const usePlagiarism = () => {
  const [references, setReferences] = useState<ReferenceDocument[]>(() => { const s = loadCorpus(); s.forEach(d => addReference(d.text, d.name)); return s; });
  const [lastResult, setLastResult] = useState<PlagiarismResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const sizeRef = useRef(getCorpusSize());
  const sync = useCallback(() => { const d = getCorpus(); setReferences([...d]); sizeRef.current = d.length; saveCorpus(d); }, []);

  const checkPlagiarism = useCallback((text: string, config?: PlagiarismConfig): PlagiarismResult => {
    if (sizeRef.current === 0) { toast.error("Ajoutez au moins un document de référence."); return { overallScore: 0, maxSimilarity: 0, referencesChecked: 0, matches: [], analysisTimeMs: 0, inputShingleCount: 0 }; }
    setIsChecking(true);
    const result = analyzePlagiarism(text, config);
    setLastResult(result); setIsChecking(false);
    if (result.overallScore > 0) { toast.warning(`Similarité : ${result.overallScore}%`); } else { toast.success("Aucune similarité détectée."); }
    return result;
  }, []);

  const addRef = useCallback((text: string, name: string) => { const d = addReference(text, name); sync(); toast.success(`« ${name} » ajouté`); return d; }, [sync]);
  const removeRef = useCallback((id: string) => { if (removeReference(id)) { sync(); toast.success("Référence supprimée"); } }, [sync]);
  const clearAllRefs = useCallback(() => { clearCorpus(); sync(); setLastResult(null); toast.success("Corpus vidé"); }, [sync]);
  const importFile = useCallback(async (file: File) => { try { const c = await file.text(); if (!c.trim()) { toast.error("Fichier vide."); return; } addRef(c, file.name); } catch { toast.error("Lecture impossible."); } }, [addRef]);

  return { checkPlagiarism, addRef, removeRef, clearAllRefs, references, corpusSize: sizeRef.current, lastResult, isChecking, importFile };
};