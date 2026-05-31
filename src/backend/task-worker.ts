import { parentPort, MessagePort } from "node:worker_threads";
import { TaskWorker as TaskWorkerBase, WorkerContext } from "../common/task-worker.js";


export abstract class TaskWorker extends TaskWorkerBase
{
    public constructor()
    {
        super(new NodeWorkerContext(parentPort as MessagePort));
    }
}


class NodeWorkerContext implements WorkerContext
{
    private readonly _port: MessagePort;


    public constructor(port: MessagePort)
    {
        this._port = port;
    }


    public onMessage(handler: (data: any) => void): void
    {
        this._port.on("message", handler);
    }

    public postMessage(message: any): void
    {
        this._port.postMessage(message);
    }
}
