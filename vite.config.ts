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
        if (!req.url || !(req.url.startsWith("/api/wa") || req.url.startsWith("/api/"))) {
          return next();
        }
        try {
          const { handleWhatsappApiRequest } = await import("./ai-studio-server");
          const host = req.headers.host ?? "localhost";
          const url = new URL(req.url, `http://${host}`);
          const method = req.method ?? "GET";

          let body: string | undefined;
          if (method !== "GET" && method !== "HEAD") {
            body = await new Promise<string>((resolve, reject) => {
              const chunks: Buffer[] = [];
              req.on("data", (c) => chunks.push(Buffer.from(c)));
              req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
              req.on("error", reject);
            });
          }

          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === "string") headers[k] = v;
            else if (Array.isArray(v)) headers[k] = v.join(", ");
          }

          const request = new Request(url.toString(), { method, headers, body });
          const response = await handleWhatsappApiRequest(request);
          if (!response) return next();

          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          const text = await response.text();
          res.end(text);
        } catch (err) {
          console.error("Erro no middleware WhatsApp:", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Erro interno no servidor do WhatsApp" }));
        }
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
