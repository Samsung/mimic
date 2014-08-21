/**
 * Functionality to evaluate programs.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Data = require('./Data')
import Util = require('./util/Util')
import Verifier = require('./Verifier')
import Recorder = require('./Recorder')

var DISTANCE_NORM = 100

var W_ERROR_EXIT = 5
var W_EXIT = 2

var W_ASSIGN_FIELD = 1.1
var W_ASSIGN_VALUE = 1
var W_ASSIGN_MISSING = 2

var W_DELETE_FIELD = 1
var W_DELETE_MISSING = 2

/**
 * Evaluate how well program `p' behaves on the given inputs (the traces in `realTraces' are used as the
 * gold standard).  Returns a non-negative value, where 0 means the program behaves identically (w.r.t. to our
 * metric) and the higher the number, the less similar `p's behavior.
 */
export function evaluate(p: Data.Program, inputs: any[][], realTraces: Data.Trace[], finalizing: boolean = false): number {
    var badness = 0
    var code = Verifier.compile(p);
    for (var i = 0; i < inputs.length; i++) {
        var candidateTrace = Recorder.record(code, inputs[i]).trace
        var td = traceDistance(realTraces[i], candidateTrace)
        Util.assert(td >= 0, () => "negative distance for " + realTraces[i] + " vs " + candidateTrace)
        badness += td
    }
    /*var W_LENGTH = 0.001
     var stmts = 0
     p.stmts.forEach((s) => {
     // don't count return statements
     if (s.type === Data.StmtType.Return)
     return false
     // don't count assignments to local variables, at least initially
     if (s.type === Data.StmtType.Assign && !finalizing) {
     var as = <Data.Assign>s
     if (as.lhs.type === Data.ExprType.Var)
     return false
     }
     stmts++
     })
     return badness + W_LENGTH*stmts*/
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