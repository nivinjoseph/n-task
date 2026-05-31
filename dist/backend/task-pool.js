import { given } from "@nivinjoseph/n-defensive";
import { ApplicationException } from "@nivinjoseph/n-exception";
import { Worker } from "node:worker_threads";
import { TaskPool as TaskPoolBase } from "../common/task-pool.js";
export class TaskPool extends TaskPoolBase {
    _taskWorkerFile;
    constructor(taskWorkerFile, count = 1) {
        given(taskWorkerFile, "taskWorkerFile").ensureHasValue().ensureIsString();
        super(count);
        this._taskWorkerFile = taskWorkerFile;
    }
    _createWorkerAdapter() {
        return new NodeWorkerAdapter(this._taskWorkerFile);
    }
}
class NodeWorkerAdapter {
    _worker;
    constructor(taskWorkerFile) {
        given(taskWorkerFile, "taskWorkerFile").ensureHasValue().ensureIsString();
        this._worker = new Worker(taskWorkerFile);
    }
    setHandlers(onMessage, onError) {
        given(onMessage, "onMessage").ensureHasValue().ensureIsFunction();
        given(onError, "onError").ensureHasValue().ensureIsFunction();
        this._worker.on("message", onMessage);
        this._worker.on("error", (error) => {
            onError(new ApplicationException("Worker thread errored.", error));
        });
        this._worker.on("exit", (code) => {
            onError(new ApplicationException(`Worker thread exited unexpectedly with code ${code}.`));
        });
    }
    postMessage(message) {
        this._worker.postMessage(message);
    }
    async terminate() {
        await this._worker.terminate();
    }
}
//# sourceMappingURL=task-pool.js.map