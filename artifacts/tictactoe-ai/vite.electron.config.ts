import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Config especial para build de Electron — usa base "./" para rutas relativas
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist-electron"),
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
  define: {
    // Deshabilitar Discord SDK en build de Electron
    __ELECTRON__: "true",
  },
});
