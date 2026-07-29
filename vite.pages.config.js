import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/Busker/",
  plugins: [react()],
  define: {
    "import.meta.env.VITE_CLOUD_DB_URL": JSON.stringify("https://api.jsonbin.io/v3/b/6a69a906da38895dfe9eaf32"),
    "import.meta.env.VITE_CLOUD_DB_KEY": JSON.stringify("$2a$10$BokWxV9Lgfw4mSRzpeztvOVx8y2wRLRMCIg0Ko75QdjRJLzCzovwS")
  },
  build: {
    outDir: "dist-pages",
    sourcemap: false
  }
});
