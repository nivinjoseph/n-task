import { given } from "@nivinjoseph/n-defensive";
export function toError(error) {
    if (error instanceof Error)
        return error;
    if (typeof error === "string" && error.length > 0)
        return new Error(error);
    return new Error(`Worker task failed with a non-error value: ${String(error)}`);
}
export class TaskWorker {
    _ctx;
    _typeName;
    constructor(ctx) {
        given(ctx, "ctx").ensureHasValue().ensureIsObject();
        this._ctx = ctx;
        this._typeName = this.getTypeName();
        this._initialize();
    }
    _initialize() {
        this._ctx.onMessage((data) => {
            const id = data.id;
            const type = data.type;
            const params = data.params;
            try {
                given(id, "id").ensureHasValue().ensureIsString();
                given(type, "type").ensureHasValue().ensureIsString();
                given(params, "params").ensureHasValue().ensureIsArray();
            }
            catch (error) {
                this._ctx.postMessage({
                    id,
                    error: toError(error)
                });
                return;
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
                                    error: toError(e)
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
                        error: toError(error)
                    });
                }
            }
            else {
                this._ctx.postMessage({
                    id,
                    error: toError(`Method '${type}' not implemented in TaskWorker '${this._typeName}'`)
                });
            }
        });
    }
}
//# sourceMappingURL=task-worker.js.map