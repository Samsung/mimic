# `Dockerfile`

Build and run as

```sh
$ ./build/docker-build.sh
```

Output:

```sh
~/dev/github/mimic $ ./build/docker-build.sh 
++ git rev-parse --short HEAD
+ GIT_REV=4039ed0
+ IMAGE_TAG=mimic:4039ed0
+ docker build -t mimic:4039ed0 .
Sending build context to Docker daemon 2.685 MB
Step 1 : FROM ubuntu:trusty
 ---> aae2b63c4946
Step 2 : MAINTAINER William Blankenship <wblankenship@nodesource.com>
 ---> Using cache
 ---> 0eb9f94a7193
Step 3 : RUN apt-get update &&     apt-get install -y --force-yes       apt-transport-https       build-essential       curl       git       lsb-release       python-all       make
 ---> Using cache
 ---> 5d790bb23d87
Step 4 : RUN curl -sL https://deb.nodesource.com/setup | bash -
 ---> Using cache
 ---> ada2d8b867da
Step 5 : RUN apt-get update
 ---> Using cache
 ---> 812e626bba87
Step 6 : RUN apt-get install nodejs -y --force-yes
 ---> Using cache
 ---> 01012257fbe4
Step 7 : RUN npm install -g node-gyp grunt-cli  && npm cache clear
 ---> Using cache
 ---> be0ff3441098
Step 8 : RUN node-gyp configure || echo ""
 ---> Using cache
 ---> 28a866a6ebee
Step 9 : ADD . /tmp/mimic
 ---> 9dcd5b351657
Removing intermediate container ecf8bf1f78f2
Step 10 : RUN cd /tmp/mimic && npm install && make && make test
 ---> Running in 44ec00fde6aa
npm WARN package.json mimic@1.0.0 No repository field.
npm WARN package.json mimic@1.0.0 No license field.
npm WARN deprecated minimatch@0.2.14: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue
npm WARN deprecated graceful-fs@1.2.3: graceful-fs v3.0.0 and before will fail on node releases >= v7.0. Please update to graceful-fs@^4.0.0 as soon as possible. Use 'npm ls graceful-fs' to find it in the tree.
npm WARN deprecated minimatch@0.3.0: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue
npm WARN deprecated jade@0.26.3: Jade has been renamed to pug, please install the latest version of pug instead of jade
npm WARN deprecated graceful-fs@2.0.3: graceful-fs v3.0.0 and before will fail on node releases >= v7.0. Please update to graceful-fs@^4.0.0 as soon as possible. Use 'npm ls graceful-fs' to find it in the tree.
npm WARN optional dep failed, continuing fsevents@0.3.8
assert@1.4.1 node_modules/assert

grunt-simple-mocha@0.4.1 node_modules/grunt-simple-mocha

harmony-reflect@1.5.0 node_modules/harmony-reflect

minimist@1.2.0 node_modules/minimist

util@0.10.3 node_modules/util
└── inherits@2.0.1

random-js@1.0.8 node_modules/random-js

mocha@1.21.5 node_modules/mocha
├── escape-string-regexp@1.0.2
├── diff@1.0.8
├── growl@1.8.1
├── commander@2.3.0
├── debug@2.0.0 (ms@0.6.2)
├── mkdirp@0.5.0 (minimist@0.0.8)
├── glob@3.2.3 (inherits@2.0.3, graceful-fs@2.0.3, minimatch@0.2.14)
└── jade@0.26.3 (commander@0.6.1, mkdirp@0.3.0)

grunt-cli@0.1.13 node_modules/grunt-cli
├── resolve@0.3.1
├── nopt@1.0.10 (abbrev@1.0.9)
└── findup-sync@0.1.3 (glob@3.2.11, lodash@2.4.2)

grunt@0.4.5 node_modules/grunt
├── dateformat@1.0.2-1.2.3
├── which@1.0.9
├── getobject@0.1.0
├── eventemitter2@0.4.14
├── rimraf@2.2.8
├── colors@0.6.2
├── async@0.1.22
├── grunt-legacy-util@0.2.0
├── hooker@0.2.3
├── nopt@1.0.10 (abbrev@1.0.9)
├── exit@0.1.2
├── lodash@0.9.2
├── minimatch@0.2.14 (sigmund@1.0.1, lru-cache@2.7.3)
├── glob@3.1.21 (inherits@1.0.2, graceful-fs@1.2.3)
├── coffee-script@1.3.3
├── underscore.string@2.2.1
├── iconv-lite@0.2.11
├── findup-sync@0.1.3 (glob@3.2.11, lodash@2.4.2)
├── grunt-legacy-log@0.1.3 (grunt-legacy-log-utils@0.1.1, underscore.string@2.3.3, lodash@2.4.2)
└── js-yaml@2.0.5 (argparse@0.1.16, esprima@1.0.4)

cli-color@0.3.3 node_modules/cli-color
├── d@0.1.1
├── timers-ext@0.1.0 (next-tick@0.2.2)
├── memoizee@0.3.10 (next-tick@0.2.2, lru-queue@0.1.0, event-emitter@0.3.4, es6-weak-map@0.1.4)
└── es5-ext@0.10.12 (es6-symbol@3.1.0, es6-iterator@2.0.0)

typescript@1.4.1 node_modules/typescript

grunt-ts@4.2.0 node_modules/grunt-ts
├── rimraf@2.2.6
├── ncp@0.5.1
├── underscore@1.5.1
├── es6-promise@0.1.2
├── underscore.string@2.3.3
├── lodash@2.4.1
├── chokidar@1.0.6 (arrify@1.0.1, is-glob@1.1.3, path-is-absolute@1.0.1, async-each@0.1.6, is-binary-path@1.0.1, glob-parent@1.3.0, readdirp@1.4.0, anymatch@1.3.0)
├── csproj2ts@0.0.2 (es6-promise@2.3.0, lodash@3.10.1, xml2js@0.4.17)
└── typescript@1.5.3
grunt
Running "ts:build" (ts) task
Compiling...
### Fast Compile >>src/Compile.ts
### Fast Compile >>src/Data.ts
### Fast Compile >>src/InputGen.ts
### Fast Compile >>src/LinkedList.ts
### Fast Compile >>src/Metric.ts
### Fast Compile >>src/ProgramGen.ts
### Fast Compile >>src/Recorder.ts
### Fast Compile >>src/Search.ts
### Fast Compile >>src/StructureInference.ts
### Fast Compile >>src/main.ts
### Fast Compile >>src/run.ts
### Fast Compile >>src/test/Test.ts
### Fast Compile >>src/util/Ansicolors.ts
### Fast Compile >>src/util/Random.ts
### Fast Compile >>src/util/Util.ts
### Fast Compile >>src/util/difflib.ts
Using tsc v1.4.1



TypeScript compilation complete: 1.57s for 17 typescript files

Done, without errors.
grunt
Running "ts:build" (ts) task
Compiling...
Cleared fast compile cache for target: build
### Fast Compile >>src/Compile.ts
### Fast Compile >>src/Data.ts
### Fast Compile >>src/InputGen.ts
### Fast Compile >>src/LinkedList.ts
### Fast Compile >>src/Metric.ts
### Fast Compile >>src/ProgramGen.ts
### Fast Compile >>src/Recorder.ts
### Fast Compile >>src/Search.ts
### Fast Compile >>src/StructureInference.ts
### Fast Compile >>src/main.ts
### Fast Compile >>src/run.ts
### Fast Compile >>src/test/Test.ts
### Fast Compile >>src/util/Ansicolors.ts
### Fast Compile >>src/util/Random.ts
### Fast Compile >>src/util/Util.ts
### Fast Compile >>src/util/difflib.ts
Using tsc v1.4.1



TypeScript compilation complete: 1.62s for 17 typescript files

Done, without errors.
npm test

> mimic@1.0.0 test /tmp/mimic
> ./scripts/runtests.sh



  Recorder
    ✓ should record for random heap modifications 
    ✓ should record for Array.prototype.pop 
    ✓ should record for Array.prototype.push 
    ✓ should record for array index 
    ✓ should record for array function with conditional 
    ✓ should record for simple higher order function 
    ✓ should record for heap modifing higher order function 
    ✓ should record for empty function 
    ✓ should record for Array.prototype.shift 
    ✓ should record for Array.prototype.every 
    ✓ should record for Array.prototype.some 
    ✓ should record for Array.prototype.forEach 

  InputGen.categorize
    ✓ number of categories for random heap modifications (88ms)
    ✓ number of categories for Array.prototype.pop 
    ✓ number of categories for Array.prototype.push 
    ✓ number of categories for array index 
    ✓ number of categories for array function with conditional 
    ✓ number of categories for simple higher order function 
    ✓ number of categories for heap modifing higher order function 
    ✓ number of categories for empty function 
    ✓ number of categories for Array.prototype.shift (763ms)
    ✓ number of categories for Array.prototype.every (4513ms)
    ✓ number of categories for Array.prototype.some (68ms)
    ✓ number of categories for Array.prototype.forEach (92ms)

  Compile
    ✓ should compile for random heap modifications 
    ✓ should compile for Array.prototype.pop 
    ✓ should compile for Array.prototype.push 
    ✓ should compile for array index 
    ✓ should compile for array function with conditional 
    ✓ should compile for simple higher order function 
    ✓ should compile for heap modifing higher order function 
    ✓ should compile for empty function 
    ✓ should compile for Array.prototype.shift 
    ✓ should compile for Array.prototype.every 
    ✓ should compile for Array.prototype.some 
    ✓ should compile for Array.prototype.forEach 

  Search
    ✓ search should succeed for random heap modifications 
    ✓ search should succeed for Array.prototype.pop (8124ms)
    ✓ search should succeed for Array.prototype.push (1534ms)
    ✓ search should succeed for array index (75ms)
    ✓ search should succeed for array function with conditional (574ms)
    ✓ search should succeed for simple higher order function 
    ✓ search should succeed for heap modifing higher order function (233ms)
    ✓ search should succeed for empty function 

  Recorder
    ✓ should run out of budget 
    ✓ should run out of budget 

  Search.combinePrograms
    ✓ should find common statements 
    ✓ should find common statements 

  Search.combinePrograms2
    ✓ should find common statements 
    ✓ should find common statements 


  50 passing (16s)

 ---> a5c3418b1125
Removing intermediate container 44ec00fde6aa
Step 11 : WORKDIR /tmp/mimic
 ---> Running in b2fcf3925014
 ---> 0dff45c2958e
Removing intermediate container b2fcf3925014
Step 12 : CMD /bin/bash
 ---> Running in c78b49f4355b
 ---> 1a88056a5506
Removing intermediate container c78b49f4355b
Successfully built 1a88056a5506
+ docker run -t -i mimic:4039ed0
root@06c179e99f43:/tmp/mimic# ll
total 108
drwxr-xr-x 13 root root  4096 Dec  4 20:06 ./
drwxrwxrwt  6 root root  4096 Dec  4 20:06 ../
drwxr-xr-x  8 root root  4096 Dec  4 20:06 .git/
-rw-r--r--  1 root root   101 Dec  4 19:37 .gitignore
drwxr-xr-x  3 root root  4096 Dec  4 20:06 .tscache/
-rw-r--r--  1 root root   714 Dec  4 19:52 Dockerfile
-rw-r--r--  1 root root  1168 Dec  4 19:37 Gruntfile.js
-rw-r--r--  1 root root 11358 Dec  4 19:37 LICENSE.txt
-rw-r--r--  1 root root   324 Dec  4 19:37 Makefile
-rw-r--r--  1 root root  4511 Dec  4 19:37 README.md
drwxr-xr-x  4 root root  4096 Dec  4 20:06 bin/
drwxr-xr-x  2 root root  4096 Dec  4 19:58 build/
-rwxr-xr-x  1 root root    33 Dec  4 19:37 mimic*
-rwxr-xr-x  1 root root    62 Dec  4 19:37 mimic-core*
drwxr-xr-x  2 root root  4096 Dec  4 19:37 models/
drwxr-xr-x 15 root root  4096 Dec  4 20:06 node_modules/
-rw-r--r--  1 root root   638 Dec  4 19:37 package.json
-rw-r--r--  1 root root  9224 Dec  4 19:37 replication.md
drwxr-xr-x  2 root root  4096 Dec  4 19:37 scripts/
drwxr-xr-x  4 root root  4096 Dec  4 20:06 src/
drwxr-xr-x  3 root root  4096 Dec  4 19:37 tests/
drwxr-xr-x  2 root root  4096 Dec  4 19:37 ts-decl/
root@06c179e99f43:/tmp/mimic# ./bin/
test/ util/ 
root@06c179e99f43:/tmp/mimic# ./mimic --function "return x" --argnames "x" --arguments "1" "2"
mimic - computing models for opaque code
--------------------------------------------------------------------------------
Configuration:
  Number of threads: 1
--------------------------------------------------------------------------------
Starting phase 1 with a timeout of 8 seconds...
--------------------------------------------------------------------------------
Successfully found a model
  Total time required:    0.33 seconds
  Attempted searches:     1
    Successful:           1
    Timeouts:             0
    Crashes:              0
  Successful search:
    Time:                 0.16 seconds
    Iterations:           1003
    using a loop-free template

Model (also stored in 'result.js'):
function f(arg0) {
  var result = arg0
  return result
}

root@06c179e99f43:/tmp/mimic# 
```