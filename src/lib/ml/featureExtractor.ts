import { splitSentences } from "../utils";
import { AI_PHRASES, WEIGHTED_CONNECTORS } from "../textAnalysis";
const WORD_RE = /\b[\wàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]+\b/gi;
// 7 heuristicScores + 7 syntax + 6 lexical + 4 pattern + 4 structure + 3 semantic + 3 personalization + 2 paraphrase + 2 style = 38
export const FEATURE_DIM = 38;
function norm(v: number, mn: number, mx: number) { const r = mx - mn; return r <= 0 ? 0.5 : Math.max(0, Math.min(1, (v - mn) / r)); }

export function extractFeatures(text: string, hs: number[]) {
  const sents = splitSentences(text), wds = (text.toLowerCase().match(WORD_RE) || []);
  const wc = wds.length, sc = sents.length;
  const sl = sents.map(s => s.trim().split(/\s+/).length);
  const avg = sc > 0 ? sl.reduce((a,b)=>a+b,0)/sc : 0;
  const mx = sl.length > 0 ? Math.max(...sl) : 0;
  const mn = sl.length > 0 ? Math.min(...sl) : 0;
  const v = sc > 0 ? sl.reduce((a,b)=>a+Math.pow(b-avg,2),0)/sc : 0;
  const sd = Math.sqrt(v);
  const qr = sc > 0 ? sents.filter(s=>s.trim().endsWith("?")).length/sc : 0;
  const awl = wc > 0 ? wds.reduce((s,w)=>s+w.length,0)/wc : 0;
  const pr = sc > 0 ? (text.match(/\b(was|were|been|being)\s+\w+ed\b/gi)||[]).length/sc : 0;
  const syn = [norm(avg,3,40),norm(mx,5,80),norm(mn,1,15),norm(sd,0,15),norm(qr,0,.5),norm(awl,2,8),norm(pr,0,.3)];
  const uw = new Set(wds), ttr = wc>0?uw.size/wc:0;
  const freq = new Map<string,number>(); wds.forEach(w=>freq.set(w,(freq.get(w)||0)+1));
  const hap = [...freq.values()].filter(v=>v===1).length, hr = wc>0?hap/wc:0;
  const fw = new Set(["le","la","les","de","des","un","une","et","à","en","que","qui","dans","pour","est","ce","il","elle","ne","pas","se","son","sa","the","of","and","to","in","is","a","it","that","this","for","on","with","as","be","are","was","were","not"]);
  const fwr = wc>0?wds.filter(w=>fw.has(w)).length/wc:0;
  const bg = new Set<string>(); for(let i=0;i<wds.length-1;i++) bg.add(`${wds[i]}|${wds[i+1]}`);
  const bd = wc>1?bg.size/(wc-1):0, dd = wc>0?(text.match(/\d/g)||[]).length/wc:0;
  const lex = [norm(ttr,.2,.8),norm(hr,0,.8),norm(fwr,.2,.6),norm(bd,.3,1),norm(dd,0,.15),norm(wc>0?1/Math.sqrt(wc):0,0,.5)];

  // ── MODULE 4 : Connecteurs pondérés (au lieu de la liste plate) ──
  let weightedConnCount = 0;
  WEIGHTED_CONNECTORS.forEach(({ connector, weight }) => {
    const m = text.match(new RegExp(connector.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi")) || [];
    weightedConnCount += m.length * weight;
  });
  const cd = wc > 0 ? weightedConnCount / wc : 0;

  const gp = ["il est important","il convient","dans le monde","à l'ère du","en conclusion","force est de constater","in today's","it is important","plays a crucial role","delve into"];
  const gd = sc>0?gp.reduce((s,p)=>s+(text.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"))||[]).length,0)/sc:0;
  const ca = ["certainement","évidemment","absolument","incontestablement","certainly","obviously","absolutely","undoubtedly"];
  const cad = sc>0?ca.reduce((s,a)=>s+(text.match(new RegExp(`\\b${a}\\b`,"gi"))||[]).length,0)/sc:0;
  const lm = ["premièrement","deuxièmement","troisièmement","ensuite","enfin","firstly","secondly","thirdly","lastly","finally"];
  const ld = sc>0?lm.reduce((s,m)=>s+(text.match(new RegExp(`\\b${m}\\b`,"gi"))||[]).length,0)/sc:0;
  const pat = [norm(cd,0,.08),norm(gd,0,.15),norm(cad,0,.1),norm(ld,0,.1)];

  // ── MODULE 3 : Features de structure ───────────────────────────
  // Coefficient de variation des paragraphes (symétrie)
  const paras = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  let paraCV = 0;
  if (paras.length >= 3) {
    const pl = paras.map(p => p.trim().split(/\s+/).length);
    const pavg = pl.reduce((a,b)=>a+b,0)/pl.length;
    const pvar = pl.reduce((a,b)=>a+Math.pow(b-pavg,2),0)/pl.length;
    paraCV = pavg > 0 ? Math.sqrt(pvar)/pavg : 0;
  }
  // Ratio de phrases commençant par un connecteur
  const connStartCount = sents.filter(s =>
    /^\s*(en effet|cependant|de plus|par ailleurs|en outre|par conséquent|néanmoins|toutefois|however|moreover|furthermore|therefore|firstly|secondly|finally|ensuite)/i.test(s.trim())
  ).length;
  const connStartRatio = sc > 0 ? connStartCount / sc : 0;
  // Énumération ordonnée
  const enumCount = (text.match(/\b(premièr(?:ement|ement)|deuxièmement|troisièmement|ensuite|enfin)\b/gi) || []).length;
  const structFeatures = [norm(paraCV, 0, 0.6), norm(connStartRatio, 0, 0.5), norm(enumCount, 0, 3), norm(paras.length, 1, 15)];

  // ── MODULE 6 : Répétition sémantique (bigram overlap proxy) ────
  let suspiciousPairs = 0;
  for (let i = 1; i < sents.length; i++) {
    const a = (sents[i-1].toLowerCase().match(WORD_RE) || []);
    const b = (sents[i].toLowerCase().match(WORD_RE) || []);
    if (a.length < 3 || b.length < 3) continue;
    const bgA = new Set<string>(), bgB = new Set<string>();
    for (let j = 0; j < a.length-1; j++) bgA.add(`${a[j]}|${a[j+1]}`);
    for (let j = 0; j < b.length-1; j++) bgB.add(`${b[j]}|${b[j+1]}`);
    const inter = [...bgA].filter(x => bgB.has(x)).length;
    const union = new Set([...bgA,...bgB]).size;
    if (union > 0 && inter/union > 0.4) suspiciousPairs++;
  }
  const semRepRatio = sc > 1 ? suspiciousPairs / (sc - 1) : 0;
  const semanticFeatures = [norm(semRepRatio, 0, 0.3), norm(suspiciousPairs, 0, 3), norm(sc > 1 ? suspiciousPairs / sc : 0, 0, 0.2)];

  // ── MODULE 7 : Personnalisation ────────────────────────────────
  const personalHits =
    (text.match(/(?<=\s)[A-ZÀ-Ý][a-zà-ÿ]{2,}/g) || []).length +
    (text.match(/\d+(?:\s*%|\s*(?:euros|dollars|€|\$|ans|mois|jours|heures|personnes))/gi) || []).length +
    (text.match(/\b(nous avons|j'ai|notre (équipe|étude|analyse|laboratoire|expérience))\b/gi) || []).length +
    (text.match(/\b(par exemple|tel que|notamment)\b/gi) || []).length;
  const personalDensity = sc > 0 ? personalHits / sc : 0;
  const personalPronouns = (text.match(/\b(je|nous|notre|nos|mon|ma|mes|moi)\b/gi) || []).length;
  const personalPronounRatio = sc > 0 ? personalPronouns / sc : 0;
  const personalFeatures = [norm(personalDensity, 0, 2), norm(personalPronounRatio, 0, 0.3), norm(personalHits, 0, 10)];

  // ── MODULE 8 : Paraphrase IA ───────────────────────────────────
  const nomCount = (text.match(/\b(la mise en œuvre|la mise en place|la prise en charge|l'optimisation de|l'amélioration de)\b/gi) || []).length;
  const weakVerbCount = (text.match(/\b(contribuer à|permettre de|viser à|tendre à|avoir pour (but|objectif))\s+(l'|la|le|les|une|un)\b/gi) || []).length;
  const reformCount = (text.match(/\b(autrement dit|en d'autres termes|c'est-à-dire)\b/gi) || []).length;
  const paraPhraseDensity = sc > 0 ? (nomCount + weakVerbCount + reformCount) / sc : 0;
  const paraphraseFeatures = [norm(paraPhraseDensity, 0, 0.5), norm(nomCount + weakVerbCount + reformCount, 0, 5)];

  // ── MODULE 9 : Style Fingerprint ───────────────────────────────
  const repetitionRate = wc > 0 ? 1 - hap/wc : 0;
  const styleFeatures = [norm(repetitionRate, 0, 0.8), norm(ttr, 0.3, 0.9)];

  const flat = new Float32Array(FEATURE_DIM);
  flat.set(hs.slice(0,7).map(s=>s/100),0);
  flat.set(syn,7);
  flat.set(lex,14);
  flat.set(pat,20);
  flat.set(structFeatures,24);
  flat.set(semanticFeatures,28);
  flat.set(personalFeatures,31);
  flat.set(paraphraseFeatures,34);
  flat.set(styleFeatures,36);
  return { heuristicScores: hs.slice(0,7).map(s=>s/100), syntaxFeatures: syn, lexicalFeatures: lex, patternFeatures: pat, structureFeatures: structFeatures, semanticFeatures, personalFeatures, paraphraseFeatures, styleFeatures, flat };
}