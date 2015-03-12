/*
 * Copyright (c) 2014 Samsung Electronics Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Functionality to compile a Data.Program to JavaScript, as well as Data.Trace to Data.Program.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Util = require('./util/Util')
import Ansi = require('./util/Ansicolors')
import Data = require('./Data')
import Recorder = require('./Recorder')
import StructureInference = require('./StructureInference')

var log = Util.log
var print = Util.print
var line = Util.line

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
        var recv = Recorder.getReceiver()
        if (a.length === 0) {
            return new Function('"use strict";' + prog).apply(recv, a)
        } else if (a.length === 1) {
            return new Function("arg0", '"use strict";' + prog).apply(recv, a)
        } else if (a.length === 2) {
            return new Function("arg0", "arg1", '"use strict";' + prog).apply(recv, a)
        } else if (a.length === 3) {
            return new Function("arg0", "arg1", "arg2", '"use strict";' + prog).apply(recv, a)
        } else if (a.length === 4) {
            return new Function("arg0", "arg1", "arg2", "arg3", '"use strict";' + prog).apply(recv, a)
        } else if (a.length === 5) {
            return new Function("arg0", "arg1", "arg2", "arg3", "arg4", '"use strict";' + prog).apply(recv, a)
        } else if (a.length === 6) {
            return new Function("arg0", "arg1", "arg2", "arg3", "arg4", "arg5", '"use strict";' + prog).apply(recv, a)
        }
        return new Function('"use strict";' + prog).apply(recv, a)
    }
}

/** Compile a trace expression. */
function expr(e: Data.TraceExpr) {
    return e.curState[e.curState.length-1]
}

/**
 * Compile a list of events
 */
function compileEventList(events: Data.Event[], alloc: boolean, loop: StructureInference.Proposal = null, trace: Data.Trace = null) {
    var stmts:Data.Stmt[] = []

    // add a fake statement to make sure we get can catch infinite loops
    stmts.push(new Data.Marker())

    /**
     * Given a body, this method assembles a for loop.
     */
    function buildForLoop(bodystmt: Data.Stmt[], alloc: boolean): Data.Stmt[] {
        // extract all variables, so that they can be declared outside of the loop
        var vars: Data.Var[] = []
        bodystmt.forEach((n) => {
            if (n.type === Data.StmtType.Assign) {
                var ass = <Data.Assign>n
                if (ass.isDecl) {
                    // note that we can only modify the assignments because they have not been shared yet
                    ass.isDecl = false
                    vars.push(<Data.Var>ass.lhs)
                }
            } else if (n.type === Data.StmtType.FuncCall) {
                var fcall = <Data.FuncCall>n
                if (fcall.isDecl) {
                    // note that we can only modify the assignments because they have not been shared yet
                    fcall.isDecl = false
                    vars.push(fcall.v)
                }
            }
        })
        var resvar = new Data.Var("result", true)
        var resres: Data.Stmt = new Data.Assign(resvar, resvar);
        if (!alloc) {
            bodystmt.push(new Data.If(new Data.Const(true), resres, Data.Seq.Empty))
        } else {
            var resassign: Data.Stmt = new Data.Assign(new Data.Field(resvar, new Data.Const(0)), new Data.Const(0));
            bodystmt.push(new Data.If(new Data.Const(false), resassign, Data.Seq.Empty))
        }
        bodystmt.push(new Data.If(new Data.Const(false), new Data.Seq([resres, <Data.Stmt>new Data.Break()]), Data.Seq.Empty))
        var body = new Data.Seq(bodystmt)

        var res: Data.Stmt[] = vars.map((v) => new Data.Assign(v, null, true))
        res.push(new Data.For(new Data.Const(0), new Data.Const(0), new Data.Const(1), body))
        return res
    }

    for (var i = 0; i < events.length; i++) {
        var e = events[i]
        if (loop !== null && loop.loopStart === i) {
            stmts = stmts.concat(buildForLoop(compileEventList(events.slice(i, i + loop.loopLength), alloc), alloc))
            /*for (var k = 0; k < loop.numIterations; k++) {
                line()
                print(events.slice(i+k*loop.loopLength, i+k*loop.loopLength+loop.loopLength).join("\n"))
                line()
            }*/
            i += (loop.loopLength * loop.getNumIterations(trace))-1
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
                stmts.push(new Data.FuncCall(ev.variable, expr(ev.target), ev.args.map(expr), recv, true))
                break
            case Data.EventKind.EDeleteProperty:
                ev = <Data.EDeleteProperty>e
                // save old value in local variable
                //stmts.push(new Data.Assign(new Data.Var(), new Data.Field(expr(ev.target), expr(ev.name)), true))
                stmts.push(new Data.DeleteProp(expr(ev.target), expr(ev.name)))
                break
            default:
                Util.assert(false, ((inner_e) => () => "unknown event kind: " + inner_e)(e))
        }
    }
    return stmts;
}
/**
 * Compile a trace to a program.
 */
export function compileTrace(trace: Data.Trace, loop?: StructureInference.Proposal): Data.Program {
    var resvar = new Data.Assign(new Data.Var("result", true), null, true)
    var alloc = trace.getResult() instanceof Data.TraceAlloc
    var stmts: Data.Stmt[] = compileEventList(trace.events, alloc, loop, trace)
    if (trace.isNormalReturn) {
        if (alloc) {
            var obj = <Data.TraceAlloc>trace.getResult()
            resvar.rhs = new Data.Alloc(Array.isArray(obj.val))
            stmts.push(new Data.Return(resvar.lhs))
        } else {
            var res = expr(trace.getResult())
            if (res instanceof Data.Const) {
                resvar.rhs = res
                stmts.push(new Data.Return(resvar.lhs))
            } else {
                stmts.push(new Data.Return(res))
            }
        }
    } else {
        stmts.push(new Data.Throw(expr(trace.getException())))
    }
    stmts = [<Data.Stmt>resvar].concat(stmts)
    return new Data.Program(new Data.Seq(stmts))
}
