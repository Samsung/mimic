

import Data = require('./Data')
import Recorder = require('./Recorder')

import Util = require('./util/Util')
var log = Util.log
var print = Util.print

import ansi = require('./util/Ansicolors')

export function isModel(model: Data.Program, prog: (...a: any[]) => any, args: any[]): boolean {
    var code = compile(model)
    var trace1 = Recorder.record(prog, args)
    var trace2 = Recorder.record(code, args)
    return traceEquiv(trace1.trace, trace2.trace)
}

export function compile(prog: Data.Program) {
    return function (...a: any[]): any {
        return Function(prog.toString()).apply(null, a)
    }
}

// euqivalence of traces up to alpha renaming of local variables
export function traceEquiv(t1: Data.Trace, t2: Data.Trace): boolean {
    // maps variables from t1 to variables in t2
    var map = new Map<Data.Var, Data.Var>()
    function nodeEquiv(n1: Data.Node, n2: Data.Node) {
        if (n1.type !== n2.type) {
            return false
        }
        // on variable declaration, save correspondence
        if (n1.type === Data.StmtType.Assign) {
            var an1 = <Data.Assign>n1
            var an2 = <Data.Assign>n2
            if (an1.isDecl) {
                map.set(<Data.Var>an1.lhs, <Data.Var>an2.lhs)
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
                var v1 = map.get(<Data.Var>c1)
                var v2 = <Data.Var>c2
                if (v1 === undefined || v1.name != v2.name) {
                    return false
                }
            } else {
                Util.assert(c1 instanceof Data.Node)
                Util.assert(c2 instanceof Data.Node)
                if (!nodeEquiv(c1, c2)) {
                    return false
                }
            }
        }
        return true
    }
    function traceEquivHelper(ss1: Data.Stmt[], ss2: Data.Stmt[]): boolean {
        if (ss1.length !== ss2.length) {
            return false
        }
        if (ss1.length === 0) {
            return true
        }
        var s1 = ss1[0]
        var s2 = ss2[0]
        if (!nodeEquiv(s1, s2)) {
            return false
        }
        return traceEquivHelper(ss1.slice(1), ss2.slice(1))
    }

    return traceEquivHelper(t1.stmts, t2.stmts)
}
