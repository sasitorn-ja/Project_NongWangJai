const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

function cleanEnv(value?: string) {
  if (!value) return "";
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
  ) {
    return trimmed.slice(1, -1).replace(/\\\$/g, "$");
  }

  return trimmed.replace(/\\\$/g, "$");
}

function getProxyConfig() {
  const target = cleanEnv(process.env.CPAC_API_TARGET) || "https://test-cpac-api.merudy.com";
  const user = cleanEnv(process.env.CPAC_API_USER);
  const password = cleanEnv(process.env.CPAC_API_PASSWORD);

  return { password, target, user };
}

function buildForwardHeaders(request: Request, authHeader: string) {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (lower === "authorization") return;
    headers.set(key, value);
  });

  headers.set("authorization", authHeader);
  headers.set("accept", "application/json");

  return headers;
}

function buildResponseHeaders(source: Headers) {
  const headers = new Headers();

  source.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  return headers;
}

export async function proxyToCpac(request: Request, upstreamPath: string) {
  const { password, target, user } = getProxyConfig();

  if (!user || !password) {
    return Response.json(
      {
        error: "Missing CPAC API credentials",
        required: ["CPAC_API_USER", "CPAC_API_PASSWORD"]
      },
      { status: 500 }
    );
  }

  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(upstreamPath, target);
  upstreamUrl.search = incomingUrl.search;

  const authHeader = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers: buildForwardHeaders(request, authHeader)
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: buildResponseHeaders(response.headers)
  });
}
import { Buffer } from "node:buffer";
