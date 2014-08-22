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

/**
 * Randomly mutate the given program.
 */
export function randomChange(state: Recorder.State, p: Data.Program): Data.Program {
    var stmts = p.body.allStmts()
    var si = randInt(stmts.length)
    // all possible transformations (they return false if they cannot be applied)
    var options = [
        new WeightedPair(0, () => { // remove this statement
            /*if (stmts.length < 1) return undefined
             stmts.splice(si, 1)
             return true*/
            return undefined
        }),
        new WeightedPair(0, () => { // insert a new statement
            /*stmts.splice(si, 0, randomStmt(state))
             return true*/
            return undefined
        }),
        new WeightedPair(0, () => { // swap with another statement
            /*if (stmts.length < 2) return undefined
             var si2
             while ((si2 = randInt(stmts.length)) === si) {}
             var t = stmts[si]
             stmts[si] = stmts[si2]
             stmts[si2] = t
             return true*/
            return undefined
        }),
        new WeightedPair(7, () => { // modify an existing statement
            if (stmts.length < 1) return undefined
            var ss = stmts[si]
            var s
            var news
            switch (ss.type) {
                case Data.StmtType.Assign:
                    s = <Data.Assign>ss
                    if (s.lhs.type === Data.ExprType.Field) {
                        if (maybe(0.3334)) {
                            news = new Data.Assign(s.lhs, randomExpr(state))
                        } else if (maybe(0.5)) {
                            var field = new Data.Field((<Data.Field>s.lhs).o, randomExpr(state))
                            news = new Data.Assign(field, s.rhs)
                        } else {
                            var field = new Data.Field(randomExpr(state, {obj: true}), (<Data.Field>s.lhs).f)
                            news = new Data.Assign(field, s.rhs)
                        }
                    } else {
                        Util.assert(s.lhs.type === Data.ExprType.Var && s.rhs.type === Data.ExprType.Field)
                        var f = <Data.Field>s.rhs
                        if (maybe()) {
                            news = new Data.Assign(s.lhs, new Data.Field(f.o, randomExpr(state)), s.isDecl)
                        } else {
                            news = new Data.Assign(s.lhs, new Data.Field(randomExpr(state, {lhs: true}), f.f), s.isDecl)
                        }
                    }
                    break
                case Data.StmtType.Return:
                    news = new Data.Return(randomExpr(state))
                    break
                case Data.StmtType.DeleteProp:
                    s = <Data.DeleteProp>ss
                    if (maybe()) {
                        news = new Data.DeleteProp(randomExpr(state, {arr: true, obj: true}), s.f)
                    } else {
                        news = new Data.DeleteProp(s.o, randomExpr(state))
                    }
                    break
                case Data.StmtType.If:
                    s = <Data.If>ss
                    news = new Data.If(randomExpr(state), s.thn, s.els)
                    break
                default:
                    Util.assert(false, () => "unhandled statement modification: " + ss)
                    break
            }
            return new Data.Program(p.body.replace(si, news))
        }),
    ]
    // randomly choose an action (and execute it)
    var res
    while ((res = pick(options)()) === undefined) {}

    Util.assert(res instanceof Data.Program)
    return res
}


function randomStmt(state: Recorder.State): Data.Stmt {
    var options = [
        () => {
            return new Data.Return(randomExpr(state))
        },
        () => {
            return new Data.Assign(randomExpr(state, {lhs: true}), randomExpr(state))
        },
    ]
    return randArr(options)()
}


function randomExpr(state: Recorder.State, args: any = {}, depth: number = 2): Data.Expr {
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
            var ps = state.getPrestates()
            if (ps.length === 0) return undefined
            return randArr(ps)
        }),
        new WeightedPair(4, () => {
            // random value read during generation
            var vs = state.variables;
            if (vs.length === 0) return undefined
            return randArr(vs)
        }),
        new WeightedPair(zeroD ? 0 : 3, () => {
            // random new field
            return <Data.Expr>new Data.Field(randomExpr(state, {obj: true}, depth-1), randomExpr(state, {}, depth-1))
        }),
        new WeightedPair(nonPrimitive || zeroD ? 0 : 2, () => {
            // random new addition
            return <Data.Expr>new Data.Add(randomExpr(state, {num: true}, depth-1), new Data.Const(maybe() ? 1 : -1))
        }),
    ]
    // filter out bad expressions
    var filter = (e: Data.Expr) => {
        if (e === undefined) return e

        // filter by requirement
        if (e.hasValue() && hasRequirement) {
            var t = typeof e.getValue()
            if (t === "number" && num) {
                return e
            }
            if (t === "object" && (obj || arr || lhs)) {
                if (lhs && e.getValue() === null) {
                    return undefined
                }
                return e
            }
            return undefined // no match
        }
        // filter by depth
        if (e.depth > depth) return undefined
        return e
    }
    var res
    while ((res = filter(pick(options)())) === undefined) {}
    return res
}
