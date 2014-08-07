/// <reference path="util/assert.d.ts" />

// activate ES6 proxy proposal
import harmonyrefl = require('harmony-reflect');
harmonyrefl;
declare var Proxy: (target: any, handler: any) => any;

import Util = require('./util/Util')
import Data = require('./Data')
import Recorder = require('./Recorder')
import Verifier = require('./Verifier')
import ansi = require('./util/Ansicolors')

var print = Util.print
var log = Util.log


function run(f, args) {

    print("")
    var state = Recorder.record(f, args)
    Util.line()
    print(ansi.green(state.toString()))
    Util.line2()
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


/*
function f(o, a, b) {
    o.f = a
    return b
}
var s = Recorder.record(f, [{}, "a", "a"])
var candidates = Recorder.generateCandidates(s);
log(candidates.length)
candidates = candidates.filter((c) => {
    return Verifier.isModel(c, f, [{}, "a", "a"])
})
log(candidates.length)
candidates = candidates.filter((c) => {
    return Verifier.isModel(c, f, [{}, "a", "b"])
})
log(candidates.length)
candidates = candidates.filter((c) => {
    return Verifier.isModel(c, f, [{}, "b", "a"])
})
log(candidates.length)

print(candidates.join("\n\n"))
*/

function f(o, m, a) {
    o.f = m
    m.g = a
    o.f2 = m.f
    return 1
}
var s = Recorder.record(f, [{}, {g: "a", f: {}}, "a"])
print(s)
var candidates = Recorder.generateCandidates(s);
log(candidates.length)
candidates = candidates.filter((c) => {
    return Verifier.isModel(c, f, [{}, {g: "a", f: {}}, "a"])
})
log(candidates.length)
candidates = candidates.filter((c) => {
    return Verifier.isModel(c, f, [{}, {g: "a", f: {}}, "b"])
})
log(candidates.length)
candidates = candidates.filter((c) => {
    return Verifier.isModel(c, f, [{}, {g: "b", f: {}}, "a"])
})
log(candidates.length)

print(candidates.join("\n\n"))
