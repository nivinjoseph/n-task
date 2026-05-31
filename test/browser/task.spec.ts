import { test, expect } from "@playwright/test";


test("frontend TaskPool runs real web workers end-to-end", async ({ page }) =>
{
    const consoleErrors: Array<string> = [];
    page.on("pageerror", (e) => consoleErrors.push(e.message));

    await page.goto("/");

    // app.ts sets #status to "done" on success or "error" on failure.
    await expect(page.locator("#status")).toHaveText("done", { timeout: 30_000 });

    const result = await page.evaluate(() => window.__result) as {
        fib: Array<number>;
        echo: unknown;
        missing: string;
        threw: string;
    };

    // Parallel fan-out returns correct results.
    expect(result.fib).toEqual([55, 6765]);

    // Structured clone preserved the nested object.
    expect(result.echo).toEqual({ a: 1, b: [2, 3] });

    // Error paths reject with real messages across the worker boundary.
    expect(result.missing).toContain("not implemented");
    expect(result.threw).toContain("boom from worker");

    expect(consoleErrors).toEqual([]);
});
