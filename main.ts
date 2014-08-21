/// <reference path="util/assert.d.ts" />

"use strict";

// activate ES6 proxy proposal
import harmonyrefl = require('harmony-reflect');
harmonyrefl;
declare var Proxy: (target: any, handler: any) => any;

import Util = require('./util/Util')
import Random = require('./util/Random')
import Data = require('./Data')
import Recorder = require('./Recorder')
import Metric = require('./Metric')
import InputGenerator = require('./InputGenerator')
import Verifier = require('./Verifier')
import ansi = require('./util/Ansicolors')
import _difflib = require('./util/difflib')
var difflib = _difflib.difflib

var print = Util.print
var log = Util.log
var line = Util.line


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

var dbug_end = false

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

/*
 arguments[0]["a"] = arguments[1]
 arguments[1][arguments[2]] = arguments[1]["g"]
 arguments[1][arguments[2]] = "b"
 n = arguments[1]["f"]
 arguments[0]["f2"] = n
 */

//infer(f, args)


var randInt = Random.randInt
var WeightedPair = Random.WeightedPair
var maybe = Random.maybe
var pick = Random.pick
var randArr = Random.randArr

/*
var p = Recorder.proxifyWithLogger([])
p.pop()
print(Recorder.record((a) => a.pop(), [[]]).trace)
Util.line()
p.push("a")
print(Recorder.record((a) => a.push("a"), [[]]).trace)
Util.line()
p.pop()
print(Recorder.record((a) => a.pop(), [["a"]]).trace)
Util.line()
print(Recorder.record((a) => a.pop(), [["b", "c"]]).trace)
Util.line()

p = Recorder.proxifyWithLogger(["a"])
function pop(a) {
    var l = a.length
    if (l == 0) return undefined
    var r = a[l-1]
    delete a[l-1]
    return r
}
pop(p)

*/


function get_diff(a, b) {
    return new difflib.SequenceMatcher(a, b).get_opcodes()
}



/*function stmtDistance(real: Data.Stmt, candidate: Data.Stmt, ds: VariableMap) {
    Util.assert(real.type === candidate.type)
    var l, r
    switch (real.type) {
        case Data.StmtType.Assign:
            l = <Data.Assign>real
            r = <Data.Assign>candidate
            if (l.lhs.type === Data.ExprType.Var && l.lhs.type === r.lhs.type) {
                if (Verifier.nodeEquiv(l.rhs, r.rhs, ds)) {
                    // record variable equalities
                    ds.set(<Data.Var>l.lhs, <Data.Var>r.lhs)
                }
            }
            return exprDistance(l.lhs, r.lhs, ds)/2 + exprDistance(l.rhs, r.rhs, ds)/2
        case Data.StmtType.Return:
            l = <Data.Return>real
            r = <Data.Return>candidate
            return exprDistance(l.rhs, r.rhs, ds)
        default:
            Util.assert(false, () => "unhandeled stmt distance: " + real)
    }
}*/

/*
function traceDistanceOld(real: Data.Trace, candidate: Data.Trace): number {
    var realSk = real.toSkeleton();
    var diff = get_diff(realSk, candidate.toSkeleton())
    var diffLength = diff.length
    var nonSkeletonDiff = 0
    var nnonSkeletonDiff = 0
    var skeletonDiff = 0
    var distanceState: Map<Data.Var, Data.Var> = new Map<Data.Var, Data.Var>()
    for (var i = 0; i < diffLength; i++) {
        var d = diff[i]
        if (d[0] === 'delete') {
            skeletonDiff += d[2] - d[1]
            skeletonDiff += d[4] - d[3]
            continue
        }
        if (d[0] === 'insert') {
            skeletonDiff += d[2] - d[1]
            skeletonDiff += d[4] - d[3]
            continue
        }
        if (d[0] === 'replace') {
            skeletonDiff += d[2] - d[1]
            skeletonDiff += d[4] - d[3]
            continue
        }
        if (d[0] === 'equal') {
            for (var j = 0; j < d[2]-d[1]; j++) {
                var left = real.getSkeletonIdx(d[1]+j)
                var right = candidate.getSkeletonIdx(d[3]+j)
                var sd = stmtDistance(left, right, distanceState) / DISTANCE_NORM;
                Util.assert(sd >= 0, () => "negative distance for " + left + " vs " + right)
                nonSkeletonDiff += sd
                nnonSkeletonDiff++
            }
        } else {
            Util.assert(false, () => "unknown tag: " + d[0])
        }
    }
    var W_SKELETON = 10
    var W_VALUES = 2
    Util.assert(skeletonDiff >= 0, () => "skeletonDiff < 0")
    Util.assert(nonSkeletonDiff >= 0, () => "nonSkeletonDiff < 0")
    var skeletonDist = W_SKELETON * (skeletonDiff / realSk.length);
    if (realSk.length === 0) {
        skeletonDist = W_SKELETON * 1
    }
    var valueDist = W_VALUES * (nonSkeletonDiff / nnonSkeletonDiff);
    if (nnonSkeletonDiff === 0) {
        valueDist = W_VALUES * 1
    }
    return skeletonDist + valueDist
}*/


function randomChange(state: Recorder.State, p: Data.Program): Data.Program {
    var stmts = p.body.allStmts()
    var si = randInt(stmts.length)
    // all possible transformations (they return false if they cannot be applied)
    var options = [
        new WeightedPair(0, () => { // remove this statement
            /*if (stmts.length < 1) return undefined
            stmts.splice(si, 1)
            return true*/
            return undefined
        }),
        new WeightedPair(0, () => { // insert a new statement
            /*stmts.splice(si, 0, randomStmt(state))
            return true*/
            return undefined
        }),
        new WeightedPair(0, () => { // swap with another statement
            /*if (stmts.length < 2) return undefined
            var si2
            while ((si2 = randInt(stmts.length)) === si) {}
            var t = stmts[si]
            stmts[si] = stmts[si2]
            stmts[si2] = t
            return true*/
            return undefined
        }),
        new WeightedPair(7, () => { // modify an existing statement
            if (stmts.length < 1) return undefined
            var ss = stmts[si]
            var s
            var news
            switch (ss.type) {
                case Data.StmtType.Assign:
                    s = <Data.Assign>ss
                    if (s.lhs.type === Data.ExprType.Field) {
                        if (maybe(0.3334)) {
                            news = new Data.Assign(s.lhs, randomExpr(state))
                        } else if (maybe(0.5)) {
                            var field = new Data.Field((<Data.Field>s.lhs).o, randomExpr(state))
                            news = new Data.Assign(field, s.rhs)
                        } else {
                            var field = new Data.Field(randomExpr(state, {obj: true}), (<Data.Field>s.lhs).f)
                            news = new Data.Assign(field, s.rhs)
                        }
                    } else {
                        Util.assert(s.lhs.type === Data.ExprType.Var && s.rhs.type === Data.ExprType.Field)
                        var f = <Data.Field>s.rhs
                        if (maybe()) {
                            news = new Data.Assign(s.lhs, new Data.Field(f.o, randomExpr(state)), s.isDecl)
                        } else {
                            news = new Data.Assign(s.lhs, new Data.Field(randomExpr(state, {lhs: true}), f.f), s.isDecl)
                        }
                    }
                    break
                case Data.StmtType.Return:
                    news = new Data.Return(randomExpr(state))
                    break
                case Data.StmtType.DeleteProp:
                    s = <Data.DeleteProp>ss
                    if (maybe()) {
                        news = new Data.DeleteProp(randomExpr(state, {arr: true, obj: true}), s.f)
                    } else {
                        news = new Data.DeleteProp(s.o, randomExpr(state))
                    }
                    break
                case Data.StmtType.If:
                    s = <Data.If>ss
                    news = new Data.If(randomExpr(state), s.thn, s.els)
                    break
                default:
                    Util.assert(false, () => "unhandled statement modification: " + ss)
                    break
            }
            return new Data.Program(p.body.replace(si, news))
        }),
    ]
    // randomly choose an action (and execute it)
    var res
    while ((res = pick(options)()) === undefined) {}

    Util.assert(res instanceof Data.Program)
    return res
}
function randomStmt(state: Recorder.State): Data.Stmt {
    var options = [
        () => {
            return new Data.Return(randomExpr(state))
        },
        () => {
            return new Data.Assign(randomExpr(state, {lhs: true}), randomExpr(state))
        },
    ]
    return randArr(options)()
}
function randomExpr(state: Recorder.State, args: any = {}): Data.Expr {
    var lhs = "lhs" in args && args.lhs === true
    var obj = "obj" in args && args.obj === true
    var arr = "arr" in args && args.arr === true
    var num = "num" in args && args.num === true

    var nonPrimitive = lhs || obj || arr
    var hasRequirement = lhs || obj || arr || num

    var options = [
        new WeightedPair(nonPrimitive ? 0 : 1, () => {
            // random new constant
            return new Data.Const(randInt(20)-10)
        }),
        new WeightedPair(6, () => {
            // random candidate expression
            var ps = state.getPrestates()
            if (ps.length === 0) return undefined
            return randArr(ps)
        }),
        new WeightedPair(4, () => {
            // random value read during generation
            var vs = state.variables;
            if (vs.length === 0) return undefined
            return randArr(vs)
        }),
        new WeightedPair(3, () => {
            // random new field
            return <Data.Expr>new Data.Field(randomExpr(state, {obj: true}), randomExpr(state))
        }),
        new WeightedPair(nonPrimitive ? 0 : 2, () => {
            // random new addition
            return <Data.Expr>new Data.Add(randomExpr(state, {num: true}), new Data.Const(maybe() ? 1 : -1))
        }),
    ]
    // filter out bad expressions
    var filter = (e: Data.Expr) => {
        if (e.hasValue() && hasRequirement) {
            var t = typeof e.getValue()
            if (t === "number" && num) {
                return e
            }
            if (t === "object" && (obj || arr || lhs)) {
                if (lhs && e.getValue() === null) {
                    return undefined
                }
                return e
            }
            return undefined // no match
        }
        return e
    }
    var res
    while ((res = filter(pick(options)())) === undefined) {}
    return res
}



function shorten(p: Data.Program, inputs: any[][], realTraces: Data.Trace[]) {

    var badness = Metric.evaluate(p, inputs, realTraces)
    for (var i = 0; i < 300 && p.body.numberOfStmts() > 0; i++) {
        var j = randInt(p.body.numberOfStmts())
        var newp = new Data.Program(p.body.replace(j, Data.Seq.Empty))
        var newbadness = Metric.evaluate(newp, inputs, realTraces)
        if (newbadness <= badness) {
            p = newp
            badness = newbadness
        }
    }
    return p
}

function introIf(f, p: Data.Program, inputs: any[][], realTraces: Data.Trace[], finalizing: boolean = false): Data.Program {
    var code = Verifier.compile(p)
    var tds = []
    for (var i = 0; i < inputs.length; i++) {
        var candidateTrace = Recorder.record(code, inputs[i]).trace
        tds[i] = {
            i: i,
            val: Metric.traceDistance(realTraces[i], candidateTrace),
        }
    }
    tds = tds.sort((a, b) => b.val - a.val)
    log(tds)
    var fulltrace = Recorder.record(f, inputs[tds[0].i], true)
    var stmt = new Data.If(new Data.Const(true), p.body, fulltrace.trace.asStmt())
    return new Data.Program(stmt)
}

function search(f, args) {
    var state = Recorder.record(f, args, true)
    var p = state.trace.asProgram()
    var inputs = InputGenerator.generateInputs(state, args)
    inputs = [
        [['a', 'b', 'c'], 'd'],
        [['a', 'b'], 'e'],
        [[], 'f'],
    ]
    var realTraces = inputs.map((i) => Recorder.record(f, i).trace)

    var badness = Metric.evaluate(p, inputs, realTraces)
    print("Starting search with the following inputs:")
    print("  " + inputs.map((a) => Util.inspect(a)).join("\n  "))

    var cache: any = {}
    var n = 7000
    var do_finalize = true
    for (var i = 0; i < n; i++) {
        var newp
        if (i === Math.floor(n/2) && badness > 0) {
            // maybe we should have an if?
            p = introIf(f, p, inputs, realTraces)

            print("--> introduce if")
        } else {
            newp = randomChange(state, p)

            cache[newp.toString()] = (cache[newp.toString()] || 0) + 1
            if (do_finalize && !finalizing && (i / n > 0.8)) {
                // switch metric
                p = shorten(p, inputs, realTraces)
                badness = Metric.evaluate(p, inputs, realTraces, true)
            }
            var finalizing = do_finalize && (i / n > 0.8)
            var newbadness = Metric.evaluate(newp, inputs, realTraces, finalizing)
            if (newbadness < badness) {
                print("  iteration "+i+": " + badness.toFixed(3) + " -> " + newbadness.toFixed(3))
                p = newp
                badness = newbadness
            } else {
                var W_BETA = 6
                var alpha = Math.min(1, Math.exp(-W_BETA * newbadness / badness))
                //print("r: " + ( alpha).toFixed(4) + " from " + newbadness)
                if (maybe(alpha)) {
                    print("! iteration "+i+": " + badness.toFixed(3) + " -> " + newbadness.toFixed(3))
                    p = newp
                    badness = newbadness
                }
            }
        }
    }
    if (false) {
        var res = []
        for (var i in cache) {
            res.push(cache[i])
        }
        print(res.sort((a,b) => b-a).slice(0, 100))
        print(res.length)
    }

    dbug_end = true

    /*
    line()
    print(evaluate(p, inputs, realTraces))
    print(p)
    line()
    var s: any = p.stmts[5]
    s.rhs = new Data.Add(s.rhs, new Data.Const(-1))
    print(evaluate(p, inputs, realTraces))
    print(p)
    */

    /*
    line()
    print(realTraces.join("\n"))
    line()
    print(inputs.map((i) => Recorder.record(Verifier.compile(p), i).trace).join("\n"))
    line()
    */

    print("Initial:")
    var initial = state.trace.asProgram()
    print(ansi.lightgrey(initial.toString()))
    line()
    print("Found:")
    print(p)
    line()
    /*
    print("Goal:")
    print(ansi.lightgrey("  arguments[0][\"a\"] = arguments[1]\n"+
"  arguments[1][arguments[2]] = arguments[1][\"g\"]\n"+
"  arguments[1][arguments[2]] = \"b\"\n"+
"  var n0 = arguments[1][\"f\"]\n" +
"  arguments[0][\"f2\"] = n0\n"+
"  return arguments[3]"))*/
}

//search(f2, args2)
search(f3, args3)

/*
var e0 = new Data.Const(0)
var e1 = new Data.Const(1)
var s0 = <Data.Stmt>new Data.Return(e0)
var s1 = <Data.Stmt>new Data.Return(e1)
var i0 = <Data.Stmt>new Data.If(e0, new Data.Seq([s0, s0]), new Data.Seq([s0, s0]))
var i0p = <Data.Stmt>new Data.If(e0, new Data.Seq([s0, s0]), new Data.Seq([s0, s0]))
var i1 = <Data.Stmt>new Data.If(e0, new Data.Seq([i0, i0p]), Data.Seq.Empty)


print(i1.replace(+Util.argv(3), s1))
print(i1)
*/


/*
var state = Recorder.record(f, args)
var trace1 = state.trace;
var trace2 = new Data.Trace([<Data.Stmt>new Data.Return(new Data.Const(0))])
print(trace1)
print(trace2)
print(traceDistance(trace1, trace2))
*/

/*
var state = Recorder.record(f, args)
for (var i = 0; i < 100; i++) {
    print(randomExpr(state, {lhs: true}))
}
*/

/*
var s = 'arguments[0]["a"] = arguments[1];\
arguments[1]["a"] = "a";\
arguments[1]["g"] = arguments[3];\
arguments[1]["f"] = arguments[3];\
arguments[2][arguments[2]] = "b";\
n0=1;\
arguments[0]["f2"] = n0;\
return 0;'
var args2 = [{}, {g: "a", f: {}}, "a", 0]

var f2 = Verifier.compile2(s);
//f2.apply(null, args2)
print(Recorder.record(f2, args2))
print(eval("n0"))
*/

/*function test() {
    arguments[0]["a"] = arguments[1];
arguments[1]["a"] = "a";
arguments[1]["g"] = arguments[3];
arguments[1]["f"] = arguments[3]
arguments[2][arguments[2]] = "b";
n0=1;
arguments[0]["f2"] = n0;
return 0;
}
test(args2[0], args2[1], "a", 0)*/


/*
var state = Recorder.record(f, args)
var p = new Data.Program(state.trace.stmts)
for (var i = 0; i < 20; i++) {
    print(randomChange(state, p))
    Util.line()
}
*/

/*
var p1 = new Data.Trace([
    <Data.Stmt>new Data.Assign(new Data.Field(new Data.Argument(0), new Data.Const("g")), new Data.Const(1)),
    <Data.Stmt>new Data.Assign(new Data.Field(new Data.Argument(0), new Data.Const("f")), new Data.Const(1)),
    <Data.Stmt>new Data.Return(new Data.Const(200)),
])
var p2 = new Data.Trace([
    <Data.Stmt>new Data.Assign(new Data.Field(new Data.Argument(0), new Data.Const("f")), new Data.Const(2)),
    <Data.Stmt>new Data.Return(new Data.Const(200)),
])


print(p1.toSkeleton().join("\n"))
print(p2.toSkeleton().join("\n"))

//print(get_diff(p1.toSkeleton(), p2.toSkeleton()).join("\n"))

print(traceDistance(p1, p2))
*/
