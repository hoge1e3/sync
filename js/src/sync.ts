import * as store from "./store.js";
import {data2zip,zip2data,data2dir,
dir2data,validate,get as sget,
Data} from "./store-file.js";
import {getDelta,getDeltaDelta} from "./delta.js";
export {getDelta,getDeltaDelta} from "./delta.js";
//import {FS} from "@hoge1e3/fs";
import {assert} from "chai";
import {instance,find,conflictFile, WorkDirStatus, DirTree} from "./dot-sync.js";
import { SFile } from "@hoge1e3/sfile";
import { zip } from "./zip.js";
export { head } from "./store.js";
export {setFS} from "./store-file.js";
export type TemporalRemoteDir={
    dir:SFile,
    tree:DirTree,
};
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
    const {__id__}=info.readTreeFile();
    let data=await dir2data(dir,{excludes:info.getExcludes()});
    data.__prev__=__id__;
    validate(data,true);
    let nco=await store.init(data);
    info.writeTreeFile({
        __id__:nco.data.__id__,
        tree:info.getWorkingTree(),
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
    return dst;
}
export async function chain(id:string){
    return await store.$get({chain:id}) as string[];
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
    let workDirStat=find(_dir);
    //const dir=workDirStat.dir;
    let rmtco=await getRemoteLatestCheckout(workDirStat);
    if (rmtco.data.__id__===workDirStat.__id__){
        return "up2date";
    }
    //let {tree:treeOfRemote,dir:rmtdir}
    const remoteTree=await data2tree(rmtco.data,workDirStat);
    const treeOfRemote=remoteTree.tree;
    assert.ok(treeOfRemote,"rmtree");
    //console.log("rmtree",rmtree, "dir",dir);
    let treeOfWork=workDirStat.getWorkingTree();
    //console.log("lcltree2",lcltree2);
    const treeOfLastCommit=workDirStat.treeOfLastCommit;
    let ldelta=getDelta(treeOfLastCommit, treeOfWork);
    let rdelta=getDelta(treeOfLastCommit, treeOfRemote);
    let dd=getDeltaDelta(ldelta,rdelta);
    const remoteId=rmtco.data.__id__;
    console.log("remote id",remoteId);
    //console.log("dd",dd);
    for (let k in dd.downloads) {
        let d=dd.downloads[k];
        let wrkf=workDirStat.dir.rel(k);//.rm();
        if (workDirStat.inSubSync(wrkf)) continue;
        if (d.deleted) {
            console.log("del",wrkf.path());
            wrkf.rm();
        } else {
            console.log("wrt",wrkf.path());
            let r=remoteTree.dir.rel(k);
            r.copyTo(wrkf);
            wrkf.setMetaInfo(r.getMetaInfo());
        }
    }
    let cfiles=[], emesg="";
    for (let k in dd.conflicts) {
        let wrkf=workDirStat.dir.rel(k);
        if (workDirStat.inSubSync(wrkf)) continue;
        let rmtf=remoteTree.dir.rel(k);
        if(!rmtf.exists())continue;
        if(wrkf.exists()&&sameIgnoreCR(rmtf.text(), wrkf.text())){
            continue;
        }
        let cf=conflictFile(wrkf, remoteId);
        emesg+=("Conflict: "+k+"\n");
        emesg+=("Saved to "+cf.name()+"\n");
        rmtf.copyTo(cf);
        cfiles.push({src:wrkf, dst:cf});
    }
    workDirStat.writeTreeFile({
        __id__: remoteId,
        tree:treeOfRemote,//getDirInfo(dir),
    });
    if (cfiles.length) {
        throw new ConfilictError(emesg, cfiles, remoteId);
    }
    return remoteId;
}
function sameIgnoreCR(a:string,b:string) {
    a=a.replace(/\r/g,"");
    b=b.replace(/\r/g,"");
    return a===b;
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
    let workDirStat=find(_dir);
    //let {dir,__id__,treeOfLastCommit}=workDirInfo;
    let workTree=workDirStat.getWorkingTree(true);
    //console.log("lcltree2",lcltree2);
    let ldelta=getDelta(workDirStat.treeOfLastCommit, workTree);
    if(Object.keys(ldelta).length==0){
        console.log("nothing changed.");
        return workDirStat.__id__;
    }
    let rmtco=await getRemoteLatestCheckout(workDirStat);
    if (rmtco.data.__id__!==workDirStat.__id__){
        console.log("cof",rmtco.data.__id__, workDirStat.__id__);
        throw new Error("checkout first.");
    }
    for (let k in ldelta) {
        console.log("commit",k);
    }
    const newData=await dir2data(workDirStat.dir,{
        excludes:workDirStat.getExcludes()
    });
    newData.__prev__=workDirStat.__id__;
    validate(newData,true);
    let newID=await rmtco.commit(newData);
    workDirStat.writeTreeFile({
        __id__:newID.data.__id__,
        tree:workTree,//workDirStat.getWorkingTree(),
    });
    return newID.data.__id__;
}
export async function data2tree(data:Data ,info: WorkDirStatus):Promise<TemporalRemoteDir>{
    let dir=await data2dir(data);
    const tmpWorks=instance(dir, true);
    let tree=tmpWorks.getWorkingTree();//.getDirTree(dir);
    //console.log("data2tree", tree);
    if (!tree) {
        console.log("data", data);
        console.log("ext", dir.path());
        throw new Error("No tree");
    }
    return {dir, tree};
}
async function getRemoteLatestCheckout(workDirStat: WorkDirStatus){
    workDirStat.rmtco=workDirStat.rmtco||await store.checkout(workDirStat.name);
    return workDirStat.rmtco;
}
export async function download(dir:SFile,id:string){
    await sget(id,dir);
}