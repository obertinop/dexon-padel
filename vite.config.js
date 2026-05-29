import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "build",
  },
  // .jsx → jsx loader, .tsx → tsx loader (esbuild defaults por extensión).
  // La app legacy en .js no entra al grafo de build (el entry es @/rd/App).
});
