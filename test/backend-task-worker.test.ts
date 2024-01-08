import assert from "node:assert";
import { describe, test } from "node:test";
import { URL, fileURLToPath } from "node:url";
import { TaskPool } from "../src/backend/task-pool.js";


await describe("Backend", async () => 
{
    await test("Task worker", async () =>
    {
        const taskPool = new TaskPool(fileURLToPath(new URL("./backend-test-task-worker.js", import.meta.url)));
        await taskPool.initializeWorkers();
        console.log("initialized");

        const val = await taskPool.invoke<string>("hello", 10);
        console.log("invoked");

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        assert.ok(val != null, "return value should not be null");
        assert.ok(typeof val === "string", "return value should be of type string");
        assert.ok(val === "world 10", "return value is incorrect");

        console.log("will dispose");
        await taskPool.dispose();

        console.log("disposed");

    });
});