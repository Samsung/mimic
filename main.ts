/// <reference path="util/assert.d.ts" />

// activate ES6 proxy proposal
import harmonyrefl = require('harmony-reflect');
harmonyrefl;
declare var Proxy: (target: any, handler: any) => any;

import Util = require('./util/Util')
import Data = require('./Data')
import Recorder = require('./Recorder')
import ansi = require('./util/Ansicolors')

var print = Util.print

function push(a, b) {
    return a.push(b);
}

function pop(a) {
    return a.pop();
}

function defineProp(o, f, v) {
    Object.defineProperty(o, f, {value : v});
    return o[f]
}

function id(a, b) {
    return b
}

print(Recorder.record(pop, [["a", "a"]]))
print(Recorder.record(push, [["a"], "b"]))
print(Recorder.record(defineProp, [{}, "field", 42]))
print(Recorder.record(id, ["a", "a"]))


var a = [1,1,1,1];

a.push = function (b) { return 1 }
print(a.push(1))
print(a)
