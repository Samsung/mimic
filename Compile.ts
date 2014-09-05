/**
 * Functionality to compile a Data.Program to JavaScript, as well as Data.Trace to Data.Program.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Util = require('./util/Util')
import Ansi = require('./util/Ansicolors')
import Data = require('./Data')
import StructureInference = require('./StructureInference')

var log = Util.log
var print = Util.print

/**
 * Given a program, compile it into a regular function.
 */
export function compile(prog: Data.Program): (...a: any[]) => any {
    return compile2(prog.toString())
}
/**
 * Like `compile', directly takes a string as input.
 */
export function compile2(prog: string): (...a: any[]) => any {
    return function (...a: any[]): any {
        return new Function('"use strict";' + prog).apply(null, a)
    }
}

export function compileTrace(trace: Data.Trace, loop?: StructureInference.Proposal): Data.Program {
    var stmts: Data.Stmt[] = []
    var expr = (e: Data.TraceExpr) => {
        return e.curState[e.curState.length-1]
    }
    trace.events.forEach((e) => {
        var ev
        switch (e.kind) {
            case Data.EventKind.EGet:
                ev = <Data.EGet>e
                stmts.push(new Data.Assign(e.variable, new Data.Field(expr(ev.target), expr(ev.name)), true))
                break
            case Data.EventKind.ESet:
                ev = <Data.ESet>e
                // save old value in local variable
                stmts.push(new Data.Assign(new Data.Var(), new Data.Field(expr(ev.target), expr(ev.name)), true))
                stmts.push(new Data.Assign(new Data.Field(expr(ev.target), expr(ev.name)), expr(ev.value)))
                break
            case Data.EventKind.EApply:
                ev = <Data.EApply>e
                var recv = null
                if (ev.receiver !== null) {
                    recv = expr(ev.receiver)
                }
                stmts.push(new Data.FuncCall(ev.variable, expr(ev.target), ev.args.map(expr), recv))
                break
            case Data.EventKind.EDeleteProperty:
                ev = <Data.EDeleteProperty>e
                // save old value in local variable
                stmts.push(new Data.Assign(new Data.Var(), new Data.Field(expr(ev.target), expr(ev.name)), true))
                stmts.push(new Data.DeleteProp(expr(ev.target), expr(ev.name)))
                break
            default:
                Util.assert(false, () => "unknown event kind: " + e)
        }
    })
    if (trace.isNormalReturn) {
        stmts.push(new Data.Return(expr(trace.result)))
    } else {
        stmts.push(new Data.Throw(expr(trace.exception)))
    }
    return new Data.Program(new Data.Seq(stmts))
}
