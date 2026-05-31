import { parentPort } from "node:worker_threads";
import { TaskWorker as TaskWorkerBase } from "../common/task-worker.js";
export class TaskWorker extends TaskWorkerBase {
    constructor() {
        super(new NodeWorkerContext(parentPort));
    }
}
class NodeWorkerContext {
    _port;
    constructor(port) {
        this._port = port;
    }
    onMessage(handler) {
        this._port.on("message", handler);
    }
    postMessage(message) {
        this._port.postMessage(message);
    }
}
//# sourceMappingURL=task-worker.js.map