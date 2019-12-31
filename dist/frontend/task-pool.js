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
const n_defensive_1 = require("@nivinjoseph/n-defensive");
const n_util_1 = require("@nivinjoseph/n-util");
const n_exception_1 = require("@nivinjoseph/n-exception");
class TaskPool {
    constructor(taskWorker, count = 1) {
        this._callbacks = {};
        this._taskWorkers = new Array();
        this._isDisposed = false;
        n_defensive_1.given(taskWorker, "taskWorker").ensureHasValue().ensureIsFunction();
        this._taskWorkerClass = taskWorker;
        n_defensive_1.given(count, "count").ensureHasValue().ensureIsNumber().ensure(t => t > 0);
        this._count = count;
        this._bp = new n_util_1.BackgroundProcessor((e) => {
            console.error(e);
            return Promise.resolve();
        }, 500, true);
        this.initialize();
    }
    invoke(method, ...params) {
        n_defensive_1.given(method, "method").ensureHasValue().ensureIsString();
        n_defensive_1.given(params, "params").ensureHasValue().ensureIsArray();
        if (this._isDisposed)
            throw new n_exception_1.ObjectDisposedException(this);
        return new Promise((resolve, reject) => {
            const id = n_util_1.Uuid.create();
            this._callbacks[id] = {
                resolve,
                reject
            };
            this._bp.processAction(() => __awaiter(this, void 0, void 0, function* () {
                let freeWorker = this._taskWorkers.find(t => !t.isBusy);
                while (!freeWorker) {
                    yield n_util_1.Delay.milliseconds(500);
                    freeWorker = this._taskWorkers.find(t => !t.isBusy);
                }
                freeWorker.isBusy = true;
                freeWorker.taskWorker.postMessage({
                    id,
                    type: method.trim(),
                    params
                });
            }));
        });
    }
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._isDisposed) {
                this._isDisposed = true;
                yield this._bp.dispose(true);
                this._taskWorkers.forEach(t => t.taskWorker.terminate());
            }
        });
    }
    initialize() {
        n_util_1.Make.loop(() => {
            const taskWorker = new this._taskWorkerClass();
            const tpTaskWorker = {
                taskWorker,
                isBusy: false
            };
            taskWorker.onmessage = (e) => {
                const id = e.data.id;
                const error = e.data.error;
                const result = e.data.result;
                if (this._callbacks[id]) {
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
exports.TaskPool = TaskPool;
//# sourceMappingURL=task-pool.js.map