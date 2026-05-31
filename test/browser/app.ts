import { TaskPool } from "@nivinjoseph/n-task/frontend";


// The frontend pool needs a zero-arg constructor that yields a Worker.
// This is the exact pattern documented in the README, built by Vite.
class MathWorkerClient extends Worker
{
    public constructor()
    {
        super(new URL("./math-worker.ts", import.meta.url), { type: "module" });
    }
}


declare global
{
    interface Window
    {
        __result?: unknown;
        __error?: string;
    }
}


async function main(): Promise<void>
{
    const pool = new TaskPool(MathWorkerClient, 2);
    await pool.initializeWorkers();

    // Parallel fan-out across 2 workers.
    const fib = await Promise.all([
        pool.invoke<number>("fib", 10),
        pool.invoke<number>("fib", 20)
    ]);

    // Structured clone round-trip of a nested object.
    const echo = await pool.invoke("echo", { a: 1, b: [2, 3] });

    // Missing-method rejection.
    let missing = "";
    try { await pool.invoke("nope"); }
    catch (e) { missing = e instanceof Error ? e.message : String(e); }

    // Thrown-method rejection.
    let threw = "";
    try { await pool.invoke("boom"); }
    catch (e) { threw = e instanceof Error ? e.message : String(e); }

    await pool.dispose();

    window.__result = { fib, echo, missing, threw };
    document.getElementById("status")!.textContent = "done";
    document.getElementById("output")!.textContent = JSON.stringify(window.__result, null, 2);
}


main().catch((e: unknown) =>
{
    window.__error = e instanceof Error ? (e.stack ?? e.message) : String(e);
    document.getElementById("status")!.textContent = "error";
    document.getElementById("output")!.textContent = window.__error;
});
