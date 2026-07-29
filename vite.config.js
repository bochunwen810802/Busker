import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin.js";
import fs from "node:fs/promises";
import path from "node:path";

const placeholderDatabaseId = "00000000-0000-4000-8000-000000000000";
const { d1, r2 } = hostingConfig;

function savePerformancesPlugin() {
  return {
    name: "save-performances-plugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url === "/api/performances" || req.url.endsWith("/api/performances")) && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", async () => {
            try {
              const data = JSON.parse(body);
              if (!Array.isArray(data)) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Invalid data format" }));
                return;
              }
              const filePath = path.resolve(process.cwd(), "public/data/performances.json");
              await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, count: data.length }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    savePerformancesPlugin(),
    vinext(),
    sites(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      config: {
        main: "./worker/index.js",
        compatibility_flags: ["nodejs_compat"],
        d1_databases: d1
          ? [
              {
                binding: d1,
                database_name: "site-creator-d1",
                database_id: placeholderDatabaseId
              }
            ]
          : [],
        r2_buckets: r2
          ? [
              {
                binding: r2,
                bucket_name: "site-creator-r2"
              }
            ]
          : []
      }
    })
  ]
});

