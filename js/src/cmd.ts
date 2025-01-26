#!node
import { Shell } from "./shell.js";
import {init,commit,checkout,clone,branch} from "./sync.js";

export async function main(this:Shell, cmd:string, ...args:string[]){
    const sh=this;
    const gd=()=>sh.resolve(args.shift()||sh.cwd);
    const a=()=>{
        const r=args.shift();
        if (r==null) throw new Error("missing argument");
        return r;
    };
    switch(cmd||"auto") {
        case "init":
            return await init(a(),gd());
        case "checkout":
            return await checkout(gd());
        case "commit":
            return await commit(gd());
        case "clone":
            return await clone(a(),gd());
        case "auto":
            await checkout(gd());
            return await commit(gd());
        case "branch":
            return await branch(a(), gd());
        default:
            sh.echo("sync init/clone/checkout/commit");
    }
}