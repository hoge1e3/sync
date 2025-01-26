// acepad-sync-delta
import {assert} from "chai";

type Delta={lastUpdate:number, deleted?:boolean, created?:boolean, modified?:boolean};
type Deltas={[key:string]:Delta};
type DeltaDelta={
    downloads:{[key:string]:Delta},
    conflicts:{[key:string]:{local:Delta,remote:Delta}},
    uploads:{[key:string]:Delta},
};
function unionKeys(...args:{[key:string]:any}[]) {
    const keys={} as {[key:string]:any};
    for (let i=0 ; i<args.length ;i++) {
        for (let key in args[i]) {keys[key]=1;}
    }
    return keys;
}
function compZipTs(a:number,b:number){
    return Math.floor(a/2000)-Math.floor(b/2000);
}
export function getDelta(before:Deltas,after:Deltas) {
    assert.ok(before,"before");
    assert.ok(after,"after");
    
    //console.log("getDelta",before,after);
    var keys=unionKeys(before,after);
    var res={} as Deltas;
    for (var key in keys) {
        var inb=(key in before),ina=(key in after);
        //console.log("Compare", before[key], after[key], ina, inb);
        if (inb && !ina) {
            // DELETED
            res[key]={lastUpdate:-1, deleted:true};
        } else if (!inb && ina) {
            // CREATED
            res[key]={lastUpdate:after[key].lastUpdate, created:true};
        } else if (compZipTs(
            before[key].lastUpdate,
            after[key].lastUpdate
        )) {
            // MODIFIED
            res[key]={
                    lastUpdate: after[key].lastUpdate,
                    modified:true
            };
            //console.log("Added", key, before[key].lastUpdate , after[key].lastUpdate)
        }else{
            /*console.log(
                "unmod",key,
                before[key].lastUpdate,
                after[key].lastUpdate);*/
        }
    }
    return res;
}
export function getDeltaDelta(local:Deltas,remote:Deltas) {
    const keys=unionKeys(local,remote);
    const res={downloads:{},conflicts:{},uploads:{}} as DeltaDelta;
    for (var key in keys) {
        var inl=(key in local),inr=(key in remote);
        assert.ok(inr||inl,"inrinl");
        if (inr&&!inl)
            res.downloads[key]=remote[key];
        if (inr&&inl)
            res.conflicts[key]={
                local:local[key],
                remote:remote[key],
            };
        if (!inr&&inl)
            res.uploads[key]=local[key];
    }
    return res;
}