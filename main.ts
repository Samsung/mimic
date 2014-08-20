/// <reference path="util/assert.d.ts" />

"use strict";

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
    obj2[str] = "b"
    obj1.f2 = obj2.f
    return int
}
var args = [{}, {g: "a", f: {}}, "a", 0]

function f2(arr) {
    return arr.pop()
}
var args2 = [['a', 'b', 'c']]

/*
 arguments[0]["a"] = arguments[1]
 arguments[1][arguments[2]] = arguments[1]["g"]
 arguments[1][arguments[2]] = "b"
 n = arguments[1]["f"]
 arguments[0]["f2"] = n
 */

//infer(f, args)




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


var DISTANCE_NORM = 10000
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

function exprDistance(real: Data.Expr, candidate: Data.Expr, ds: Data.VariableMap) {
    if (real.type !== candidate.type) {
        return DISTANCE_NORM
    }
    var l, r
    switch (real.type) {
        case Data.ExprType.Arg:
            if ((<Data.Argument>real).i === (<Data.Argument>candidate).i) {
                return 0
            }
            return DISTANCE_NORM
        case Data.ExprType.Field:
            l = <Data.Field>real
            r = <Data.Field>candidate
            return exprDistance(l.o, r.o, ds)/2 + exprDistance(l.f, r.f, ds)/2
        case Data.ExprType.Const:
            l = (<Data.Const>real).val
            r = (<Data.Const>candidate).val
            if (l === r) {
                return 0
            }
            if (typeof l !== typeof r) {
                return DISTANCE_NORM
            }
            if (typeof l === 'number') {
                var n = Math.min(Math.abs(l - r), DISTANCE_NORM);
                return n !== n ? DISTANCE_NORM : n // handle NaN
            }
            if (typeof l === 'string') {
                return DISTANCE_NORM
            }
            Util.assert(false, () => "unhandled const distance: " + real + " - " + candidate)
            return 0
        case Data.ExprType.Var:
            l = <Data.Var>real
            r = <Data.Var>candidate
            if (ds.areEqual(l, r)) {
                return 0
            }
            return DISTANCE_NORM
        default:
            Util.assert(false, () => "unhandled expr distance: " + real)
    }
    return 0
}
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

function traceDistance(a: Data.Trace, b: Data.Trace): number {
    var badness = 0
    var W_ERROR_EXIT = 20
    var W_EXIT = 2

    var W_ASSIGN_FIELD = 1.1
    var W_ASSIGN_VALUE = 1
    var W_ASSIGN_MISSING = 2

    var W_DELETE_FIELD = 1
    var W_DELETE_MISSING = 2

    // build a variable mapping
    var ds = new Data.VariableMap()
    a.stmts.forEach((s) => {
        var ss
        if (s.type === Data.StmtType.Assign) {
            ss = <Data.Assign>s
            if (ss.lhs.type === Data.ExprType.Var) {
                ds.addFromA(<Data.Var>ss.lhs, ss.rhs)
            }
        }
    })
    b.stmts.forEach((s) => {
        var ss
        if (s.type === Data.StmtType.Assign) {
            ss = <Data.Assign>s
            if (ss.lhs.type === Data.ExprType.Var) {
                ds.addFromB(<Data.Var>ss.lhs, ss.rhs)
            }
        }
    })

    // compare all assignments
    var aa: any = <Data.Assign[]>a.stmts.filter((s) => s.type === Data.StmtType.Assign && (<Data.Assign>s).lhs.type !== Data.ExprType.Var)
    var bb: any = <Data.Assign[]>b.stmts.filter((s) => s.type === Data.StmtType.Assign && (<Data.Assign>s).lhs.type !== Data.ExprType.Var)
    var notInB = 0
    var used = new Map<number, boolean>()
    var notInA = bb.length
    aa.forEach((astmt) => {
        var ao = (<Data.Field>astmt.lhs).o
        var af = (<Data.Field>astmt.lhs).f
        var av = astmt.rhs
        var found = false
        for (var i = 0; i < bb.length; i++) {
            if (!used.has(i)) {
                var bstmt = bb[i]
                var bo = (<Data.Field>bstmt.lhs).o
                var bf = (<Data.Field>bstmt.lhs).f
                var bv = bstmt.rhs
                if (Verifier.nodeEquiv(ao, bo, ds)) {
                    if (Verifier.nodeEquiv(af, bf, ds)) {
                        if (!Verifier.nodeEquiv(av, bv, ds)) {
                            // receiver and field matches, but not the value
                            badness += W_ASSIGN_VALUE * exprDistance(av, bv, ds) / DISTANCE_NORM
                        }
                    } else {
                        // receiver matches, but not field
                        badness += W_ASSIGN_FIELD * exprDistance(af, bf, ds) / DISTANCE_NORM
                    }
                    used.set(i, true)
                    found = true
                    notInA--
                    break
                }
            }
        }
        if (!found) {
            notInB++
        }
    })
    badness += (notInA + notInB) * W_ASSIGN_MISSING

    // compare all delete properties
    aa = <Data.DeleteProp[]>a.stmts.filter((s) => s.type === Data.StmtType.DeleteProp)
    bb = <Data.DeleteProp[]>b.stmts.filter((s) => s.type === Data.StmtType.DeleteProp)
    notInB = 0
    used = new Map<number, boolean>()
    notInA = bb.length
    aa.forEach((astmt) => {
        var ao = astmt.o
        var af = astmt.f
        var found = false
        for (var i = 0; i < bb.length; i++) {
            if (!used.has(i)) {
                var bstmt = bb[i]
                var bo = bstmt.o
                var bf = bstmt.f
                if (Verifier.nodeEquiv(ao, bo, ds)) {
                    if (!Verifier.nodeEquiv(af, bf, ds)) {
                        // receiver matches, but not field
                        badness += W_DELETE_FIELD * exprDistance(af, bf, ds) / DISTANCE_NORM
                    }
                    used.set(i, true)
                    found = true
                    notInA--
                    break
                }
            }
        }
        if (!found) {
            notInB++
        }
    })
    badness += (notInA + notInB) * W_DELETE_MISSING

    // compare the last statement (return or throw)
    if (a.lastStmt().type === b.lastStmt().type) {
        if (a.lastStmt().type === Data.StmtType.Throw) {
            badness += W_EXIT * exprDistance((<Data.Throw>a.lastStmt()).rhs, (<Data.Throw>b.lastStmt()).rhs, ds)/DISTANCE_NORM
        } else {
            badness += W_EXIT * exprDistance((<Data.Return>a.lastStmt()).rhs, (<Data.Return>b.lastStmt()).rhs, ds)/DISTANCE_NORM
        }
    } else {
        // one must be return, the other throw
        badness += W_ERROR_EXIT
    }

    return badness
}

var randInt = Util.randInt


/* Returns a random element from an array. */
function randArr<T>(arr: T[]): T {
    Util.assert(arr.length > 0)
    return arr[randInt(arr.length)]
}
/* Return a random element from an array of weight/element pairs */
function randArrW<T>(arr: T[], weights: number[]): T {
    Util.assert(arr.length > 0 && arr.length === weights.length)
    var total = weights.reduce((s, w) => w + s, 0)
    var rand = Util.randFloat(0, total)
    var choice = 0
    var sofar = 0
    while (sofar <= rand) {
        sofar += weights[choice]
        choice += 1
    }
    Util.assert(choice-1 < arr.length)
    return arr[choice-1]
}
function maybe(yesProbability: number = 0.5) {
    return Util.randFloat(0, 1) < yesProbability
}
class WeightedPair<T> {
    constructor(public w: number, public e: T) {
    }
}
function pick<T>(arr: WeightedPair<T>[]): T {
    return randArrW(arr.map((x) => x.e), arr.map((x) => x.w))
}

function randomChange(state: Recorder.State, p: Data.Program): Data.Program {
    var stmts = p.stmts.slice(0)

    // randomly choose a statement
    var si = randInt(stmts.length)
    // all possible transformations (they return false if they cannot be applied)
    var options = [
        new WeightedPair(2, () => { // remove this statement
            if (stmts.length < 1) return false
            stmts.splice(si, 1)
            return true
        }),
        new WeightedPair(0, () => { // insert a new statement
            stmts.splice(si, 0, randomStmt(state))
            return true
        }),
        new WeightedPair(1, () => { // swap with another statement
            if (stmts.length < 2) return false
            var si2
            while ((si2 = randInt(stmts.length)) === si) {}
            var t = stmts[si]
            stmts[si] = stmts[si2]
            stmts[si2] = t
            return true
        }),
        new WeightedPair(7, () => { // modify an existing statement
            if (stmts.length < 1) return false
            var ss = stmts[si]
            var s
            switch (ss.type) {
                case Data.StmtType.Assign:
                    s = <Data.Assign>ss
                    var news
                    if (s.lhs.type === Data.ExprType.Field) {
                        if (maybe(0.3334)) {
                            var rhs = randomExpr(state);
                            news = new Data.Assign(s.lhs, rhs)
                        } else if (maybe(0.5)) {
                            var field = new Data.Field((<Data.Field>s.lhs).o, randomExpr(state, {lhs: true}))
                            news = new Data.Assign(field, s.rhs)
                        } else {
                            var field = new Data.Field(randomExpr(state, {obj: true}), (<Data.Field>s.lhs).f)
                            news = new Data.Assign(field, s.rhs)
                        }
                    } else {
                        if (maybe()) {
                            news = new Data.Assign(s.lhs, randomExpr(state))
                        } else {
                            news = new Data.Assign(randomExpr(state, {lhs: true}), s.rhs)
                        }
                    }
                    stmts[si] = news
                    break
                case Data.StmtType.Return:
                    stmts[si] = new Data.Return(randomExpr(state))
                    break
                case Data.StmtType.DeleteProp:
                    s = <Data.DeleteProp>ss
                    var news
                    if (maybe()) {
                        news = new Data.DeleteProp(randomExpr(state, {arr: true}), s.f)
                    } else {
                        news = new Data.DeleteProp(s.o, randomExpr(state))
                    }
                    stmts[si] = news
                    break
                default:
                    Util.assert(false, () => "unhandled statement modification: " + ss)
                    break
            }
            return true
        }),
    ]
    // randomly choose an action (and execute it)
    while (!pick(options)()) {}

    return new Data.Program(stmts)
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

    var options: WeightedPair<() => Data.Expr>[] = [
        new WeightedPair(nonPrimitive ? 0 : 1, () => {
            // random new constant
            return new Data.Const(randInt(20)-10)
        }),
        new WeightedPair(6, () => {
            // random candidate expression
            var ps = state.getPrestates();
            if (ps.length === 0) return undefined
            return randArr(ps)
        }),
        new WeightedPair(3, () => {
            // random new field
            return <Data.Expr>new Data.Field(randomExpr(state, {obj: true}), randomExpr(state))
        }),
        new WeightedPair(nonPrimitive ? 0 : 2, () => {
            // random new addition
            return <Data.Expr>new Data.Add(randomExpr(state, {num: true}), new Data.Const(randInt(3)-1))
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

function evaluateOld(p: Data.Program, inputs: any[][], realTraces: Data.Trace[]): number {
    var badness = 0
    var code = Verifier.compile(p);
    for (var i = 0; i < inputs.length; i++) {
        var candidateTrace = Recorder.record(code, inputs[i]).trace
        var td = traceDistance(realTraces[i], candidateTrace)
        Util.assert(td >= 0, () => "negative distance for " + realTraces[i] + " vs " + candidateTrace)
        badness += td
    }
    var W_LENGTH = 0.01
    return badness + W_LENGTH*p.stmts.length
}

function evaluate(p: Data.Program, inputs: any[][], realTraces: Data.Trace[]): number {
    var badness = 0
    var code = Verifier.compile(p);
    for (var i = 0; i < inputs.length; i++) {
        var candidateTrace = Recorder.record(code, inputs[i]).trace
        var td = traceDistance(realTraces[i], candidateTrace)
        Util.assert(td >= 0, () => "negative distance for " + realTraces[i] + " vs " + candidateTrace)
        badness += td
    }
    var W_LENGTH = 0.001
    return badness + W_LENGTH*(p.stmts.length - (p.stmts[p.stmts.length-1].type === Data.StmtType.Return ? 1 : 0))
}

function search(f, args) {
    var state = Recorder.record(f, args)
    var p = new Data.Program(state.trace.stmts)
    var inputs = InputGenerator.generateInputs(state, args)
    inputs = [
        [['a', 'b', 'c']],
        [['a', 'b']],
        [[]],
    ]
    var realTraces = inputs.map((i) => Recorder.record(f, i).trace)

    var badness = evaluate(p, inputs, realTraces)
    print("Starting search with the following inputs:")
    print("  " + inputs.map((a) => Util.inspect(a)).join("\n  "))

    var cache:any = {}
    for (var i = 0; i < 10000; i++) {
        var newp = randomChange(state, p)
        cache[newp.toString()] = (cache[newp.toString()] || 0) + 1
        var newbadness = evaluate(newp, inputs, realTraces)
        if (newbadness < badness) {
            print("iteration "+i+": " + badness.toFixed(3) + " -> " + newbadness.toFixed(3))
            p = newp
            badness = newbadness
        } else {
            // TODO accept anyway sometimes
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

    line()
    print(realTraces.join("\n"))
    line()
    print(inputs.map((i) => Recorder.record(Verifier.compile(p), i).trace).join("\n"))
    line()
    print("Initial:")
    var initial = new Data.Program(state.trace.stmts);
    print(ansi.lightgrey(initial.toString()))
    line()
    print("Found:")
    print(p)
    line()
    print("Goal:")
    print(ansi.lightgrey("  arguments[0][\"a\"] = arguments[1]\n"+
"  arguments[1][arguments[2]] = arguments[1][\"g\"]\n"+
"  arguments[1][arguments[2]] = \"b\"\n"+
"  var n0 = arguments[1][\"f\"]\n" +
"  arguments[0][\"f2\"] = n0\n"+
"  return arguments[3]"))
}

search(f2, args2)

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
