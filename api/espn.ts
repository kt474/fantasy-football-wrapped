const ESPN_HOST = "lm-api-reads.fantasy.espn.com";
const ESPN_PATH_PATTERN =
  /^\/apis\/v3\/games\/ffl\/seasons\/\d{4}\/segments\/0\/leagues\/\d+$/;
const ALLOWED_QUERY_KEYS = new Set(["view", "scoringPeriodId"]);
const ALLOWED_VIEWS = new Set([
  "mSettings",
  "mTeam",
  "mRoster",
  "mDraftDetail",
  "mMatchupScore",
  "mScoreboard",
  "mTransactions2",
]);
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_URL_LENGTH = 4_096;
const MAX_SWID_LENGTH = 256;
const MAX_ESPN_S2_LENGTH = 4_096;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

type EspnProxyBody = {
  url?: unknown;
  swid?: unknown;
  espnS2?: unknown;
};

type ApiRequest = {
  method?: string;
  body?: EspnProxyBody;
};

type ApiResponse = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};

const setSecurityHeaders = (res: ApiResponse) => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
};

const sendJson = (
  res: ApiResponse,
  status: number,
  payload: Record<string, string>
) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

const hasValidCredentialFormat = (value: string, maxLength: number) =>
  value.length > 0 &&
  value.length <= maxLength &&
  !CONTROL_CHARACTER_PATTERN.test(value);

export const isAllowedEspnUrl = (parsedUrl: URL) => {
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== ESPN_HOST ||
    (parsedUrl.port && parsedUrl.port !== "443") ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.hash ||
    !ESPN_PATH_PATTERN.test(parsedUrl.pathname)
  ) {
    return false;
  }

  for (const [key, value] of parsedUrl.searchParams) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return false;
    }
    if (key === "view" && !ALLOWED_VIEWS.has(value)) {
      return false;
    }
    if (
      key === "scoringPeriodId" &&
      (!/^\d{1,2}$/.test(value) || Number(value) < 1 || Number(value) > 25)
    ) {
      return false;
    }
  }

  return parsedUrl.searchParams.has("view");
};

const readLimitedResponse = async (response: Response) => {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("ESPN_RESPONSE_TOO_LARGE");
  }

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      throw new Error("ESPN_RESPONSE_TOO_LARGE");
    }
    return new TextDecoder().decode(buffer);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("ESPN_RESPONSE_TOO_LARGE");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setSecurityHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const { url, swid, espnS2 } = req.body ?? {};

  if (
    typeof url !== "string" ||
    typeof swid !== "string" ||
    typeof espnS2 !== "string" ||
    url.length > MAX_URL_LENGTH ||
    !hasValidCredentialFormat(swid, MAX_SWID_LENGTH) ||
    !hasValidCredentialFormat(espnS2, MAX_ESPN_S2_LENGTH)
  ) {
    sendJson(res, 400, { error: "Invalid ESPN request credentials" });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    sendJson(res, 400, { error: "Invalid ESPN request URL" });
    return;
  }

  if (!isAllowedEspnUrl(parsedUrl)) {
    sendJson(res, 400, { error: "Unsupported ESPN request URL" });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        Accept: "application/json",
        Cookie: `SWID=${swid}; espn_s2=${espnS2}`,
      },
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) {
      sendJson(res, response.status, {
        error: "ESPN rejected the league data request",
      });
      return;
    }

    const text = await readLimitedResponse(response);
    res.statusCode = response.status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(text);
  } catch (error) {
    if (
      controller.signal.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      sendJson(res, 504, { error: "ESPN request timed out" });
      return;
    }
    if (
      error instanceof Error &&
      error.message === "ESPN_RESPONSE_TOO_LARGE"
    ) {
      sendJson(res, 502, { error: "ESPN response was too large" });
      return;
    }
    sendJson(res, 502, { error: "Unable to fetch ESPN league data" });
  } finally {
    clearTimeout(timeoutId);
  }
}
