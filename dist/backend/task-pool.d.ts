import { TaskPool as TaskPoolBase, WorkerAdapter } from "../common/task-pool.js";
export declare class TaskPool extends TaskPoolBase {
    private readonly _taskWorkerFile;
    constructor(taskWorkerFile: string, count?: number);
    protected _createWorkerAdapter(): WorkerAdapter;
}
//# sourceMappingURL=task-pool.d.ts.map