/**
 * Functionality to evaluate programs.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Data = require('./Data')
import Util = require('./util/Util')
import Recorder = require('./Recorder')

var print = Util.print
var log = Util.log
var line = Util.line

var DISTANCE_NORM = 100

var W_ERROR_EXIT = 5
var W_EXIT = 2

var W_ASSIGN_FIELD = 1.1
var W_ASSIGN_VALUE = 1
var W_ASSIGN_MISSING = 2

var W_DELETE_FIELD = 1
var W_DELETE_MISSING = 2

var W_WRONG_PARAM = 1
var W_CALL_MISSING = 2

/**
 * Evaluate how well program `p' behaves on the given inputs (the traces in `realTraces' are used as the
 * gold standard).  Returns a non-negative value, where 0 means the program behaves identically (w.r.t. to our
 * metric) and the higher the number, the less similar `p's behavior.
 */
export function evaluate(p: Data.Program, inputs: any[][], realTraces: Data.Trace[], finalizing: boolean = false): number {
    var badness = 0
    var code = Recorder.compile(p);
    for (var i = 0; i < inputs.length; i++) {
        var candidateTrace = Recorder.record(code, inputs[i]).trace
        var td = traceDistance(realTraces[i], candidateTrace)
        Util.assert(td >= 0, () => "negative distance for " + realTraces[i] + " vs " + candidateTrace)
        badness += td
    }
    if (finalizing) {
        var W_LENGTH = 0.0001
        badness += W_LENGTH * p.toString().length
    }
    return badness
}

/**
 * Determine how 'close' two traces are, and return a number describing the closeness.  0 is identical,
 * and the higher, the less similar the traces are.  This is a metric.
 */
export function traceDistance(a: Data.Trace, b: Data.Trace): number {
    var badness = 0

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
                if (nodeEquiv(ao, bo, ds)) {
                    if (nodeEquiv(af, bf, ds)) {
                        if (!nodeEquiv(av, bv, ds)) {
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
    badness += (notInA + notInB) * W_CALL_MISSING

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
                if (nodeEquiv(ao, bo, ds)) {
                    if (!nodeEquiv(af, bf, ds)) {
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

    // compare all calls
    aa = <Data.FuncCall[]>a.stmts.filter((s) => s.type === Data.StmtType.FuncCall)
    bb = <Data.FuncCall[]>b.stmts.filter((s) => s.type === Data.StmtType.FuncCall)
    notInB = 0
    used = new Map<number, boolean>()
    notInA = bb.length
    aa.forEach((astmt) => {
        var arecv = astmt.rrecv
        var af = astmt.f
        var aargs = astmt.args
        var found = false
        for (var i = 0; i < bb.length; i++) {
            if (!used.has(i)) {
                var bstmt = bb[i]
                var brecv = bstmt.rrecv
                var bf = bstmt.f
                var bargs = bstmt.args
                if (arecv === brecv || nodeEquiv(arecv, brecv, ds)) {
                    if (nodeEquiv(af, bf, ds)) {
                        Util.assert(aargs.length === bargs.length)
                        for (var i = 0; i < aargs.length; i++) {
                            if (!nodeEquiv(aargs[i], bargs[i], ds)) {
                                // receiver and function matches, but not this argument
                                badness += W_WRONG_PARAM * exprDistance(aargs[i], bargs[i], ds) / DISTANCE_NORM
                            }
                        }
                        used.set(i, true)
                        found = true
                        notInA--
                        break
                    }
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
                return DISTANCE_NORM
                /*
                 var n = Math.min(Math.abs(l - r), DISTANCE_NORM);
                 return n !== n ? DISTANCE_NORM : n // handle NaN
                 */
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

function nodeEquiv(n1: Data.Node, n2: Data.Node, ds: Data.VariableMap) {
    if (n1.type !== n2.type) {
        return false
    }
    // on variable declaration, save correspondence
    if (n1.type === Data.StmtType.Assign) {
        var an1 = <Data.Assign>n1
        var an2 = <Data.Assign>n2
        if (an1.isDecl && an2.isDecl) {
            ds.addFromA(<Data.Var>an1.lhs, an1.rhs)
            ds.addFromB(<Data.Var>an2.lhs, an2.rhs)
        }
    }
    // check that all children are equivalent
    var cs1 = n1.anychildren()
    var cs2 = n2.anychildren()
    Util.assert(cs1.length === cs2.length)
    for (var i = 0; i < cs1.length; i++) {
        var c1 = cs1[i]
        var c2 = cs2[i]
        if (Util.isPrimitive(c1)) {
            if (c1 !== c2) {
                return false
            }
        } else if (c1.type === Data.ExprType.Var) {
            if (!ds.areEqual(<Data.Var>c1, <Data.Var>c2)) {
                return false
            }
        } else {
            Util.assert(c1 instanceof Data.Node)
            Util.assert(c2 instanceof Data.Node)
            if (!nodeEquiv(c1, c2, ds)) {
                return false
            }
        }
    }
    return true
}