



import Data = require('./Data')
import Recorder = require('./Recorder')

import Util = require('./util/Util')
var log = Util.log
var print = Util.print
var line = Util.line

import Ansi = require('./util/Ansicolors')

/**
 * Generate up to `n' other values of similar shape as `init'.
 * The value `init' itself doesn't have to be returned (but can).
 */
export function generate(init: any, n: number): any[] {
    var type = typeof init
    if (type === "number") {
        return [0, 1]
    } else if (type === "string") {
        return ["b", "def"]
    } else if (type === "boolean") {
        return [true, false]
    } else if (type === "object") {
        // TODO better strategy
        if (Array.isArray(init)) {
            return [[]]
        }
        return []
    } else if (type === "undefined") {
        // TODO better strategy
        return [undefined]
    }

    Util.assert(false, () => "unknown type encountered: " + type)
    return []
}

export function generateInputs(f: (...a: any[]) => any, args: any[]): any[][] {
    var candidates = genCandidateExpr(f, args).reverse()
    print(candidates.join("\n"))
    return generateInputsAux(f, args, candidates)
}

function generateInputsAux(f: (...a: any[]) => any, args: any[], exprs: Data.Expr[]): any[][] {
    var helper = function (ps: Data.Expr[]): any[][] {
        if (ps.length === 0) return [args]
        var res: any[][] = []
        var p = ps[0]
        var rest = helper(ps.slice(1))
        for (var j = 0; j < rest.length; j++) {
            var r = rest[j]

            // one version where everything is unchanged
            res.push(Util.clone(r))

            // skip if we can't update this
            if (!p.canBeUpdated(r)) {
                continue
            }

            var init = p.eval(r)
            var vals = generate(init, 3)

            for (var i = 0; i < vals.length; i++) {

                // skip if the update would be a noop
                if (p.isUpdateNop(args, vals[i])) {
                    continue
                }

                var nr = Util.clone(r)
                p.update(nr, vals[i])
                res.push(nr)
            }
        }
        return res
    }

    return helper(exprs)
}

/**
 * Returns a list of interesting expressions that should be modified to get inputs.
 */
function genCandidateExpr(f: (...a: any[]) => any, initial: any[]): Data.Expr[] {
    function filter(input: Data.Expr[]): Data.Expr[] {
        var filtered: Data.Expr[] = []
        for (var i = 0; i < input.length; i++) {
            var e
            if (input[i].type === Data.ExprType.Field) {
                e = <Data.Field>input[i]
                /*if (Array.isArray(e.o.getValue()) && typeof e.f.getValue() === 'number') {
                 filtered.push(e.o)
                 continue
                 }*/
                if (
                    Array.isArray(e.o.getValue()) && e.f.getValue() === 'length') {
                    // we always vary the array length, so no need to kep this
                    // but make sure we have the array itself
                    filtered.push(e.o)
                    continue
                }
            }
            filtered.push(input[i])
        }
        filtered = Util.dedup2(filtered)
        return filtered;
    }

    var state = Recorder.record(f, initial)
    var newArgs = generateInputsAux(f, initial, filter(state.getPrestates()))
    var res = state.getPrestates()
    for (var i = 0; i < newArgs.length; i++) {
        var ps = Recorder.record(f, newArgs[i]).getPrestates()
        res = res.concat(ps)
    }
    res = Util.dedup2(res)
    return filter(res)
}
