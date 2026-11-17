/** Missing configuration disables collection; it never falls back to an old property. */
export function analyticsConfig(
  measurementId: string | undefined,
  hostname: string | undefined,
  production: boolean,
  currentHostname: string,
  debugRequested: boolean,
) {
  const debug = !production && debugRequested;
  const valid = /^G-[A-Z0-9]+$/.test(measurementId ?? "");
  return {
    measurementId: measurementId ?? "",
    debug,
    enabled:
      valid &&
      (debug || (production && !!hostname && hostname === currentHostname)),
  };
}
