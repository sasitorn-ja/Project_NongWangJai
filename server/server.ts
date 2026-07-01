import fs from "node:fs";
import path from "node:path";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { resolveApiRouteFile } from "./api-routing.js";
import { resolveBasePath, stripBasePath } from "./base-path.js";

const port = Number(process.env.PORT || 3000);
const basePath = resolveBasePath();
const clientDistDir = path.resolve(process.cwd(), "dist");
const apiDistDir = path.resolve(process.cwd(), "dist-server/api");

const CONTENT_TYPES = new Map<string, string>([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function nodeHeadersToFetchHeaders(headers: IncomingMessage["headers"]) {
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

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks);
}

async function sendWebResponse(response: Response, nodeResponse: ServerResponse) {
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

function sendError(response: ServerResponse, status: number, message: string) {
  response.statusCode = status;
  response.setHeader("content-type", "text/plain; charset=utf-8");
  response.end(message);
}

function getMimeType(filePath: string) {
  return CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

function isSafeRelativePath(relativePath: string) {
  return !relativePath.split("/").some((segment) => segment === "..");
}

function buildRequestUrl(request: IncomingMessage) {
  const host = request.headers.host ?? "127.0.0.1";
  const protocol = typeof request.headers["x-forwarded-proto"] === "string" ? request.headers["x-forwarded-proto"] : "http";
  return new URL(request.url ?? "/", `${protocol}://${host}`);
}

async function handleApi(request: IncomingMessage, response: ServerResponse, pathname: string) {
  const routeFile = resolveApiRouteFile(apiDistDir, pathname);

  if (!routeFile) {
    sendError(response, 404, "Not Found");
    return;
  }

  try {
    const routeModule = await import(pathToFileURL(routeFile).href);
    const method = (request.method ?? "GET").toUpperCase();
    const handler = routeModule[method] as ((request: Request) => Response | Promise<Response>) | undefined;

    if (!handler) {
      sendError(response, 405, `Method ${method} Not Allowed`);
      return;
    }

    const body = method === "GET" || method === "HEAD" ? undefined : await readRequestBody(request);
    const incomingUrl = buildRequestUrl(request);
    const routeUrl = new URL(incomingUrl.toString());
    routeUrl.pathname = pathname;
    const webRequest = new Request(routeUrl.toString(), {
      body,
      headers: nodeHeadersToFetchHeaders(request.headers),
      method
    });

    const webResponse = await handler(webRequest);
    await sendWebResponse(webResponse, response);
  } catch (error) {
    console.error("API route failed", { error, pathname, routeFile });
    sendError(response, 500, "Internal Server Error");
  }
}

function sendFile(response: ServerResponse, filePath: string) {
  response.statusCode = 200;
  response.setHeader("content-type", getMimeType(filePath));
  fs.createReadStream(filePath).pipe(response);
}

function handleStatic(response: ServerResponse, pathname: string) {
  const relativePath = pathname.replace(/^\/+/, "");

  if (!isSafeRelativePath(relativePath)) {
    sendError(response, 400, "Bad Request");
    return;
  }

  const targetFile = path.join(clientDistDir, relativePath);
  if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
    sendFile(response, targetFile);
    return;
  }

  const indexFile = path.join(clientDistDir, "index.html");
  if (!fs.existsSync(indexFile)) {
    sendError(response, 500, "Missing index.html");
    return;
  }

  sendFile(response, indexFile);
}

createServer(async (request, response) => {
  const incomingUrl = buildRequestUrl(request);
  const scopedPathname = stripBasePath(incomingUrl.pathname, basePath);

  if (scopedPathname === null) {
    sendError(response, 404, "Not Found");
    return;
  }

  if (scopedPathname.startsWith("/api/") || scopedPathname === "/api") {
    await handleApi(request, response, scopedPathname);
    return;
  }

  handleStatic(response, scopedPathname);
}).listen(port, "0.0.0.0", () => {
  console.log(`Nong Wang Jai server listening on ${port} with base path ${basePath}`);
});
