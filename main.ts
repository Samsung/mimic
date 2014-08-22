
/**
 * Main entry point.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

"use strict";

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



function howMany(f, a, n: number = 5, max: number[] = [4000, 0]) {
    var nit = []
    var success = 0
    for (var i = 0; i < n; i++) {
        Ansi.Gray("Iteration " + (i+1) + " of " + n + "...")
        var res = Search.search(f, a, {
            iterations: max[0],
            cleanupIterations: max[1],
            debug: 1,
        })
        if (res.score === 0) {
            success += 1
            nit.push(res.iterations)
            Ansi.Gray("  successful in " + res.iterations + " iterations")
        } else {
            Ansi.Gray("  no success in " + res.iterations + " iterations")
        }
        Ansi.Gray(res.result.toString())
    }

    print("Tried " + n + " searches, with " + success + " successful ones.")
    print("Average number of iterations (for sucessful ones): " + (Util.sum(nit)/success).toFixed(1) +
        " (max: " + max[0] + "/" + max[1] + ")")
}


howMany(f2, args2, 5, [7000, 0])


/*
var res = Search.search(f2, args2)
print("Found in " + res.iterations + " iterations:")
print(res.result.toString())
*/

/*
var ff = f2
var aa = args2
var state = Recorder.record(ff, aa)
var gen = InputGen.generateInputs(state, aa)

log(gen)
*/