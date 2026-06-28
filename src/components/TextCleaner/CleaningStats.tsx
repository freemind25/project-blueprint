import React from "react";
import { CheckCircle2, Sparkles, FileText, Eye, Flag, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CleanStats } from "@/lib/cleaner";

interface CleaningStatsProps {
  stats: CleanStats;
  isVisible: boolean;
}

const STAT_ITEMS: { key: keyof CleanStats; label: string; icon: React.ReactNode; color: "primary" | "accent" | "success" }[] = [
  { key: "nbspCount", label: "Espaces insécables (U+00A0)", icon: <FileText className="w-4 h-4" />, color: "primary" },
  { key: "narrowNbspCount", label: "Espaces minces (U+202F)", icon: <FileText className="w-4 h-4" />, color: "accent" },
  { key: "zeroWidthCount", label: "Caractères largeur zéro", icon: <Eye className="w-4 h-4" />, color: "accent" },
  { key: "bidiCount", label: "Marques directionnelles", icon: <Flag className="w-4 h-4" />, color: "accent" },
  { key: "bomCount", label: "BOM (U+FEFF)", icon: <Eraser className="w-4 h-4" />, color: "accent" },
  { key: "otherInvisibleCount", label: "Autres invisibles", icon: <Eraser className="w-4 h-4" />, color: "accent" },
];

export const CleaningStats: React.FC<CleaningStatsProps> = ({ stats, isVisible }) => {
  if (!isVisible) return null;

  const activeItems = STAT_ITEMS.filter((item) => (stats[item.key] as number) > 0);
  const hasMultipleTypes = activeItems.length > 1;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-success/10 text-success">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Nettoyage terminé</h3>
      </div>

      <div className={cn(
        "grid gap-4",
        hasMultipleTypes ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
      )}>
        {activeItems.map((item) => (
          <StatCard
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={stats[item.key] as number}
            color={item.color}
          />
        ))}

        {stats.totalCleaned > 0 && (
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Total remplacés"
            value={stats.totalCleaned}
            color="success"
            highlight
          />
        )}
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "primary" | "accent" | "success";
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, highlight }) => {
  const colorClasses = {
    primary: "bg-primary/5 border-primary/20 text-primary",
    accent: "bg-accent border-accent-foreground/20 text-accent-foreground",
    success: "bg-success/5 border-success/20 text-success",
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all duration-300",
        colorClasses[color],
        highlight && "ring-2 ring-success/30 shadow-lg"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className={cn("text-3xl font-bold", highlight && "animate-sparkle")}>
        {value.toLocaleString("fr-FR")}
      </p>
    </div>
  );
};