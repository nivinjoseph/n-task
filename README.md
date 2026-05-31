# n-task

A TypeScript library for task parallelization in both backend (Node.js worker threads) and frontend (browser web workers) environments. You define a worker with ordinary methods, spin up a pool of them, and call those methods from your main thread with a promise-based API.

## Features

- **Cross-platform**: Node.js worker threads (`@nivinjoseph/n-task/backend`) and browser web workers (`@nivinjoseph/n-task/frontend`) with the same pool API.
- **Pooling & queueing**: Create N workers; calls are dispatched to the first idle worker, and queued when all are busy.
- **Promise-based**: `invoke()` returns a promise that resolves with the method's return value (sync or async methods both work).
- **Robust failures**: a thrown method, a missing method, a crashed worker, or a disposed pool all reject the corresponding `invoke()` rather than hanging.
- **TypeScript first**: ships type definitions; `invoke<T>()` is generic over the return type.

## Installation

```bash
npm install @nivinjoseph/n-task
# or
yarn add @nivinjoseph/n-task
```

## Requirements

- **ESM only.** This package is `"type": "module"` and exposes no CommonJS build — consume it from an ES module (`import`), not `require`.
- **Backend**: Node.js >= 20.
- **Frontend**: a browser with Web Worker support, and a bundler (Vite, webpack 5, etc.) to build the worker entry.

> The package root is intentionally not importable. Always import from the `./backend` or `./frontend` subpath:
> ```ts
> import { TaskPool, TaskWorker } from "@nivinjoseph/n-task/backend";  // Node
> import { TaskPool, TaskWorker } from "@nivinjoseph/n-task/frontend"; // browser
> ```

## How it works

- A **`TaskWorker`** is a class you write that runs *inside* the worker. Each public method becomes a remotely-callable task. You instantiate it once at the bottom of the worker module so it starts listening.
- A **`TaskPool`** runs in your main thread, spawns `count` workers, and exposes `invoke(methodName, ...args)` to call a worker method on the next available worker.
- Arguments and return values cross the worker boundary via **structured clone**, so they must be cloneable (primitives, plain objects/arrays, `ArrayBuffer`, `Map`, `Set`, etc.) — not functions or class instances with behavior.

---

## Backend (Node.js)

**1. The worker module** — `math-worker.ts` (compiles to `math-worker.js`):

```ts
import { TaskWorker } from "@nivinjoseph/n-task/backend";

class MathWorker extends TaskWorker
{
    // A synchronous task.
    public fib(n: number): number
    {
        return n < 2 ? n : this.fib(n - 1) + this.fib(n - 2);
    }

    // An async task — the pool awaits the returned promise.
    public async hash(value: string): Promise<string>
    {
        const { createHash } = await import("node:crypto");
        return createHash("sha256").update(value).digest("hex");
    }
}

// Instantiate once so the worker starts handling messages.
new MathWorker();
```

**2. The main thread:**

```ts
import { TaskPool } from "@nivinjoseph/n-task/backend";
import { fileURLToPath } from "node:url";

// The backend pool takes a path to the COMPILED worker file (.js).
const workerPath = fileURLToPath(new URL("./math-worker.js", import.meta.url));

const pool = new TaskPool(workerPath, 4); // 4 worker threads

await pool.initializeWorkers();

// Calls fan out across the 4 workers and run in parallel.
const results = await Promise.all([
    pool.invoke<number>("fib", 40),
    pool.invoke<number>("fib", 41),
    pool.invoke<number>("fib", 42)
]);

console.log(results); // [102334155, 165580141, 267914296]

await pool.dispose();
```

---

## Frontend (browser)

**1. The worker module** — `image-worker.ts`:

```ts
import { TaskWorker } from "@nivinjoseph/n-task/frontend";

class ImageWorker extends TaskWorker
{
    public async resize(bytes: ArrayBuffer, width: number): Promise<ArrayBuffer>
    {
        // ...resize logic...
        return resized;
    }
}

// `self` is the web worker global scope.
new ImageWorker(self as unknown as Worker);
```

**2. The main thread:**

The frontend pool needs a **zero-argument constructor that produces a `Worker`**. With a bundler that understands `new URL(..., import.meta.url)` (Vite, webpack 5), wrap your worker entry:

```ts
import { TaskPool } from "@nivinjoseph/n-task/frontend";

class ImageWorkerClient extends Worker
{
    public constructor()
    {
        super(new URL("./image-worker.js", import.meta.url), { type: "module" });
    }
}

const pool = new TaskPool(ImageWorkerClient, navigator.hardwareConcurrency ?? 4);

await pool.initializeWorkers();

const resized = await pool.invoke<ArrayBuffer>("resize", bytes, 256);

await pool.dispose();
```

> n-task only requires that `new TaskWorkerClass()` yield a `Worker` instance. How you obtain that constructor (the `new URL` wrapper above, a `?worker` import, a worker-loader, etc.) depends on your bundler.

---

## One-time worker initialization

If each worker needs setup before handling tasks (open a DB handle, load a model, etc.), give it an initializer method and pass its name to `initializeWorkers`. It runs **once on every worker** before the pool accepts `invoke` calls:

```ts
class DbWorker extends TaskWorker
{
    private _client: Client | null = null;

    public async connect(connectionString: string): Promise<void>
    {
        this._client = await Client.connect(connectionString);
    }

    public async query(sql: string): Promise<Array<unknown>>
    {
        return this._client!.query(sql);
    }
}
```

```ts
await pool.initializeWorkers("connect", process.env.DB_URL);
const rows = await pool.invoke<Array<unknown>>("query", "select 1");
```

## Error handling

`invoke<T>()` rejects (rather than hanging) in all of these cases:

| Situation | Rejection |
|---|---|
| The worker method throws (sync or async) | An `Error` carrying the original message and stack |
| The method name isn't implemented on the worker | `Error: Method '<name>' not implemented in TaskWorker '<class>'` |
| The worker thread crashes or exits unexpectedly | An error describing the crash; the faulted worker is dropped from the pool |
| `dispose()` is called while the task is queued or in flight | `ObjectDisposedException` |

```ts
try
{
    await pool.invoke("query", "bad sql");
}
catch (e)
{
    console.error("task failed:", e); // a real Error with message + stack
}
```

## API reference

### `TaskPool`

| | Backend | Frontend |
|---|---|---|
| Constructor | `new TaskPool(taskWorkerFile: string, count = 1)` | `new TaskPool(taskWorker: Function, count = 1)` |
| `taskWorkerFile` / `taskWorker` | Path to the compiled worker `.js` file | A zero-arg constructor that returns a `Worker` |
| `count` | Number of workers to spawn (default `1`) | Number of workers to spawn (default `1`) |

#### Methods

```ts
initializeWorkers(initializerMethod?: string, ...initializerParams: Array<any>): Promise<void>
```
Spawns the workers. If `initializerMethod` is provided, calls it once on every worker (awaiting all) before resolving. Throws if already initialized or disposed.

```ts
invoke<T>(method: string, ...params: Array<any>): Promise<T>
```
Runs `method(...params)` on the next available worker (queueing if all are busy) and resolves with its return value. Throws if the pool isn't initialized or is disposed.

```ts
dispose(): Promise<void>
```
Rejects all queued and in-flight tasks, terminates every worker, and resolves once teardown is complete. Idempotent.

### `TaskWorker`

Abstract base class you extend to define a worker. Each public method is callable via `pool.invoke("methodName", ...)`. Methods may be synchronous or async; the return value is sent back to the caller.

- **Backend**: `new MyWorker()` at the bottom of the worker module (no constructor argument).
- **Frontend**: `new MyWorker(self as unknown as Worker)` at the bottom of the worker module.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For support, please open an issue in the [GitHub repository](https://github.com/nivinjoseph/n-task/issues).

## License

MIT License - See [LICENSE](LICENSE) file for details.
