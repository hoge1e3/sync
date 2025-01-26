<?php
//directory for store data, that contains data, branch info.
define("STORE","./store");// This is not recommended for production use. Place it outside the document root.
//directory for store data, whose name is a hash of content.
define("DATA",STORE."/data");
//directory for store branch info, whose name is the branch name. 
define("HASH_BRANCH",STORE."/branch");

// max size for one data
define("MAX_DATA_SIZE",5*1000*1000);

/* Data clean up: 
 When access with parmeter clean=1,
 If the size of all data in the DATA directory exceeds MAX_ALL_DATA_SIZE, 
 Old files are deleted. 
 However, files that have been inactive for less than MIN_RETAIN_DURATION are not deleted.
 */
// max size for all data in DATA directory.
define("MAX_ALL_DATA_SIZE", 100*1000*1000);
// minimum time(in second) a data file is retained from the point of last access. 
define("MIN_RETAIN_DURATION", 30*86400);
// If ARCHIVE is set, the cleaned data is moved to there. 
// If ARCHIVE is not set, it is completely deleted. 
define("ARCHIVE", STORE."/archive");


// API_KEYS: allows access from other origin, 
//   set a key in the entries as GET/POST parameter 'apikey' on request
//   then allows access from origin of corresponding value.
define("API_KEYS",[
    // from example.com, access with the parameter apikey=samplekey
    "samplekey"=>"https://example.com"
]);