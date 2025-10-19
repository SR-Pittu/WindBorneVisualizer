
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",    
    setupFiles: "./src/setupTests.js",
    include: ["src/__tests__/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",         
      reporter: ["text", "html"],
    },
  },
});
