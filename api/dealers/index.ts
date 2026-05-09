import { proxyToCpac } from "../../lib/cpac-proxy.js";

export async function GET(request: Request) {
  return proxyToCpac(request, "/api/ai-wangjai/dealers");
}
