import { Disposable } from "@nivinjoseph/n-util";
export declare class TaskPool implements Disposable {
    private readonly _taskWorkerFile;
    private readonly _count;
    private readonly _taskWorkers;
    private readonly _taskQueue;
    private _isInitialized;
    private _disposePromise;
    private get _isDisposed();
    constructor(taskWorkerFile: string, count?: number);
    initializeWorkers(initializerMethod?: string, ...initializerParams: any[]): Promise<void>;
    invoke<T>(method: string, ...params: any[]): Promise<T>;
    dispose(): Promise<void>;
    private _createWorkers;
    private _onAvailable;
    private _enqueue;
    private _executeAvailableWork;
}
