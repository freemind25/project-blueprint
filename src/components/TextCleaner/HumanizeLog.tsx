import React from "react";
import { cn } from "@/lib/utils";
import { ChangeLog } from "@/hooks/useTextCleaner";
import {
  ArrowRightLeft,
  Scissors,
  MessageCircle,
  BookOpen,
  Quote,
  Type,
  HelpCircle,
  Repeat,
  List,
  Parentheses,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

interface HumanizeLogProps {
  changeLog: ChangeLog[];
}

const typeMeta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  transition: {
    label: "Transitions mécaniques remplacées",
    icon: <ArrowRightLeft className="w-4 h-4" />,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  sentence_split: {
    label: "Phrases longues découpées",
    icon: <Scissors className="w-4 h-4" />,
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  interjection: {
    label: "Interjections ajoutées",
    icon: <MessageCircle className="w-4 h-4" />,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  formal_to_informal: {
    label: "Mots formels désamorcés",
    icon: <BookOpen className="w-4 h-4" />,
    color: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  },
  punctuation: {
    label: "Ponctuation variée",
    icon: <Quote className="w-4 h-4" />,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  contraction: {
    label: "Contractions familières",
    icon: <Type className="w-4 h-4" />,
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
  rhetorical_question: {
    label: "Questions rhétoriques",
    icon: <HelpCircle className="w-4 h-4" />,
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
  repetition: {
    label: "Répétitions naturelles",
    icon: <Repeat className="w-4 h-4" />,
    color: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  },
  list_style: {
    label: "Styles de liste variés",
    icon: <List className="w-4 h-4" />,
    color: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  },
  parenthetical: {
    label: "Parenthèses explicatives",
    icon: <Parentheses className="w-4 h-4" />,
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  },
};

export const HumanizeLog: React.FC<HumanizeLogProps> = ({ changeLog }) => {
  const [expandedTypes, setExpandedTypes] = React.useState<Record<string, boolean>>({});

  if (!changeLog.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Aucune modification détectée</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Le texte n'a pas nécessité d'ajustements avec l'intensité actuelle. Essayez un niveau plus élevé.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Grouper par type
  const grouped = changeLog.reduce<Record<string, ChangeLog[]>>((acc, change) => {
    if (!acc[change.type]) acc[change.type] = [];
    acc[change.type].push(change);
    return acc;
  }, {});

  const toggle = (type: string) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10">
          <ArrowRightLeft className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Journal des modifications</h3>
          <p className="text-sm text-muted-foreground">
            {changeLog.length} changement{changeLog.length > 1 ? "s" : ""} appliqué{changeLog.length > 1 ? "s" : ""} pour humaniser le texte
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([type, changes]) => {
          const meta = typeMeta[type] || {
            label: type,
            icon: <Info className="w-4 h-4" />,
            color: "bg-muted text-muted-foreground border-border",
          };
          const isOpen = expandedTypes[type] ?? true;

          return (
            <div
              key={type}
              className="rounded-lg border border-border bg-background overflow-hidden"
            >
              <button
                onClick={() => toggle(type)}
                className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn("p-1.5 rounded-md border", meta.color)}>{meta.icon}</span>
                  <span className="text-sm font-medium text-foreground">{meta.label}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {changes.length}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {changes.map((change, i) => (
                    <div
                      key={i}
                      className="rounded-md bg-muted/40 p-3 text-sm space-y-1.5"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="line-through text-destructive/80 bg-destructive/5 px-1.5 py-0.5 rounded">
                          {change.original}
                        </span>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-success bg-success/5 px-1.5 py-0.5 rounded">
                          {change.replacement}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <Info className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                        {change.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
