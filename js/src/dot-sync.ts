import { SFile } from "@hoge1e3/sfile";
import { Checkout } from "./store";

export type DirInfo={lastUpdate:number};
export type DirInfos={
    [key:string]:DirInfo,
};
export type TreeData={
    tree:DirInfos,
    __id__:string,
};
export type Config={
    excludes:string[],
};
export type RepoData={
    name:string,
    config?:Config,
};
// acepad-dot-sync
export function find(dir:SFile):WorkDirStatus{
    let sync=findDotSyncDir(dir);
    dir=sync.up()!;
    let info=instance(dir);
    
    const {repof,treef}=info;
    let {name,config}=repof.obj() as RepoData;
    let trdata=treef.obj() as TreeData;
    let lcltree1=trdata.tree;
    let __id__=trdata.__id__;
    return Object.assign(info,{
        name,
        __id__,// local __id__ of prev sync
        lcltree1,//trdata.tree
    });
}
export type WorkDirStatus=WorkDir&{
    name:string,
    __id__:string,
    lcltree1:DirInfos,
    rmtco?:Checkout
};
export type WorkDir={
    repof:SFile,
    treef:SFile,
    dir:SFile,
    sync:SFile,
    getExcludes():(f:SFile)=>boolean,
    getLocalTree2():DirInfos,
    getLocalTree1():DirInfos,
    updateTree():void,
    getConfig():Config,
    writeRepo(obj:RepoData):void,
    readRepo():RepoData,
    writeLocal(obj:TreeData):void,
    readLocal():TreeData,
    getDirInfo(_dir?:SFile):DirInfos,
    init({name,__id__,config}:{name:string,__id__:string,config?:Config}):void,
    branch(newname:string):void,
};
export function instance(dir: SFile):WorkDir{
    const sync=dir.rel(".sync/");
    const repof=sync.rel(repon);
    const treef=sync.rel(treen);
    const syncignore=dir.rel(".syncignore");
    return {
        /*
        name,
        __id__,// local __id__ of prev sync
        //trdata,//local of prev sync
        lcltree1,//trdata.tree
        */

        repof,treef,
        dir,
        sync,
        getExcludes(){
            const truncSEP=((s:string)=>s.replace(/\/$/,""));
            const excludePaths=[".sync/", ...(
                this.getConfig().excludes||[]
            ), ...(
                syncignore.exists()?syncignore.lines():[]
            )].map(truncSEP);
            const hasSync=(f:SFile)=>f.isDir() && f.rel(".sync/").exists();
            return (f:SFile)=>hasSync(f)||excludePaths.some(e=>truncSEP(f.relPath(dir))==e);
        },
        getLocalTree2(){//local of current
            return this.getDirInfo() as DirInfos;
        },
        getLocalTree1(){//local of last commit
            return this.readLocal().tree;
        },
        updateTree(){
            const lc=this.readLocal();
            lc.tree=this.getLocalTree2();
            this.writeLocal(lc);
        },
        getConfig(){
            let {config}=this.readRepo();
            return config||{excludes:[]};
        },
        writeRepo(obj:RepoData){
            repof.obj(obj);
        },
        readRepo(){
            return repof.obj() as RepoData;
        },
        writeLocal(obj:TreeData){
            treef.obj(obj);
        },
        readLocal(){
            return treef.obj() as TreeData;
        },
        getDirInfo(_dir?:SFile){
            _dir=_dir||dir;
            return _dir.getDirTree({
                style:"flat-relative",
                excludes:this.getExcludes()
            }) as DirInfos;
        },
        init({name,__id__,config}:{name:string,__id__:string,config?:Config}){
            if(!sync.exists())sync.mkdir();
            this.writeRepo({
                name,config,
            });
            const tree={};
            this.writeLocal({
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

