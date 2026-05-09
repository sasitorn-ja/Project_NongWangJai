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

function encodeBasicAuth(user: string, password: string) {
  return `Basic ${btoa(`${user}:${password}`)}`;
}

function buildForwardHeaders(request: Request, authHeader: string) {
  const headers = new Headers();
  headers.set("authorization", authHeader);
  headers.set("accept", "application/json");

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  return headers;
}

function buildResponseHeaders(source: Headers) {
  const headers = new Headers();

  source.forEach((value, key) => {
    headers.set(key, value);
  });

  return headers;
}

export async function proxyToCpac(request: Request, upstreamPath: string) {
  try {
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

    const method = request.method.toUpperCase();
    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers: buildForwardHeaders(request, encodeBasicAuth(user, password)),
      body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer()
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: buildResponseHeaders(response.headers)
    });
  } catch (error) {
    console.error("CPAC proxy failed", {
      error,
      requestUrl: request.url,
      upstreamPath
    });

    const message = error instanceof Error ? error.message : "Unknown proxy error";
    const name = error instanceof Error ? error.name : "Error";

    return Response.json(
      {
        error: "CPAC proxy invocation failed",
        details: {
          message,
          name,
          upstreamPath
        }
      },
      { status: 500 }
    );
  }
}
