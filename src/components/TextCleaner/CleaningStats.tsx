import React from "react";
import { CheckCircle2, Sparkles, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface CleaningStatsProps {
  nbspCount: number;
  narrowNbspCount: number;
  totalCleaned: number;
  isVisible: boolean;
}

export const CleaningStats: React.FC<CleaningStatsProps> = ({
  nbspCount,
  narrowNbspCount,
  totalCleaned,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-success/10 text-success">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Nettoyage terminé</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<FileText className="w-4 h-4" />}
          label="Espaces insécables (U+00A0)"
          value={nbspCount}
          color="primary"
        />
        <StatCard
          icon={<FileText className="w-4 h-4" />}
          label="Espaces minces (U+202F)"
          value={narrowNbspCount}
          color="accent"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Total remplacés"
          value={totalCleaned}
          color="success"
          highlight
        />
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
