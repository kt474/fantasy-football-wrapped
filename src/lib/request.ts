export const LEAGUE_LOAD_TIMEOUT_MS = 20_000;
export const ESPN_LEAGUE_LOAD_TIMEOUT_MS = 45_000;
export const REQUEST_ATTEMPT_TIMEOUT_MS = 8_000;

export type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export class RequestTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "RequestTimeoutError";
  }
}

export class RequestAbortedError extends Error {
  constructor() {
    super("Request was canceled");
    this.name = "AbortError";
  }
}

export const isRequestCancellation = (error: unknown) =>
  error instanceof RequestAbortedError ||
  (error instanceof Error && error.name === "AbortError");

export const isRequestTimeout = (error: unknown) =>
  error instanceof RequestTimeoutError;

const getAbortError = (signal?: AbortSignal) =>
  signal?.reason instanceof Error
    ? signal.reason
    : new RequestAbortedError();

export const throwIfRequestAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw getAbortError(signal);
};

export const runWithRequestTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  { signal, timeoutMs = LEAGUE_LOAD_TIMEOUT_MS }: RequestOptions = {}
): Promise<T> => {
  if (signal?.aborted) throw getAbortError(signal);

  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort(getAbortError(signal));
  signal?.addEventListener("abort", abortFromParent, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new RequestTimeoutError(timeoutMs));
  }, timeoutMs);
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => reject(getAbortError(controller.signal)),
      { once: true }
    );
  });

  try {
    return await Promise.race([operation(controller.signal), aborted]);
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError(timeoutMs);
    if (signal?.aborted) throw getAbortError(signal);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromParent);
  }
};

type FetchWithRetryOptions = RequestInit & {
  retries?: number;
  retryDelayMs?: number;
  attemptTimeoutMs?: number;
};

const isSleeperApiRequest = (input: RequestInfo | URL) => {
  const requestUrl = input instanceof Request ? input.url : String(input);
  return /^https:\/\/api\.sleeper\.(?:app|com)\//.test(requestUrl);
};

const shouldRetryResponse = (response: Response) =>
  response.status === 408 ||
  response.status === 429 ||
  response.status >= 500;

const waitForRetry = (delayMs: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(getAbortError(signal));
      return;
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, delayMs);
    const abort = () => {
      clearTimeout(timeoutId);
      reject(getAbortError(signal));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });

export const fetchWithRetry = async (
  input: RequestInfo | URL,
  {
    retries = 1,
    retryDelayMs = 250,
    attemptTimeoutMs = REQUEST_ATTEMPT_TIMEOUT_MS,
    signal,
    ...init
  }: FetchWithRetryOptions = {}
): Promise<Response> => {
  const parentSignal = signal ?? undefined;
  const requestInit =
    init.cache === undefined && isSleeperApiRequest(input)
      ? { ...init, cache: "no-store" as const }
      : init;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await runWithRequestTimeout<Response>(
        (attemptSignal) =>
          fetch(input, { ...requestInit, signal: attemptSignal }),
        { signal: parentSignal, timeoutMs: attemptTimeoutMs }
      );

      if (!shouldRetryResponse(response) || attempt === retries) {
        return response;
      }
      void response.body?.cancel().catch(() => undefined);
    } catch (error) {
      if (isRequestCancellation(error) || parentSignal?.aborted) throw error;
      if (attempt === retries) throw error;
    }

    await waitForRetry(retryDelayMs * 2 ** attempt, parentSignal);
  }

  throw new Error("Request retry loop exited unexpectedly");
};

export const getLeagueLoadErrorMessage = (
  error: unknown,
  platform: "sleeper" | "espn" = "sleeper"
) => {
  const label = platform === "espn" ? "ESPN league" : "League";
  if (isRequestTimeout(error)) {
    return `${label} loading timed out. Please try again.`;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You appear to be offline. Check your connection and try again.";
  }
  return platform === "espn"
    ? "Unable to load ESPN league right now. Please try again."
    : "Unable to load league right now. Please try again.";
};

export const createLatestRequestGuard = () => {
  let activeController: AbortController | null = null;

  return {
    start() {
      activeController?.abort();
      activeController = new AbortController();
      return activeController;
    },
    isActive(controller: AbortController) {
      return activeController === controller && !controller.signal.aborted;
    },
    finish(controller: AbortController) {
      if (activeController !== controller) return false;
      activeController = null;
      return true;
    },
    cancel() {
      activeController?.abort();
      activeController = null;
    },
  };
};
