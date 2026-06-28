import { FEATURE_DIM, type TextFeatures } from "./featureExtractor";
import type { MLPrediction, ModelSource } from "./types";
function relu(x:number){return x>0?x:0;}
function sig(x:number){return 1/(1+Math.exp(-Math.max(-500,Math.min(500,x))));}
function mm(inp:Float32Array,w:Float32Array,b:Float32Array,id:number,od:number):Float32Array{
  const o=new Float32Array(od);for(let j=0;j<od;j++){let s=b[j];for(let i=0;i<id;i++)s+=inp[i]*w[i*od+j];o[j]=s;}return o;
}
function ar(t:Float32Array):Float32Array{const r=new Float32Array(t.length);for(let i=0;i<t.length;i++)r[i]=relu(t[i]);return r;}
const S=(i:number,j:number)=>Math.sin(i*.73+j*.31)*.5+Math.cos(i*.17+j*.53)*.3;
const L1W=new Float32Array(FEATURE_DIM*32),L1B=new Float32Array(32),L2W=new Float32Array(32*16),L2B=new Float32Array(16);
for(let i=0;i<FEATURE_DIM*32;i++)L1W[i]=S(i,i*.7);
for(let i=0;i<32*16;i++)L2W[i]=S(i,i*.5);
const L3W=new Float32Array([.42,-.18,.67,.31,-.55,.48,.23,-.39,.56,.14,-.61,.37,.52,-.26,.44,.59]),L3B=new Float32Array([-.12]);
export function builtinPredict(features:TextFeatures,source:ModelSource="builtin"):MLPrediction{
  const t0=performance.now(),h1=ar(mm(features.flat,L1W,L1B,FEATURE_DIM,32)),h2=ar(mm(h1,L2W,L2B,32,16)),o=mm(h2,L3W,L3B,16,1);
  const p=sig(o[0]),ms=performance.now()-t0,c=1-2*Math.abs(p-.5);
  return{aiProbability:p,score:Math.round(p*100),source,confidence:Math.round(c*100)/100,inferenceTimeMs:Math.round(ms*100)/100};
}