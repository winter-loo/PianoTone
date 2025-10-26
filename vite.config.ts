import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "TonePiano",
      fileName: "tone-piano",
    },
    rollupOptions: {
      external: ["tone"],
      output: {
        globals: {
          tone: "Tone",
        },
      },
    },
  },
});
