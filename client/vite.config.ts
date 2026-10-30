import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// In development the interface runs on port 5173 and forwards /api to the local Kioo server.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:8787" } },
  test: { environment: "node" },
});
