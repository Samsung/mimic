
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
        iterations: 20000,
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
        [['a','b','c','d','e']]
    ],
    [ // 9
        "Array.prototype.every",
        (a, f) => a.every(f),
        [[0,5,2,20,3,23], (e) => e < 10]
    ],
    [ // 10
        "Array.prototype.some",
        (a, f) => a.some(f),
        [[1,2,3], (e) => e < 10],
        [[1,2,3], (e) => e > 10],
    ],
    [ // 11
        "Array.prototype.indexOf",
        (a, e) => a.indexOf(e),
        [[1,2,3], 2],
    ],
    [ // 12
        "Array.prototype.forEach",
        (a, f) => a.forEach(f),
        [[1,2,3], (e) => 0],
    ],
    [ // 13
        "Array.prototype.reduce",
        (a, f, z) => a.reduce(f, z),
        [[1,2,3], (previousValue, currentValue, index, array) => previousValue + currentValue, 0],
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
var inputs = a
var traces = Recorder.all(f, inputs)
var loops = StructureInference.infer(traces)
var categories = InputGen.categorize(inputs, traces, loops[0])

log(categories)*/


/*
function f2(arg0, arg1) {
    var n0 = arg0.length
    for (var i11 = 0; i11 < 3+1; i11 += 1) {
        var n1 = arg0[i11]
        var n2 = arg1.apply(undefined, [ n1, i11, arg0 ])
    }
    return true
}
function f3(arg0, arg1) {
    var n0 = arg0.length
    for (var i11 = 0; i11 < 3+1; i11 += 1) {
        var n1 = arg0[i11]
        var n2 = arg1.apply(undefined, [ n1, 0, arg0 ])
    }
    return true
}

var k = 0
var inputs = InputGen.generateInputs(f, a).filter((i) => i[0].length > 4).filter((i) => k++ < 1)
var ff = (x) => x < 10
//inputs = [
//    [[ 1, 1, 0, 0, 1 ], ff,],
//    [[ 0, 0, 0, 20, 1, 0 ], ff,],
//    [[ 1, 5, 1, 1, 1, 23 ], ff,],
//    [[ 1, 1, 0, 20, 3, 23 ], ff,],
//    [[ 1, 1, 2, 1, 3, 1 ], ff,],
//    [[ 0, 5, 1, 0, 1, 0 ], ff,],
//    [[ 0, 5, 1, 0, 1, 1 ], ff,],
//    [[ 1, 5, 2, 0, 0, 23 ], ff,],
//    [[ 1, 5, 1, 20, 1, 23 ], ff,],
//    [[ 0, 1, 0, 1, 1, 1 ], ff,],
//    [[ 0, 1, 1, 0, 3 ], ff,],
//    [[ 0, 0, 2, 1, 0, 23 ], ff,],
//    [[ 1, 0, 2, 0, 0 ], ff,],
//    [[ 1, 1, 1, 20, 3 ], ff,],
//    [[ 1, 5, 0, 1, 0, 1 ], ff,],
//    [[ 1, 5, 0, 20, 0, 1 ], ff,],
//    [[ 1, 0, 2, 1, 0 ], ff,],
//    [[ 0, 0, 1, 1, 3, 0 ], ff,],
//    [[ 0, 1, 2, 1, 3, 1 ], ff,],
//    [[ 1, 1, 1, 20, 1, 0 ], ff,],
//]
var traces = inputs.map((i) => Recorder.record(f, i))
var t1 = Recorder.record(f, a0)
print(t1)
var t2 = Recorder.record(f2, a0)
print(t2)
var t3 = Recorder.record(f3, a0)
print(t3)
log(inputs)
line()
print(Metric.evaluate2(f2, inputs, traces))
line()
print(Metric.evaluate2(f3, inputs, traces))
*/

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

















/*
 var patch = (function (global) {

 "use strict";
 var has = Object.prototype.hasOwnProperty;
 return function (original, originalRef, patches) {
 global[originalRef] = original; // Maintain a reference to the original constructor as a new property on the global object
 var args = [],
 newRef, // This will be the new patched constructor
 i;

 patches.called = patches.called || originalRef; // If we are not patching static calls just pass them through to the original function

 for (i = 0; i < original.length; i++) { // Match the arity of the original constructor
 args[i] = "a" + i; // Give the arguments a name (native constructors don't care, but user-defined ones will break otherwise)
 }

 if (patches.constructed) { // This string is evaluated to create the patched constructor body in the case that we are patching newed calls
 args.push("'use strict'; return (!!this ? " + patches.constructed + " : " + patches.called + ").apply(null, arguments);");
 } else { // This string is evaluated to create the patched constructor body in the case that we are only patching static calls
 args.push("'use strict'; return (!!this ? new (Function.prototype.bind.apply(" + originalRef + ", [{}].concat([].slice.call(arguments))))() : " + patches.called + ".apply(null, arguments));");
 }

 //newRef = new (Function.prototype.bind.apply(Function, [{}].concat(args)))(); // Create a new function to wrap the patched constructor
 newRef = Function.apply(null, args);
 newRef.prototype = original.prototype; // Keep a reference to the original prototype to ensure instances of the patch appear as instances of the original
 newRef.prototype.constructor = newRef; // Ensure the constructor of patched instances is the patched constructor

 Object.getOwnPropertyNames(original).forEach(function (property) { // Binary any "static" properties of the original constructor to the patched one
 if (!has.call(Function, property)) { // Don't include static properties of Function since the patched constructor will already have them
 newRef[property] = original[property];
 }
 });

 return newRef; // Return the patched constructor
 };

 })(global);

 print(typeof String("abc"))
 print(typeof String(20))

 String = patch(String, "StringOriginal", {
 called: function (arg) {
 return  typeof arg === "number" ? arg : StringOriginal(arg);
 }
 });

 Array = patch(String, "ArrayOriginal", {
 called: function (arg) {
 console.log(2)
 return ArrayOriginal(arg);
 }
 });

 print(typeof String("abc"))
 print(typeof String(20))*/
/*
 var oldArray = Array
 Array = <any>function () {
 print("1")
 return oldArray.apply(this, arguments)
 }
 for (var k in oldArray) {
 print(k)
 }
 for (var k in oldArray.prototype) {
 print(k)
 }*/

//print(Array(1, 2, 3))
//print(new Array(1, 2, 3))
//print([1,2,3]);
/*
 var oldObject = Object
 Object = <any>function () {
 console.log(":")
 return oldObject.apply(this, arguments)
 }
 Object.create = oldObject.create
 Object.keys = oldObject.keys
 Object.getOwnPropertyDescriptor = oldObject.getOwnPropertyDescriptor
 Object.defineProperty = function () {
 //global.console.log("f")
 return oldObject.defineProperty.apply(this, arguments)
 }
 var oldArray = Array
 Array = <any>function () {
 console.log(".")
 return oldArray.apply(this, arguments)
 }
 Array.isArray = oldArray.isArray

 Array = proxify(Array)
 console.log(Array(1,2))
 console.log(new Array(1,2,3))
 console.log([1,2].concat([2,3]))

 console.log(Object())
 console.log(new Object())
 console.log({ a: 1 })
 console.log(Object.create({ b: 2}))
 */