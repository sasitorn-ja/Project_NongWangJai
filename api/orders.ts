import { proxyToCpac } from "./_shared/cpac-proxy.js";

export async function GET(request: Request) {
  return proxyToCpac(request, "/api/ai-wangjai/order");
}
