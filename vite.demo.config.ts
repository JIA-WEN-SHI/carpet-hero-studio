import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()], base: "./", define: { "import.meta.env.VITE_PORTFOLIO_DEMO": '"true"' }, build: { outDir: "dist-demo" } });
