"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@babel/polyfill");
require("@nivinjoseph/n-ext");
const n_defensive_1 = require("@nivinjoseph/n-defensive");
class TaskWorker {
    constructor(ctx) {
        n_defensive_1.given(ctx, "ctx").ensureHasValue().ensureIsObject();
        this._ctx = ctx;
        this._typeName = this.getTypeName();
        this.initialize();
    }
    initialize() {
        this._ctx.onmessage = (e) => {
            const id = e.data.id;
            const type = e.data.type;
            const params = e.data.params;
            try {
                n_defensive_1.given(id, "id").ensureHasValue().ensureIsString();
                n_defensive_1.given(type, "type").ensureHasValue().ensureIsString();
                n_defensive_1.given(params, "params").ensureHasValue().ensureIsArray();
            }
            catch (error) {
                this._ctx.postMessage({
                    id,
                    error: error || true
                });
            }
            if (this[type] && typeof this[type] === "function") {
                try {
                    const result = this[type](...params);
                    if (result != null) {
                        if (result.then && result.catch) {
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