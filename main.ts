
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
import Compile = require('./Compile')
import ProgramGen = require('./ProgramGen')
import Search = require('./Search')
import List = require('./LinkedList')
import StructureInference = require('./StructureInference')


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
        "random heap modifications",
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
        "Array.prototype.pop",
        (arr) => arr.pop(),
        [['a', 'b', 'c']]
    ],
    [ // 2
        "Array.prototype.push",
        (arr, v) => arr.push(v),
        [['a', 'b', 'c'], 'd']
    ],
    [ // 3
        "array index",
        (arr, i) => arr[i],
        [['a', 'b', 'c'], 2]
    ],
    [ // 4
        "array function with conditional",
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
        "simple higher order function",
        (f, i) => f(i),
        [(x) => x, 2],
        [(x) => 2*x, 2]
    ],
    [ // 6
        "heap modifing higher order function",
        (setX, o, x, v) => setX(o, x, v),
        [(o, x, v) => o[x] = v, {}, 0, 0],
        [(o, x, v) => undefined, {}, 0, 0],
    ],
    [ // 7
        "empty function",
        () => undefined,
        []
    ],
    [ // 8
        "Array.prototype.shift",
        (a) => a.shift(),
        [[1,2,3,4,5]]
    ],
]


var i = Util.argv(3)
var name = fs[i][0]
var f = fs[i][1]
var a = fs[i].slice(2)
var a0 = a[0]

//howMany(f, a, 20, [1500, 0])
search(f, a)




/*
var inputs = InputGen.generateInputs(f, a)
var traces = inputs.map((i) => Recorder.record(f, i))
var loops = StructureInference.infer(traces)
var loop = loops[0]
var trace: Data.Trace = traces[0]
var p0 = Compile.compileTrace(trace)
print(traces[0])
line()
print(loops.join("\n"))
line()
print(Compile.compileTrace(trace, loop))
*/

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

/*
proxify([1, 2, 3, 5, 6]).shift()
line()
proxify([1, 2, 3, 5]).shift()
line()
proxify([]).shift()
*/




// trace recording
/*
var gl
function init() {
    gl = {
        a: Recorder.proxifyWithLogger([1,2,3,4,5,6], "a"),
        b: Recorder.proxifyWithLogger(['a','b','c','d'], "b"),
        c: Recorder.proxifyWithLogger([6,4,2,1,5,3], "a"),
        f: (x) => x % 2 == 0
    }
}


line()
print("Configuration:")
print("  a = [1,2,3,4,5,6]")
print("  b = ['a','b','c','d']")
print("  c = [6,4,2,1,5,3]")
print("  f = (x) => x % 2 == 0")
line()
print("a.shift()")
init()
gl.a.shift()
line()
print("a.unshift('a')")
init()
gl.a.unshift('a')
line()
print("a.concat(b)")
init()
gl.a.concat(gl.b)
line()
print("a.every(f)")
init()
gl.a.every(gl.f)
line()
print("a.filter(f)")
init()
gl.a.filter(gl.f)
line()
print("a.some(f)")
init()
gl.a.some(gl.f)
line()
print("a.forEach(f)")
init()
gl.a.forEach(gl.f)
line()
print("a.indexOf(4)")
init()
gl.a.indexOf(4)
line()
print("a.indexOf(7)")
init()
gl.a.indexOf(7)
line()
print("a.join(',')")
init()
gl.a.join(',')
line()
print("a.lastIndexOf(4)")
init()
gl.a.lastIndexOf(4)
line()
print("a.map(f)")
init()
gl.a.map(gl.f)
line()
print("a.reverse()")
init()
gl.a.reverse()
line()
print("c.sort()")
init()
//gl.c.sort()
print("actually fails with an illegal access violation")
line()





var gl2
function init2() {
    gl2 = {
        l: Recorder.proxifyWithLogger(List.LinkedList.make([1,2,3,4,5]), "l"),
    }
}

line()
print("Configuration:")
print("  l = <1,2,3,4,5,6>")
print("Methods ending in R are recursive, everything else is iterative")
line()
init2()
print("l.itemAt(3)")
gl2.l.itemAt(3)
line()
init2()
print("l.getSize()")
gl2.l.getSize()
line()
init2()
print("l.getLast()")
gl2.l.getLast()
line()
init2()
print("l.addFront(0)")
gl2.l.addFront(0)
line()
init2()
print("l.addBack(0)")
gl2.l.addBack(0)
line()
init2()
print("l.removeFirst()")
gl2.l.removeFirst()
line()

init2()
print("l.itemAtR(3)")
gl2.l.itemAtR(3)
line()


*/
