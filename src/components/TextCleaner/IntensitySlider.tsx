import React from "react";
import { Slider } from "@/components/ui/slider";
import { HumanizeIntensity } from "@/hooks/useTextCleaner";
import { Zap, ZapOff, Flame } from "lucide-react";

interface IntensitySliderProps {
  value: HumanizeIntensity;
  onChange: (value: HumanizeIntensity) => void;
}

const intensityLevels: { value: HumanizeIntensity; label: string; description: string }[] = [
  { value: "light", label: "Léger", description: "Modifications subtiles" },
  { value: "moderate", label: "Modéré", description: "Équilibre naturel" },
  { value: "aggressive", label: "Agressif", description: "Transformations profondes" },
];

const intensityToValue = (intensity: HumanizeIntensity): number => {
  switch (intensity) {
    case "light": return 0;
    case "moderate": return 50;
    case "aggressive": return 100;
  }
};

const valueToIntensity = (value: number): HumanizeIntensity => {
  if (value <= 25) return "light";
  if (value <= 75) return "moderate";
  return "aggressive";
};

export const IntensitySlider: React.FC<IntensitySliderProps> = ({ value, onChange }) => {
  const currentLevel = intensityLevels.find((level) => level.value === value) || intensityLevels[1];

  const handleValueChange = (values: number[]) => {
    onChange(valueToIntensity(values[0]));
  };

  const Icon = value === "light" ? ZapOff : value === "moderate" ? Zap : Flame;
  const iconColor = value === "light" ? "text-muted-foreground" : value === "moderate" ? "text-primary" : "text-orange-500";

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-medium">Intensité d'humanisation</span>
        </div>
        <span className="text-sm font-semibold text-primary">{currentLevel.label}</span>
      </div>
      
      <Slider
        value={[intensityToValue(value)]}
        onValueChange={handleValueChange}
        max={100}
        step={50}
        className="w-full"
      />
      
      <div className="flex justify-between text-xs text-muted-foreground">
        {intensityLevels.map((level) => (
          <button
            key={level.value}
            onClick={() => onChange(level.value)}
            className={`transition-colors hover:text-foreground ${
              value === level.value ? "text-primary font-medium" : ""
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground text-center mt-1">
        {currentLevel.description}
      </p>
    </div>
  );
};
