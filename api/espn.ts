const ESPN_HOST = "lm-api-reads.fantasy.espn.com";

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

const sendJson = (
  res: ApiResponse,
  status: number,
  payload: Record<string, string>
) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
    !url ||
    !swid ||
    !espnS2
  ) {
    sendJson(res, 400, { error: "Missing ESPN request credentials" });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    sendJson(res, 400, { error: "Invalid ESPN request URL" });
    return;
  }

  if (parsedUrl.hostname !== ESPN_HOST || parsedUrl.protocol !== "https:") {
    sendJson(res, 400, { error: "Unsupported ESPN request URL" });
    return;
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        Cookie: `SWID=${swid}; espn_s2=${espnS2}`,
      },
    });
    const text = await response.text();

    res.statusCode = response.status;
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") ?? "application/json"
    );
    res.end(text);
  } catch {
    sendJson(res, 502, { error: "Unable to fetch ESPN league data" });
  }
}
