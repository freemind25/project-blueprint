/**
 * Types pour le module Transfer Learning.
 * L'utilisateur entraîne un modèle personnalisé sur ses propres textes (humain vs IA).
 */
export interface LabeledText {
  text: string;
  label: "human" | "ai"; // 0 = humain, 1 = IA
  addedAt: string;
}

export interface TrainingDataset {
  id: string;
  name: string;
  samples: LabeledText[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainingConfig {
  epochs?: number;      // Défaut : 30
  batchSize?: number;   // Défaut : 16
  learningRate?: number; // Défaut : 0.001
  validationSplit?: number; // Défaut : 0.2
}

export const DEFAULT_TRAINING_CONFIG: Required<TrainingConfig> = {
  epochs: 30,
  batchSize: 16,
  learningRate: 0.001,
  validationSplit: 0.2,
};

export interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  trainLoss: number;
  valLoss?: number;
  valAccuracy?: number;
  samplesPerSecond: number;
}

export interface CustomModel {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  sampleCount: number;
  trainAccuracy: number;
  valAccuracy: number;
  /** Poids sérialisés du modèle (base64). */
  weightsBase64: string;
  /** Architecture : nombre de neurones par couche. */
  architecture: number[];
}

export interface PredictionResult {
  aiProbability: number;
  confidence: number;
  source: "custom";
}