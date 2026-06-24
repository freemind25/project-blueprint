import React from "react";
import type { HumanizeMode } from "@/hooks/useTextCleaner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";

interface ModeSelectorProps {
  mode: HumanizeMode;
  onModeChange: (m: HumanizeMode) => void;
  untilNatural: boolean;
  onUntilNaturalChange: (v: boolean) => void;
}

const MODES: { value: HumanizeMode; label: string; hint: string }[] = [
  { value: "naturel", label: "Naturel", hint: "Ton fluide et conversationnel" },
  { value: "professionnel", label: "Professionnel", hint: "Clair, concis, sans jargon" },
  { value: "academique", label: "Académique", hint: "Registre soutenu et précis" },
  { value: "expert", label: "Expert", hint: "Direct, technique, sans hésitation" },
  { value: "personnel", label: "Personnel", hint: "Première personne, oralité" },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  onModeChange,
  untilNatural,
  onUntilNaturalChange,
}) => {
  const current = MODES.find((m) => m.value === mode) ?? MODES[0];
  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
      <span className="text-sm font-medium">Mode de réécriture</span>
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
              mode === m.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{current.hint}</p>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <label htmlFor="until-natural" className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-primary" />
          Humaniser jusqu'au score naturel
        </label>
        <Switch id="until-natural" checked={untilNatural} onCheckedChange={onUntilNaturalChange} />
      </div>
      <p className="text-xs text-muted-foreground">
        Répète le pipeline (analyse → réécriture → vérification) jusqu'à un score IA &lt; 30%.
      </p>
    </div>
  );
};