import "core-js/stable/index.js";
import "regenerator-runtime/runtime.js";
import "@nivinjoseph/n-ext";
import { given } from "@nivinjoseph/n-defensive";


function toError(error: unknown): Error
{
    if (error instanceof Error)
        return error;

    if (typeof error === "string" && error.length > 0)
        return new Error(error);

    return new Error(`Worker task failed with a non-error value: ${String(error)}`);
}


export abstract class TaskWorker
{
    private readonly _ctx: Worker;
    private readonly _typeName: string;


    public constructor(ctx: Worker)
    {
        given(ctx, "ctx").ensureHasValue().ensureIsObject();
        this._ctx = ctx;

        this._typeName = (<Object>this).getTypeName();

        this._initialize();
    }


    private _initialize(): void
    {
        this._ctx.onmessage = (e: MessageEvent): void =>
        {
            const id = e.data.id as string;
            const type = e.data.type as string;
            const params = e.data.params as Array<any>;

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
        };
    }
}