import { splitSentences } from "../utils";
const WORD_RE = /\b[\wàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]+\b/gi;
export const FEATURE_DIM = 24;
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
  const conn = ["en effet","cependant","de plus","par ailleurs","en outre","however","moreover","furthermore","therefore","consequently"];
  const cd = wc>0?conn.reduce((s,c)=>s+(text.match(new RegExp(`\\b${c}\\b`,"gi"))||[]).length,0)/wc:0;
  const gp = ["il est important","il convient","dans le monde","à l'ère du","en conclusion","force est de constater","in today's","it is important","plays a crucial role","delve into"];
  const gd = sc>0?gp.reduce((s,p)=>s+(text.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"))||[]).length,0)/sc:0;
  const ca = ["certainement","évidemment","absolument","incontestablement","certainly","obviously","absolutely","undoubtedly"];
  const cad = sc>0?ca.reduce((s,a)=>s+(text.match(new RegExp(`\\b${a}\\b`,"gi"))||[]).length,0)/sc:0;
  const lm = ["premièrement","deuxièmement","troisièmement","ensuite","enfin","firstly","secondly","thirdly","lastly","finally"];
  const ld = sc>0?lm.reduce((s,m)=>s+(text.match(new RegExp(`\\b${m}\\b`,"gi"))||[]).length,0)/sc:0;
  const pat = [norm(cd,0,.08),norm(gd,0,.15),norm(cad,0,.1),norm(ld,0,.1)];
  const flat = new Float32Array(FEATURE_DIM);
  flat.set(hs.slice(0,7).map(s=>s/100),0); flat.set(syn,7); flat.set(lex,14); flat.set(pat,20);
  return { heuristicScores: hs.slice(0,7).map(s=>s/100), syntaxFeatures: syn, lexicalFeatures: lex, patternFeatures: pat, flat };
}