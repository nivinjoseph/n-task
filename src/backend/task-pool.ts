import { given } from "@nivinjoseph/n-defensive";
import { ApplicationException } from "@nivinjoseph/n-exception";
import { Worker } from "node:worker_threads";
import { TaskPool as TaskPoolBase, WorkerAdapter } from "../common/task-pool.js";


export class TaskPool extends TaskPoolBase
{
    private readonly _taskWorkerFile: string;


    public constructor(taskWorkerFile: string, count = 1)
    {
        given(taskWorkerFile, "taskWorkerFile").ensureHasValue().ensureIsString();
        super(count);
        this._taskWorkerFile = taskWorkerFile;
    }


    protected override _createWorkerAdapter(): WorkerAdapter
    {
        return new NodeWorkerAdapter(this._taskWorkerFile);
    }
}


class NodeWorkerAdapter implements WorkerAdapter
{
    private readonly _worker: Worker;


    public constructor(taskWorkerFile: string)
    {
        given(taskWorkerFile, "taskWorkerFile").ensureHasValue().ensureIsString();
        this._worker = new Worker(taskWorkerFile);
    }


    public setHandlers(onMessage: (data: any) => void, onError: (error: Error) => void): void
    {
        given(onMessage, "onMessage").ensureHasValue().ensureIsFunction();
        given(onError, "onError").ensureHasValue().ensureIsFunction();

        this._worker.on("message", onMessage);

        this._worker.on("error", (error: Error) =>
        {
            onError(new ApplicationException("Worker thread errored.", error));
        });

        this._worker.on("exit", (code: number) =>
        {
            onError(new ApplicationException(`Worker thread exited unexpectedly with code ${code}.`));
        });
    }

    public postMessage(message: any): void
    {
        this._worker.postMessage(message);
    }

    public async terminate(): Promise<void>
    {
        await this._worker.terminate();
    }
}
