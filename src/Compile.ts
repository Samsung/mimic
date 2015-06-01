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
function compileEventList(events: Data.Event[], alloc: boolean, loop: StructureInference.Proposal = null) {

    function compileEvent(e: Data.Event): Data.Stmt {
        var ev
        switch (e.kind) {
            case Data.EventKind.EGet:
                ev = <Data.EGet>e
                return new Data.Assign(e.variable, new Data.Field(expr(ev.target), expr(ev.name)), true)
                break
            case Data.EventKind.EHas:
                ev = <Data.EHas>e
                return new Data.Assign(e.variable, new Data.Has(expr(ev.target), expr(ev.name)), true)
            case Data.EventKind.ESet:
                ev = <Data.ESet>e
                // save old value in local variable
                //stmts.push(new Data.Assign(new Data.Var(), new Data.Field(expr(ev.target), expr(ev.name)), true))
                return new Data.Assign(new Data.Field(expr(ev.target), expr(ev.name)), expr(ev.value))
            case Data.EventKind.EApply:
                ev = <Data.EApply>e
                var recv = null
                if (ev.receiver !== null) {
                    recv = expr(ev.receiver)
                }
                return new Data.FuncCall(ev.variable, expr(ev.target), ev.args.map(expr), recv, true)
            case Data.EventKind.EDeleteProperty:
                ev = <Data.EDeleteProperty>e
                // save old value in local variable
                //stmts.push(new Data.Assign(new Data.Var(), new Data.Field(expr(ev.target), expr(ev.name)), true))
                return new Data.DeleteProp(expr(ev.target), expr(ev.name))
            default:
                Util.assert(false, ((inner_e) => () => "unknown event kind: " + inner_e)(e))
                return null
        }
    }

    function compileEvents(events: Data.Event[]): Data.Stmt[] {
        return events.map(compileEvent)
    }

    if (loop == null) {
        return compileEvents(events)
    }

    // build loop body
    var body: Data.Stmt
    {
        // helper statements
        var resvar = new Data.Var("result", true)
        var resAssignment: Data.Stmt
        if (!alloc) {
            resAssignment = new Data.If(new Data.Const(true), new Data.Assign(resvar, resvar), Data.Seq.Empty)
        } else {
            resAssignment = new Data.If(new Data.Const(false),
                new Data.Assign(new Data.Field(resvar, new Data.Const(0)), new Data.Const(0)), Data.Seq.Empty)
        }
        var breakStmt = new Data.If(new Data.Const(false), new Data.Seq([resAssignment, <Data.Stmt>new Data.Break()]), Data.Seq.Empty)

        var trace = loop.trace
        var bodyStmts: Data.Stmt[] = []
        // add a fake statement to make sure we get can catch infinite loops
        bodyStmts.push(new Data.Marker())

        // prefix
        bodyStmts = bodyStmts.concat(compileEvents(trace.subEvents(loop.prefixStart, loop.prefixLen)))

        // conditional
        if (loop.thenLen != 0 || loop.elseLen != 0) {
            var thenBranch = compileEvents(trace.subEvents(loop.thenStart, loop.thenLen))
            var elseBranch = compileEvents(trace.subEvents(loop.elseStart, loop.elseLen))
            if (thenBranch.length != 0) {
                thenBranch.push(resAssignment)
                thenBranch.push(breakStmt)
            }
            if (elseBranch.length != 0) {
                elseBranch.push(resAssignment)
                elseBranch.push(breakStmt)
            }
            bodyStmts.push(new Data.If(new Data.Const(true), new Data.Seq(thenBranch), new Data.Seq(elseBranch)))
        } else {
            bodyStmts.push(resAssignment)
            bodyStmts.push(breakStmt)
        }
        body = new Data.Seq(bodyStmts)
    }

    var stmts: Data.Stmt[] = []
    stmts = stmts.concat(compileEvents(trace.subEvents(0, loop.prefixStart)))

    // move variable declarations out of loop body
    {
        body.allStmts().forEach((n) => {
            if (n.type === Data.StmtType.Assign) {
                var ass = <Data.Assign>n
                if (ass.isDecl) {
                    // note that we can only modify the assignments because they have not been shared yet
                    ass.isDecl = false
                    stmts.push(new Data.Assign(<Data.Var>ass.lhs, null, true))
                }
            } else if (n.type === Data.StmtType.FuncCall) {
                var fcall = <Data.FuncCall>n
                if (fcall.isDecl) {
                    // note that we can only modify the assignments because they have not been shared yet
                    fcall.isDecl = false
                    stmts.push(new Data.Assign(<Data.Var>fcall.v, null, true))
                }
            }
        })
    }

    // add everything
    stmts.push(new Data.For(new Data.Const(0), new Data.Const(0), new Data.Const(1), new Data.Seq(bodyStmts)))
    stmts = stmts.concat(compileEvents(trace.subEvents(loop.prefixStart + loop.unrolledLen)))

    return stmts;
}
/**
 * Compile a trace to a program.
 */
export function compileTrace(trace: Data.Trace, loop?: StructureInference.Proposal): Data.Program {
    var resvar = new Data.Assign(new Data.Var("result", true), null, true)
    var alloc = trace.isNormalReturn && trace.getResult() instanceof Data.TraceAlloc
    var stmts: Data.Stmt[] = compileEventList(trace.events, alloc, loop)
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
