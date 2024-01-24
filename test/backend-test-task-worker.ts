import { TaskWorker } from "../src/backend/task-worker.js";


export class BackendTestTaskWorker extends TaskWorker 
{
    public hello(value: number): string 
    {
        console.log("hello");

        return `world ${value}`;
    }
}

new BackendTestTaskWorker();