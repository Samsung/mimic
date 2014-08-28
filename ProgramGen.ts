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
    constructor(public candidates: Data.Expr[], public variables: Data.Var[]) {
    }
}

/**
 * A factory for ast creation, where creation can sometimes fail, and failure is propagated correctly.
 * Failure is indicated with `null', and if any of the child nodes failed, then so does the overall creation.
 */
class MaybeAstFactory {
    makeField(a: Data.Expr, b: Data.Expr): Data.Field {
        if (a === null || b === null) {
            return null
        }
        return new Data.Field(a, b)
    }
    makeAdd(a: Data.Expr, b: Data.Expr): Data.Add {
        if (a === null || b === null) {
            return null
        }
        return new Data.Add(a, b)
    }
    makeDeleteProp(a: Data.Expr, b: Data.Expr): Data.DeleteProp {
        if (a === null || b === null) {
            return null
        }
        return new Data.DeleteProp(a, b)
    }
    makeAssign(a: Data.Expr, b: Data.Expr, isDecl: boolean = false): Data.Assign {
        if (a === null || b === null) {
            return null
        }
        return new Data.Assign(a, b, isDecl)
    }
    makeReturn(a: Data.Expr): Data.Return {
        if (a === null) {
            return null
        }
        return new Data.Return(a)
    }
    makeThrow(a: Data.Expr): Data.Throw {
        if (a === null) {
            return null
        }
        return new Data.Throw(a)
    }
    makeIf(a: Data.Expr, b: Data.Stmt, c: Data.Stmt): Data.If {
        if (a === null || b === null || c === null) {
            return null
        }
        return new Data.If(a, b, c)
    }
}
var factory = new MaybeAstFactory()

/**
 * Randomly mutate the given program.
 */
export function randomChange(info: RandomMutationInfo, p: Data.Program): Data.Program {
    var stmts = p.body.allStmts()
    var si = randInt(stmts.length)
    // all possible transformations (they return false if they cannot be applied)
    var options = [
        new WeightedPair(0, () => { // remove this statement
            if (stmts.length < 1) return null
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
            var ss = stmts[si]
            var s
            var news
            switch (ss.type) {
                case Data.StmtType.Assign:
                    s = <Data.Assign>ss
                    if (s.lhs.type === Data.ExprType.Field) {
                        if (maybe(0.3334)) {
                            news = factory.makeAssign(s.lhs, randomExpr(info))
                        } else if (maybe(0.5)) {
                            var field = factory.makeField((<Data.Field>s.lhs).o, randomExpr(info))
                            news = factory.makeAssign(field, s.rhs)
                        } else {
                            var field = factory.makeField(randomExpr(info, {obj: true}), (<Data.Field>s.lhs).f)
                            news = factory.makeAssign(field, s.rhs)
                        }
                    } else {
                        Util.assert(s.lhs.type === Data.ExprType.Var && s.rhs.type === Data.ExprType.Field)
                        var f = <Data.Field>s.rhs
                        if (maybe()) {
                            news = factory.makeAssign(s.lhs, factory.makeField(f.o, randomExpr(info)), s.isDecl)
                        } else {
                            news = factory.makeAssign(s.lhs, factory.makeField(randomExpr(info, {lhs: true}), f.f), s.isDecl)
                        }
                    }
                    break
                case Data.StmtType.Return:
                    s = <Data.Return>ss
                    if (s.rhs.type === Data.ExprType.Field) {
                        var e = <Data.Field>s.rhs
                        if (maybe()) {
                            news = factory.makeReturn(factory.makeField(e.o, randomExpr(info)))
                        } else {
                            news = factory.makeReturn(factory.makeField(randomExpr(info, {lhs: true}), e.f))
                        }
                    } else {
                        news = new Data.Return(randomExpr(info))
                    }
                    break
                case Data.StmtType.DeleteProp:
                    s = <Data.DeleteProp>ss
                    if (maybe()) {
                        news = factory.makeDeleteProp(randomExpr(info, {arr: true, obj: true}), s.f)
                    } else {
                        news = factory.makeDeleteProp(s.o, randomExpr(info))
                    }
                    break
                case Data.StmtType.If:
                    s = <Data.If>ss
                    news = factory.makeIf(randomExpr(info, {num: true}), s.thn, s.els)
                    break
                default:
                    Util.assert(false, () => "unhandled statement modification: " + ss)
                    break
            }
            if (news === null) {
                return null
            }
            return new Data.Program(p.body.replace(si, news))
        }),
    ]
    // randomly choose an action (and execute it)
    var res
    var i = 0
    while ((res = pick(options)()) === null && i < 25) { i += 1 }
    return res
}


function randomStmt(info: RandomMutationInfo): Data.Stmt {
    var options = [
        () => {
            return factory.makeReturn(randomExpr(info))
        },
        () => {
            return factory.makeAssign(randomExpr(info, {lhs: true}), randomExpr(info))
        },
    ]
    return randArr(options)()
}


function randomExpr(info: RandomMutationInfo, args: any = {}, depth: number = 2): Data.Expr {
    var lhs = "lhs" in args && args.lhs === true
    var obj = "obj" in args && args.obj === true
    var arr = "arr" in args && args.arr === true
    var num = "num" in args && args.num === true

    var nonPrimitive = lhs || obj || arr
    var hasRequirement = lhs || obj || arr || num

    var zeroD = depth === 0

    var options = [
        new WeightedPair(nonPrimitive ? 0 : 1, () => {
            // random new constant
            return new Data.Const(randInt(20)-10)
        }),
        new WeightedPair(6, () => {
            // random candidate expression
            var ps = info.candidates
            if (ps.length === 0) return null
            return randArr(ps)
        }),
        new WeightedPair(4, () => {
            // random value read during generation
            var vs = info.variables;
            if (vs.length === 0) return null
            return randArr(vs)
        }),
        new WeightedPair(zeroD ? 0 : 3, () => {
            // random new field
            return <Data.Expr>factory.makeField(randomExpr(info, {obj: true}, depth-1), randomExpr(info, {}, depth-1))
        }),
        new WeightedPair(nonPrimitive || zeroD ? 0 : 2, () => {
            // random new addition
            return <Data.Expr>factory.makeAdd(randomExpr(info, {num: true}, depth-1), new Data.Const(maybe() ? 1 : -1))
        }),
    ]
    // filter out bad expressions
    var filter = (e: Data.Expr) => {
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
