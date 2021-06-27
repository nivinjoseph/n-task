import "@nivinjoseph/n-ext";
import { given } from "@nivinjoseph/n-defensive";
import { Disposable, Uuid, Make, Deferred, Observer } from "@nivinjoseph/n-util";
import { ApplicationException, ObjectDisposedException } from "@nivinjoseph/n-exception";
import { Worker } from "worker_threads";


export class TaskPool implements Disposable
{
    private readonly _taskWorkerFile: string;
    private readonly _count: number;
    private readonly _taskWorkers = new Array<TaskWorkerInstance>();
    private readonly _taskQueue = new Array<TaskItem>();
    private _isInitialized = false;
    private _disposePromise: Promise<any> | null = null;
    
    
    private get _isDisposed(): boolean { return this._disposePromise != null; }


    public constructor(taskWorkerFile: string, count: number = 1)
    {
        given(taskWorkerFile, "taskWorkerFile").ensureHasValue().ensureIsString();
        this._taskWorkerFile = taskWorkerFile;

        given(count, "count").ensureHasValue().ensureIsNumber().ensure(t => t > 0);
        this._count = count;  
    }

    
    public async initializeWorkers(initializerMethod?: string, ...initializerParams: any[]): Promise<void>
    {
        given(initializerMethod, "initializerMethod").ensureIsString();
        given(initializerParams, "initializerParams").ensureIsArray().ensureIsArray();
        
        given(this, "this").ensure(t => !t._isInitialized, "already initialized");
        
        if (this._isDisposed)
            throw new ObjectDisposedException(this);
       
        this._createWorkers();
        
        if (initializerMethod != null)
            await Promise.all(this._taskWorkers.map(t =>
                t.execute(Uuid.create(), initializerMethod, ...initializerParams)));
        
        this._isInitialized = true;
    }
    

    public invoke<T>(method: string, ...params: any[]): Promise<T>
    {
        given(method, "method").ensureHasValue().ensureIsString();
        given(params, "params").ensureHasValue().ensureIsArray();
        
        given(this, "this").ensure(t => t._isInitialized, "not initialized");

        if (this._isDisposed)
            throw new ObjectDisposedException(this);
        
        return this._enqueue(method, params);
    }

    public async dispose(): Promise<void>
    {
        if (!this._isDisposed)
        {
            this._taskQueue.forEach(t => t.deferred.reject("disposed"));
            this._taskQueue.clear();

            this._disposePromise = Promise.all(this._taskWorkers.map(t => t.dispose()));
        }
        
        return this._disposePromise;
    }

    private _createWorkers(): void
    {
        Make.loop(() =>
        {
            const taskWorker = new TaskWorkerInstance(this._taskWorkerFile);
            taskWorker.initialize(this._onAvailable.bind(this));
            this._taskWorkers.push(taskWorker);
        }, this._count);
    }
    
    private _onAvailable(twi: TaskWorkerInstance): void
    {
        given(twi, "twi").ensureHasValue().ensureIsObject().ensureIsType(TaskWorkerInstance);
        
        this._executeAvailableWork(twi);
    }
    
    private _enqueue(method: string, params: any[]): Promise<any>
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
        
        const work = this._taskQueue.pop();
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
    params: any[];
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
    
    
    public constructor(taskWorkerFile: string)
    {
        given(taskWorkerFile, "taskWorkerFile").ensureHasValue().ensureIsString();
        
        this._id = Uuid.create();
        this._worker = new Worker(taskWorkerFile);
    }
    
    
    public initialize(availabilityCallback: (twi: this) => void): void
    {
        given(availabilityCallback, "availabilityCallback").ensureHasValue().ensureIsFunction();
        
        given(this, "this").ensure(t => !t._isInitialized, "already initialized");
        
        if (this._isDisposed)
            throw new ObjectDisposedException(this);
        
        this._availabilityObserver.subscribe(availabilityCallback);
        
        this._worker.on("message", (data: any) =>
        {
            const id = data.id as string;
            const error = data.error as any;
            const result = data.result as any;

            if (this._currentTask.id !== id)
            {
                this._currentTask.deferred
                    .reject(new ApplicationException("Current task id does not match id of task result."));
            }
            else
            {
                if (error != null)
                    this._currentTask.deferred.reject(error);
                else
                    this._currentTask.deferred.resolve(result);
            }

            this._currentTask = null;
            this._availabilityObserver.notify(this);
        });
    }
    
    public execute<T>(id: string, method: string, ...params: any[]): Promise<T>
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
        
        return this._currentTask.deferred.promise;
    }
    
    public dispose(): Promise<void>
    {
        if (!this._isDisposed)
        {
            this._availabilityObserver.cancel();
            this._disposePromise = this._worker.terminate();
        }
        
        return this._disposePromise;
    }
}


interface WorkerTask
{
    id: string;
    deferred: Deferred<any>;
}