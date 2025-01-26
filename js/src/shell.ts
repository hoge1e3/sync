import * as path from 'path';
import { SFile, FileSystemFactory } from '@hoge1e3/sfile';
export class Shell {
    constructor(public cwd: string, public FS:FileSystemFactory){}
    resolve(_path: string): SFile {
        return this.FS.get(path.join(this.cwd, _path));
    }
    echo(msg: string) {
        console.log(msg);
    }
}