<?php
require_once(__DIR__."/config/config.php");
//print_r($_POST["data"]);
try {
    if (param("apikey",null)) allowOrigin(param("apikey"));
    if (isset($_POST["data"])) put();
    else if (isset($_GET["clean"])) clean();
    else if (isset($_GET["chain"])) chain();
    else get();
} catch (Exception $e) {
    http_response_code(500);
    $e->data["trace"]=$e->getTraceAsString();//$lines;
    //$e->data["params"]=get_and_post_params();
    header("Content-type: text/json; charset=utf8");
    print(json_encode($e->data));
}
function allowOrigin($apikey) {
    header("Access-Control-Allow-Origin: ".API_KEYS[$apikey]);
}
function error($message) {
    if (is_string($message)) {
        $data=["status"=>"Error","message"=>$message];
    } else {
        $data=$message;
        $message=$data["message"];
    }
    $e=new Exception($message);
    $e->data=$data;
    return $e;
}
function put() {
    if (strlen($_POST["data"])>MAX_DATA_SIZE) {
        throw error("Too much data");
    }
    $key=null;
    if (isset($_POST["key"])) {
        $key=$_POST["key"];
        if ($key=="new") {
            $key=kvs_new();
        }
        $id=kvs_put($key,$_POST["data"]);
    } else {
        $id=data_put($_POST["data"]);
    }
    header("Content-type: text/json; charset=utf8");
    print(json_encode(["status"=>"OK","id"=>$id,"key"=>$key]));
}
function get() {
    if (isset($_GET["key"])) {
        $id=kvs_get($_GET["key"])->head;
    } else {
        $id=param("id");
    }
    $data=data_get($id);
    header("Content-type: text/json; charset=utf8");
    print(json_encode($data));
}
function chain() {  
    $id=param("chain");
    $data=data_get($id);
    $res=[];
    for ($i=0;$i<32;$i++) {
        $res[]=$data->__id__;
        if (!isset($data->__prev__)) break;
        $data=data_get($data->__prev__);
    }
    header("Content-type: text/json; charset=utf8");
    print(json_encode($res));
}
function data_file($id){
    return DATA."/$id";
}
function data_get($id) {
    $file=data_file($id);
    if (!file_exists($file)) {
        throw error("$id not found");
    }
    $str=file_get_contents($file);
    if (defined("TOUCH_ON_GET")) touch($file);
    $data=json_decode($str);
    $data->__id__=$id;
    return $data;
} 
function data_put($data){
    if (is_string($data)) {
        $data=json_decode($data);
    }
    if (isset($data->__id__)) unset($data->__id__);
    $data=json_encode($data);
    $id=makeHash($data);
    $file=data_file($id);
    $fp=fopen($file,"w");
    fwrite($fp,$data);
    fclose($fp);    
    return $id;
}
function makeHash($data) {
    if (!is_string($data)) {
        $data=json_encode($data);
    }
    return hash('sha256', $data);
}
function kvs_validateKey($key) {
    if (!preg_match("/^[\\/\\-\\w]+$/",$key)){
        throw error("Invalid key $key ");
    }
}
function kvs_file($key){
    kvs_validateKey($key);
    return HASH_BRANCH."/$key";
}
function kvs_exists($key) {
    return file_exists(kvs_file($key));
}
function kvs_get($key) {
    $c=file_get_contents(kvs_file($key));
    return json_decode($c);
}
function kvs_new() {
    do{
        $key="B_".makeHash(microtime().rand());
    } while (kvs_exists($key));
    $k=new stdClass;
    $k->head=null;
    file_put_contents(kvs_file($key), json_encode($k));
    return $key;
}
function kvs_put($key, $value, $config=null) {
    if (is_string($value)) {
        $value=json_decode($value);
    }
    if (kvs_exists($key)) {
        $k=kvs_get($key);
        $ph=$k->head;
        if ($ph===null) {
            // OK
        } else if (!isset($value->__prev__)) {
            throw error(["status"=>"prev_not_set","message"=>"prev is not set"]);
        } else if ($value->__prev__!==$ph) {
            throw error(["status"=>"prev_not_match","__prev__"=>$value->__prev__]);
        }    
    } else {
        throw error(["status"=>"key_not_found","key"=>$key]);
    }
    $id=data_put($value);
    $k->head=$id;
    file_put_contents(kvs_file($key), json_encode($k));
    return $id;
}
function clean() {
    header("Content-type: text/plain");
    $ent=[];
    $all=0;
    foreach (glob(DATA."/*") as $d) {
        $t=time()-filemtime($d);
        $s=filesize($d);
        $e=$t;//*$s;
        //print "$d\t$e\t$t\t$s\n";
        $ent[]=[$d, $e, $t, $s];
        $all+=$s;
    }   
    if ($all<MAX_ALL_DATA_SIZE){
        print("Nothing cleaned");
        return;
    }
    usort($ent, function ($a,$b) {
        return $b[1]-$a[1];
    });
    $count=0;
    foreach ($ent as $_e) {
        $d=$_e[0];
        $e=$_e[1];
        $t=$_e[2];
        $s=$_e[3];
        if ($t<MIN_RETAIN_DURATION) continue;
        if (isset($_GET["dry"])) {
            print "will archive: inactive_time=$t, size=$s, all_size=$all\n";
        } else if(defined("ARCHIVE")) {
            moveFileToFolder($d, ARCHIVE);
        } else {
            unlink($d);
        }
        $count++;
        $all-=$s;
        if ($all<MAX_ALL_DATA_SIZE) break;
    }
    if ($count==0) print("Nothing cleaned.");
    else if (!isset($_GET["dry"])) print ("File(s) cleaned.");
}
function moveFileToFolder($fileName, $folderPath) {
    $oldFilePath = $fileName;
    $newFilePath = rtrim($folderPath, '/') . '/' . basename($fileName);
    return rename($oldFilePath, $newFilePath);
}
function param() {
    $a=func_get_args();
    $key=$a[0];
    if (isset($_POST[$key])) return $_POST[$key];
    if (isset($_GET[$key])) return $_GET[$key];
    if (count($a)===1) throw error(["status"=>"parameter_required","message"=>"parameter required: $key","key"=>$key]);
    return $a[1];
}
function get_and_post_params() {
    return $_REQUEST;//["get"=>$_GET,"post"=>$_POST]; 
}