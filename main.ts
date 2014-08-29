
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
var Gray = Ansi.Gray
var proxify = Recorder.proxifyWithLogger


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





function howMany(f, a, n: number = 5, max: number[] = [4000, 0]) {
    var nit = []
    var success = 0
    for (var i = 0; i < n; i++) {
        Gray("Iteration " + (i+1) + " of " + n + "...")
        var res = Search.search(f, a, {
            iterations: max[0],
            cleanupIterations: max[1],
            debug: 0,
        })
        if (res.score === 0) {
            success += 1
            nit.push(res.iterations)
            Gray("  successful in " + res.iterations + " iterations")
        } else {
            Gray("  no success in " + res.iterations + " iterations")
        }
        Gray(Util.indent(res.getStats()))
    }

    print("Tried " + n + " searches, with " + success + " successful ones.")
    print("Average number of iterations (for sucessful ones): " + (Util.sum(nit)/success).toFixed(1) +
        " (max: " + max[0] + "/" + max[1] + ")")
}

function search(f, a) {
    var config = new Search.SearchConfig({
        iterations: 5000,
        cleanupIterations: 700,
        debug: 1,
    })
    Gray("Configuration: " + config.toString())
    var res = Search.search(f, a, config)
    Gray("Found in " + res.iterations + " iterations:")
    Gray(Util.indent(res.getStats()))
    if (res.score > 0) {
        Ansi.Red("  Score: " + res.score)
    } else {
        Gray("  Score: " + res.score)
    }
    print(res.result.toString())
}


var fs:any = [
    [ // 0
        (obj1, obj2, str, int) => {
            obj1.a = obj2
            obj2[str] = obj2.g
            obj2[str] = "b"
            obj1.f2 = obj2.f
            return int
        },
        [{}, {g: "a", f: {}}, "a", 0]
    ],
    [ // 1
        (arr) => arr.pop(),
        [['a', 'b', 'c']]
    ],
    [ // 2
        (arr, v) => arr.push(v),
        [['a', 'b', 'c'], 'd']
    ],
    [ // 3
        (arr, i) => arr[i],
        [['a', 'b', 'c'], 2]
    ],
    [ // 4
        (arr, i) => {
            if (i) {
                return arr
            } else {
                return arr[arr.length-1]
            }
        },
        [['a', 'b', 'c'], 2]
    ],
    [ // 5
        (f, i) => f(i),
        [(x) => x, 2],
        [(x) => 2*x, 2]
    ],
    [ // 6
        (setX, o, x, v) => setX(o, x, v),
        [(o, x, v) => o[x] = v, {}, 0, 0],
        [(o, x, v) => undefined, {}, 0, 0],
    ],
    [ // 7
        () => undefined,
        []
    ],
    [ // 8
        (a) => a.shift(),
        [[1,2,3]]
    ],
]


var i = Util.argv(3)
var f = fs[i][0]
var a = fs[i].slice(1)


search(f, a)
//howMany(f, a, 20, [1500, 0])

/*
var ff = f
var aa = a
var gen = InputGen.generateInputs(ff, aa)
Util.logall(gen)
*/
/*
function loop(o, b) {
    for (var f in o) {
        o[f]++
        if (b) break
    }
}
function loop2(o) {
    for (var i = 0; i < o.length; i++) {
        o[i]++
    }
}
loop(proxify({a: 0, b: 2, c: 3}), false)
line()
loop(proxify({a: 0, b: 2, c: 3}), true)
line()
loop(proxify([1, 2, 3]), false)
line()
loop2(proxify([1, 2, 3]))
*/

/*
var a1 = proxify([1, 2, 3], "a")
var a2 = proxify([3, 4], "b")
var pred = proxify((n) => n < 2, "f")

print("a1.every(pred)")
a1.every(pred)
line()
print("a1.concat(a2)")
a1.concat(a2)
line()
print("a1.shift()")
a1.shift()
line()
print("a1.join(.)")
a1.join(".")
line()
*/

