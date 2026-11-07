// A non-negative number from an env var, or `fallback` when it is unset,
// blank or invalid. `Number(v) || fallback` turned a deliberate 0 into the
// fallback, so a cooldown could never be switched off.
export function envNumber(name, fallback, env = process.env) {
  const raw = env[name]?.trim();
  const n = Number(raw);
  return raw && Number.isFinite(n) && n >= 0 ? n : fallback;
}
