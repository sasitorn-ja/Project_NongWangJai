import { Buffer } from "node:buffer";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.CPAC_API_TARGET ?? "https://test-cpac-api.merudy.com";
  const user = env.CPAC_API_USER ?? "";
  const password = env.CPAC_API_PASSWORD ?? "";
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
        }
      }
    }
  };
});
