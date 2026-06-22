import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/Busker/",
  plugins: [react()],
  build: {
    outDir: "dist-pages",
    sourcemap: false
  }
});
