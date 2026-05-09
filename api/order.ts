import { proxyToCpac } from "./_lib/proxy";

export async function GET(request: Request) {
  return proxyToCpac(request, "/api/ai-wangjai/order");
}
