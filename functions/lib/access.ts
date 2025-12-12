const textDecoder = new TextDecoder();

const base64UrlDecode = (input: string): ArrayBuffer => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const parseJwt = (token: string) => {
  const [headerB64, payloadB64, signatureB64] = token.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) throw new Error("Malformed JWT");
  const header = JSON.parse(textDecoder.decode(base64UrlDecode(headerB64)));
  const payload = JSON.parse(textDecoder.decode(base64UrlDecode(payloadB64)));
  const signature = base64UrlDecode(signatureB64);
  const signingInput = `${headerB64}.${payloadB64}`;
  return { header, payload, signature, signingInput };
};

type Jwk = { kid: string; kty: string; alg: string; n?: string; e?: string };

const importRsaKey = async (jwk: Jwk): Promise<CryptoKey> => {
  if (!jwk.n || !jwk.e) throw new Error("Invalid JWK");
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg, ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
};

const getAccessKeys = async (teamDomain: string) => {
  const resp = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!resp.ok) throw new Error(`Failed to load Access certs: ${resp.status}`);
  const { keys } = (await resp.json()) as { keys: Jwk[] };
  const map = new Map<string, CryptoKey>();
  for (const jwk of keys) {
    if (!jwk.kid) continue;
    try {
      map.set(jwk.kid, await importRsaKey(jwk));
    } catch {
      // ignore keys we cannot import
    }
  }
  return map;
};

export type AdminCheckResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/**
 * Validates a Cloudflare Access JWT on PUT requests. GET/OPTIONS are allowed.
 * Requires env.CF_ACCESS_TEAM_DOMAIN and env.CF_ACCESS_AUD to be set.
 */
export const requireAccessForWrite = async (
  request: Request,
  env: { CF_ACCESS_TEAM_DOMAIN?: string; CF_ACCESS_AUD?: string }
): Promise<AdminCheckResult> => {
  if (request.method !== "PUT") return { ok: true };

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
  const audience = env.CF_ACCESS_AUD;
  if (!teamDomain || !audience) {
    // If not configured, allow but warn so we don't break writes unexpectedly.
    console.warn("Access validation skipped: CF_ACCESS_TEAM_DOMAIN or CF_ACCESS_AUD not set.");
    return { ok: true };
  }

  const token =
    request.headers.get("Cf-Access-Jwt-Assertion") ||
    request.headers.get("cf-access-jwt-assertion") ||
    // Access sets CF_Authorization cookie after login
    (() => {
      const cookie = request.headers.get("Cookie") || "";
      const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    })();

  if (!token) {
    return { ok: false, status: 401, message: "Missing Access token" };
  }

  try {
    const { header, payload, signature, signingInput } = parseJwt(token);
    const keys = await getAccessKeys(teamDomain);
    const key = keys.get(header.kid);
    if (!key) throw new Error("Unknown key id");

    const valid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      signature,
      new TextEncoder().encode(signingInput)
    );
    if (!valid) throw new Error("Invalid signature");

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now >= payload.exp) throw new Error("Token expired");
    if (payload.nbf && now < payload.nbf) throw new Error("Token not yet valid");

    const audOk = Array.isArray(payload.aud)
      ? payload.aud.includes(audience)
      : payload.aud === audience;
    if (!audOk) throw new Error("Audience mismatch");

    const issOk = payload.iss === `https://${teamDomain}/`;
    if (!issOk) throw new Error("Issuer mismatch");

    return { ok: true };
  } catch (error) {
    console.warn("Access validation failed", error);
    return { ok: false, status: 403, message: "Access token invalid" };
  }
};
