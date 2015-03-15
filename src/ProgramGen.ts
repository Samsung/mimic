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
 * Random program generation.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Data = require('./Data')
import Util = require('./util/Util')
import Random = require('./util/Random')
import Recorder = require('./Recorder')

var randInt = Random.randInt
var WeightedPair = Random.WeightedPair
var maybe = Random.maybe
var pick = Random.pick
var randArr = Random.randArr

var print = Util.print
var log = Util.log
var line = Util.line

export class RandomMutationInfo {
    types: string[][]
    nArgs: number
    constructor(public constants: Data.Expr[], public variables: Data.VarDef[], public inputs: any[][], public useAlloc: boolean) {
        this.types = []
        this.nArgs = Util.max(inputs.map((i) => i.length))
        for (var i = 0; i < this.nArgs; i++) {
            this.types[i] = Util.dedup(inputs.map((inp) => typeof inp[i]))
        }
    }
}

/**
 * A factory for ast creation, where creation can sometimes fail, and failure is propagated correctly.
 * Failure is indicated with `null', and if any of the child nodes failed, then so does the overall creation.
 */
class MaybeAstFactory {
    static makeField(a: Data.Expr, b: Data.Expr): Data.Field {
        if (a === null || b === null) {
            return null
        }
        return new Data.Field(a, b)
    }
    static makeBinary(a: Data.Expr, op: string, b: Data.Expr): Data.Binary {
        if (a === null || b === null) {
            return null
        }
        return new Data.Binary(a, op, b)
    }
    static makeDeleteProp(a: Data.Expr, b: Data.Expr): Data.DeleteProp {
        if (a === null || b === null) {
            return null
        }
        return new Data.DeleteProp(a, b)
    }
    static makeAssign(a: Data.Expr, b: Data.Expr, isDecl: boolean = false): Data.Assign {
        if (a === null || b === null) {
            return null
        }
        return new Data.Assign(a, b, isDecl)
    }
    static makeFuncCall(v: Data.Var, f: Data.Expr, r: Data.Expr, args: Data.Expr[], isDecl: boolean): Data.FuncCall {
        if (v === null || f === null || args.some((a) => a === null)) {
            return null
        }
        return new Data.FuncCall(v, f, args, r, isDecl)
    }
    static makeReturn(a: Data.Expr): Data.Return {
        if (a === null) {
            return null
        }
        return new Data.Return(a)
    }
    static makeArgument(a: Data.Expr): Data.Argument {
        if (a === null) {
            return null
        }
        return new Data.Argument(a)
    }
    static makeThrow(a: Data.Expr): Data.Throw {
        if (a === null) {
            return null
        }
        return new Data.Throw(a)
    }
    static makeIf(a: Data.Expr, b: Data.Stmt, c: Data.Stmt): Data.If {
        if (a === null || b === null || c === null) {
            return null
        }
        return new Data.If(a, b, c)
    }
    static makeFor(v: Data.Var, a: Data.Expr, b: Data.Expr, c: Data.Expr, body: Data.Stmt): Data.For {
        if (a === null || b === null || c === null || v === null || body === null) {
            return null
        }
        return new Data.For(a, b, c, body, v)
    }
}
var Ast = MaybeAstFactory

/**
 * Randomly mutate the given program.
 */
export function randomChange(info: RandomMutationInfo, p: Data.Program): Data.Program {
    var stmts = p.body.allStmts()

    // all possible transformations (they return false if they cannot be applied)
    var options = [
        new WeightedPair(0, () => { // remove this statement
            if (stmts.length < 1) return null
            var si = randInt(stmts.length)
            p.body.replace(si, Data.Seq.Empty)
            return null
        }),
        new WeightedPair(0, () => { // insert a new statement
            /*stmts.splice(si, 0, randomStmt(state))
             return true*/
            return null
        }),
        new WeightedPair(0, () => { // swap with another statement
            /*if (stmts.length < 2) return undefined
             var si2
             while ((si2 = randInt(stmts.length)) === si) {}
             var t = stmts[si]
             stmts[si] = stmts[si2]
             stmts[si2] = t
             return true*/
            return null
        }),
        new WeightedPair(7, () => { // modify an existing statement
            if (stmts.length < 1) return null
            var si = randInt(stmts.length)
            var randExp = (args = {}) => randomExpr(info, si, args)
            var ss = stmts[si]
            var s
            var news
            switch (ss.type) {
                case Data.StmtType.Assign:
                    s = <Data.Assign>ss
                    if (s.lhs.type === Data.ExprType.Field) {
                        if (maybe(0.3334)) {
                            news = Ast.makeAssign(s.lhs, randExp())
                        } else if (maybe(0.5)) {
                            var field = Ast.makeField((<Data.Field>s.lhs).o, randExp({field: true}))
                            news = Ast.makeAssign(field, s.rhs)
                        } else {
                            var field = Ast.makeField(randExp({obj: true}), (<Data.Field>s.lhs).f)
                            news = Ast.makeAssign(field, s.rhs)
                        }
                    } else {
                        if (s.rhs === null) {
                            // only a variable declaration -> add an initializer
                            news = Ast.makeAssign(s.lhs, randExp(), s.isDecl)
                        } else if (s.rhs.type === Data.ExprType.Alloc) {
                            // leave allocations
                            return null
                        } else if (s.rhs.type === Data.ExprType.Var && s.lhs.type === Data.ExprType.Var && s.lhs.name == "result") {
                            // result variable assignment
                            news = Ast.makeAssign(s.lhs, randExp(), s.isDecl)
                        } else if (s.rhs.type === Data.ExprType.Var && s.lhs.type === Data.ExprType.Var) {
                            // from code merging
                            return null
                        } else {
                            if (s.lhs.type === Data.ExprType.Var && s.rhs.type === Data.ExprType.Field) {
                                var f = <Data.Field>s.rhs
                                if (maybe()) {
                                    var exp = randExp({field: true})
                                    news = Ast.makeAssign(s.lhs, Ast.makeField(f.o, exp), s.isDecl)
                                } else {
                                    news = Ast.makeAssign(s.lhs, Ast.makeField(randExp({lhs: true}), f.f), s.isDecl)
                                }
                            } else {
                                if (s.isDecl) {
                                    if (maybe(0.9)) {
                                        news = Ast.makeAssign(s.lhs, randExp(), s.isDecl)
                                    } else {
                                        news = new Data.Assign(s.lhs, null, s.isDecl)
                                    }
                                } else {
                                    news = Ast.makeAssign(s.lhs, randExp(), s.isDecl)
                                }
                            }
                        }
                    }
                    break
                case Data.StmtType.Return:
                    s = <Data.Return>ss
                    news = Ast.makeReturn(randExp())
                    break
                case Data.StmtType.DeleteProp:
                    s = <Data.DeleteProp>ss
                    if (maybe()) {
                        news = Ast.makeDeleteProp(randExp({arr: true, obj: true}), s.f)
                    } else {
                        news = Ast.makeDeleteProp(s.o, randExp())
                    }
                    break
                case Data.StmtType.If:
                    s = <Data.If>ss
                    news = Ast.makeIf(randExp({num: true, bool: true}), s.thn, s.els)
                    break
                case Data.StmtType.For:
                    s = <Data.For>ss
                    var newEnd = randExp({num: true})
                    news = Ast.makeFor(s.variable, s.start, newEnd, s.inc, s.body)
                    break
                case Data.StmtType.FuncCall:
                    s = <Data.FuncCall>ss
                    if (s.args.length === 0) return null
                    var idx = randInt(s.args.length)
                    var newExpr = randExp();
                    var newargs = s.args.slice(0)
                    newargs.splice(idx, 1, newExpr)
                    news = Ast.makeFuncCall(s.v, s.f, s.recv, newargs, s.isDecl)
                    break
                case Data.StmtType.Break:
                    return null // cannot modify breaks
                case Data.StmtType.Marker:
                    return null
                default:
                    Util.assert(false, () => "unhandled statement modification: " + ss)
                    break
            }
            if (news === null) {
                // not successful at finding a new statement
                return null
            }
            if (softEquals(news, s)) {
                // new statement happens to be the same as the old one
                return null
            }
            return new Data.Program(p.body.replace(si, news))
        }),
    ]
    // randomly choose an action (and execute it)
    var res
    var i = 0
    while ((res = pick(options)()) === null && i < 25) { i += 1 }
    Util.assert(res != null)
    return res
}

/**
 * Equals function for statements that only considers the part of a statement which
 * can actually be modified by program generation.
 */
function softEquals(a: Data.Stmt, b: Data.Stmt): boolean {
    if (a.type !== b.type) return false
    switch (a.type) {
        case Data.StmtType.Assign:
        case Data.StmtType.Return:
        case Data.StmtType.DeleteProp:
        case Data.StmtType.FuncCall:
            return a.equals(b)
        case Data.StmtType.If:
            var aif = <Data.If>a
            var bif = <Data.If>b
            return aif.c.equals(bif.c)
        case Data.StmtType.For:
            var afor = <Data.For>a
            var bfor = <Data.For>b
            return afor.end.equals(bfor.end)
        default:
            Util.assert(false, () => "unhandled statement soft equals: " + a)
            break
    }
}

//function randomStmt(info: RandomMutationInfo): Data.Stmt {
//    var options = [
//        () => {
//            return Ast.makeReturn(randomExpr(info))
//        },
//        () => {
//            return Ast.makeAssign(randomExpr(info, {lhs: true}), randomExpr(info))
//        },
//    ]
//    return randArr(options)()
//}


function randomExpr(info: RandomMutationInfo, stmtIdx: number, args: any = {}, depth: number = 2): Data.Expr {
    var lhs = "lhs" in args && args.lhs === true
    var obj = "obj" in args && args.obj === true
    var arr = "arr" in args && args.arr === true
    var num = "num" in args && args.num === true
    var bool = "bool" in args && args.bool === true
    var str = "str" in args && args.str === true
    var noconst = "noconst" in args && args.noconst === true
    var field = "field" in args && args.field === true
    if (field) {
        num = true
        str = true
    }

    var nonPrimitive = lhs || obj || arr
    var hasRequirement = nonPrimitive || num || bool || str

    var zeroD = depth === 0

    var recurse = (a: any = {}) => {
        if (depth <= 0) return null
        return randomExpr(info, stmtIdx, a, depth - 1)
    }

    var randomVar = () => {
        var varDef: Data.VarDef = randArr(info.variables)
        if (varDef.definedAt >= stmtIdx) {
            return null
        }
        return <Data.Expr>varDef.v
    }

    var options: Random.WeightedPair<() => Data.Expr>[] = [
        new WeightedPair(info.nArgs > 0 ? 6 : 0, () => {
            // random argument
            return <Data.Expr>new Data.Argument(new Data.Const(Random.randInt(info.nArgs)))
        }),
        new WeightedPair(info.nArgs > 0 ? 2 : 0, () => {
            // random argument
            return <Data.Expr>Ast.makeArgument(recurse({num: true, noconst: true}))
        }),
        new WeightedPair(info.nArgs > 0 ? 2 : 0, () => {
            // random argument
            return <Data.Expr>Ast.makeField(new Data.Var("arguments", true), new Data.Const("length"))
        }),
        new WeightedPair(info.constants.length > 0 && !noconst ? 1 : 0, () => {
            // random new constant from the program
            return <Data.Expr>randArr(info.constants)
        }),
        new WeightedPair(info.variables.length > 0 ? 4 : 0, () => {
            // random variable from the program
            return randomVar()
        }),
        new WeightedPair(zeroD || !info.useAlloc ? 0 : 1/*3*/, () => {
            // length field read of result
            return <Data.Expr>Ast.makeField(new Data.Var("result", true), new Data.Const("length"))
        }),
        new WeightedPair(zeroD || !info.useAlloc ? 0 : 0/*3*/, () => {
            // random field read of result
            return <Data.Expr>Ast.makeField(new Data.Var("result", true), recurse({field: true}))
        }),
        new WeightedPair(zeroD ? 0 : 0/*3*/, () => {
            // random new field
            return <Data.Expr>Ast.makeField(recurse({obj: true}), recurse({field: true}))
        }),
        new WeightedPair(nonPrimitive || zeroD ? 0 : 2, () => {
            // random new addition
            return <Data.Expr>Ast.makeBinary(recurse({num: true, noconst: true}), "+", new Data.Const(maybe() ? 1 : -1))
        }),
        new WeightedPair(nonPrimitive || zeroD || info.variables.length  == 0 ? 0 : 1, () => {
            // random new addition of two variables
            return <Data.Expr>Ast.makeBinary(randomVar(), "+", randomVar())
        }),
        new WeightedPair(nonPrimitive || zeroD || info.variables.length  == 0 ? 0 : 1, () => {
            // random new subtraction of two variables
            return <Data.Expr>Ast.makeBinary(Ast.makeBinary(randomVar(), "-", randomVar()), "-", new Data.Const(1))
        }),
        new WeightedPair(bool && !zeroD ? 1 : 0, () => {
            // random new equality comparison
            var e1 = recurse()
            var conf = {}
            if (e1.type === Data.ExprType.Const) {
                conf = { noconst: true }
            }
            var e2 = recurse(conf)
            return <Data.Expr>Ast.makeBinary(e1, "==", e2)
        }),
        new WeightedPair(bool && !zeroD ? 1 : 0, () => {
            // random new arithmetic comparison
            var e1 = recurse({ num: true })
            var conf = { num: true }
            if (e1.type === Data.ExprType.Const) {
                conf = { noconst: true, num: true }
            }
            var e2 = recurse(conf)
            return <Data.Expr>Ast.makeBinary(e1, "<", e2)
        }),
        new WeightedPair(nonPrimitive || zeroD ? 0 : 1, () => {
            // random boolean not
            return <Data.Expr>new Data.Unary("!", recurse({noconst: true}))
        }),
        new WeightedPair(nonPrimitive || noconst ? 0 : 1, () => {
            // random new integer
            return <Data.Expr>new Data.Const(randInt(20)-10)
        }),
    ]
    // filter out bad expressions
    var filter: (e: Data.Expr) => Data.Expr = (e: Data.Expr) => {
        if (e === null) return e

        // filter by depth
        if (e.depth > depth) return null

        // filter by requirement
        var type = e.getType()
        if (hasRequirement && type !== undefined) {
            var isConst = e.type === Data.ExprType.Const;
            var constVal = (<Data.Const>e).val;
            if (lhs && isConst && constVal === null) {
                // dereference of null
                return null
            }
            if (field && isConst && type === "number" && (constVal < 0 || constVal % 1 !== 0)) {
                // only allow whole positive numbers as fields
                return null
            }
            if (type === "number" && num) {
                return e
            }
            if (type === "object" && (obj || arr || lhs)) {
                return e
            }
            if (type === "boolean" && bool) {
                return e
            }
            if (type === "string" && str) {
                return e
            }
            return null // no match
        }
        if (hasRequirement && e.type === Data.ExprType.Arg) {
            var arg = <Data.Argument>e
            var types: string[] = []
            if (arg.i.type === Data.ExprType.Const) {
                types = info.types[(<Data.Const>arg.i).val]
            } else {
                for (var i = 0; i < info.types.length; i++) {
                    types = types.concat(info.types[i])
                }
                types = Util.dedup(types)
            }
            var required: string[] = []
            if (str || field) {
                required.push("string")
            }
            if (lhs || arr || obj) {
                required.push("object")
            }
            if (bool) {
                required.push("boolean")
            }
            if (num || field) {
                required.push("number")
            }
            if (required.length > 0) {
                // make sure there is at least the possibility to have the correct type
                for (var i = 0; i < required.length; i++) {
                    if (types.indexOf(required[i]) != -1) {
                        return e
                    }
                }
                return null
            }
        }
        return e
    }
    var res
    var i = 0
    while ((res = filter(pick(options)())) === null && i < 25) { i += 1 }
    return res
}
