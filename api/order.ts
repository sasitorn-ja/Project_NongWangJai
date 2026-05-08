import { proxyToCpac } from "./_lib/proxy";

export default {
  async fetch(request: Request) {
    return proxyToCpac(request, "/api/ai-wangjai/order");
  }
};
