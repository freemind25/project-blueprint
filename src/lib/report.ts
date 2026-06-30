import type { AIAnalysisResult } from "./textAnalysis";
import type { HumanizeStats } from "./humanizer";
import { toast } from "sonner";
import { escapeHtml, downloadBlob, printHTML } from "./utils";

export interface ReportData {
  generatedAt: string;
  text: string;
  analysis: AIAnalysisResult | null;
  humanize: HumanizeStats | null;
}

/** Rapport JSON téléchargeable, 100% local. */
export function downloadReportJSON(data: ReportData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `rapport-unrobot-${Date.now()}.json`);
}

// ── Helpers pour les graphiques ──────────────────────────────────────────────

function scoreColor(pct: number): string {
  if (pct >= 70) return "#dc2626";
  if (pct >= 45) return "#f59e0b";
  return "#16a34a";
}

function barHtml(label: string, value: number, max = 100): string {
  const pct = Math.min(100, Math.max(0, value));
  const color = scoreColor(pct);
  const w = Math.round((pct / max) * 100);
  return `<div class="bar-row">
    <div class="bar-label">${label}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${color}"></div></div>
    <div class="bar-value" style="color:${color}">${value}%</div>
  </div>`;
}

function radarSvg(scores: { label: string; value: number }[]): string {
  const n = scores.length;
  if (n < 3) return "";
  const cx = 120, cy = 120, r = 90;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  // Grid rings at 25%, 50%, 75%, 100%
  let grid = "";
  for (const ring of [0.25, 0.5, 0.75, 1]) {
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const a = startAngle + i * angleStep;
      pts.push(`${cx + r * ring * Math.cos(a)},${cy + r * ring * Math.sin(a)}`);
    }
    grid += `<polygon points="${pts.join(" ")}" fill="none" stroke="#e4e4e7" stroke-width="0.8"/>`;
  }

  // Axes
  let axes = "";
  for (let i = 0; i < n; i++) {
    const a = startAngle + i * angleStep;
    axes += `<line x1="${cx}" y1="${cy}" x2="${cx + r * Math.cos(a)}" y2="${cy + r * Math.sin(a)}" stroke="#e4e4e7" stroke-width="0.5"/>`;
  }

  // Data polygon
  const dataPts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = startAngle + i * angleStep;
    const v = Math.max(0, Math.min(100, scores[i].value)) / 100;
    dataPts.push(`${cx + r * v * Math.cos(a)},${cy + r * v * Math.sin(a)}`);
  }

  // Labels
  let labels = "";
  for (let i = 0; i < n; i++) {
    const a = startAngle + i * angleStep;
    const lx = cx + (r + 18) * Math.cos(a);
    const ly = cy + (r + 18) * Math.sin(a);
    const anchor = Math.abs(Math.cos(a)) < 0.1 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
    const dy = Math.abs(Math.sin(a)) < 0.1 ? 4 : Math.sin(a) > 0 ? 14 : -4;
    labels += `<text x="${lx}" y="${ly + dy}" text-anchor="${anchor}" font-size="9" fill="#52525b" font-family="system-ui">${scores[i].label}</text>`;
  }

  // Data dots
  let dots = "";
  for (let i = 0; i < n; i++) {
    const a = startAngle + i * angleStep;
    const v = Math.max(0, Math.min(100, scores[i].value)) / 100;
    dots += `<circle cx="${cx + r * v * Math.cos(a)}" cy="${cy + r * v * Math.sin(a)}" r="3" fill="#6366f1" stroke="#fff" stroke-width="1.5"/>`;
  }

  return `<svg viewBox="0 0 240 240" width="240" height="240" style="display:block;margin:0 auto">
    ${grid}${axes}
    <polygon points="${dataPts.join(" ")}" fill="rgba(99,102,241,0.15)" stroke="#6366f1" stroke-width="2"/>
    ${dots}${labels}
  </svg>`;
}

function severityBadge(sev: string): string {
  const colors: Record<string, string> = { high: "#dc2626", medium: "#f59e0b", low: "#16a34a" };
  const labels: Record<string, string> = { high: "Critique", medium: "Modéré", low: "Mineur" };
  const c = colors[sev] || "#71717a";
  const l = labels[sev] || sev;
  return `<span style="display:inline-block;background:${c}12;color:${c};font-size:10px;font-weight:600;padding:1px 8px;border-radius:99px;border:1px solid ${c}33;margin-left:6px;vertical-align:middle">${l}</span>`;
}

// ── Rapport PDF ──────────────────────────────────────────────────────────────

/** Rapport PDF local via la fenêtre d'impression du navigateur (aucune dépendance, aucun réseau). */
export function downloadReportPDF(data: ReportData) {
  const a = data.analysis;
  const h = data.humanize;
  const logoSrc = `${window.location.origin}/logo.png`;

  // Score principal
  const mainScore = a?.score ?? 0;
  const mainColor = scoreColor(mainScore);
  const verdict = mainScore >= 70
    ? "Ce texte présente des caractéristiques compatibles avec une génération IA"
    : mainScore >= 45
      ? "Ce texte présente des caractéristiques partiellement compatibles avec une génération IA"
      : "Ce texte présente des caractéristiques d'écriture humaine";

  // Barres de scores détaillés
  const scoreBars = a ? [
    barHtml("Détection IA", a.score),
    barHtml("Humanisation", a.humanizationScore),
    barHtml("Burstiness", a.burstinessScore),
    barHtml("Transitions", a.transitionScore),
    barHtml("Voix générique", a.voiceScore),
    barHtml("Vocabulaire", a.vocabularyScore),
    barHtml("Profondeur", a.depthScore),
    barHtml("Structure IA", a.structureScore),
    barHtml("Répét. sémantique", a.semanticRepetitionScore),
    barHtml("Personnalisation", a.personalizationScore),
    barHtml("Paraphrase IA", a.paraphraseScore),
    barHtml("Style", a.styleScore),
  ] : [];

  // Radar chart
  const radarData = a ? [
    { label: "Burstiness", value: a.burstinessScore },
    { label: "Transitions", value: a.transitionScore },
    { label: "Voix", value: a.voiceScore },
    { label: "Vocab.", value: a.vocabularyScore },
    { label: "Structure", value: a.structureScore },
    { label: "Style", value: a.styleScore },
    { label: "SUCKS", value: a.sucksScore },
  ] : [];
  const radar = radarData.length >= 3 ? radarSvg(radarData) : "";

  // Before/After humanisation
  let beforeAfterHtml = "";
  if (h) {
    const beforeColor = scoreColor(h.scoreBefore);
    const afterColor = scoreColor(h.scoreAfter);
    const delta = h.scoreAfter - h.scoreBefore;
    const deltaStr = delta > 0 ? `-${delta}` : delta < 0 ? `+${Math.abs(delta)}` : "0";
    const deltaColor = delta > 0 ? "#16a34a" : delta < 0 ? "#dc2626" : "#71717a";
    beforeAfterHtml = `
    <div class="section">
      <h2>Humanisation</h2>
      <div class="ba-grid">
        <div class="ba-card">
          <div class="ba-label">Avant</div>
          <div class="ba-score" style="color:${beforeColor}">${h.scoreBefore}%</div>
          <div class="bar-track"><div class="bar-fill" style="width:${h.scoreBefore}%;background:${beforeColor}"></div></div>
        </div>
        <div class="ba-arrow">
          <svg viewBox="0 0 40 40" width="40" height="40"><path d="M8 20h24m-8-8l8 8-8 8" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <div class="ba-delta" style="color:${deltaColor}">${deltaStr} pts</div>
        </div>
        <div class="ba-card">
          <div class="ba-label">Après</div>
          <div class="ba-score" style="color:${afterColor}">${h.scoreAfter}%</div>
          <div class="bar-track"><div class="bar-fill" style="width:${h.scoreAfter}%;background:${afterColor}"></div></div>
        </div>
      </div>
      <table class="meta-table">
        <tr><td>Mode</td><td style="text-align:right;font-weight:600;text-transform:capitalize">${escapeHtml(h.mode)}</td></tr>
        <tr><td>Intensité</td><td style="text-align:right;font-weight:600">${escapeHtml(h.intensity)}</td></tr>
        <tr><td>Passes</td><td style="text-align:right;font-weight:600">${h.passes}</td></tr>
        <tr><td>Modifications</td><td style="text-align:right;font-weight:600">${h.modificationsCount}</td></tr>
      </table>
    </div>`;
  }

  // Problèmes détectés
  let issuesHtml = "";
  if (a && a.details.length) {
    const grouped = new Map<string, typeof a.details>();
    for (const d of a.details) {
      const list = grouped.get(d.category) || [];
      list.push(d);
      grouped.set(d.category, list);
    }
    const sections = [...grouped.entries()].map(([cat, items]) => {
      const itemsHtml = items.map(i =>
        `<div class="issue-item"><div class="issue-text">${escapeHtml(i.issue)}</div>${severityBadge(i.severity)}${i.suggestions?.length ? `<div class="issue-sugg">${i.suggestions.map(s => `<span class="sugg-tag">${escapeHtml(s)}</span>`).join("")}</div>` : ""}</div>`
      ).join("");
      return `<div class="issue-group"><div class="issue-cat">${escapeHtml(cat)} <span class="issue-count">${items.length}</span></div>${itemsHtml}</div>`;
    }).join("");
    issuesHtml = `<div class="section"><h2>Détails par catégorie (${a.patternCount} motif${a.patternCount > 1 ? "s" : ""} détecté${a.patternCount > 1 ? "s" : ""})</h2>${sections}</div>`;
  }

  // Stats texte
  const wc = data.text.split(/\s+/).filter(Boolean).length;
  const sc = data.text.split(/[.!?]+/).filter(s => s.trim()).length;
  const charCount = data.text.length;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Rapport UnRobot</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,sans-serif;margin:40px 48px;color:#18181b;line-height:1.6;font-size:13px}
  @page{margin:15mm 18mm;size:A4}

  /* Header */
  .header{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #18181b}
  .header img{height:44px;width:auto}
  .header h1{font-size:20px;font-weight:700;letter-spacing:-0.3px}
  .muted{color:#71717a;font-size:11px}

  /* Sections */
  .section{margin-top:22px}
  h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#52525b;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e4e4e7}

  /* Score hero */
  .hero{display:flex;align-items:center;gap:28px;background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:20px 24px;margin-top:16px}
  .hero-circle{width:90px;height:90px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#fff;flex-shrink:0;position:relative}
  .hero-circle svg{position:absolute;top:-2px;left:-2px;transform:rotate(-90deg)}
  .hero-info{flex:1}
  .hero-verdict{font-size:15px;font-weight:600;margin-bottom:2px}
  .hero-meta{color:#71717a;font-size:11px}

  /* Bars */
  .bar-row{display:flex;align-items:center;gap:10px;margin-bottom:6px}
  .bar-label{width:130px;font-size:12px;color:#52525b;flex-shrink:0}
  .bar-track{flex:1;height:8px;background:#f4f4f5;border-radius:99px;overflow:hidden}
  .bar-fill{height:100%;border-radius:99px;transition:width .3s}
  .bar-value{width:38px;text-align:right;font-size:12px;font-weight:700;flex-shrink:0}

  /* Radar */
  .radar-wrap{display:flex;justify-content:center;margin:8px 0}

  /* Before/After */
  .ba-grid{display:flex;align-items:center;gap:20px;margin-bottom:14px}
  .ba-card{flex:1;background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;padding:14px 16px;text-align:center}
  .ba-label{font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#71717a;margin-bottom:4px}
  .ba-score{font-size:32px;font-weight:800}
  .ba-arrow{display:flex;flex-direction:column;align-items:center;gap:4px}
  .ba-delta{font-size:13px;font-weight:700}

  /* Tables */
  .meta-table{border-collapse:collapse;width:100%;font-size:12px}
  .meta-table td{padding:5px 10px;border-bottom:1px solid #f0f0f0}

  /* Issues */
  .issue-group{margin-bottom:10px}
  .issue-cat{font-size:12px;font-weight:600;margin-bottom:4px;color:#18181b}
  .issue-count{background:#f4f4f5;color:#71717a;font-size:10px;font-weight:600;padding:1px 7px;border-radius:99px;margin-left:6px}
  .issue-item{background:#fafafa;border-radius:6px;padding:6px 10px;margin-bottom:3px;font-size:12px;display:flex;align-items:center;flex-wrap:wrap;gap:4px}
  .issue-text{flex:1;min-width:0}
  .issue-sugg{width:100%;margin-top:3px;display:flex;flex-wrap:wrap;gap:4px}
  .sugg-tag{background:#eef2ff;color:#4f46e5;font-size:10px;padding:2px 8px;border-radius:4px}

  /* Text */
  .text-block{white-space:pre-wrap;background:#fafafa;border:1px solid #e4e4e7;padding:14px;border-radius:8px;font-size:11.5px;line-height:1.65;max-height:200px;overflow:hidden;position:relative}
  .text-block::after{content:'';position:absolute;bottom:0;left:0;right:0;height:40px;background:linear-gradient(transparent,#fafafa)}

  /* Footer */
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #e4e4e7;display:flex;justify-content:space-between;font-size:10px;color:#a1a1aa}

  @media print{
    body{margin:0}
    .no-print{display:none!important}
    .text-block{max-height:none}
    .text-block::after{display:none}
  }
</style></head><body>
<div class="header">
  <img src="${logoSrc}" alt="UnRobot" onerror="this.style.display='none'" />
  <div>
    <h1>Rapport d'analyse</h1>
    <div class="muted">Généré le ${new Date(data.generatedAt).toLocaleString("fr-FR")} — Traitement 100% local</div>
  </div>
</div>

${a ? `
<div class="section">
  <h2>Score global</h2>
  <div class="hero">
    <div class="hero-circle" style="background:${mainColor}">
      <svg width="94" height="94" viewBox="0 0 94 94">
        <circle cx="47" cy="47" r="44" fill="none" stroke="#fff" stroke-width="3" opacity="0.3"/>
        <circle cx="47" cy="47" r="44" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="${Math.round(2 * Math.PI * 44 * mainScore / 100)} ${2 * Math.PI * 44}" stroke-linecap="round"/>
      </svg>
      ${mainScore}%
    </div>
    <div class="hero-info">
      <div class="hero-verdict">${verdict}</div>
      <div class="hero-meta">${wc} mots · ${sc} phrases · ${charCount} caractères · ${a.patternCount} motif${a.patternCount !== 1 ? "s" : ""} IA détecté${a.patternCount !== 1 ? "s" : ""}</div>
    </div>
  </div>
</div>

<div style="display:flex;gap:24px;margin-top:22px">
  <div style="flex:1.2">
    <div class="section" style="margin-top:0">
      <h2>Détail des scores</h2>
      ${scoreBars.join("")}
    </div>
  </div>
  <div style="flex:0.8">
    <div class="section" style="margin-top:0">
      <h2>Profil radar</h2>
      <div class="radar-wrap">${radar}</div>
    </div>
  </div>
</div>
` : ""}

${beforeAfterHtml}
${issuesHtml}

${a?.styleFingerprint ? `
<div class="section">
  <h2>Empreinte de style (Style Fingerprint)</h2>
  <table class="meta-table">
    <tr><td>Longueur moy. phrases</td><td style="text-align:right;font-weight:600">${a.styleFingerprint.sentenceLength} mots</td></tr>
    <tr><td>Densité lexicale (TTR)</td><td style="text-align:right;font-weight:600">${(a.styleFingerprint.vocabularyDensity * 100).toFixed(1)}%</td></tr>
    <tr><td>Taux de connecteurs</td><td style="text-align:right;font-weight:600">${a.styleFingerprint.connectorRate.toFixed(4)}</td></tr>
    <tr><td>Taux de répétition</td><td style="text-align:right;font-weight:600">${(a.styleFingerprint.repetitionRate * 100).toFixed(1)}%</td></tr>
    <tr><td>Complexité (long. moy. mots)</td><td style="text-align:right;font-weight:600">${a.styleFingerprint.complexity} car.</td></tr>
    <tr><td>Marques personnelles</td><td style="text-align:right;font-weight:600">${a.styleFingerprint.personalMarkers.toFixed(3)} / phrase</td></tr>
  </table>
</div>` : ""}

<div class="section">
  <h2>Texte analysé</h2>
  <div class="text-block">${escapeHtml(data.text)}</div>
</div>

<div class="footer">
  <span>UnRobot — Détection d'IA 100% locale</span>
  <span>${new Date(data.generatedAt).toLocaleString("fr-FR")}</span>
</div>

<script>window.onload=function(){window.print();}</script>
</body></html>`;

  if (!printHTML(html)) {
    toast.error("Veuillez autoriser les fenêtres popups pour générer le rapport PDF");
    return;
  }
  toast.success("Rapport PDF prêt à imprimer/enregistrer");
}