import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";


// Map the published package specifier to the locally-built frontend output,
// so the test consumes n-task exactly as a downstream app would.
export default defineConfig({
    root: fileURLToPath(new URL(".", import.meta.url)),
    resolve: {
        alias: {
            "@nivinjoseph/n-task/frontend": fileURLToPath(
                new URL("../../src/frontend/index.js", import.meta.url))
        }
    },
    // n-util uses top-level await (webcrypto fallback), so target an engine that supports it.
    build: { target: "esnext" },
    worker: { format: "es" },
    optimizeDeps: { esbuildOptions: { target: "esnext" } }
});
