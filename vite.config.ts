// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function whatsappApiPlugin(): Plugin {
  return {
    name: "whatsapp-api-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith("/api/wa") || req.url.startsWith("/api/"))) {
          try {
            const { default: expressApp } = await import("./whatsapp-server");
            if (req.url.startsWith("/api/wa")) {
              req.url = req.url.replace(/^\/api\/wa/, "/api");
            }
            return expressApp(req, res, next);
          } catch (err) {
            console.error("Erro ao carregar WhatsApp Express Server:", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Erro interno no servidor do WhatsApp" }));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        sharp: path.resolve(__dirname, "src/mocks/sharp.js"),
        "@img/sharp-linux-x64": path.resolve(__dirname, "src/mocks/sharp.js"),
        "@img/sharp-linuxmusl-x64": path.resolve(__dirname, "src/mocks/sharp.js"),
      },
    },
    ssr: {
      external: ["sharp", "@whiskeysockets/baileys", "pino"],
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      allowedHosts: true,
    },
    plugins: [whatsappApiPlugin()],
  },
});
