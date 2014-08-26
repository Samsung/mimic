



import Data = require('./Data')
import Recorder = require('./Recorder')

import Util = require('./util/Util')
var log = Util.log
var print = Util.print
var line = Util.line

import Ansi = require('./util/Ansicolors')


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
        return [init]
    } else if (type === "undefined") {
        // TODO better strategy
        return [undefined]
    }

    Util.assert(false, () => "unknown type encountered: " + type)
    return []
}

export function generateInputs(state: Recorder.State, args: any[]): any[][] {
    var debug = 0
    var helper = function (ps: Data.Expr[]): any[][] {
        if (ps.length === 0) return [args]
        var res: any[][] = []
        var p = ps[0]
        var rest = helper(ps.slice(1))
        for (var j = 0; j < rest.length; j++) {
            var r = rest[j]
            var init = p.eval(r)
            var vals = generate(init, 3)
            Util.assert(vals.length > 0)
            for (var i = 0; i < vals.length; i++) {
                var nr = Util.clone(r)
                if (debug) {
                    Ansi.Gray("update " + p + " to " + vals[i])
                }
                p.update(nr, vals[i])
                res.push(nr)
            }
        }
        return res
    }

    if (debug) {
        Ansi.Gray(state.getPrestates().join("\n"))
    }
    return helper(state.getPrestates()).concat([args])
}

export function genInputs(f: (...a: any[]) => any, initial: any[]): any[][] {
    var state = Recorder.record(f, initial)
    var newArgs = generateInputs(state, initial)
    var res = state.getPrestates()
    print(res.join("\n"))
    line()
    for (var i = 0; i < newArgs.length; i++) {
        var ps = Recorder.record(f, newArgs[i]).getPrestates()
        res = res.concat(ps)
    }
    res = Util.dedup2(res)
    var filtered = []
    for (var i = 0; i < res.length; i++) {
        var e
        if (res[i].type === Data.ExprType.Field) {
            e = <Data.Field>res[i]
            /*if (Array.isArray(e.o.getValue()) && typeof e.f.getValue() === 'number') {
                filtered.push(e.o)
                continue
            }*/
            if (Array.isArray(e.o.getValue()) && e.f.getValue() === 'length') {
                // we always vary the array length, so no need to kep this
                filtered.push(e.o)
                continue
            }
        }
        filtered.push(res[i])
    }
    filtered = Util.dedup2(filtered)
    print(filtered.join("\n"))
    return null
}
