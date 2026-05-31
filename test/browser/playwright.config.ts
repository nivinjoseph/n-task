import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";


const dir = fileURLToPath(new URL(".", import.meta.url));
const port = 5179;
const baseURL = `http://localhost:${port}`;


export default defineConfig({
    testDir: dir,
    testMatch: "**/*.spec.ts",
    fullyParallel: true,
    timeout: 60_000,
    use: {
        baseURL
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } }
    ],
    webServer: {
        command: `vite --port ${port} --strictPort`,
        cwd: dir,
        url: baseURL,
        reuseExistingServer: !process.env["CI"],
        timeout: 60_000
    }
});
