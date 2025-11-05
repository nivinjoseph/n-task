import { given } from "@nivinjoseph/n-defensive";
import { Disposable, Uuid, Make, Observer, Deferred } from "@nivinjoseph/n-util";
import { ApplicationException, ObjectDisposedException } from "@nivinjoseph/n-exception";


export class TaskPool implements Disposable
{
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    private readonly _taskWorkerClass: Function;
    private readonly _count: number;
    private readonly _taskWorkers = new Array<TaskWorkerInstance>();
    private readonly _taskQueue = new Array<TaskItem>();
    private _isInitialized = false;
    private _disposePromise: Promise<any> | null = null;


    private get _isDisposed(): boolean { return this._disposePromise != null; }

    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    public constructor(taskWorker: Function, count = 1)
    {
        given(taskWorker, "taskWorker").ensureHasValue().ensureIsFunction();
        this._taskWorkerClass = taskWorker;

        given(count, "count").ensureHasValue().ensureIsNumber().ensure(t => t > 0);
        this._count = count;
    }


    public async initializeWorkers(initializerMethod?: string, ...initializerParams: Array<any>): Promise<void>
    {
        given(initializerMethod as string, "initializerMethod").ensureIsString();
        given(initializerParams, "initializerParams").ensureIsArray();

        given(this, "this").ensure(t => !t._isInitialized, "already initialized");

        if (this._isDisposed)
            throw new ObjectDisposedException(this);

        this._createWorkers();

        if (initializerMethod != null)
            await Promise.all(this._taskWorkers.map(t =>
                t.execute(Uuid.create(), initializerMethod, ...initializerParams)));

        this._isInitialized = true;
    }


    public async invoke<T>(method: string, ...params: Array<any>): Promise<T>
    {
        given(method, "method").ensureHasValue().ensureIsString();
        given(params, "params").ensureHasValue().ensureIsArray();

        given(this, "this").ensure(t => t._isInitialized, "not initialized");

        if (this._isDisposed)
            throw new ObjectDisposedException(this);

        return this._enqueue(method, params) as Promise<T>;
    }

    public async dispose(): Promise<void>
    {
        if (!this._isDisposed)
        {
            this._taskQueue.forEach(t => t.deferred.reject("disposed"));
            this._taskQueue.clear();

            this._disposePromise = Promise.all(this._taskWorkers.map(t => t.dispose()));
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this._disposePromise;
    }

    private _createWorkers(): void
    {
        Make.loop(() =>
        {
            const taskWorker = new TaskWorkerInstance(this._taskWorkerClass);
            taskWorker.initialize(this._onAvailable.bind(this));
            this._taskWorkers.push(taskWorker);
        }, this._count);
    }

    private _onAvailable(twi: TaskWorkerInstance): void
    {
        given(twi, "twi").ensureHasValue().ensureIsObject().ensureIsType(TaskWorkerInstance);

        this._executeAvailableWork(twi);
    }

    private _enqueue(method: string, params: Array<any>): Promise<any>
    {
        const taskItem: TaskItem = {
            id: Uuid.create(),
            deferred: new Deferred<any>(),
            method,
            params
        };

        this._taskQueue.unshift(taskItem);

        this._executeAvailableWork();

        return taskItem.deferred.promise;
    }

    private _executeAvailableWork(twi?: TaskWorkerInstance): void
    {
        if (this._taskQueue.isEmpty)
            return;

        const availableWorker = twi ?? this._taskWorkers.find(t => !t.isBusy);
        if (availableWorker == null)
            return;

        const work = this._taskQueue.pop()!;
        availableWorker
            .execute(work.id, work.method, ...work.params)
            .then(t => work.deferred.resolve(t))
            .catch(e => work.deferred.reject(e));
    }
}

interface TaskItem
{
    id: string;
    deferred: Deferred<any>;
    method: string;
    params: Array<any>;
}


class TaskWorkerInstance implements Disposable
{
    private readonly _id: string;
    private readonly _worker: Worker;
    private readonly _availabilityObserver = new Observer<this>("available");
    private _disposePromise: Promise<any> | null = null;
    private _currentTask: WorkerTask | null = null;

    private get _isInitialized(): boolean { return this._availabilityObserver.hasSubscriptions; }
    private get _isDisposed(): boolean { return this._disposePromise != null; }

    public get id(): string { return this._id; }
    public get isBusy(): boolean { return this._currentTask != null; }


    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    public constructor(taskWorkerClass: Function)
    {
        given(taskWorkerClass, "taskWorkerClass").ensureHasValue().ensureIsFunction();

        this._id = Uuid.create();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this._worker = new (<any>taskWorkerClass)();
    }


    public initialize(availabilityCallback: (twi: this) => void): void
    {
        given(availabilityCallback, "availabilityCallback").ensureHasValue().ensureIsFunction();

        given(this, "this").ensure(t => !t._isInitialized, "already initialized");

        if (this._isDisposed)
            throw new ObjectDisposedException(this);

        this._availabilityObserver.subscribe(availabilityCallback);

        this._worker.onmessage = (e: MessageEvent): void =>
        {
            const id = e.data.id as string;
            const error = e.data.error;
            const result = e.data.result;

            if (this._currentTask!.id !== id)
            {
                this._currentTask!.deferred
                    .reject(new ApplicationException("Current task id does not match id of task result."));
            }
            else
            {
                if (error != null)
                    this._currentTask!.deferred.reject(error);
                else
                    this._currentTask!.deferred.resolve(result);
            }

            this._currentTask = null;
            this._availabilityObserver.notify(this);
        };
    }

    public async execute<T>(id: string, method: string, ...params: Array<any>): Promise<T>
    {
        given(id, "id").ensureHasValue().ensureIsString();
        given(method, "method").ensureHasValue().ensureIsString();
        given(params, "params").ensureHasValue().ensureIsArray();

        given(this, "this")
            .ensure(t => t._isInitialized, "worker instance not initialized")
            .ensure(t => !t.isBusy, "worker instance is busy");

        if (this._isDisposed)
            throw new ObjectDisposedException(this);

        this._currentTask = {
            id,
            deferred: new Deferred<T>()
        };

        this._worker.postMessage({
            id: this._currentTask.id,
            type: method.trim(),
            params
        });

        return this._currentTask.deferred.promise as Promise<T>;
    }

    public async dispose(): Promise<void>
    {
        if (!this._isDisposed)
        {
            this._availabilityObserver.cancel();
            this._worker.terminate();
            this._disposePromise = Promise.resolve();
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this._disposePromise;
    }
}


interface WorkerTask
{
    id: string;
    deferred: Deferred<any>;
}