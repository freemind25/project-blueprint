import React from "react";
import { cn } from "@/lib/utils";
import { ChangeLog } from "@/hooks/useTextCleaner";
import { Button } from "@/components/ui/button";
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
  FileJson,
  FileText,
} from "lucide-react";

interface HumanizeLogProps {
  changeLog: ChangeLog[];
  summary?: {
    passes: number;
    scoreBefore: number;
    scoreAfter: number;
    mode: string;
    intensity: string;
  };
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

export const HumanizeLog: React.FC<HumanizeLogProps> = ({ changeLog, summary }) => {
  const [expandedTypes, setExpandedTypes] = React.useState<Record<string, boolean>>({});

  const summaryBanner = summary ? (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div className="p-2 rounded border border-border bg-background/40">
        <div className="font-semibold capitalize">{summary.mode}</div>
        <div className="text-muted-foreground">mode</div>
      </div>
      <div className="p-2 rounded border border-border bg-background/40">
        <div className="font-semibold">{summary.passes}</div>
        <div className="text-muted-foreground">passe{summary.passes > 1 ? "s" : ""}</div>
      </div>
      <div className="p-2 rounded border border-border bg-background/40">
        <div className="font-semibold">{summary.scoreBefore}% → {summary.scoreAfter}%</div>
        <div className="text-muted-foreground">score IA</div>
      </div>
      <div className="p-2 rounded border border-border bg-background/40">
        <div className="font-semibold capitalize">{summary.intensity}</div>
        <div className="text-muted-foreground">intensité</div>
      </div>
    </div>
  ) : null;

  if (!changeLog.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        {summaryBanner}
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

  const exportJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      totalChanges: changeLog.length,
      changes: changeLog.map((c) => ({
        type: c.type,
        category: typeMeta[c.type]?.label ?? c.type,
        original: c.original,
        replacement: c.replacement,
        reason: c.reason,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "journal_modifications.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const exportPDF = () => {
    const rows = changeLog
      .map(
        (c, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td><span class="cat">${escapeHtml(typeMeta[c.type]?.label ?? c.type)}</span></td>
          <td class="orig">${escapeHtml(c.original)}</td>
          <td class="repl">${escapeHtml(c.replacement)}</td>
          <td class="reason">${escapeHtml(c.reason)}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<title>Journal des modifications</title>
<style>
  * { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; }
  body { margin: 32px; color: #18181b; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #71717a; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e4e4e7; vertical-align: top; }
  th { background: #f4f4f5; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: #52525b; }
  .num { width: 28px; color: #a1a1aa; }
  .cat { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
  .orig { color: #b91c1c; text-decoration: line-through; }
  .repl { color: #15803d; }
  .reason { color: #52525b; }
  @media print { body { margin: 12px; } }
</style></head>
<body>
  <h1>Journal des modifications</h1>
  <div class="meta">${changeLog.length} changement${changeLog.length > 1 ? "s" : ""} - exporté le ${new Date().toLocaleString("fr-FR")}</div>
  <table>
    <thead><tr><th>#</th><th>Catégorie</th><th>Original</th><th>Remplacement</th><th>Raison</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = () => { window.print(); };</script>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      {summaryBanner}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Journal des modifications</h3>
            <p className="text-sm text-muted-foreground">
              {changeLog.length} changement{changeLog.length > 1 ? "s" : ""} appliqué{changeLog.length > 1 ? "s" : ""} pour humaniser le texte
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportJSON}>
            <FileJson className="w-4 h-4" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="w-4 h-4" />
            PDF
          </Button>
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
