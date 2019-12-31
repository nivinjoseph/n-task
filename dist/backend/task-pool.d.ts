import { Disposable } from "@nivinjoseph/n-util";
export declare class TaskPool implements Disposable {
    private readonly _taskWorkerFile;
    private readonly _callbacks;
    private readonly _taskWorkers;
    private readonly _count;
    private readonly _bp;
    private _isDisposed;
    constructor(taskWorkerFile: string, count?: number);
    invoke<T>(method: string, ...params: any[]): Promise<T>;
    dispose(): Promise<void>;
    private initialize;
}
