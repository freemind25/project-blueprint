/**
 * Build a minimal valid ONNX model file (protobuf binary) for the MLP:
 *   input(1,24) -> MatMul -> Add -> Relu -> MatMul -> Add -> Relu -> MatMul -> Add -> Sigmoid -> output(1,1)
 *
 * Weights match the builtin model exactly (same deterministic formula).
 * No external dependencies beyond Node.js built-ins.
 */

const fs = require('fs');
const path = require('path');

// ── Protobuf low-level encoding ──────────────────────────────────────────────

function encodeVarint(val) {
  const buf = [];
  val = val >>> 0;
  if (val === 0) return Buffer.from([0]);
  do {
    let b = val & 0x7f;
    val >>>= 7;
    if (val) b |= 0x80;
    buf.push(b);
  } while (val);
  return Buffer.from(buf);
}

function tag(field, wire) { return encodeVarint((field << 3) | wire); }
const W_VARINT = 0, W_64 = 1, W_LEN = 2, W_32 = 5;

function fldVarint(field, val) { return Buffer.concat([tag(field, W_VARINT), encodeVarint(val)]); }
function fldFloat(field, val) { const b = Buffer.alloc(4); b.writeFloatLE(val); return Buffer.concat([tag(field, W_32), b]); }
function fldBytes(field, buf) { return Buffer.concat([tag(field, W_LEN), encodeVarint(buf.length), buf]); }
function fldString(field, s) { return fldBytes(field, Buffer.from(s, 'utf8')); }
function fldMsg(field, msgBuf) { return fldBytes(field, msgBuf); }

// ── Weights (match builtinModel.ts exactly) ──────────────────────────────────

const FEATURE_DIM = 24;
const H1 = 32, H2 = 16, OUT = 1;

function S(i, j) { return Math.sin(i * 0.73 + j * 0.31) * 0.5 + Math.cos(i * 0.17 + j * 0.53) * 0.3; }

// Layer 1: 24x32
const l1w = new Float32Array(FEATURE_DIM * H1);
for (let i = 0; i < FEATURE_DIM * H1; i++) l1w[i] = S(i, i * 0.7);
const l1b = new Float32Array(H1); // zeros

// Layer 2: 32x16
const l2w = new Float32Array(H1 * H2);
for (let i = 0; i < H1 * H2; i++) l2w[i] = S(i, i * 0.5);
const l2b = new Float32Array(H2); // zeros

// Layer 3: 16x1
const l3w = new Float32Array([.42,-.18,.67,.31,-.55,.48,.23,-.39,.56,.14,-.61,.37,.52,-.26,.44,.59]);
const l3b = new Float32Array([-.12]);

// ── ONNX protobuf builders ──────────────────────────────────────────────────

// TensorProto (data_type=1=FLOAT, raw_data on field 13)
function makeTensor(name, dims, float32Array) {
  const parts = [];
  parts.push(fldString(8, name));
  parts.push(fldVarint(2, 1)); // FLOAT
  for (const d of dims) parts.push(fldVarint(1, d));
  parts.push(fldBytes(13, Buffer.from(float32Array.buffer, float32Array.byteOffset, float32Array.byteLength)));
  return Buffer.concat(parts);
}

// TypeProto.Tensor -> TypeProto message
function makeTensorType(elemType, shape) {
  // TensorShapeProto { repeated Dimension dim = 1; }
  // Dimension { int64 dim_value = 1; }
  const shapeParts = [];
  for (const d of shape) {
    shapeParts.push(fldMsg(1, fldVarint(1, d)));
  }
  const tensorShape = Buffer.concat(shapeParts);

  // TypeProto.Tensor { int32 elem_type = 1; TensorShapeProto shape = 2; }
  const tensor = Buffer.concat([
    fldVarint(1, elemType),
    fldMsg(2, tensorShape),
  ]);

  // TypeProto { Tensor tensor_type = 1; }
  return fldMsg(1, tensor);
}

// ValueInfoProto { string name = 1; TypeProto type = 2; }
function makeValueInfo(name, shape) {
  return Buffer.concat([
    fldString(1, name),
    makeTensorType(1, shape),
  ]);
}

// NodeProto { repeated string input = 1; repeated string output = 2; string name = 3; string op_type = 4; }
function makeNode(opType, inputs, outputs, name) {
  const parts = [];
  for (const inp of inputs) parts.push(fldString(1, inp));
  for (const out of outputs) parts.push(fldString(2, out));
  if (name) parts.push(fldString(3, name));
  parts.push(fldString(4, opType));
  return Buffer.concat(parts);
}

// ── Build the graph ──────────────────────────────────────────────────────────

const nodes = [
  makeNode('MatMul', ['input', 'l1w'], ['t1'], 'matmul1'),
  makeNode('Add', ['t1', 'l1b'], ['t2'], 'add1'),
  makeNode('Relu', ['t2'], ['t3'], 'relu1'),
  makeNode('MatMul', ['t3', 'l2w'], ['t4'], 'matmul2'),
  makeNode('Add', ['t4', 'l2b'], ['t5'], 'add2'),
  makeNode('Relu', ['t5'], ['t6'], 'relu2'),
  makeNode('MatMul', ['t6', 'l3w'], ['t7'], 'matmul3'),
  makeNode('Add', ['t7', 'l3b'], ['t8'], 'add3'),
  makeNode('Sigmoid', ['t8'], ['prob'], 'sigmoid'),
];

const initializers = [
  makeTensor('l1w', [FEATURE_DIM, H1], l1w),
  makeTensor('l1b', [H1], l1b),
  makeTensor('l2w', [H1, H2], l2w),
  makeTensor('l2b', [H2], l2b),
  makeTensor('l3w', [H2, OUT], l3w),
  makeTensor('l3b', [OUT], l3b),
];

const graphInputs = [makeValueInfo('input', [1, FEATURE_DIM])];
const graphOutputs = [makeValueInfo('prob', [1, 1])];

// GraphProto { repeated Node node=1; string name=2; repeated TensorProto initializer=5; repeated ValueInfoProto input=11; repeated ValueInfoProto output=12; }
const graphParts = [];
for (const n of nodes) graphParts.push(fldMsg(1, n));
graphParts.push(fldString(2, 'ai_detector_mlp'));
for (const init of initializers) graphParts.push(fldMsg(5, init));
for (const inp of graphInputs) graphParts.push(fldMsg(11, inp));
for (const out of graphOutputs) graphParts.push(fldMsg(12, out));
const graph = Buffer.concat(graphParts);

// ── Build the model ──────────────────────────────────────────────────────────

// OperatorSetIdProto { string domain = 1; int64 version = 2; }
const opset = Buffer.concat([
  fldString(1, ''),   // default ONNX domain
  fldVarint(2, 17),   // opset version 17
]);

// ModelProto { int64 ir_version=1; string producer_name=2; GraphProto graph=7; repeated OperatorSetIdProto opset_import=8; }
const model = Buffer.concat([
  fldVarint(1, 8),               // ir_version = 8
  fldString(2, 'unrobot-onnx'),  // producer_name
  fldMsg(7, graph),              // graph
  fldMsg(8, opset),              // opset_import
]);

// ── Write to file ────────────────────────────────────────────────────────────

const outPath = path.join(__dirname, '..', 'public', 'models', 'ai-detector.onnx');
fs.writeFileSync(outPath, model);
const sizeKB = (model.length / 1024).toFixed(1);
console.log(`ONNX model written to ${outPath} (${sizeKB} KB)`);
console.log(`Total bytes: ${model.length}`);

// Quick sanity: first byte should encode field 1 (ir_version) with varint wire type
const firstByte = model[0];
console.log(`First byte: 0x${firstByte.toString(16)} (field ${firstByte >> 3}, wire ${firstByte & 7})`);
// Should be field 1, wire 0 (varint) = 0x08
if (firstByte !== 0x08) {
  console.error('WARNING: First byte mismatch! Expected 0x08 for ir_version field.');
} else {
  console.log('OK: First byte is correct (0x08 = field 1, varint).');
}