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
        if (a.length === 0) {
            return new Function('"use strict";' + prog).apply(null, a)
        } else if (a.length === 1) {
            return new Function("arg0", '"use strict";' + prog).apply(null, a)
        } else if (a.length === 2) {
            return new Function("arg0", "arg1", '"use strict";' + prog).apply(null, a)
        } else if (a.length === 3) {
            return new Function("arg0", "arg1", "arg2", '"use strict";' + prog).apply(null, a)
        } else if (a.length === 4) {
            return new Function("arg0", "arg1", "arg2", "arg3", '"use strict";' + prog).apply(null, a)
        } else if (a.length === 5) {
            return new Function("arg0", "arg1", "arg2", "arg3", "arg4", '"use strict";' + prog).apply(null, a)
        } else if (a.length === 6) {
            return new Function("arg0", "arg1", "arg2", "arg3", "arg4", "arg5", '"use strict";' + prog).apply(null, a)
        }
        return new Function('"use strict";' + prog).apply(null, a)
    }
}

/** Compile a trace expression. */
function expr(e: Data.TraceExpr) {
    return e.curState[e.curState.length-1]
}

/**
 * Compile a list of events
 */
function compileEventList(events: Data.Event[], loop?: StructureInference.Proposal) {
    var stmts:Data.Stmt[] = []
    for (var i = 0; i < events.length; i++) {
        var e = events[i]
        if (loop !== undefined && loop.loopStart === i) {
            var body = new Data.Seq(compileEventList(events.slice(i, i+loop.loopLength)))
            stmts.push(new Data.For(Data.Seq.Empty, new Data.Const(false), Data.Seq.Empty, body))
            i += (loop.loopLength * loop.numIterations)-1
            continue
        }
        var ev
        switch (e.kind) {
            case Data.EventKind.EGet:
                ev = <Data.EGet>e
                stmts.push(new Data.Assign(e.variable, new Data.Field(expr(ev.target), expr(ev.name)), true))
                break
            case Data.EventKind.ESet:
                ev = <Data.ESet>e
                // save old value in local variable
                //stmts.push(new Data.Assign(new Data.Var(), new Data.Field(expr(ev.target), expr(ev.name)), true))
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
                //stmts.push(new Data.Assign(new Data.Var(), new Data.Field(expr(ev.target), expr(ev.name)), true))
                stmts.push(new Data.DeleteProp(expr(ev.target), expr(ev.name)))
                break
            default:
                Util.assert(false, () => "unknown event kind: " + e)
        }
    }
    return stmts;
}
/**
 * Compile a trace to a program.
 */
export function compileTrace(trace: Data.Trace, loop?: StructureInference.Proposal): Data.Program {
    var stmts = compileEventList(trace.events, loop)
    if (trace.isNormalReturn) {
        stmts.push(new Data.Return(expr(trace.result)))
    } else {
        stmts.push(new Data.Throw(expr(trace.exception)))
    }
    return new Data.Program(new Data.Seq(stmts))
}
