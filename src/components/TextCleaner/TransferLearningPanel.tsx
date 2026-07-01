import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  trainCustomModel, loadModelsFromIDB, deleteModelFromIDB, saveModelToIDB,
  saveDatasetToIDB, loadDatasetFromIDB, listDatasetsFromIDB,
  type LabeledText, type TrainingProgress, type CustomModel, DEFAULT_TRAINING_CONFIG,
} from "@/lib/transfer";
import { Brain, Play, Square, Trash2, Download, Upload, Check, X, Loader2, Cpu, Save, FolderOpen, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { TransferLearningHelp } from "./TransferLearningHelp";

interface TransferLearningPanelProps {
  onModelLoaded: (model: CustomModel | null) => void;
  activeModel: CustomModel | null;
}

export const TransferLearningPanel: React.FC<TransferLearningPanelProps> = ({ onModelLoaded, activeModel }) => {
  const [samples, setSamples] = useState<LabeledText[]>([]);
  const [inputText, setInputText] = useState("");
  const [inputLabel, setInputLabel] = useState<"human" | "ai">("human");
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [savedModels, setSavedModels] = useState<CustomModel[]>([]);
  const [epochs, setEpochs] = useState(DEFAULT_TRAINING_CONFIG.epochs);
  const [showModels, setShowModels] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const refreshModels = useCallback(async () => {
    const models = await loadModelsFromIDB();
    setSavedModels(models);
  }, []);

  const addSample = useCallback(() => {
    if (!inputText.trim() || inputText.trim().length < 50) {
      toast.error("Le texte doit faire au moins 50 caractères.");
      return;
    }
    setSamples((prev) => [...prev, { text: inputText.trim(), label: inputLabel, addedAt: new Date().toISOString() }]);
    setInputText("");
    toast.success(`${inputLabel === "ai" ? "IA" : "Humain"} ajouté (${samples.length + 1} échantillons)`);
  }, [inputText, inputLabel, samples.length]);

  const removeSample = useCallback((idx: number) => {
    setSamples((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleTrain = useCallback(async () => {
    const aiCount = samples.filter((s) => s.label === "ai").length;
    const humanCount = samples.filter((s) => s.label === "human").length;
    if (aiCount < 2 || humanCount < 2) {
      toast.error("Minimum 2 échantillons IA + 2 humains requis.");
      return;
    }

    setIsTraining(true);
    setProgress(null);

    try {
      const model = await trainCustomModel(samples, { epochs, learningRate: 0.001 }, (p) => {
        setProgress(p);
      });
      await saveModelToIDB(model);
      onModelLoaded(model);
      toast.success(`Modèle entraîné ! Précision : ${Math.round(model.valAccuracy * 100)}%`);
      refreshModels();
    } catch (err) {
      toast.error(`Entraînement échoué : ${(err as Error).message}`);
    } finally {
      setIsTraining(false);
    }
  }, [samples, epochs, onModelLoaded, refreshModels]);

  const handleDeleteModel = useCallback(async (id: string) => {
    await deleteModelFromIDB(id);
    if (activeModel?.id === id) onModelLoaded(null);
    refreshModels();
    toast.success("Modèle supprimé");
  }, [activeModel, onModelLoaded, refreshModels]);

  const handleExportDataset = useCallback(() => {
    const blob = new Blob([JSON.stringify(samples, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `unrobot-dataset-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Dataset exporté");
  }, [samples]);

  const handleImportDataset = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as LabeledText[];
        if (!Array.isArray(data)) throw new Error("Format invalide");
        setSamples((prev) => [...prev, ...data.filter((d) => d.text && d.label)]);
        toast.success(`${data.length} échantillons importés`);
      } catch { toast.error("Fichier JSON invalide"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // Charger les modèles au mount
  React.useEffect(() => { refreshModels(); }, [refreshModels]);

  const aiCount = samples.filter((s) => s.label === "ai").length;
  const humanCount = samples.filter((s) => s.label === "human").length;

  return (
    <>
    <div className="space-y-4 animate-fade-in" role="region" aria-label="Transfer Learning">
      {/* En-tête */}
      <div className="p-6 rounded-lg border border-border bg-card/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">Modèle personnalisé</h3>
              <p className="text-xs text-muted-foreground">Transfer Learning in-browser · Pur JavaScript</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Aide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          {activeModel && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-success">
                <Cpu className="w-3.5 h-3.5" />
                <span className="text-sm font-medium">{activeModel.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">Précision : {Math.round(activeModel.valAccuracy * 100)}%</p>
            </div>
          )}
        </div>

        {/* Stats dataset */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-2.5 rounded-md border border-border bg-background/40 text-center">
            <div className="text-xl font-bold text-foreground">{samples.length}</div>
            <p className="text-xs text-muted-foreground">Échantillons</p>
          </div>
          <div className="p-2.5 rounded-md border border-success/30 bg-success/10 text-center">
            <div className="text-xl font-bold text-success">{humanCount}</div>
            <p className="text-xs text-muted-foreground">Humains</p>
          </div>
          <div className="p-2.5 rounded-md border border-destructive/30 bg-destructive/10 text-center">
            <div className="text-xl font-bold text-destructive">{aiCount}</div>
            <p className="text-xs text-muted-foreground">IA</p>
          </div>
        </div>

        {/* Formulaire d'ajout */}
        <div className="space-y-2 mb-4">
          <textarea
            placeholder="Collez un texte humain ou généré par IA (min. 50 caractères)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={inputLabel === "ai"} onCheckedChange={(c) => setInputLabel(c ? "ai" : "human")} />
              <span className={inputLabel === "ai" ? "text-destructive font-medium" : "text-success font-medium"}>
                {inputLabel === "ai" ? "Texte IA" : "Texte humain"}
              </span>
            </label>
            <Button size="sm" onClick={addSample} disabled={inputText.trim().length < 50}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter
            </Button>
          </div>
        </div>

        {/* Actions dataset */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => document.getElementById("dataset-import")?.click()}>
            <Upload className="w-3.5 h-3.5 mr-1" /> Importer JSON
          </Button>
          <input id="dataset-import" type="file" accept=".json" className="hidden" onChange={handleImportDataset} />
          <Button variant="outline" size="sm" onClick={handleExportDataset} disabled={samples.length === 0}>
            <Download className="w-3.5 h-3.5 mr-1" /> Exporter dataset
          </Button>
          {samples.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSamples([])} className="text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Vider
            </Button>
          )}
        </div>

        {/* Configuration entraînement */}
        <div className="flex items-center gap-4 mb-4 p-3 rounded-md border border-border bg-background/40">
          <label className="text-xs text-muted-foreground">Époques :</label>
          <select
            value={epochs}
            onChange={(e) => setEpochs(Number(e.target.value))}
            className="text-sm bg-background border border-border rounded px-2 py-1"
          >
            <option value={10}>10 (rapide)</option>
            <option value={30}>30 (recommandé)</option>
            <option value={50}>50 (précis)</option>
            <option value={100}>100 (exhaustif)</option>
          </select>
          <div className="flex-1" />
          <Button size="sm" onClick={handleTrain} disabled={isTraining || aiCount < 2 || humanCount < 2}>
            {isTraining ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Entraînement...</>
            ) : (
              <><Play className="w-3.5 h-3.5 mr-1" /> Entraîner</>
            )}
          </Button>
        </div>

        {/* Barre de progression */}
        {progress && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span>Époque {progress.epoch}/{progress.totalEpochs}</span>
              <span>Loss: {progress.trainLoss.toFixed(4)}</span>
              {progress.valAccuracy !== undefined && (
                <span className="text-success">Précision: {Math.round(progress.valAccuracy * 100)}%</span>
              )}
            </div>
            <Progress value={(progress.epoch / progress.totalEpochs) * 100} className="h-2" />
          </div>
        )}

        {/* Modèles sauvegardés */}
        <div>
          <button
            onClick={() => { setShowModels(!showModels); if (!showModels) refreshModels(); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={showModels}
          >
            <FolderOpen className="w-3 h-3" />
            Modèles sauvegardés ({savedModels.length})
          </button>

          {showModels && savedModels.length > 0 && (
            <ul className="mt-2 space-y-1" role="list">
              {savedModels.map((m) => (
                <li key={m.id} className={`flex items-center justify-between px-2 py-1.5 rounded text-xs border ${activeModel?.id === m.id ? "border-primary/50 bg-primary/10" : "border-border bg-background/60"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {activeModel?.id === m.id ? <Check className="w-3 h-3 text-success" /> : <Cpu className="w-3 h-3 text-muted-foreground" />}
                    <span className="truncate">{m.name}</span>
                    <span className="text-muted-foreground">{Math.round(m.valAccuracy * 100)}% · {m.sampleCount} samples</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { onModelLoaded(m); toast.success("Modèle activé"); }} className="p-1 hover:text-primary" aria-label="Activer">
                      <Play className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDeleteModel(m.id)} className="p-1 hover:text-destructive" aria-label="Supprimer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showModels && savedModels.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">Aucun modèle sauvegardé. Entraînez-en un ci-dessus.</p>
          )}
        </div>
      </div>

      {/* Aperçu des échantillons (pliable) */}
      {samples.length > 0 && (
        <div className="p-4 rounded-lg border border-border bg-card/80">
          <p className="text-xs text-muted-foreground mb-2">
            Derniers échantillons ({samples.length} au total)
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {samples.slice(-5).reverse().map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs p-1.5 rounded bg-background/40">
                <span className={`mt-0.5 px-1 py-0.5 rounded text-[10px] font-medium ${s.label === "ai" ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"}`}>
                  {s.label === "ai" ? "IA" : "HUM"}
                </span>
                <span className="line-clamp-1 text-muted-foreground">{s.text.slice(0, 80)}...</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
      <TransferLearningHelp open={showHelp} onOpenChange={setShowHelp} />
    </>
  );
};

// Need Plus icon
function Plus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}