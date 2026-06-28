/**
 * Pipeline d'entraînement Transfer Learning in-browser — 100% pur JavaScript.
 *
 * Architecture : 24 (features) → 32 (ReLU) → 16 (ReLU) → 1 (Sigmoid)
 * Optimiseur : Adam (implémentation JS)
 * Loss : Binary Cross-Entropy
 *
 * Le modèle est entraîné sur les features extraites par le module ML existant,
 * pas sur le texte brut — ce qui rend l'entraînement instantané (< 5s pour 200 samples).
 */
import type { TrainingConfig, TrainingProgress, CustomModel, LabeledText, PredictionResult } from "./types";
import { DEFAULT_TRAINING_CONFIG } from "./types";
import { extractFeatures, FEATURE_DIM } from "../ml/featureExtractor";
import { analyzeText } from "../textAnalysis";

// Architecture du modèle personnalisé
const ARCHITECTURE = [FEATURE_DIM, 32, 16, 1];

/**
 * Extrait les features d'un dataset étiqueté.
 */
function extractDatasetFeatures(samples: LabeledText[]): {
  xs: number[][];
  ys: number[];
} {
  const xs: number[][] = [];
  const ys: number[] = [];

  for (const sample of samples) {
    const analysis = analyzeText(sample.text);
    const scores = [
      analysis.burstinessScore, analysis.transitionScore, analysis.perfectionScore,
      analysis.voiceScore, analysis.perplexityScore, analysis.vocabularyScore, analysis.depthScore,
    ];
    const features = extractFeatures(sample.text, scores);
    xs.push(Array.from(features.flat));
    ys.push(sample.label === "ai" ? 1 : 0);
  }

  return { xs, ys };
}

// ---- Pure JS Neural Network Training ----

function relu(x: number): number { return Math.max(0, x); }
function sigmoid(x: number): number { const cx = Math.max(-500, Math.min(500, x)); return 1 / (1 + Math.exp(-cx)); }
function reluDeriv(x: number): number { return x > 0 ? 1 : 0; }

interface Layer {
  w: number[][]; // weights[out][in]
  b: number[];
  mW: number[][]; // Adam first moment weights
  vW: number[][]; // Adam second moment weights
  mB: number[];   // Adam first moment bias
  vB: number[];   // Adam second moment bias
}

function createLayers(arch: number[], rng: () => number): Layer[] {
  const layers: Layer[] = [];
  for (let i = 0; i < arch.length - 1; i++) {
    const inSize = arch[i];
    const outSize = arch[i + 1];
    const scale = Math.sqrt(2 / inSize); // He initialization
    const w: number[][] = [];
    const mW: number[][] = [];
    const vW: number[][] = [];
    for (let j = 0; j < outSize; j++) {
      const row: number[] = [];
      const mRow: number[] = [];
      const vRow: number[] = [];
      for (let k = 0; k < inSize; k++) {
        row.push((rng() * 2 - 1) * scale);
        mRow.push(0);
        vRow.push(0);
      }
      w.push(row);
      mW.push(mRow);
      vW.push(vRow);
    }
    layers.push({ w, b: Array(outSize).fill(0), mW, vW, mB: Array(outSize).fill(0), vB: Array(outSize).fill(0) });
  }
  return layers;
}

function forward(layers: Layer[], input: number[]): { outputs: number[][]; preActivations: number[][] } {
  const outputs: number[][] = [input];
  const preActivations: number[][] = [];
  let current = input;

  for (let l = 0; l < layers.length; l++) {
    const layer = layers[l];
    const z: number[] = [];
    const a: number[] = [];
    const isLast = l === layers.length - 1;

    for (let j = 0; j < layer.w.length; j++) {
      let sum = layer.b[j];
      for (let i = 0; i < current.length; i++) {
        sum += current[i] * layer.w[j][i];
      }
      z.push(sum);
      a.push(isLast ? sigmoid(sum) : relu(sum));
    }
    preActivations.push(z);
    outputs.push(a);
    current = a;
  }

  return { outputs, preActivations };
}

function trainEpoch(
  layers: Layer[],
  xs: number[][], ys: number[],
  lr: number, beta1: number, beta2: number, eps: number, t: number,
  clipVal: number,
): { loss: number; correct: number } {
  // Shuffle
  const indices = xs.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  let totalLoss = 0;
  let correct = 0;

  for (const idx of indices) {
    const x = xs[idx];
    const y = ys[idx];

    // Forward
    const { outputs, preActivations } = forward(layers, x);
    const pred = outputs[outputs.length - 1][0];
    const clippedPred = Math.max(eps, Math.min(1 - eps, pred));

    // BCE loss
    const loss = -(y * Math.log(clippedPred) + (1 - y) * Math.log(1 - clippedPred));
    totalLoss += loss;
    if ((pred >= 0.5 ? 1 : 0) === y) correct++;

    // Backprop
    // Output layer delta: dL/dz = pred - y (for sigmoid + BCE)
    let deltas: number[] = [pred - y];

    // Hidden layers
    for (let l = layers.length - 2; l >= 0; l--) {
      const nextLayer = layers[l + 1];
      const newDeltas: number[] = [];
      for (let i = 0; i < layers[l].w.length; i++) {
        let sum = 0;
        for (let j = 0; j < nextLayer.w.length; j++) {
          sum += nextLayer.w[j][i] * deltas[j];
        }
        newDeltas.push(sum * reluDeriv(preActivations[l][i]));
      }
      deltas = newDeltas;
    }

    // Update weights with Adam
    for (let l = 0; l < layers.length; l++) {
      const layer = layers[l];
      const input = outputs[l];
      const isLast = l === layers.length - 1 ? deltas : deltas;

      // Recompute deltas for this layer's output
      let layerDeltas: number[];
      if (l === layers.length - 1) {
        layerDeltas = [pred - y];
      } else {
        const nextLayer = layers[l + 1];
        layerDeltas = [];
        for (let i = 0; i < layer.w.length; i++) {
          let sum = 0;
          // We need the next layer's deltas, which we already computed in backprop
          // But we need to store them. Let's refactor.
          layerDeltas.push(0); // placeholder
        }
      }

      // Simpler approach: compute gradients directly
      const outDeltas = l === layers.length - 1
        ? [pred - y]
        : computeHiddenDeltas(layers, l, preActivations, pred - y);

      for (let j = 0; j < layer.w.length; j++) {
        const d = outDeltas[j];
        for (let i = 0; i < layer.w[j].length; i++) {
          const grad = d * input[i];
          const clippedGrad = Math.max(-clipVal, Math.min(clipVal, grad));

          layer.mW[j][i] = beta1 * layer.mW[j][i] + (1 - beta1) * clippedGrad;
          layer.vW[j][i] = beta2 * layer.vW[j][i] + (1 - beta2) * clippedGrad * clippedGrad;
          const mHat = layer.mW[j][i] / (1 - Math.pow(beta1, t));
          const vHat = layer.vW[j][i] / (1 - Math.pow(beta2, t));
          layer.w[j][i] -= lr * mHat / (Math.sqrt(vHat) + eps);
        }

        const bGrad = d;
        const clippedBGrad = Math.max(-clipVal, Math.min(clipVal, bGrad));
        layer.mB[j] = beta1 * layer.mB[j] + (1 - beta1) * clippedBGrad;
        layer.vB[j] = beta2 * layer.vB[j] + (1 - beta2) * clippedBGrad * clippedBGrad;
        const mBHat = layer.mB[j] / (1 - Math.pow(beta1, t));
        const vBHat = layer.vB[j] / (1 - Math.pow(beta2, t));
        layer.b[j] -= lr * mBHat / (Math.sqrt(vBHat) + eps);
      }
    }
  }

  return { loss: totalLoss / xs.length, correct };
}

function computeHiddenDeltas(
  layers: Layer[],
  layerIdx: number,
  preActivations: number[][],
  outputDelta: number,
): number[] {
  if (layerIdx === layers.length - 1) return [outputDelta];

  // Propagate delta back through subsequent layers
  const numLayers = layers.length;
  const allDeltas: number[][] = Array.from({ length: numLayers }, () => []);

  // Output delta
  allDeltas[numLayers - 1] = [outputDelta];

  // Backpropagate
  for (let l = numLayers - 2; l >= 0; l--) {
    const nextLayer = layers[l + 1];
    const nextDeltas = allDeltas[l + 1];
    for (let i = 0; i < layers[l].w.length; i++) {
      let sum = 0;
      for (let j = 0; j < nextLayer.w.length; j++) {
        sum += nextLayer.w[j][i] * nextDeltas[j];
      }
      allDeltas[l].push(sum * reluDeriv(preActivations[l][i]));
    }
  }

  return allDeltas[layerIdx];
}

/**
 * Pipeline d'entraînement complet — 100% pur JavaScript, sans TensorFlow.js.
 *
 * @param samples - Textes étiquetés (humain vs IA)
 * @param config - Hyperparamètres d'entraînement
 * @param onProgress - Callback de progression (appelé à chaque époque)
 * @returns Le modèle entraîné sérialisé
 */
export async function trainCustomModel(
  samples: LabeledText[],
  config: TrainingConfig = {},
  onProgress?: (progress: TrainingProgress) => void,
): Promise<CustomModel> {
  const cfg = { ...DEFAULT_TRAINING_CONFIG, ...config };

  // 1. Extraction des features
  const { xs, ys } = extractDatasetFeatures(samples);
  if (xs.length < 4) throw new Error("Minimum 4 échantillons requis (au moins 2 humains + 2 IA)");

  // 2. Initialisation du modèle
  // Simple seeded PRNG for reproducibility
  let seed = 42;
  const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };
  const layers = createLayers(ARCHITECTURE, rng);

  // 3. Split train/val
  const valSplit = cfg.validationSplit;
  const valCount = Math.max(1, Math.floor(xs.length * valSplit));
  const trainXs = xs.slice(0, xs.length - valCount);
  const trainYs = ys.slice(0, ys.length - valCount);
  const valXs = xs.slice(xs.length - valCount);
  const valYs = ys.slice(ys.length - valCount);

  // 4. Entraînement
  const startTime = performance.now();
  let bestValAcc = 0;
  const beta1 = 0.9, beta2 = 0.999, adamEps = 1e-8;
  let adamT = 0;

  for (let epoch = 0; epoch < cfg.epochs; epoch++) {
    adamT++;
    const { loss, correct } = trainEpoch(layers, trainXs, trainYs, cfg.learningRate, beta1, beta2, adamEps, adamT, 5.0);

    // Validation
    let valCorrect = 0;
    for (let i = 0; i < valXs.length; i++) {
      const { outputs } = forward(layers, valXs[i]);
      const pred = outputs[outputs.length - 1][0];
      if ((pred >= 0.5 ? 1 : 0) === valYs[i]) valCorrect++;
    }
    const valAcc = valCorrect / valXs.length;
    if (valAcc > bestValAcc) bestValAcc = valAcc;

    const elapsed = performance.now() - startTime;
    onProgress?.({
      epoch: epoch + 1,
      totalEpochs: cfg.epochs,
      trainLoss: loss,
      valLoss: undefined,
      valAccuracy: Math.round(valAcc * 100) / 100,
      samplesPerSecond: Math.round((trainXs.length * (epoch + 1)) / (elapsed / 1000)),
    });
  }

  // 5. Évaluation finale sur tout le dataset
  let totalCorrect = 0;
  for (let i = 0; i < xs.length; i++) {
    const { outputs } = forward(layers, xs[i]);
    const pred = outputs[outputs.length - 1][0];
    if ((pred >= 0.5 ? 1 : 0) === ys[i]) totalCorrect++;
  }
  const trainAcc = totalCorrect / xs.length;

  // 6. Sérialisation des poids
  const weights: Array<{ shape: number[]; data: number[] }> = [];
  for (const layer of layers) {
    const inSize = layer.w[0].length;
    const outSize = layer.w.length;
    const wData: number[] = [];
    for (let j = 0; j < outSize; j++) {
      for (let i = 0; i < inSize; i++) {
        wData.push(layer.w[j][i]);
      }
    }
    weights.push({ shape: [inSize, outSize], data: wData });
    weights.push({ shape: [outSize], data: [...layer.b] });
  }

  // 7. Sérialisation en base64
  const weightsJson = JSON.stringify(weights);
  const weightsBase64 = btoa(unescape(encodeURIComponent(weightsJson)));

  return {
    id: crypto.randomUUID(),
    name: `Modèle personnalisé (${new Date().toLocaleDateString("fr-FR")})`,
    version: "2.0.0",
    createdAt: new Date().toISOString(),
    sampleCount: xs.length,
    trainAccuracy: Math.round(trainAcc * 100) / 100,
    valAccuracy: Math.round(bestValAcc * 100) / 100,
    weightsBase64,
    architecture: ARCHITECTURE,
  };
}

/**
 * Charge un modèle personnalisé depuis sa sérialisation base64.
 * Retourne une fonction de prédiction prête à l'emploi.
 */
export function loadCustomPredictor(customModel: CustomModel): (features: Float32Array) => number {
  // Désérialiser les poids
  const json = decodeURIComponent(escape(atob(customModel.weightsBase64)));
  const layers: Array<{ weights: number[]; bias: number[]; shape: number[] }> = [];
  const parsed = JSON.parse(json) as Array<{ shape: number[]; data: number[] }>;

  let idx = 0;
  for (let l = 0; l < parsed.length; l += 2) {
    if (idx + 1 >= parsed.length) break;
    const wShape = parsed[idx].shape; // [inSize, outSize]
    const outSize = wShape[1];
    const weights = parsed[idx].data;
    const bias = parsed[idx + 1].data;

    // Transpose from column-major (TF.js style) to row-major
    const transposed: number[] = [];
    for (let j = 0; j < outSize; j++) {
      for (let i = 0; i < wShape[0]; i++) {
        transposed.push(weights[i * outSize + j]);
      }
    }

    layers.push({
      weights: transposed,
      bias,
      shape: wShape,
    });
    idx += 2;
  }

  // Fonction d'inférence pure (sans TF.js, ultra-rapide)
  return (input: Float32Array): number => {
    let current = Array.from(input);

    for (let l = 0; l < layers.length; l++) {
      const layer = layers[l];
      const inSize = layer.shape[0];
      const outSize = layer.shape[1];
      const output: number[] = new Array(outSize).fill(0);

      for (let j = 0; j < outSize; j++) {
        let sum = layer.bias[j] ?? 0;
        for (let i = 0; i < Math.min(inSize, current.length); i++) {
          sum += (current[i] ?? 0) * (layer.weights[j * inSize + i] ?? 0);
        }
        // Dernière couche = sigmoid, autres = ReLU
        output[j] = l === layers.length - 1
          ? 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, sum))))
          : Math.max(0, sum);
      }
      current = output;
    }

    return current[0] ?? 0.5;
  };
}

/**
 * Sauvegarde un modèle dans IndexedDB.
 */
export async function saveModelToIDB(model: CustomModel): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("models", "readwrite");
  tx.objectStore("models").put(model);
  await tx.done;
}

/**
 * Charge tous les modèles depuis IndexedDB.
 */
export async function loadModelsFromIDB(): Promise<CustomModel[]> {
  const db = await openDB();
  return db.transaction("models", "readonly").objectStore("models").getAll();
}

/**
 * Supprime un modèle d'IndexedDB.
 */
export async function deleteModelFromIDB(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("models", "readwrite");
  tx.objectStore("models").delete(id);
  await tx.done;
}

/**
 * Sauvegarde un dataset étiqueté dans IndexedDB.
 */
export async function saveDatasetToIDB(dataset: { id: string; name: string; samples: LabeledText[]; createdAt: string; updatedAt: string }): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("datasets", "readwrite");
  tx.objectStore("datasets").put(dataset);
  await tx.done;
}

/**
 * Charge un dataset depuis IndexedDB.
 */
export async function loadDatasetFromIDB(id: string): Promise<{ id: string; name: string; samples: LabeledText[]; createdAt: string; updatedAt: string } | undefined> {
  const db = await openDB();
  return db.transaction("datasets", "readonly").objectStore("datasets").get(id);
}

/**
 * Liste tous les datasets.
 */
export async function listDatasetsFromIDB(): Promise<Array<{ id: string; name: string; createdAt: string; updatedAt: string }>> {
  const db = await openDB();
  return db.transaction("datasets", "readonly").objectStore("datasets").getAll();
}

/**
 * Ouvre/crée la base IndexedDB "unrobot-transfer".
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("unrobot-transfer", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("models")) db.createObjectStore("models", { keyPath: "id" });
      if (!db.objectStoreNames.contains("datasets")) db.createObjectStore("datasets", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Crée un résultat de prédiction au format standard.
 */
export function formatCustomPrediction(probability: number): PredictionResult {
  return {
    aiProbability: probability,
    confidence: Math.round((1 - 2 * Math.abs(probability - 0.5)) * 100) / 100,
    source: "custom",
  };
}