



import Data = require('./Data')
import Recorder = require('./Recorder')

import Util = require('./util/Util')
var log = Util.log
var print = Util.print

import Ansi = require('./util/Ansicolors')


export function generate(init: any, n: number): any[] {
    var type = typeof init
    if (type === "number") {
        return [0, 1]
    } else if (type === "string") {
        return ["b", "def"]
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