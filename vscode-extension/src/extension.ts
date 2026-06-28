import * as vscode from "vscode";

const WORD_RE = /\b[\w]+\b/gi;

function analyzeComment(text: string): number {
  if (!text || text.length < 30) return 0;
  const lower = text.toLowerCase();
  const words = (lower.match(WORD_RE) || []);
  if (words.length < 5) return 0;
  const wc = words.length;

  const aiPatterns = [
    /\b(this (?:code|function|method|class|module|approach|pattern|implementation|technique|solution))\b/gi,
    /\b(it (?:is |it's )?(?:important|worth noting|crucial|essential|key|vital|significant))\b/gi,
    /\b(ensures?|provides?|allows?|enables?|facilitates?|offers?)\s+\w+/gi,
    /\b(designed (?:to|for|with)|aimed at|intended (?:to|for))\b/gi,
    /\b(in (?:order|addition|conjunction|summary|conclusion))\b/gi,
    /\b(furthermore|additionally|consequently|nevertheless|nonetheless)\b/gi,
    /\b(here'?s? (?:the thing|what|how|why))\b/gi,
    /\b(plays? (?:a )?(?:crucial|key|vital|important|significant) (?:role|part))\b/gi,
    /\b(a (?:comprehensive|detailed|thorough|robust|clear))\b/gi,
    /\b(make (?:sure|certain|clear))\b/gi,
    /\b(please note|note that|keep in mind|bear in mind)\b/gi,
    /\b(the (?:above|following|below) (?:code|function|implementation|example))\b/gi,
  ];

  let patternPoints = 0;
  for (const p of aiPatterns) {
    const matches = lower.match(p);
    if (matches) patternPoints += matches.length * 8;
  }

  const hasPunctuation = /[.!?]$/.test(text.trim());
  const hasListMarker = /^[-•*]\s/.test(text.trim());
  const startsWithCapital = /^[A-Z]/.test(text.trim());
  let perfectionBonus = 0;
  if (hasPunctuation) perfectionBonus += 3;
  if (hasListMarker) perfectionBonus += 5;
  if (startsWithCapital && !hasListMarker) perfectionBonus += 2;

  const genericWords = ["leverage", "utilize", "implement", "facilitate", "optimize", "streamline", "enhance", "comprehensive", "robust", "seamless"];
  const genericCount = genericWords.filter(w => lower.includes(w)).length;
  const genericDensity = (genericCount / wc) * 100;

  const connectors = ["however", "moreover", "furthermore", "therefore", "additionally", "consequently", "nevertheless"];
  const connCount = connectors.filter(c => lower.includes(c)).length;

  return Math.min(100, Math.round(
    (patternPoints * 0.4) + (perfectionBonus * 0.2) + (genericDensity * 0.2) + (connCount * 5 * 0.2)
  ));
}

interface CommentInfo {
  text: string; line: number; type: string; language: string;
}

function extractComments(doc: vscode.TextDocument): CommentInfo[] {
  const text = doc.getText();
  const lines = text.split("\n");
  const comments: CommentInfo[] = [];
  let inBlock = false, blockStart = 0, blockText = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], trimmed = line.trim();
    if (inBlock) {
      blockText += "\n" + line;
      if (/\*\//.test(trimmed) || (doc.languageId === "python" && trimmed.includes('"""'))) {
        comments.push({ text: blockText, line: blockStart, type: "block", language: doc.languageId });
        inBlock = false;
      }
      continue;
    }
    if (/^\s*\/\*\//.test(line) || /^\s*\/\/\//.test(line)) {
      comments.push({ text: trimmed.replace(/^[/*\s]+/, ""), line: i, type: "doc", language: doc.languageId });
      continue;
    }
    if (doc.languageId === "python" && /^\s*(\"{3}|\'{3})/.test(trimmed)) {
      inBlock = true; blockStart = i; blockText = line; continue;
    }
    if (/^\s*\/\*/.test(trimmed)) {
      inBlock = true; blockStart = i; blockText = line; continue;
    }
    if (/^\s*\/\//.test(trimmed) || (doc.languageId === "python" && /^\s*#(?!\/)/.test(trimmed)) || (doc.languageId === "html" && /<!--/.test(trimmed))) {
      const ct = trimmed.replace(/^[\s/*#]+/, "").replace(/\*\/$/, "").replace(/-->/, "").trim();
      if (ct.length > 10) comments.push({ text: ct, line: i, type: "line", language: doc.languageId });
    }
  }
  return comments;
}

const decoType = vscode.window.createTextEditorDecorationType("unrobot-ai");

function scoreLevel(s: number) {
  if (s >= 70) return { color: "#ef4444", msg: `IA: ${s}% — Forte probabilité` };
  if (s >= 40) return { color: "#f59e0b", msg: `IA: ${s}% — Possible` };
  return { color: "#22c55e", msg: `IA: ${s}%` };
}

function makeDecos(comments: CommentInfo[], threshold: number): vscode.DecorationOptions[] {
  return comments.filter(c => analyzeComment(c.text) >= threshold).map(c => {
    const s = analyzeComment(c.text), l = scoreLevel(s);
    return {
      range: new vscode.Range(c.line, 0, c.line, c.text.length),
      renderOptions: {
        before: { contentText: "\u26A1", color: l.color, margin: "0 0 0 4px", fontWeight: "bold" },
        after: { contentText: ` [${s}%]`, color: l.color, margin: "0 4px 0 0" },
      },
      hoverMessage: l.msg,
    };
  });
}

const out = vscode.window.createOutputChannel("UnRobot");

export function activate(ctx: vscode.ExtensionContext) {
  const cfg = vscode.workspace.getConfiguration("unrobot");
  let diagColl: vscode.DiagnosticCollection;

  function updateDecos(editor: vscode.TextEditor) {
    if (!cfg.get("enableDecorations")) { editor.setDecorations(decoType, []); return; }
    const coms = extractComments(editor.document);
    editor.setDecorations(decoType, makeDecos(coms, cfg.get<number>("threshold")));
  }

  function scanDoc(doc: vscode.TextDocument): vscode.Diagnostic[] {
    const coms = extractComments(doc), thr = cfg.get<number>("threshold"), diags: vscode.Diagnostic[] = [];
    for (const c of coms) {
      const s = analyzeComment(c.text);
      if (s >= thr) {
        diags.push(new vscode.Diagnostic(
          new vscode.Range(c.line, 0, c.line, c.text.length), "unrobot",
          `Commentaire possiblement IA (${s}%)`, s >= 70 ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information));
      }
    }
    return diags;
  }

  diagColl = vscode.languages.createDiagnosticCollection("unrobot");

  ctx.subscriptions.push(
    vscode.commands.registerCommand("unrobot.scanFile", () => {
      const ed = vscode.window.activeTextEditor;
      if (!ed) { vscode.window.showWarningMessage("Aucun fichier ouvert."); return; }
      diagColl.set(ed.document.uri, scanDoc(ed.document));
      updateDecos(ed);
      const coms = extractComments(ed.document), flagged = coms.filter(c => analyzeComment(c.text) >= cfg.get<number>("threshold"));
      out.appendLine(`[UnRobot] ${ed.document.fileName} — ${coms.length} commentaires, ${flagged.length} signalés`);
      out.show();
      vscode.window.showInformationMessage(flagged.length > 0 ? `${flagged.length} commentaire(s) IA détecté(s).` : "Aucun commentaire IA détecté.");
    }),
    vscode.commands.registerCommand("unrobot.scanWorkspace", async () => {
      out.appendLine("[UnRobot] Analyse workspace..."); out.show();
      for (const d of vscode.workspace.textDocuments) {
        diagColl.set(d.uri, scanDoc(d));
        const ed = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === d.uri.toString());
        if (ed) updateDecos(ed);
      }
      out.appendLine("[UnRobot] Terminé.");
    }),
    vscode.commands.registerCommand("unrobot.clearDecorations", () => {
      if (vscode.window.activeTextEditor) { vscode.window.activeTextEditor.setDecorations(decoType, []); diagColl.clear(); }
    }),
    vscode.window.onDidChangeActiveTextEditor(ed => { if (ed) updateDecos(ed); }),
    vscode.workspace.onDidSaveTextDocument(d => {
      if (cfg.get("scanOnSave")) { diagColl.set(d.uri, scanDoc(d)); const ed = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === d.uri.toString()); if (ed) updateDecos(ed); }
    }),
    vscode.workspace.onDidChangeConfiguration(e => { if (e.affectsConfiguration("unrobot") && vscode.window.activeTextEditor) updateDecos(vscode.window.activeTextEditor); }),
  );
  if (vscode.window.activeTextEditor) updateDecos(vscode.window.activeTextEditor);
}
export function deactivate() {}