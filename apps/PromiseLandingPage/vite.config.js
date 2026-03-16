import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        precios: resolve(__dirname, "precios.html"),
        quienesSomos: resolve(__dirname, "quienes-somos.html"),
        comoFunciona: resolve(__dirname, "como-funciona.html"),
        promiseLanding: resolve(__dirname, "promise-landing.html")
      }
    }
  }
});
