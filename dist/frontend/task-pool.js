import { given } from "@nivinjoseph/n-defensive";
import { Uuid, Make, Observer, Deferred } from "@nivinjoseph/n-util";
import { ApplicationException, ObjectDisposedException } from "@nivinjoseph/n-exception";
export class TaskPool {
    get _isDisposed() { return this._disposePromise != null; }
    constructor(taskWorker, count = 1) {
        this._taskWorkers = new Array();
        this._taskQueue = new Array();
        this._isInitialized = false;
        this._disposePromise = null;
        given(taskWorker, "taskWorker").ensureHasValue().ensureIsFunction();
        this._taskWorkerClass = taskWorker;
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
            this._taskQueue.forEach(t => t.deferred.reject("disposed"));
            this._taskQueue.clear();
            this._disposePromise = Promise.all(this._taskWorkers.map(t => t.dispose()));
        }
        return this._disposePromise;
    }
    _createWorkers() {
        Make.loop(() => {
            const taskWorker = new TaskWorkerInstance(this._taskWorkerClass);
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
        const availableWorker = twi !== null && twi !== void 0 ? twi : this._taskWorkers.find(t => !t.isBusy);
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
    get _isInitialized() { return this._availabilityObserver.hasSubscriptions; }
    get _isDisposed() { return this._disposePromise != null; }
    get id() { return this._id; }
    get isBusy() { return this._currentTask != null; }
    constructor(taskWorkerClass) {
        this._availabilityObserver = new Observer("available");
        this._disposePromise = null;
        this._currentTask = null;
        given(taskWorkerClass, "taskWorkerClass").ensureHasValue().ensureIsFunction();
        this._id = Uuid.create();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this._worker = new taskWorkerClass();
    }
    initialize(availabilityCallback) {
        given(availabilityCallback, "availabilityCallback").ensureHasValue().ensureIsFunction();
        given(this, "this").ensure(t => !t._isInitialized, "already initialized");
        if (this._isDisposed)
            throw new ObjectDisposedException(this);
        this._availabilityObserver.subscribe(availabilityCallback);
        this._worker.onmessage = (e) => {
            const id = e.data.id;
            const error = e.data.error;
            const result = e.data.result;
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
        };
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
    async dispose() {
        if (!this._isDisposed) {
            this._availabilityObserver.cancel();
            this._worker.terminate();
            this._disposePromise = Promise.resolve();
        }
        return this._disposePromise;
    }
}
//# sourceMappingURL=task-pool.js.map