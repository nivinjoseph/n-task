import "core-js/stable";
import "regenerator-runtime/runtime";
import "@nivinjoseph/n-ext";
import { given } from "@nivinjoseph/n-defensive";
export class TaskWorker {
    constructor(ctx) {
        given(ctx, "ctx").ensureHasValue().ensureIsObject();
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
                given(id, "id").ensureHasValue().ensureIsString();
                given(type, "type").ensureHasValue().ensureIsString();
                given(params, "params").ensureHasValue().ensureIsArray();
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
//# sourceMappingURL=task-worker.js.map