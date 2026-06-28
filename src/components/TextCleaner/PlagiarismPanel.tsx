import React, { useState, useRef } from "react";
import { toast } from "sonner";
import type { PlagiarismResult, ReferenceDocument } from "@/lib/plagiarism";
import { ShieldCheck, AlertTriangle, XCircle, Upload, Trash2, Plus, FileText, Search, Clock, Database, ChevronDown, ChevronUp, X, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  result: PlagiarismResult | null; isChecking: boolean; corpusSize: number; references: ReferenceDocument[];
  onCheck: (text: string) => PlagiarismResult; onAddRef: (text: string, name: string) => void;
  onRemoveRef: (id: string) => void; onClearAllRefs: () => void; onImportFile: (file: File) => Promise<void>; inputText: string;
}

const sevCfg = { low: { c: "border-success/30 bg-success/10", ic: "text-success", l: "Faible" }, medium: { c: "border-warning/30 bg-warning/10", ic: "text-warning", l: "Modéré" }, high: { c: "border-destructive/50 bg-destructive/10", ic: "text-destructive", l: "Élevé" }, critical: { c: "border-destructive bg-destructive/20", ic: "text-destructive", l: "Critique" } };

export const PlagiarismPanel: React.FC<Props> = ({ result, isChecking, corpusSize, references, onCheck, onAddRef, onRemoveRef, onClearAllRefs, onImportFile, inputText }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { onImportFile(f); e.target.value = ""; } };
  const handleAdd = () => { if (!newText.trim()) { toast.error("Texte vide."); return; } onAddRef(newText, newName.trim() || `Référence ${corpusSize + 1}`); setNewName(""); setNewText(""); setShowForm(false); };

  return (
    <div className="space-y-4 animate-fade-in" role="region" aria-label="Détection de plagiat">
      <div className="p-6 rounded-lg border border-border bg-card/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">Détection de plagiat</h3>
              <p className="text-xs text-muted-foreground">MinHash · {corpusSize} réf. · 100% local</p>
            </div>
          </div>
          {result && (
            <div className="text-right">
              <div className={`text-3xl font-bold ${result.overallScore < 20 ? "text-success" : result.overallScore < 40 ? "text-warning" : "text-destructive"}`}>{result.overallScore}%</div>
              <p className="text-xs text-muted-foreground">Similarité</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onCheck(inputText)} disabled={!inputText.trim() || isChecking || corpusSize === 0}>
            {isChecking ? <><Search className="w-3.5 h-3.5 mr-1 animate-pulse" /> Analyse...</> : <><Search className="w-3.5 h-3.5 mr-1" /> Analyser</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1" /> Importer</Button>
          <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFile} />
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-3.5 h-3.5 mr-1" /> Ajouter</Button>
          {corpusSize > 0 && <Button variant="ghost" size="sm" onClick={onClearAllRefs} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-1" /> Vider</Button>}
        </div>

        {showForm && (
          <div className="mt-3 p-3 rounded-md border border-border space-y-2">
            <input type="text" placeholder="Nom (optionnel)" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-md" />
            <textarea placeholder="Collez le texte de référence..." value={newText} onChange={e => setNewText(e.target.value)} rows={3} className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-md resize-y" />
            <div className="flex gap-2"><Button size="sm" onClick={handleAdd} disabled={!newText.trim()}>Ajouter</Button><Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button></div>
          </div>
        )}

        {corpusSize > 0 && (
          <div className="mt-3">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" aria-expanded={isOpen}>
              <Database className="w-3 h-3" /> Corpus ({corpusSize}) {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {isOpen && <ul className="mt-2 space-y-1">{references.map(r => (
              <li key={r.id} className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-background/60 border border-border/50">
                <div className="flex items-center gap-2 min-w-0"><FileText className="w-3 h-3 text-muted-foreground" /><span className="truncate">{r.name}</span><span className="text-muted-foreground opacity-60">({r.shingleCount})</span></div>
                <button onClick={() => onRemoveRef(r.id)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
              </li>
            ))}</ul>}
          </div>
        )}
        {corpusSize === 0 && !isChecking && <div className="mt-3 p-3 rounded-md border border-dashed border-border/60 text-center"><p className="text-xs text-muted-foreground">Aucune référence. Importez ou collez un texte.</p></div>}
      </div>

      {result && result.matches.length > 0 && result.matches.map((m, i) => {
        const sev = sevCfg[m.severity];
        return (
          <div key={i} className={`p-4 rounded-lg border ${sev.c}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">{m.severity === "critical" ? <XCircle className={`w-4 h-4 ${sev.ic}`} /> : <AlertTriangle className={`w-4 h-4 ${sev.ic}`} />}<span className="text-sm font-medium">{m.reference.name}</span></div>
              <span className={`text-lg font-bold ${sev.ic}`}>{m.similarityPercent}%</span>
            </div>
            <Progress value={m.similarityPercent} className="h-1.5 mb-2" />
            {m.matchingPassages.length > 0 && m.matchingPassages.slice(0, 5).map((p, j) => (
              <div key={j} className="flex items-start gap-2 p-2 rounded bg-background/40 text-xs mb-1">
                <span className="font-mono text-muted-foreground">[{p.localSimilarity}%]</span>
                <span className="flex-1 line-clamp-2">{p.text}</span>
              </div>
            ))}
          </div>
        );
      })}

      {result && result.overallScore === 0 && result.referencesChecked > 0 && (
        <div className="p-4 rounded-lg border border-success/30 bg-success/10 text-center">
          <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" /><p className="text-sm text-success font-medium">Aucun plagiat détecté</p>
        </div>
      )}

      {isChecking && <div className="p-6 rounded-lg border border-border bg-card/80 space-y-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-2 w-full" /><Skeleton className="h-16 w-full" /></div>}

      {result && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1"><Database className="w-3 h-3" />{result.referencesChecked} ref.</span>
          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{result.inputShingleCount} shingles</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{result.analysisTimeMs} ms</span>
        </div>
      )}
    </div>
  );
};