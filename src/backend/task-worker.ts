import "@nivinjoseph/n-ext";
import { given } from "@nivinjoseph/n-defensive";
import { parentPort, MessagePort } from "worker_threads";


export abstract class TaskWorker
{
    private readonly _ctx: MessagePort;
    private readonly _typeName: string;


    public constructor()
    {
        this._ctx = parentPort as MessagePort;

        this._typeName = (<Object>this).getTypeName();

        this.initialize();
    }


    private initialize(): void
    {
        this._ctx.on("message", (data: any) =>
        {
            const id = data.id as string;
            const type = data.type as string;
            const params = data.params as any[];

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
        });
    }
}