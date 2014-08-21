/// <reference path="util/assert.d.ts" />

"use strict";

// activate ES6 proxy proposal
import harmonyrefl = require('harmony-reflect');
harmonyrefl;
declare var Proxy: (target: any, handler: any) => any;


import _difflib = require('./util/difflib')
var difflib = _difflib.difflib

import Ansi = require('./util/Ansicolors')
import Util = require('./util/Util')
import Random = require('./util/Random')
import Data = require('./Data')
import Metric = require('./Metric')
import InputGen = require('./InputGen')
import Recorder = require('./Recorder')
import ProgramGen = require('./ProgramGen')
import Search = require('./Search')

var print = Util.print
var log = Util.log
var line = Util.line


// --------------------------
/*
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

function f2(o) {
    o.f = o.g
    o.h = o.g
    return o.h
}

run(pop, [["a", "a"]])
run(push, [["a"], "b"])
run(defineProp, [{}, "field", 42])
run(id, ["a", "a"])
run(f2, [{g: {}}])
*/

function f(obj1, obj2, str, int) {
    obj1.a = obj2
    obj2[str] = obj2.g
    obj2[str] = "b"
    obj1.f2 = obj2.f
    return int
}
var args = [{}, {g: "a", f: {}}, "a", 0]

function f2(arr) {
    return arr.pop()
}
var args2 = [['a', 'b', 'c']]

function f3(arr, v) {
    return arr.push(v)
}
var args3 = [['a', 'b', 'c'], 'd']

Search.search(f3, args3)

