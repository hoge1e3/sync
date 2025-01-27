// acepad-store

import { Data, NoIdData } from "./store-file.js";
export {setFS} from "./store-file.js";
type PostResponse={id:string};
const hashurl=process.env["STORE_URL"]!;
if (!hashurl) throw new Error("environment variable 'STORE_URL' not set");
const apikey=process.env["STORE_KEY"];
const opt:any=apikey?{apikey}:{};
// $.get implementation using async/await
async function $get(data = {}) {
    const url=hashurl;
    const queryString = new URLSearchParams({...opt,...data}).toString();
    const fetchUrl = queryString ? `${url}?${queryString}` : url;
    const response = await fetch(fetchUrl, {
        method: 'GET',
    });
    if (!response.ok) {
        await showResponseBody(response);
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
}
async function showResponseBody(response:Response){
    console.log(await response.text());
}
// $.post implementation using async/await
async function $post(data = {}) {
    const url=hashurl;
    const queryString = new URLSearchParams({...opt,...data}).toString();
    //console.log("post",queryString);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded', // Specify the content type
        },
        body: queryString,// JSON.stringify({...opt, ...data}),
    });
    if (!response.ok) {
        await showResponseBody(response);
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
}
  
export async function put(data:NoIdData) { 
    let r=await $post({
        data:JSON.stringify(data)
    }) as PostResponse;
    return r.id;
}
export async function get(id:string):Promise<Data> {
    return await $get({id}) as Data;
}
export async function init(data={}) {
    const r:any=await $post({
        key:"new",
        data:JSON.stringify(data),
    });
    console.log("init",r);
    return await checkout(r.key);
}
export type Checkout={
    branch:string,
    data:Data,
    commit(data:NoIdData):Promise<Checkout>;
};
export async function checkout(branch:string, _data?:Data):Promise<Checkout> {
    /*let data;
    if(typeof _data==="object") data=_data;
    else if(typeof _data==="string") data={__id__:_data};
    else data=await $get({key:branch}) as Data;
    let head=data.__id__;*/
    const data=_data || await $get({key:branch}) as Data;
    const head=data.__id__;
    return {
        data,
        branch,
        async commit(data:Data) {
            data.__prev__=head;
            let r:any=await $post({
                key:branch,
                data:JSON.stringify(data),
            });
            data.__id__=r.id;
            return checkout(branch, data);
        }
    };
}