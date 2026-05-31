/**
 * Platform abstraction over the worker-side message context (Node parentPort or the web worker
 * global scope). Backend and frontend each provide a concrete implementation; all dispatch
 * logic is shared.
 */
export interface WorkerContext {
    onMessage(handler: (data: any) => void): void;
    postMessage(message: any): void;
}
export declare function toError(error: unknown): Error;
export declare abstract class TaskWorker {
    private readonly _ctx;
    private readonly _typeName;
    protected constructor(ctx: WorkerContext);
    private _initialize;
}
//# sourceMappingURL=task-worker.d.ts.map