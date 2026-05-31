import { TaskWorker } from "@nivinjoseph/n-task/frontend";


// The worker class: each public method is callable via pool.invoke(...).
class MathWorker extends TaskWorker
{
    public fib(n: number): number
    {
        return n < 2 ? n : this.fib(n - 1) + this.fib(n - 2);
    }

    public async echo(value: unknown): Promise<unknown>
    {
        return value;
    }

    public boom(): never
    {
        throw new Error("boom from worker");
    }
}


// `self` is the dedicated web worker global scope.
new MathWorker(self as unknown as Worker);
