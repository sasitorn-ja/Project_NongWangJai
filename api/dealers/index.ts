import { proxyToCpac } from "../_lib/proxy";

export const runtime = "edge";

export default async function handler(request: Request) {
  return proxyToCpac(request, "/api/ai-wangjai/dealers");
}
