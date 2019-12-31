import { given } from "@nivinjoseph/n-defensive";
import { Disposable, Uuid, Make, BackgroundProcessor, Delay } from "@nivinjoseph/n-util";
import { ObjectDisposedException } from "@nivinjoseph/n-exception";


export class TaskPool implements Disposable
{
    private readonly _taskWorkerClass: Function;
    private readonly _callbacks: { [index: string]: { resolve: (value?: any) => void; reject: (reason?: any) => void } } = {};
    private readonly _taskWorkers = new Array<TpTaskWorker>();
    private readonly _count: number;
    private readonly _bp: BackgroundProcessor;
    private _isDisposed = false;


    public constructor(taskWorker: Function, count: number = 1)
    {
        given(taskWorker, "taskWorker").ensureHasValue().ensureIsFunction();
        this._taskWorkerClass = taskWorker;

        given(count, "count").ensureHasValue().ensureIsNumber().ensure(t => t > 0);
        this._count = count;

        this._bp = new BackgroundProcessor((e) =>
        {
            console.error(e);
            return Promise.resolve();
        }, 500, true);

        this.initialize();
    }


    public invoke<T>(method: string, ...params: any[]): Promise<T>
    {
        given(method, "method").ensureHasValue().ensureIsString();
        given(params, "params").ensureHasValue().ensureIsArray();

        if (this._isDisposed)
            throw new ObjectDisposedException(this);

        return new Promise((resolve, reject) =>
        {
            const id = Uuid.create();

            this._callbacks[id] = {
                resolve,
                reject
            };

            this._bp.processAction(async () =>
            {
                let freeWorker = this._taskWorkers.find(t => !t.isBusy);
                while (!freeWorker)
                {
                    await Delay.milliseconds(500);
                    freeWorker = this._taskWorkers.find(t => !t.isBusy);
                }

                freeWorker.isBusy = true;

                freeWorker.taskWorker.postMessage({
                    id,
                    type: method.trim(),
                    params
                });
            });
        });
    }

    public async dispose(): Promise<void>
    {
        if (!this._isDisposed)
        {
            this._isDisposed = true;

            await this._bp.dispose(true);

            this._taskWorkers.forEach(t => t.taskWorker.terminate());
        }
    }

    private initialize(): void
    {
        Make.loop(() =>
        {
            const taskWorker = new (<any>this._taskWorkerClass)();

            const tpTaskWorker: TpTaskWorker = {
                taskWorker,
                isBusy: false
            };

            taskWorker.onmessage = (e: MessageEvent) =>
            {
                const id = e.data.id as string;
                const error = e.data.error as any;
                const result = e.data.result as any;

                if (this._callbacks[id])
                {
                    if (error != null)
                        this._callbacks[id].reject(error);
                    else
                        this._callbacks[id].resolve(result);

                    tpTaskWorker.isBusy = false;
                    delete this._callbacks[id];
                }
            };

            this._taskWorkers.push(tpTaskWorker);
        }, this._count);
    }
}

interface TpTaskWorker
{
    taskWorker: Worker;
    isBusy: boolean;
}