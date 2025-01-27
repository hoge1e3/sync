import { main } from "../js/cmd.js";
process.env["STORE_URL"]="http://localhost/sync/store.php";
import { Shell } from "../js/shell.js";
import { setFS } from "../js/store-file.js";
const FS=await getNodeFS();
setFS(FS);
const shell=new Shell(process.cwd(),FS);
main.call(shell, ...process.argv);