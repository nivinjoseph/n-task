import { Disposable } from "@nivinjoseph/n-util";
export declare class TaskPool implements Disposable {
    private readonly _taskWorkerClass;
    private readonly _count;
    private readonly _taskWorkers;
    private readonly _taskQueue;
    private _isInitialized;
    private _disposePromise;
    private get _isDisposed();
    constructor(taskWorker: Function, count?: number);
    initializeWorkers(initializerMethod?: string, ...initializerParams: Array<any>): Promise<void>;
    invoke<T>(method: string, ...params: Array<any>): Promise<T>;
    dispose(): Promise<void>;
    private _createWorkers;
    private _onAvailable;
    private _enqueue;
    private _executeAvailableWork;
}
//# sourceMappingURL=task-pool.d.ts.map