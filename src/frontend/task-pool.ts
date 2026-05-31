import { given } from "@nivinjoseph/n-defensive";
import { ApplicationException } from "@nivinjoseph/n-exception";
import { TaskPool as TaskPoolBase, WorkerAdapter } from "../common/task-pool.js";


export class TaskPool extends TaskPoolBase
{
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    private readonly _taskWorkerClass: Function;


    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    public constructor(taskWorker: Function, count = 1)
    {
        given(taskWorker, "taskWorker").ensureHasValue().ensureIsFunction();
        super(count);
        this._taskWorkerClass = taskWorker;
    }


    protected override _createWorkerAdapter(): WorkerAdapter
    {
        return new WebWorkerAdapter(this._taskWorkerClass);
    }
}


class WebWorkerAdapter implements WorkerAdapter
{
    private readonly _worker: Worker;


    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    public constructor(taskWorkerClass: Function)
    {
        given(taskWorkerClass, "taskWorkerClass").ensureHasValue().ensureIsFunction();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this._worker = new (<any>taskWorkerClass)();
    }


    public setHandlers(onMessage: (data: any) => void, onError: (error: Error) => void): void
    {
        given(onMessage, "onMessage").ensureHasValue().ensureIsFunction();
        given(onError, "onError").ensureHasValue().ensureIsFunction();

        this._worker.onmessage = (e: MessageEvent): void =>
        {
            onMessage(e.data);
        };

        this._worker.onerror = (e: ErrorEvent): void =>
        {
            onError(new ApplicationException(`Worker errored: ${e.message}`));
        };

        this._worker.onmessageerror = (): void =>
        {
            onError(new ApplicationException("Worker failed to deserialize a message."));
        };
    }

    public postMessage(message: any): void
    {
        this._worker.postMessage(message);
    }

    public terminate(): Promise<void>
    {
        this._worker.terminate();
        return Promise.resolve();
    }
}
