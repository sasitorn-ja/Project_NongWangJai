import { proxyToCpac } from "../_lib/proxy";

function resolveUpstreamPath(request: Request) {
  const url = new URL(request.url);
  const suffix = url.pathname.replace(/^\/api\/dealers\/?/, "");
  return `/api/ai-wangjai/dealers/${suffix}`;
}

export default {
  async fetch(request: Request) {
    return proxyToCpac(request, resolveUpstreamPath(request));
  }
};
