import { Disposable } from "@nivinjoseph/n-util";
/**
 * Platform abstraction over an underlying worker (Node worker thread or browser web worker).
 * Backend and frontend each provide a concrete implementation; all pool logic is shared.
 */
export interface WorkerAdapter {
    setHandlers(onMessage: (data: any) => void, onError: (error: Error) => void): void;
    postMessage(message: any): void;
    terminate(): Promise<void>;
}
export declare abstract class TaskPool implements Disposable {
    private readonly _count;
    private readonly _taskWorkers;
    private readonly _taskQueue;
    private _isInitialized;
    private _disposePromise;
    private get _isDisposed();
    constructor(count: number);
    initializeWorkers(initializerMethod?: string, ...initializerParams: Array<any>): Promise<void>;
    invoke<T>(method: string, ...params: Array<any>): Promise<T>;
    dispose(): Promise<void>;
    protected abstract _createWorkerAdapter(): WorkerAdapter;
    private _createWorkers;
    private _onAvailable;
    private _enqueue;
    private _executeAvailableWork;
}
//# sourceMappingURL=task-pool.d.ts.map