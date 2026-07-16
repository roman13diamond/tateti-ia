import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Config para deploy en Vercel — base "/" y sin plugins de Replit
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist-vercel"),
    emptyOutDir: true,
  },
  define: {
    // Sin Discord SDK en Vercel (no es una Activity)
    __ELECTRON__: "false",
  },
});
