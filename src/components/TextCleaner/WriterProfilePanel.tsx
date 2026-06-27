import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildProfile, serializeProfile, parseProfile, type WriterProfile } from "@/lib/writerProfile";
import { downloadBlob } from "@/lib/utils";
import { UserPen, Download, Upload, Trash2 } from "lucide-react";

interface WriterProfilePanelProps {
  profile: WriterProfile | null;
  onProfileChange: (p: WriterProfile | null) => void;
}

export const WriterProfilePanel: React.FC<WriterProfilePanelProps> = ({ profile, onProfileChange }) => {
  const [sample, setSample] = useState("");
  const [open, setOpen] = useState(false);

  const handleAnalyze = () => {
    if (sample.trim().length < 100) {
      toast.error("Collez au moins 100 caractères de votre écriture");
      return;
    }
    const p = buildProfile(sample);
    onProfileChange(p);
    toast.success("Profil stylistique créé");
  };

  const handleExport = () => {
    if (!profile) return;
    const blob = new Blob([serializeProfile(profile)], { type: "application/json;charset=utf-8" });
    downloadBlob(blob, "profil-stylistique.json");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const p = parseProfile(await file.text());
      onProfileChange(p);
      toast.success("Profil importé");
    } catch {
      toast.error("Fichier de profil invalide");
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="writer-profile-panel"
        className="flex w-full items-center justify-between text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <UserPen className="w-4 h-4 text-primary" />
          Profil d'écriture
          {profile && <span className="text-xs text-primary">({profile.name})</span>}
        </span>
        <span className="text-xs text-muted-foreground">{open ? "Masquer" : "Configurer"}</span>
      </button>

      {open && (
        <div id="writer-profile-panel" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Collez un de vos textes pour créer un profil stylistique local (JSON). Il sert à réécrire dans votre style.
          </p>
          <Textarea
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            placeholder="Collez ici un exemple de votre écriture..."
            className="min-h-24 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleAnalyze}>
              <UserPen className="w-4 h-4" /> Analyser mon style
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={!profile}>
              <Download className="w-4 h-4" /> Exporter
            </Button>
            <Button size="sm" variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4" /> Importer
                <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
              </label>
            </Button>
            {profile && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onProfileChange(null)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" /> Retirer
              </Button>
            )}
          </div>

          {profile && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded border border-border bg-background/40">
                <div className="font-semibold">{profile.metrics.avgSentenceLength}</div>
                <div className="text-muted-foreground">mots/phrase</div>
              </div>
              <div className="p-2 rounded border border-border bg-background/40">
                <div className="font-semibold">{Math.round(profile.metrics.lexicalDiversity * 100)}%</div>
                <div className="text-muted-foreground">diversité</div>
              </div>
              <div className="p-2 rounded border border-border bg-background/40">
                <div className="font-semibold">{profile.metrics.firstPersonRate}</div>
                <div className="text-muted-foreground">1re pers./phrase</div>
              </div>
              <div className="p-2 rounded border border-border bg-background/40">
                <div className="font-semibold uppercase">{profile.language}</div>
                <div className="text-muted-foreground">langue</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};