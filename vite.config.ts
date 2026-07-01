import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function resolveApiRouteFile(baseDir: string, pathname: string): string | null {
  const segments = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  return resolveApiRouteFromDirectory(baseDir, segments);
}

function resolveApiRouteFromDirectory(currentDir: string, segments: string[]): string | null {
  if (segments.length === 0) {
    const indexFile = path.join(currentDir, "index.ts");
    return fs.existsSync(indexFile) ? indexFile : null;
  }

  const [segment, ...rest] = segments;
  const exactDirectory = path.join(currentDir, segment);

  if (fs.existsSync(exactDirectory) && fs.statSync(exactDirectory).isDirectory()) {
    const match = resolveApiRouteFromDirectory(exactDirectory, rest);
    if (match) return match;
  }

  const exactFile = path.join(currentDir, `${segment}.ts`);
  if (rest.length === 0 && fs.existsSync(exactFile) && fs.statSync(exactFile).isFile()) {
    return exactFile;
  }

  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\[.+\]$/.test(entry.name)) continue;
    const match = resolveApiRouteFromDirectory(path.join(currentDir, entry.name), rest);
    if (match) return match;
  }

  if (rest.length === 0) {
    for (const entry of entries) {
      if (!entry.isFile() || !/^\[.+\]\.ts$/.test(entry.name)) continue;
      return path.join(currentDir, entry.name);
    }
  }

  return null;
}

function normalizeBasePath(basePath: string) {
  if (!basePath || basePath === "/") return "/";
  return `/${basePath.replace(/^\/+|\/+$/g, "")}/`;
}

function resolveBasePath(env: Record<string, string>) {
  if (env.APP_BASE_PATH) {
    return normalizeBasePath(env.APP_BASE_PATH);
  }

  if (env.PROD_UI_BASE_URL) {
    try {
      return normalizeBasePath(new URL(env.PROD_UI_BASE_URL).pathname);
    } catch {
      return normalizeBasePath(env.PROD_UI_BASE_URL);
    }
  }

  return "/";
}

function nodeHeadersToFetchHeaders(headers: Record<string, string | string[] | undefined>) {
  const result = new Headers();

  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => result.append(key, item));
      return;
    }

    if (typeof value === "string") {
      result.set(key, value);
    }
  });

  return result;
}

async function readRequestBody(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks);
}

async function sendWebResponse(response: Response, nodeResponse: import("node:http").ServerResponse) {
  nodeResponse.statusCode = response.status;
  nodeResponse.statusMessage = response.statusText;

  const setCookies =
    typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];

  if (setCookies.length > 0) {
    nodeResponse.setHeader("set-cookie", setCookies);
  }

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    nodeResponse.setHeader(key, value);
  });

  const body = await response.arrayBuffer();
  nodeResponse.end(Buffer.from(body));
}

export default defineConfig(({ mode }) => {
  const apiRoot = path.resolve(__dirname, "./api");
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);
  const basePath = resolveBasePath(env);

  return {
    base: basePath,
    plugins: [
      react(),
      {
        name: "local-api-routes",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const method = (req.method ?? "GET").toUpperCase();
            const url = req.url ? new URL(req.url, "http://127.0.0.1:5173") : null;
            const requestPathname = url ? (basePath !== "/" && url.pathname.startsWith(basePath)
              ? url.pathname.slice(basePath.length - 1) || "/"
              : url.pathname) : null;

            if (!url || !requestPathname || !requestPathname.startsWith("/api/")) {
              next();
              return;
            }

            const routeFile = resolveApiRouteFile(apiRoot, requestPathname);
            if (!routeFile) {
              next();
              return;
            }

            try {
              const routeModule = await server.ssrLoadModule(routeFile);
              const handler = routeModule[method] as ((request: Request) => Response | Promise<Response>) | undefined;

              if (!handler) {
                res.statusCode = 405;
                res.end(`Method ${method} Not Allowed`);
                return;
              }

              const body = method === "GET" || method === "HEAD" ? undefined : await readRequestBody(req);
              const routeUrl = new URL(url.toString());
              routeUrl.pathname = requestPathname;
              const request = new Request(routeUrl.toString(), {
                body,
                headers: nodeHeadersToFetchHeaders(req.headers),
                method
              });

              const response = await handler(request);
              await sendWebResponse(response, res);
            } catch (error) {
              server.ssrFixStacktrace(error as Error);
              console.error("Local API route failed", {
                error,
                method,
                pathname: requestPathname,
                routeFile
              });
              res.statusCode = 500;
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ error: "Local API route failed" }));
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    }
  };
});
