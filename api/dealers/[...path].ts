import { proxyToCpac } from "../../lib/cpac-proxy";

function resolveUpstreamPath(request: Request) {
  const url = new URL(request.url);
  const suffix = url.pathname.replace(/^\/api\/dealers\/?/, "");
  return `/api/ai-wangjai/dealers/${suffix}`;
}

export async function GET(request: Request) {
  return proxyToCpac(request, resolveUpstreamPath(request));
}
