import { proxyToCpac } from "../../_shared/cpac-proxy.js";

function resolveDealerId(request: Request) {
  const url = new URL(request.url);
  return url.pathname.split("/").filter(Boolean)[2] ?? "";
}

export async function GET(request: Request) {
  return proxyToCpac(request, `/api/ai-wangjai/dealers/${resolveDealerId(request)}/sites`);
}
