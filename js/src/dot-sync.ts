import { SFile } from "@hoge1e3/sfile";
import { Checkout } from "./store";
import exp from "constants";

export type DirInfo={lastUpdate:number};
export type DirTree={
    [key:string]:DirInfo,
};
export type TreeData={
    tree:DirTree,
    __id__:string,
};
export type Config={
    excludes:string[],
};
export type RepoData={
    name:string,
    config?:Config,
};
export type SubSyncEntry={
    __id__: string,
};
// acepad-dot-sync
export function find(dir:SFile):WorkDirStatus{
    let sync=findDotSyncDir(dir);
    dir=sync.up()!;
    let info=instance(dir);
    
    const {repof,treef}=info;
    let {name,config}=repof.obj() as RepoData;
    let trdata=treef.obj() as TreeData;
    let treeOfLastCommit=trdata.tree;
    let __id__=trdata.__id__;
    return Object.assign(info,{
        name,
        __id__,// local __id__ of prev sync
        treeOfLastCommit,//trdata.tree
    });
}
export type WorkDirStatus=WorkDir&{
    name:string,
    __id__:string,
    treeOfLastCommit:DirTree,
    rmtco?:Checkout
};
export type ExcludeFunctionWithSubSync=((f:SFile)=>boolean)&{subSyncs?:Set<string>};
export type WorkDir={
    isSubSync(f: SFile): boolean;
    inSubSync(f: SFile): boolean;
    repof:SFile,
    treef:SFile,
    dir:SFile,
    sync:SFile,
    getExcludes():ExcludeFunctionWithSubSync,
    getWorkingTree(writeSubSyncs?:boolean):DirTree,
    //getLocalTree1():DirInfos,
    updateTree():void,
    getConfig():Config,
    writeRepo(obj:RepoData):void,
    readRepo():RepoData,
    writeTreeFile(obj:TreeData):void,
    //writeSubSyncs():void,
    readTreeFile():TreeData,
    //getDirTree(_dir?:SFile):DirTree,
    init({name,__id__,config}:{name:string,__id__:string,config?:Config}):void,
    branch(newname:string):void,
};
export function instance(dir: SFile, inTmp=false):WorkDir{
    const sync=dir.rel(".sync/");
    const repof=sync.rel(repon);
    const treef=sync.rel(treen);
    const syncignore=dir.rel(".syncignore");
    const subSyncsFile=dir.rel(".subsyncs.json");
    //let subSyncs=undefined as Set<string>|undefined;
    return {
        repof,
        treef,
        dir,
        sync,
        isSubSync(f:SFile){
            return !f.equals(dir) && f.isDir() && f.rel(".sync/").exists();
        },
        inSubSync(f:SFile){
            while(dir.contains(f)) {
                if (this.isSubSync(f)) return true;
                f=f.up()!;
            }
            return false;
        },
        getExcludes(){
            const truncSEP=((s:string)=>s.replace(/\/$/,""));
            const excludePaths=[".sync/", ...(
                this.getConfig().excludes||[]
            ), ...(
                syncignore.exists()?syncignore.lines():[]
            )].map(truncSEP);
            const isSubSync=(f:SFile)=>this.isSubSync(f);
            const subSyncs=new Set<string>();
            const res:ExcludeFunctionWithSubSync=(f:SFile)=>{
                const relPath=f.relPath(dir);
                if (isSubSync(f)) {
                    subSyncs.add(relPath);
                    return true;
                }
                return excludePaths.some(e=>truncSEP(relPath)==e);
            };
            res.subSyncs=subSyncs;
            return res;
        },
        updateTree(){
            const lc=this.readTreeFile();
            lc.tree=this.getWorkingTree();
            this.writeTreeFile(lc);
        },
        getConfig(){
            // repof may not exist when downloaded into tmp dir, or checkout only subsync
            if (!repof.exists()) return {excludes:[]};
            let {config}=this.readRepo();
            return config||{excludes:[]};
        },
        writeRepo(obj:RepoData){
            repof.obj(obj);
        },
        readRepo(){
            return repof.obj() as RepoData;
        },
        writeTreeFile(obj:TreeData){
            treef.obj(obj);
        },
        readTreeFile(){
            return treef.obj() as TreeData;
        },
        getWorkingTree(writeSubSyncs=false){
            const excludes=this.getExcludes();
            const tree=dir.getDirTree({
                style:"flat-relative",
                excludes,
            }) as DirTree;
            const subSyncs=excludes.subSyncs;
            if (writeSubSyncs && subSyncs) {
                const data=(subSyncsFile.exists()?subSyncsFile.obj():{}) as {[key:string]:SubSyncEntry};
                let save=false;
                for (let subSync of subSyncs) {
                    let f=dir.rel(subSync);
                    const w=instance(f);
                    const __id__=w.readTreeFile().__id__;
                    if (!data[subSync]) {
                        // TODO: which __id__ is newer??
                        save=true;
                        data[subSync]={__id__};
                    }
                }
                if (save) {
                    subSyncsFile.obj(data);
                    tree[subSyncsFile.relPath(dir)]={lastUpdate:subSyncsFile.lastUpdate()}
                }
            }
            return tree;
        },
        init({name,__id__,config}:{name:string,__id__:string,config?:Config}){
            if(!sync.exists())sync.mkdir();
            this.writeRepo({
                name,config,
            });
            const tree={};
            this.writeTreeFile({
                __id__,
                tree,
            });
        },
        branch(newname:string) {
            const r=this.readRepo();
            r.name=newname;
            this.writeRepo(r);
        },
    };
}
const repon="repo.json";
const treen="tree.json";

export function findDotSyncDir(dir:SFile){
    for(let d:SFile|null=dir;d;d=d.up()){
        let s=d.rel(".sync/");
        if(s.exists())return s;
    }
    throw new Error(`.sync not found from ${dir}`);
}
export function conflictFile(f:SFile, id:string) {
    let names=f.name().split(".");
    names[0]+=`(${id.substring(0,8)})`;
    return f.sibling(names.join("."));
}

