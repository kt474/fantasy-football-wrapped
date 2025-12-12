import { requireAccess } from "./lib/access";

const protectedPaths = [
  /^\/admin(\/|$)/,
  /^\/api\/awards/,
  /^\/api\/weekly-bonuses/,
];

export const onRequest: PagesFunction = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  const isProtected = protectedPaths.some((pattern) => pattern.test(url.pathname));
  if (!isProtected) return next();

  const access = await requireAccess(request, env);
  if (access.ok) return next();

  const isApi = url.pathname.startsWith("/api/");
  const wantsJson =
    isApi ||
    request.headers.get("accept")?.includes("application/json") ||
    request.headers.get("content-type") === "application/json";

  if (access.loginUrl && !wantsJson) {
    return Response.redirect(access.loginUrl, 302);
  }

  const message = access.message || "Access denied";
  const body = wantsJson ? JSON.stringify({ message, loginUrl: access.loginUrl }) : message;
  return new Response(body, {
    status: access.status,
    headers: wantsJson ? { "Content-Type": "application/json" } : undefined,
  });
};
