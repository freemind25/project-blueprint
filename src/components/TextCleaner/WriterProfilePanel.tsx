import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { buildProfile, serializeProfile, parseProfile, type WriterProfile } from "@/lib/writerProfile";
import { UserPen, Download, Upload, Trash2, Plus, Check } from "lucide-react";

interface WriterProfilePanelProps {
  profile: WriterProfile | null;
  profiles: Record<string, WriterProfile>;
  onProfileChange: (p: WriterProfile | null) => void;
  onSaveProfile: (p: WriterProfile) => void;
  onDeleteProfile: (name: string) => void;
  onSelectProfile: (name: string | null) => void;
}

export const WriterProfilePanel: React.FC<WriterProfilePanelProps> = ({
  profile,
  profiles,
  onProfileChange,
  onSaveProfile,
  onDeleteProfile,
  onSelectProfile,
}) => {
  const [sample, setSample] = useState("");
  const [open, setOpen] = useState(false);
  const [profileName, setProfileName] = useState("Mon style");

  const profileList = Object.values(profiles);

  const handleAnalyze = () => {
    if (sample.trim().length < 100) {
      toast.error("Collez au moins 100 caractères de votre écriture");
      return;
    }
    const name = profileName.trim() || "Mon style";
    const p = buildProfile(sample, name);
    onSaveProfile(p);
    toast.success(`Profil "${name}" créé et sauvegardé`);
    setSample("");
  };

  const handleExport = () => {
    if (!profile) return;
    const blob = new Blob([serializeProfile(profile)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `profil-${profile.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const p = parseProfile(await file.text());
      onSaveProfile(p);
      toast.success(`Profil "${p.name}" importé`);
    } catch {
      toast.error("Fichier de profil invalide");
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <UserPen className="w-4 h-4 text-primary" />
          Profils d'écriture
          {profile && <span className="text-xs text-primary">({profile.name})</span>}
          {profileList.length > 0 && (
            <span className="text-xs text-muted-foreground">({profileList.length} profil{profileList.length > 1 ? "s" : ""})</span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{open ? "Masquer" : "Configurer"}</span>
      </button>

      {open && (
        <div className="space-y-4">
          {/* Liste des profils existants */}
          {profileList.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Profils sauvegardés :</p>
              <div className="flex flex-wrap gap-2">
                {profileList.map((p) => (
                  <div key={p.name} className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={profile?.name === p.name ? "default" : "outline"}
                      onClick={() => onSelectProfile(profile?.name === p.name ? null : p.name)}
                      className="text-xs"
                    >
                      {profile?.name === p.name && <Check className="w-3 h-3" />}
                      {p.name}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onDeleteProfile(p.name);
                        toast.success(`Profil "${p.name}" supprimé`);
                      }}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Créer un nouveau profil */}
          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              <Plus className="w-3 h-3 inline" /> Créer un nouveau profil : collez un de vos textes et nommez-le.
            </p>
            <Input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Nom du profil (ex: Travail, Réseaux sociaux...)"
              className="text-sm"
            />
            <Textarea
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              placeholder="Collez ici un exemple de votre écriture..."
              className="min-h-24 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleAnalyze}>
                <UserPen className="w-4 h-4" /> Analyser et sauvegarder
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
            </div>
          </div>

          {/* Métriques du profil actif */}
          {profile && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                Profil actif : <span className="text-primary">{profile.name}</span>
              </p>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};
