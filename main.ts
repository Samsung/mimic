/// <reference path="util/assert.d.ts" />

// activate ES6 proxy proposal
import harmonyrefl = require('harmony-reflect');
harmonyrefl;
declare var Proxy: (target: any, handler: any) => any;

import Util = require('./util/Util')
import Data = require('./Data')
import Recorder = require('./Recorder')
import InputGenerator = require('./InputGenerator')
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

function infer(f, args) {
    var status = (s) => print(ansi.green(s))

    status("the function to be processed is:")
    print(f.toString())
    status("initial set of arguments")
    log(args, false)

    status("recording an initial trace: ")
    var s = Recorder.record(f, args)
    print(s.trace)

    var candidates = Recorder.generateCandidates(s);
    status("generated " + candidates.length + " candidate implementations based on this trace.")

    var inputs = InputGenerator.generateInputs(s, args)
    status("generated " + inputs.length + " inputs based on this trace.")
    inputs.forEach((a) => {
        log(a, false)
    })

    status("running validation for candidates. remaining candidates:")
    Util.printnln(candidates.length + " ")
    for (var i = 0; i < inputs.length; i++) {
        candidates = candidates.filter((c) => {
            return Verifier.isModel(c, f, inputs[i])
        })
        Util.printnln(candidates.length + " ")
    }
    print("")

    if (candidates.length === 0) {
        status("no candidate left :(")
    } else if (candidates.length === 1) {
        status("one candidate program left:")
        print(candidates[0])
    } else {
        status(candidates.length + " many candidates left:")
        print(candidates.join("\n\n"))
    }
}

function f(obj1, obj2, str, int) {
    obj1.a = obj2
    obj2[str] = obj2.g
    obj1.f2 = obj2.f
    return 0
}
var args = [{}, {g: "a", f: {}}, "a", 0]

infer(f, args)