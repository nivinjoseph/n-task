import { given } from "@nivinjoseph/n-defensive";
import { ApplicationException } from "@nivinjoseph/n-exception";
import { TaskPool as TaskPoolBase } from "../common/task-pool.js";
export class TaskPool extends TaskPoolBase {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    _taskWorkerClass;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    constructor(taskWorker, count = 1) {
        given(taskWorker, "taskWorker").ensureHasValue().ensureIsFunction();
        super(count);
        this._taskWorkerClass = taskWorker;
    }
    _createWorkerAdapter() {
        return new WebWorkerAdapter(this._taskWorkerClass);
    }
}
class WebWorkerAdapter {
    _worker;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    constructor(taskWorkerClass) {
        given(taskWorkerClass, "taskWorkerClass").ensureHasValue().ensureIsFunction();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this._worker = new taskWorkerClass();
    }
    setHandlers(onMessage, onError) {
        given(onMessage, "onMessage").ensureHasValue().ensureIsFunction();
        given(onError, "onError").ensureHasValue().ensureIsFunction();
        this._worker.onmessage = (e) => {
            onMessage(e.data);
        };
        this._worker.onerror = (e) => {
            onError(new ApplicationException(`Worker errored: ${e.message}`));
        };
        this._worker.onmessageerror = () => {
            onError(new ApplicationException("Worker failed to deserialize a message."));
        };
    }
    postMessage(message) {
        this._worker.postMessage(message);
    }
    terminate() {
        this._worker.terminate();
        return Promise.resolve();
    }
}
//# sourceMappingURL=task-pool.js.map