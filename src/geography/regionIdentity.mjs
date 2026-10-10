const fingerprints = new WeakMap();
// Fast content identity for pinned geometry, not a security or factual-review signal.
export function geometryFingerprint(geometry) {
  let value = fingerprints.get(geometry);
  if (value !== undefined) return value;
  const text = JSON.stringify(geometry);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  value = (hash >>> 0).toString(16);
  fingerprints.set(geometry, value);
  return value;
}
