import * as store from "./store.js";
import {data2zip,zip2data,data2dir,
dir2data,validate,get as sget,
Data} from "./store-file.js";
import {getDelta,getDeltaDelta} from "./delta.js";
//import {FS} from "@hoge1e3/fs";
import {assert} from "chai";
import {instance,find,conflictFile, WorkDirStatus} from "./dot-sync.js";
import { SFile } from "@hoge1e3/sfile";
import { zip } from "./zip.js";
export async function init(dir:SFile,data={} as Data){
    let co=await store.init(data);
    const __id__=co.data.__id__;
    const info=instance(dir);
    info.init({name:co.branch,__id__});
    return __id__;
}
export function getBranchName(dir:SFile) {
    return instance(dir).readRepo().name;
}
export async function branch(dir:SFile) {
    const info=instance(dir);
    const {__id__}=info.readLocal();
    let data=await dir2data(dir,{excludes:info.getExcludes()});
    data.__prev__=__id__;
    validate(data,true);
    let nco=await store.init(data);
    info.writeLocal({
        __id__:nco.data.__id__,
        tree:info.getLocalTree2(),
    });
    info.branch(nco.branch);
    return nco.data.__id__;
}
export async function downloadZip(dir:SFile,id:string){
    let data=await store.get(id);
    let zipFile=data2zip(data);
    const dst=dir.rel(zipFile.name());
    zipFile.moveTo(dst);
    console.log("zipped to "+dst.path());
}
export async function chain(id:string){
    return store.$get({chain:id});
}

export async function clone(name:string,dir:SFile){
    if(dir.ls().length)throw new Error("not empty");
    let co=await store.checkout(name);
    const __id__=co.data.__id__;
    let zipFile=data2zip(co.data);
    await zip.unzip(zipFile,dir);
    const info=instance(dir);
    info.init({name,__id__});
    info.updateTree();
    return __id__;
}
export async function checkout(_dir:SFile){
    let info=find(_dir);
    let {dir,sync,lcltree1,__id__}=info;
    let rmtco=await get_rmtco(info);
    if (rmtco.data.__id__===__id__){
        return "up2date";
    }
    __id__=rmtco.data.__id__;
    let {tree:rmtree,dir:rmtdir}=await data2tree(rmtco.data,info);
    assert.ok(rmtree,"rmtree");
    //console.log("rmtree",rmtree, "dir",dir);
    let lcltree2=info.getLocalTree2();
    //console.log("lcltree2",lcltree2);
    let ldelta=getDelta(lcltree1, lcltree2);
    let rdelta=getDelta(lcltree1, rmtree);
    let dd=getDeltaDelta(ldelta,rdelta);
    console.log("remote id",__id__);
    //console.log("dd",dd);
    for (let k in dd.downloads) {
        let d=dd.downloads[k];
        let f=dir.rel(k);//.rm();
        if (d.deleted) {
            console.log("del",f.path());
            f.rm();
        } else {
            console.log("wrt",f.path());
            let r=rmtdir.rel(k);
            r.copyTo(f);
            f.setMetaInfo(r.getMetaInfo());
        }
    }
    let cfiles=[], emesg="";
    for (let k in dd.conflicts) {
        let f=dir.rel(k);
        let rmtf=rmtdir.rel(k);
        if(!rmtf.exists())continue;
        if(f.exists()&&rmtf.text()===f.text()){
            continue;
        }
        let cf=conflictFile(f, __id__);
        emesg+=("Conflict: "+k+"\n");
        emesg+=("Saved to "+cf.name()+"\n");
        rmtf.copyTo(cf);
        cfiles.push({src:f, dst:cf});
    }
    info.writeLocal({
        __id__,
        tree:rmtree,//getDirInfo(dir),
    });
    if (cfiles.length) {
        throw new ConfilictError(emesg, cfiles, __id__);
    }
    return __id__;
}
export class ConfilictError extends Error{
    constructor(
        message:string, 
        public conflictFiles:{src:SFile,dst:SFile}[], 
        public __id__:string){
        super(message);
    }
}
export async function commit(_dir:SFile){
    let info=find(_dir);
    let {dir,sync,__id__,lcltree1,name}=info;
    let lcltree2=info.getLocalTree2();
    //console.log("lcltree2",lcltree2);
    let ldelta=getDelta(lcltree1, lcltree2);
    if(Object.keys(ldelta).length==0){
        console.log("nothing changed.");
        return __id__;
    }
    let rmtco=await get_rmtco(info);
    if (rmtco.data.__id__!==__id__){
        console.log("cof",rmtco.data.__id__, __id__);
        throw new Error("checkout first.");
    }
    let data=await dir2data(dir,{excludes:info.getExcludes()});
    data.__prev__=__id__;
    validate(data,true);
    let nid=await rmtco.commit(data);
    info.writeLocal({
        __id__:nid.data.__id__,
        tree:info.getLocalTree2(),
    });
    return nid.data.__id__;
}
export async function data2tree(data:Data ,info: WorkDirStatus){
    let dir=await data2dir(data);
    let tree=info.getDirInfo(dir);
    //console.log("data2tree", tree);
    if (!tree) {
        console.log("data", data);
        console.log("ext", dir.path());
        throw new Error("No tree");
    }
    return {dir, tree};
}
async function get_rmtco(info: WorkDirStatus){
    info.rmtco=info.rmtco||await store.checkout(info.name);
    return info.rmtco;
}
export async function download(dir:SFile,id:string){
    await sget(id,dir);
}