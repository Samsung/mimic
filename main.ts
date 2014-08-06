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
var log = Util.log


function run(f, args) {
    print("")
    Util.line2()
    var state = Recorder.record(f, args)
    Util.line()
    print(ansi.green(state.toString()))
}


// --------------------------

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



function f(o, a, b) {
    o.f = a
    return b
}

run(f, [{}, "a", "a"])
run(f, [{}, "a", "b"])
run(f, [{}, "b", "a"])



var s = Recorder.record(f, [{}, "a", "a"])
var candidates = Recorder.generateCandidates(s);
print(candidates.join("\n\n"))
