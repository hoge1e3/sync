# @hoge1e3/psync
File Synchronization with minimum conflict check, login-free.

# Preparation

- Put store.php in https://github.com/hoge1e3/sync to your Web Server. 
- Configure config/config.php
- Set Environment Variable STORE_URL as the URL of store.php

# Commands 

`npx psync init`
 - initialize current folder.  
 - `<branch-id>` is auto-generated
 - NOTE: Anyone who knows `<branch-id>` can synchronize(write) to this branch.

`npx psync branch`
 - Folder must be initialized by `init` or `clone` 
 - Shows `<branch-id>` of current folder. 

`npx psync clone <branch-id>`
 - Clones branch of `<branch-id>` into current folder.
 - Current folder must be empty.

`npx psync`
 - Folder must be initialized by `init` or `clone` 
 - Synchronizes current folder.
 - If there are conflicted files, they will saved in same folder with diferrent name.

`npx fork`
 - Folder must be initialized by `init` or `clone` 
 - Creates new branch. `<branch-id>` will be re-generated. Further synchronization uses the new branch.