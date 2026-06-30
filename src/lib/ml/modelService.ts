/* eslint-disable @typescript-eslint/no-explicit-any */
import type{MLPrediction,ModelInfo,ModelState,ModelSource}from"./types";
import{extractFeatures,FEATURE_DIM}from"./featureExtractor";
import{builtinPredict}from"./builtinModel";
let onnxSession:unknown=null,currentState:ModelState="idle",currentInfo:ModelInfo|null=null,initP:Promise<void>|null=null;
export async function initModelService():Promise<ModelInfo>{
  if(currentState==="ready"||currentState==="onnx-ready")return currentInfo!;
  if(initP){await initP;return currentInfo!;}
  currentState="loading";
  initP=tryOnnx().then(()=>{if(currentState!=="onnx-ready"){currentState="ready";currentInfo={source:"builtin",name:"UnRobot Neural v1.0",version:"1.0.0",size:"~2 KB",inputShape:[1,FEATURE_DIM]};}}).catch(()=>{currentState="ready";currentInfo={source:"builtin",name:"UnRobot Neural v1.0",version:"1.0.0",size:"~2 KB",inputShape:[1,FEATURE_DIM]};});
  await initP;return currentInfo!;
}
async function tryOnnx(){try{const ort=await import("onnxruntime-web");ort.env.wasm.wasmPaths="/wasm/";const r=await fetch("/models/ai-detector.onnx",{method:"HEAD"});if(!r.ok)return;onnxSession=await ort.InferenceSession.create("/models/ai-detector.onnx",{executionProviders:["wasm"],graphOptimizationLevel:"all"});currentState="onnx-ready";currentInfo={source:"onnx",name:"RoBERTa AI Detector",version:"1.0.0",size:"5-10 MB (ONNX INT8)",inputShape:[1,FEATURE_DIM]};}catch{ /* ONNX not available */ }}
function sig(x:number){return 1/(1+Math.exp(-Math.max(-500,Math.min(500,x))));}
export async function runInference(text:string,heuristicScores:number[],customPredict?:(f:Float32Array)=>number):Promise<MLPrediction>{
  if(currentState==="idle")await initModelService();
  const features=extractFeatures(text,heuristicScores);
  if(customPredict){const t=performance.now(),p=customPredict(features.flat);return{aiProbability:p,score:Math.round(p*100),source:"custom"as ModelSource,confidence:1-2*Math.abs(p-.5),inferenceTimeMs:Math.round((performance.now()-t)*100)/100};}
  if(currentState==="onnx-ready"&&onnxSession){try{const ort=await import("onnxruntime-web"),sess=onnxSession as any,tensor=new ort.Tensor("float32",features.flat,[1,FEATURE_DIM]),res=await sess.run({[sess.inputNames[0]]:tensor}),out=res[sess.outputNames[0]] as any;let p:number;if(out.dims[out.dims.length-1]===2){const l=out.data as Float32Array,mx=Math.max(...l);p=Math.exp(l[1]-mx)/l.reduce((s,v)=>s+Math.exp(v-mx),0);}else p=sig(out.data[0]);return{aiProbability:p,score:Math.round(p*100),source:"onnx",confidence:1-2*Math.abs(p-.5),inferenceTimeMs:0};}catch{return builtinPredict(features,"builtin");}}
  return builtinPredict(features,"builtin");
}
export function getModelState():ModelState{return currentState;}
export function getModelInfo():ModelInfo|null{return currentInfo;}
export function resetModelService(){onnxSession=null;currentState="idle";currentInfo=null;initP=null;}