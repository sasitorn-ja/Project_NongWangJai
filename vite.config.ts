import { Buffer } from "node:buffer";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function cleanEnv(value?: string) {
  if (!value) return "";
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
  ) {
    return trimmed.slice(1, -1).replace(/\\\$/g, "$");
  }

  return trimmed.replace(/\\\$/g, "$");
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = cleanEnv(env.CPAC_API_TARGET) || "https://test-cpac-api.merudy.com";
  const user = cleanEnv(env.CPAC_API_USER);
  const password = cleanEnv(env.CPAC_API_PASSWORD);
  const auth = user && password ? `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}` : "";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    server: {
      proxy: {
        "/api/dealers": {
          target,
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api\/dealers/, "/api/ai-wangjai/dealers"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (auth) proxyReq.setHeader("Authorization", auth);
            });
          }
        },
        "/api/orders": {
          target,
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api\/orders/, "/api/ai-wangjai/order"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (auth) proxyReq.setHeader("Authorization", auth);
            });
          }
        }
      }
    }
  };
});
