import { given } from "@nivinjoseph/n-defensive";
import { Uuid, Make, Deferred, Observer } from "@nivinjoseph/n-util";
import { ApplicationException, ObjectDisposedException } from "@nivinjoseph/n-exception";
export class TaskPool {
    _count;
    _taskWorkers = new Array();
    _taskQueue = new Array();
    _isInitialized = false;
    _disposePromise = null;
    get _isDisposed() { return this._disposePromise != null; }
    constructor(count) {
        given(count, "count").ensureHasValue().ensureIsNumber().ensure(t => t > 0);
        this._count = count;
    }
    async initializeWorkers(initializerMethod, ...initializerParams) {
        given(initializerMethod, "initializerMethod").ensureIsString();
        given(initializerParams, "initializerParams").ensureIsArray();
        given(this, "this").ensure(t => !t._isInitialized, "already initialized");
        if (this._isDisposed)
            throw new ObjectDisposedException(this);
        this._createWorkers();
        if (initializerMethod != null)
            await Promise.all(this._taskWorkers.map(t => t.execute(Uuid.create(), initializerMethod, ...initializerParams)));
        this._isInitialized = true;
    }
    async invoke(method, ...params) {
        given(method, "method").ensureHasValue().ensureIsString();
        given(params, "params").ensureHasValue().ensureIsArray();
        given(this, "this").ensure(t => t._isInitialized, "not initialized");
        if (this._isDisposed)
            throw new ObjectDisposedException(this);
        return this._enqueue(method, params);
    }
    async dispose() {
        if (!this._isDisposed) {
            this._taskQueue.forEach(t => t.deferred.reject(new ObjectDisposedException(this)));
            this._taskQueue.clear();
            this._disposePromise = Promise.all(this._taskWorkers.map(t => t.dispose()));
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this._disposePromise;
    }
    _createWorkers() {
        Make.loop(() => {
            const taskWorker = new TaskWorkerInstance(this._createWorkerAdapter());
            taskWorker.initialize(this._onAvailable.bind(this));
            this._taskWorkers.push(taskWorker);
        }, this._count);
    }
    _onAvailable(twi) {
        given(twi, "twi").ensureHasValue().ensureIsObject().ensureIsType(TaskWorkerInstance);
        this._executeAvailableWork(twi);
    }
    _enqueue(method, params) {
        const taskItem = {
            id: Uuid.create(),
            deferred: new Deferred(),
            method,
            params
        };
        this._taskQueue.unshift(taskItem);
        this._executeAvailableWork();
        return taskItem.deferred.promise;
    }
    _executeAvailableWork(twi) {
        if (this._taskQueue.isEmpty)
            return;
        const availableWorker = twi ?? this._taskWorkers.find(t => t.isAvailable);
        if (availableWorker == null)
            return;
        const work = this._taskQueue.pop();
        availableWorker
            .execute(work.id, work.method, ...work.params)
            .then(t => work.deferred.resolve(t))
            .catch(e => work.deferred.reject(e));
    }
}
class TaskWorkerInstance {
    _id;
    _worker;
    _availabilityObserver = new Observer("available");
    _disposePromise = null;
    _currentTask = null;
    _isFaulted = false;
    get _isInitialized() { return this._availabilityObserver.hasSubscriptions; }
    get _isDisposed() { return this._disposePromise != null; }
    get id() { return this._id; }
    get isBusy() { return this._currentTask != null; }
    get isFaulted() { return this._isFaulted; }
    get isAvailable() { return !this._isFaulted && !this._isDisposed && !this.isBusy; }
    constructor(worker) {
        given(worker, "worker").ensureHasValue().ensureIsObject();
        this._id = Uuid.create();
        this._worker = worker;
    }
    initialize(availabilityCallback) {
        given(availabilityCallback, "availabilityCallback").ensureHasValue().ensureIsFunction();
        given(this, "this").ensure(t => !t._isInitialized, "already initialized");
        if (this._isDisposed)
            throw new ObjectDisposedException(this);
        this._availabilityObserver.subscribe(availabilityCallback);
        this._worker.setHandlers((data) => {
            if (this._currentTask == null)
                return;
            const id = data.id;
            const error = data.error;
            const result = data.result;
            if (this._currentTask.id !== id) {
                this._currentTask.deferred
                    .reject(new ApplicationException("Current task id does not match id of task result."));
            }
            else {
                if (error != null)
                    this._currentTask.deferred.reject(error);
                else
                    this._currentTask.deferred.resolve(result);
            }
            this._currentTask = null;
            this._availabilityObserver.notify(this);
        }, (error) => {
            this._onError(error);
        });
    }
    async execute(id, method, ...params) {
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
            deferred: new Deferred()
        };
        this._worker.postMessage({
            id: this._currentTask.id,
            type: method.trim(),
            params
        });
        return this._currentTask.deferred.promise;
    }
    dispose() {
        if (!this._isDisposed) {
            if (this._currentTask != null) {
                this._currentTask.deferred.reject(new ObjectDisposedException(this));
                this._currentTask = null;
            }
            this._availabilityObserver.cancel();
            this._disposePromise = this._worker.terminate();
        }
        return this._disposePromise;
    }
    _onError(error) {
        if (this._isFaulted || this._isDisposed)
            return;
        this._isFaulted = true;
        if (this._currentTask != null) {
            this._currentTask.deferred.reject(error);
            this._currentTask = null;
        }
        this._availabilityObserver.cancel();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this._worker.terminate();
    }
}
//# sourceMappingURL=task-pool.js.map