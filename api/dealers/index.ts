import { proxyToCpac } from "../../lib/cpac-proxy";

export async function GET(request: Request) {
  return proxyToCpac(request, "/api/ai-wangjai/dealers");
}
