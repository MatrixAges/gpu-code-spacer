export function modelShader(inputs, hidden, outputs) {
  const b1 = inputs * hidden;
  const w2 = b1 + hidden;
  const b2 = w2 + hidden * outputs;

  return `
@group(0) @binding(0) var<storage, read> weights: array<f32>;
@group(0) @binding(1) var<storage, read> features: array<f32>;
@group(0) @binding(2) var<storage, read_write> logits: array<f32>;

var<workgroup> activations: array<f32, ${hidden}>;

@compute @workgroup_size(${hidden})
fn main(
  @builtin(workgroup_id) group: vec3<u32>,
  @builtin(local_invocation_index) neuron: u32,
) {
  let sample = group.x;
  var sum = weights[${b1}u + neuron];

  for (var i = 0u; i < ${inputs}u; i += 1u) {
    sum += features[sample * ${inputs}u + i] * weights[i * ${hidden}u + neuron];
  }

  activations[neuron] = max(0.0, sum);
  workgroupBarrier();

  if (neuron < ${outputs}u) {
    var value = weights[${b2}u + neuron];

    for (var h = 0u; h < ${hidden}u; h += 1u) {
      value += activations[h] * weights[${w2}u + h * ${outputs}u + neuron];
    }

    logits[sample * ${outputs}u + neuron] = value;
  }
}
`;
}
