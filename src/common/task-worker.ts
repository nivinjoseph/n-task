import { given } from "@nivinjoseph/n-defensive";


/**
 * Platform abstraction over the worker-side message context (Node parentPort or the web worker
 * global scope). Backend and frontend each provide a concrete implementation; all dispatch
 * logic is shared.
 */
export interface WorkerContext
{
    onMessage(handler: (data: any) => void): void;
    postMessage(message: any): void;
}


export function toError(error: unknown): Error
{
    if (error instanceof Error)
        return error;

    if (typeof error === "string" && error.length > 0)
        return new Error(error);

    return new Error(`Worker task failed with a non-error value: ${String(error)}`);
}


export abstract class TaskWorker
{
    private readonly _ctx: WorkerContext;
    private readonly _typeName: string;


    protected constructor(ctx: WorkerContext)
    {
        given(ctx, "ctx").ensureHasValue().ensureIsObject();
        this._ctx = ctx;

        this._typeName = (<Object>this).getTypeName();

        this._initialize();
    }


    private _initialize(): void
    {
        this._ctx.onMessage((data: any) =>
        {
            const id = data.id as string;
            const type = data.type as string;
            const params = data.params as Array<any>;

            try
            {
                given(id, "id").ensureHasValue().ensureIsString();
                given(type, "type").ensureHasValue().ensureIsString();
                given(params, "params").ensureHasValue().ensureIsArray();
            }
            catch (error)
            {
                this._ctx.postMessage({
                    id,
                    error: toError(error)
                });

                return;
            }

            if ((<any>this)[type] && typeof (<any>this)[type] === "function")
            {
                try
                {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    const result = (<any>this)[type](...params);
                    if (result != null)
                    {
                        if (result.then && result.catch) // is promise
                        {
                            const promise = result as Promise<any>;
                            promise
                                .then((v) =>
                                {
                                    this._ctx.postMessage({
                                        id,
                                        result: v
                                    });
                                })
                                .catch(e =>
                                {
                                    this._ctx.postMessage({
                                        id,
                                        error: toError(e)
                                    });
                                });
                        }
                        else
                        {
                            this._ctx.postMessage({
                                id,
                                result
                            });
                        }
                    }
                    else
                    {
                        this._ctx.postMessage({
                            id,
                            result
                        });
                    }
                }
                catch (error)
                {
                    this._ctx.postMessage({
                        id,
                        error: toError(error)
                    });
                }
            }
            else
            {
                this._ctx.postMessage({
                    id,
                    error: toError(`Method '${type}' not implemented in TaskWorker '${this._typeName}'`)
                });
            }
        });
    }
}
