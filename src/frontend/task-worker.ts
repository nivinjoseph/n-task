import "@babel/polyfill";
import "@nivinjoseph/n-ext";
import { given } from "@nivinjoseph/n-defensive";


export abstract class TaskWorker
{
    private readonly _ctx: Worker;
    private readonly _typeName: string;


    public constructor(ctx: any)
    {
        given(ctx, "ctx").ensureHasValue().ensureIsObject();
        this._ctx = ctx;

        this._typeName = (<Object>this).getTypeName();

        this.initialize();
    }


    private initialize(): void
    {
        this._ctx.onmessage = (e: MessageEvent) =>
        {
            const id = e.data.id as string;
            const type = e.data.type as string;
            const params = e.data.params as any[];

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
                    error: error || true
                });
            }

            if ((<any>this)[type] && typeof (<any>this)[type] === "function")
            {
                try 
                {
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
                                        error: e || true
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
                        error: error || true
                    });
                }
            }
            else
            {
                this._ctx.postMessage({
                    id,
                    error: `Method '${type}' not implemented in TaskWorker '${this._typeName}'`
                });
            }
        };
    }
}