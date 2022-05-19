"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskWorker = void 0;
require("@babel/polyfill");
require("@nivinjoseph/n-ext");
const n_defensive_1 = require("@nivinjoseph/n-defensive");
class TaskWorker {
    constructor(ctx) {
        (0, n_defensive_1.given)(ctx, "ctx").ensureHasValue().ensureIsObject();
        this._ctx = ctx;
        this._typeName = this.getTypeName();
        this._initialize();
    }
    _initialize() {
        this._ctx.onmessage = (e) => {
            const id = e.data.id;
            const type = e.data.type;
            const params = e.data.params;
            try {
                (0, n_defensive_1.given)(id, "id").ensureHasValue().ensureIsString();
                (0, n_defensive_1.given)(type, "type").ensureHasValue().ensureIsString();
                (0, n_defensive_1.given)(params, "params").ensureHasValue().ensureIsArray();
            }
            catch (error) {
                this._ctx.postMessage({
                    id,
                    error: error || true
                });
            }
            if (this[type] && typeof this[type] === "function") {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    const result = this[type](...params);
                    if (result != null) {
                        if (result.then && result.catch) // is promise
                         {
                            const promise = result;
                            promise
                                .then((v) => {
                                this._ctx.postMessage({
                                    id,
                                    result: v
                                });
                            })
                                .catch(e => {
                                this._ctx.postMessage({
                                    id,
                                    error: e || true
                                });
                            });
                        }
                        else {
                            this._ctx.postMessage({
                                id,
                                result
                            });
                        }
                    }
                    else {
                        this._ctx.postMessage({
                            id,
                            result
                        });
                    }
                }
                catch (error) {
                    this._ctx.postMessage({
                        id,
                        error: error || true
                    });
                }
            }
            else {
                this._ctx.postMessage({
                    id,
                    error: `Method '${type}' not implemented in TaskWorker '${this._typeName}'`
                });
            }
        };
    }
}
exports.TaskWorker = TaskWorker;
//# sourceMappingURL=task-worker.js.map