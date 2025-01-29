// acepad-store-file
//import {FS} from "@hoge1e3/sfile";
import { FileSystemFactory, SFile } from "@hoge1e3/sfile";
import * as s from "./store.js";
import { zip } from "./zip.js";
import os from "os";

export type Data={url:string,__id__:string,__prev__?:string};
export type NoIdData={url:string,__prev__?:string};
const tmpath=os.tmpdir();
//const FS=await getNodeFS();
let FS:FileSystemFactory;
export function setFS(fs:FileSystemFactory){
    FS=fs;
}
export function validate(data:NoIdData, allownoid:true):NoIdData;
export function validate(data:Data):Data;
export function validate(data:NoIdData|Data, allownoid:boolean=false){
    if((!allownoid &&!(data as Data).__id__) || !data.url){
        //console.log("data",data);
        throw new Error("no __id__ or url "+allownoid);
    }
    //console.log("datavalid",data);
    return data;
}
export async function put(src:SFile){
    const data=file2data(src);
    const id=await s.put(data);
    const withID:Data={...data,__id__:id};
    validate(withID);
    return id;
}
export async function get(id:string, dst:SFile):Promise<void> {
    let data=await s.get(id);
    data2file(validate(data),dst);
}
export function data2file(data:Data ,dst:SFile):void {
    dst.dataURL(validate(data).url);
}
export function file2data(src:SFile):NoIdData {
    return validate({url:src.dataURL()},true);
}
export function zip2data(src:SFile):NoIdData {
    return validate(file2data(src),true);
}
export function data2zip(data:Data):SFile {
    validate(data);
    let ram=FS.get(tmpath);    
    let zip=ram.rel(data.__id__+".zip");
    data2file(data,zip);
    return zip;
}
export async function data2dir(data:Data):Promise<SFile>{
    validate(data);
    let zipFile=data2zip(data);
    let extracted=zipFile.sibling(data.__id__+"/");
    await zip.unzip(zipFile,extracted,{overwrite:true});
    return extracted;
}
export async function dir2data(dir:SFile,opt:{excludes:(f:SFile)=>boolean}):Promise<NoIdData>{
    let ram=FS.get(tmpath);    
    let n=Math.floor(Math.random()*100000);
    let zipFile=ram.rel(n+".zip");
    await zip.zip(dir,zipFile,opt);
    let data=zip2data(zipFile);
    return validate(data,true);
}
