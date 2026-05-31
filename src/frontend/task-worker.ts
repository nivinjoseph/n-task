import { given } from "@nivinjoseph/n-defensive";
import { TaskWorker as TaskWorkerBase, WorkerContext } from "../common/task-worker.js";


export abstract class TaskWorker extends TaskWorkerBase
{
    public constructor(ctx: Worker)
    {
        given(ctx, "ctx").ensureHasValue().ensureIsObject();
        super(new WebWorkerContext(ctx));
    }
}


class WebWorkerContext implements WorkerContext
{
    private readonly _worker: Worker;


    public constructor(worker: Worker)
    {
        this._worker = worker;
    }


    public onMessage(handler: (data: any) => void): void
    {
        this._worker.onmessage = (e: MessageEvent): void =>
        {
            handler(e.data);
        };
    }

    public postMessage(message: any): void
    {
        this._worker.postMessage(message);
    }
}
