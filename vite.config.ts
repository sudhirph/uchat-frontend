import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Allow external hosts (ngrok, etc.)
    allowedHosts: true,
    // ngrok HTTPS: HMR websocket uses same host on 443
    hmr: {
      clientPort: 443,
    },
  },
});
