import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves project sites under /<repo>/. Allow override via VITE_BASE
// (set in CI) and default to the repo name so local `vite preview` matches prod.
const base = process.env.VITE_BASE ?? "/high-bar/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
