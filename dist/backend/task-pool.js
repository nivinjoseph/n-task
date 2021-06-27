"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskPool = void 0;
require("@nivinjoseph/n-ext");
const n_defensive_1 = require("@nivinjoseph/n-defensive");
const n_util_1 = require("@nivinjoseph/n-util");
const n_exception_1 = require("@nivinjoseph/n-exception");
const worker_threads_1 = require("worker_threads");
class TaskPool {
    constructor(taskWorkerFile, count = 1) {
        this._taskWorkers = new Array();
        this._taskQueue = new Array();
        this._isInitialized = false;
        this._disposePromise = null;
        n_defensive_1.given(taskWorkerFile, "taskWorkerFile").ensureHasValue().ensureIsString();
        this._taskWorkerFile = taskWorkerFile;
        n_defensive_1.given(count, "count").ensureHasValue().ensureIsNumber().ensure(t => t > 0);
        this._count = count;
    }
    get _isDisposed() { return this._disposePromise != null; }
    initializeWorkers(initializerMethod, ...initializerParams) {
        return __awaiter(this, void 0, void 0, function* () {
            n_defensive_1.given(initializerMethod, "initializerMethod").ensureIsString();
            n_defensive_1.given(initializerParams, "initializerParams").ensureIsArray().ensureIsArray();
            n_defensive_1.given(this, "this").ensure(t => !t._isInitialized, "already initialized");
            if (this._isDisposed)
                throw new n_exception_1.ObjectDisposedException(this);
            this._createWorkers();
            if (initializerMethod != null)
                yield Promise.all(this._taskWorkers.map(t => t.execute(n_util_1.Uuid.create(), initializerMethod, ...initializerParams)));
            this._isInitialized = true;
        });
    }
    invoke(method, ...params) {
        n_defensive_1.given(method, "method").ensureHasValue().ensureIsString();
        n_defensive_1.given(params, "params").ensureHasValue().ensureIsArray();
        n_defensive_1.given(this, "this").ensure(t => t._isInitialized, "not initialized");
        if (this._isDisposed)
            throw new n_exception_1.ObjectDisposedException(this);
        return this._enqueue(method, params);
    }
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._isDisposed) {
                this._taskQueue.forEach(t => t.deferred.reject("disposed"));
                this._taskQueue.clear();
                this._disposePromise = Promise.all(this._taskWorkers.map(t => t.dispose()));
            }
            return this._disposePromise;
        });
    }
    _createWorkers() {
        n_util_1.Make.loop(() => {
            const taskWorker = new TaskWorkerInstance(this._taskWorkerFile);
            taskWorker.initialize(this._onAvailable.bind(this));
            this._taskWorkers.push(taskWorker);
        }, this._count);
    }
    _onAvailable(twi) {
        n_defensive_1.given(twi, "twi").ensureHasValue().ensureIsObject().ensureIsType(TaskWorkerInstance);
        this._executeAvailableWork(twi);
    }
    _enqueue(method, params) {
        const taskItem = {
            id: n_util_1.Uuid.create(),
            deferred: new n_util_1.Deferred(),
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
exports.TaskPool = TaskPool;
class TaskWorkerInstance {
    constructor(taskWorkerFile) {
        this._availabilityObserver = new n_util_1.Observer("available");
        this._disposePromise = null;
        this._currentTask = null;
        n_defensive_1.given(taskWorkerFile, "taskWorkerFile").ensureHasValue().ensureIsString();
        this._id = n_util_1.Uuid.create();
        this._worker = new worker_threads_1.Worker(taskWorkerFile);
    }
    get _isInitialized() { return this._availabilityObserver.hasSubscriptions; }
    get _isDisposed() { return this._disposePromise != null; }
    get id() { return this._id; }
    get isBusy() { return this._currentTask != null; }
    initialize(availabilityCallback) {
        n_defensive_1.given(availabilityCallback, "availabilityCallback").ensureHasValue().ensureIsFunction();
        n_defensive_1.given(this, "this").ensure(t => !t._isInitialized, "already initialized");
        if (this._isDisposed)
            throw new n_exception_1.ObjectDisposedException(this);
        this._availabilityObserver.subscribe(availabilityCallback);
        this._worker.on("message", (data) => {
            const id = data.id;
            const error = data.error;
            const result = data.result;
            if (this._currentTask.id !== id) {
                this._currentTask.deferred
                    .reject(new n_exception_1.ApplicationException("Current task id does not match id of task result."));
            }
            else {
                if (error != null)
                    this._currentTask.deferred.reject(error);
                else
                    this._currentTask.deferred.resolve(result);
            }
            this._currentTask = null;
            this._availabilityObserver.notify(this);
        });
    }
    execute(id, method, ...params) {
        n_defensive_1.given(id, "id").ensureHasValue().ensureIsString();
        n_defensive_1.given(method, "method").ensureHasValue().ensureIsString();
        n_defensive_1.given(params, "params").ensureHasValue().ensureIsArray();
        n_defensive_1.given(this, "this")
            .ensure(t => t._isInitialized, "worker instance not initialized")
            .ensure(t => !t.isBusy, "worker instance is busy");
        if (this._isDisposed)
            throw new n_exception_1.ObjectDisposedException(this);
        this._currentTask = {
            id,
            deferred: new n_util_1.Deferred()
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
            this._availabilityObserver.cancel();
            this._disposePromise = this._worker.terminate();
        }
        return this._disposePromise;
    }
}
//# sourceMappingURL=task-pool.js.map