import { authenticatedFetch } from "@/lib/authFetch";
import { runWithRequestTimeout } from "@/lib/request";

export const AI_REPORT_TIMEOUT_MS = 60_000;

export const fetchAiReport = (
  input: RequestInfo | URL,
  init: Omit<RequestInit, "signal">,
  authenticated = false
) =>
  runWithRequestTimeout(
    (requestSignal) =>
      (authenticated ? authenticatedFetch : fetch)(input, {
        ...init,
        signal: requestSignal,
      }),
    { timeoutMs: AI_REPORT_TIMEOUT_MS }
  );
