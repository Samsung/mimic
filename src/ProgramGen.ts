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
    constructor(public constants: Data.Expr[], public variables: Data.VarDef[], public nArgs: number) {
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
                            var field = Ast.makeField((<Data.Field>s.lhs).o, randExp())
                            news = Ast.makeAssign(field, s.rhs)
                        } else {
                            var field = Ast.makeField(randExp({obj: true}), (<Data.Field>s.lhs).f)
                            news = Ast.makeAssign(field, s.rhs)
                        }
                    } else {
                        if (s.rhs === null) {
                            // only a variable declaration -> add an initializer
                            news = Ast.makeAssign(s.lhs, randExp(), s.isDecl)
                        } else if (s.rhs.type === Data.ExprType.Var && s.lhs.type === Data.ExprType.Var) {
                            // from code merging
                            return null
                        } else {
                            if (s.lhs.type === Data.ExprType.Var && s.rhs.type === Data.ExprType.Field) {
                                var f = <Data.Field>s.rhs
                                if (maybe()) {
                                    var exp = randExp()
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
                    if (s.rhs.type === Data.ExprType.Field) {
                        var e = <Data.Field>s.rhs
                        if (maybe(0.3334)) {
                            news = Ast.makeReturn(Ast.makeField(e.o, randExp()))
                        } else if (maybe(0.5)) {
                            news = Ast.makeReturn(Ast.makeField(randExp({lhs: true}), e.f))
                        } else {
                            news = Ast.makeReturn(randExp())
                        }
                    } else {
                        news = new Data.Return(randExp())
                    }
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
                    news = Ast.makeIf(randExp( {num: true, bool: true}), s.thn, s.els)
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

    var nonPrimitive = lhs || obj || arr
    var hasRequirement = lhs || obj || arr || num || bool

    var zeroD = depth === 0

    var recurse = (a: any = {}) => {
        return randomExpr(info, stmtIdx, a, depth - 1)
    }

    var options: Random.WeightedPair<() => Data.Expr>[] = [
        new WeightedPair(info.nArgs > 0 ? 6 : 0, () => {
            // random argument
            return <Data.Expr>new Data.Argument(Random.randInt(info.nArgs))
        }),
        new WeightedPair(info.constants.length > 0 ? 1 : 0, () => {
            // random new constant from the program
            return <Data.Expr>randArr(info.constants)
        }),
        new WeightedPair(info.variables.length > 0 ? 4 : 0, () => {
            // random variable from the program
            var varDef: Data.VarDef = randArr(info.variables)
            if (varDef.definedAt >= stmtIdx) {
                return null
            }
            return <Data.Expr>varDef.v
        }),
        new WeightedPair(zeroD ? 0 : 0/*3*/, () => {
            // random new field
            return <Data.Expr>Ast.makeField(recurse({obj: true}), recurse())
        }),
        new WeightedPair(nonPrimitive || zeroD ? 0 : 2, () => {
            // random new addition
            return <Data.Expr>Ast.makeBinary(recurse({num: true}), "+", new Data.Const(maybe() ? 1 : -1))
        }),
        new WeightedPair(bool && !zeroD ? 1 : 0, () => {
            // random new comparison
            return <Data.Expr>Ast.makeBinary(recurse(), "==", recurse())
        }),
        new WeightedPair(nonPrimitive || zeroD ? 0 : 1, () => {
            // random boolean not
            return <Data.Expr>new Data.Unary("!", recurse({bool: true}))
        }),
        new WeightedPair(nonPrimitive ? 0 : 1, () => {
            // random new integer
            return <Data.Expr>new Data.Const(randInt(20)-10)
        }),
    ]
    // filter out bad expressions
    var filter: (e: Data.Expr) => Data.Expr = (e: Data.Expr) => {
        if (e === null) return e

        // filter by requirement
        if (e.hasValue() && hasRequirement) {
            var t = typeof e.getValue()
            if (t === "number" && num) {
                return e
            }
            if (t === "object" && (obj || arr || lhs)) {
                if (lhs && e.getValue() === null) {
                    return null
                }
                return e
            }
            return null // no match
        }
        // filter by depth
        if (e.depth > depth) return null
        return e
    }
    var res
    var i = 0
    while ((res = filter(pick(options)())) === null && i < 25) { i += 1 }
    return res
}
