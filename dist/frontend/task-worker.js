import { given } from "@nivinjoseph/n-defensive";
import { TaskWorker as TaskWorkerBase } from "../common/task-worker.js";
export class TaskWorker extends TaskWorkerBase {
    constructor(ctx) {
        given(ctx, "ctx").ensureHasValue().ensureIsObject();
        super(new WebWorkerContext(ctx));
    }
}
class WebWorkerContext {
    _worker;
    constructor(worker) {
        this._worker = worker;
    }
    onMessage(handler) {
        this._worker.onmessage = (e) => {
            handler(e.data);
        };
    }
    postMessage(message) {
        this._worker.postMessage(message);
    }
}
//# sourceMappingURL=task-worker.js.map