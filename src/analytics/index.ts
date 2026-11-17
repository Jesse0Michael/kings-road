import { GameAnalytics, type Send } from "./gameAnalytics";

import { analyticsConfig } from "./config";

const {
  measurementId: MEASUREMENT_ID,
  debug,
  enabled,
} = analyticsConfig(
  import.meta.env.VITE_GA_MEASUREMENT_ID,
  import.meta.env.VITE_ANALYTICS_HOSTNAME,
  import.meta.env.PROD,
  window.location.hostname,
  import.meta.env.VITE_ANALYTICS_DEBUG === "true",
);
declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

// Debug mode queues events locally without loading Google. Ordinary development
// is silent; production uses the standard Google tag, with no GTM container.
function gtag(..._args: unknown[]) {
  window.dataLayer ??= [];
  window.dataLayer.push(arguments);
}
const send: Send = (event, parameters) => {
  if (enabled) gtag("event", event, { ...parameters, send_to: MEASUREMENT_ID });
};
let storage: Storage | undefined;
try {
  if (enabled) storage = window.localStorage;
} catch {
  /* Storage is optional. */
}
export const analytics = new GameAnalytics(send, storage);

export function initializeAnalytics() {
  if (enabled) {
    gtag("js", new Date());
    gtag("config", MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    if (!debug) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      document.head.appendChild(script);
    }
  }
  analytics.visibility(!document.hidden);
  document.addEventListener("visibilitychange", () =>
    analytics.visibility(!document.hidden),
  );
  window.addEventListener("pagehide", () => analytics.visibility(false));
  window.addEventListener("pageshow", () =>
    analytics.visibility(!document.hidden),
  );
}
