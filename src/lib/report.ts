import type { AIAnalysisResult } from "./textAnalysis";
import type { HumanizeStats } from "./humanizer";
import { toast } from "sonner";

export interface ReportData {
  generatedAt: string;
  text: string;
  analysis: AIAnalysisResult | null;
  humanize: HumanizeStats | null;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Rapport JSON téléchargeable, 100% local. */
export function downloadReportJSON(data: ReportData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  triggerDownload(blob, `rapport-unrobot-${Date.now()}.json`);
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Rapport PDF local via la fenêtre d'impression du navigateur (aucune dépendance, aucun réseau). */
export function downloadReportPDF(data: ReportData) {
  const a = data.analysis;
  const h = data.humanize;
  const rows = a
    ? [
        ["Score de détection IA", `${a.score}%`],
        ["Score d'humanisation", `${a.humanizationScore}%`],
        ["Score SUCKS", `${a.sucksScore}`],
        ["Motifs IA détectés", `${a.patternCount}`],
        ["Burstiness", `${a.burstinessScore}%`],
        ["Transitions", `${a.transitionScore}%`],
        ["Voix générique", `${a.voiceScore}%`],
        ["Vocabulaire", `${a.vocabularyScore}%`],
        ["Profondeur", `${a.depthScore}%`],
      ]
    : [];

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Rapport UnRobot</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;margin:40px;color:#18181b;line-height:1.5}
  h1{font-size:22px;margin-bottom:4px}
  h2{font-size:15px;margin-top:28px;border-bottom:1px solid #e4e4e7;padding-bottom:6px}
  .muted{color:#71717a;font-size:12px}
  table{border-collapse:collapse;width:100%;margin-top:8px;font-size:13px}
  td{padding:6px 10px;border-bottom:1px solid #f0f0f0}
  td:last-child{text-align:right;font-weight:600}
  .text{white-space:pre-wrap;background:#fafafa;border:1px solid #eee;padding:12px;border-radius:8px;font-size:12px}
  ul{font-size:13px}
</style></head><body>
<h1>UnRobot - Rapport d'analyse</h1>
<div class="muted">Généré le ${new Date(data.generatedAt).toLocaleString("fr-FR")} - Traitement 100% local</div>
${a ? `<h2>Scores</h2><table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>` : ""}
${h ? `<h2>Humanisation</h2><table>
  <tr><td>Mode</td><td>${esc(h.mode)}</td></tr>
  <tr><td>Intensité</td><td>${esc(h.intensity)}</td></tr>
  <tr><td>Passes</td><td>${h.passes}</td></tr>
  <tr><td>Modifications</td><td>${h.modificationsCount}</td></tr>
  <tr><td>Score avant -> après</td><td>${h.scoreBefore}% -> ${h.scoreAfter}%</td></tr>
</table>` : ""}
${a && a.details.length ? `<h2>Problèmes détectés</h2><ul>${a.details.map((d) => `<li><strong>${esc(d.category)}</strong> : ${esc(d.issue)}</li>`).join("")}</ul>` : ""}
<h2>Texte analysé</h2>
<div class="text">${esc(data.text)}</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    toast.error("Veuillez autoriser les fenêtres popups pour générer le rapport PDF");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  toast.success("Rapport PDF prêt à imprimer/enregistrer");
}