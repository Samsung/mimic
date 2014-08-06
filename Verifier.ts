

import Data = require('./Data')
import Recorder = require('./Recorder')

import Util = require('./util/Util')
var log = Util.log
var print = Util.print

import ansi = require('./util/Ansicolors')

export function isModel(model: Data.Program, prog: (...a: any[]) => any, args: any[]): boolean {
    var code = compile(model)
    var trace1 = Recorder.record(prog, args)
    var trace2 = Recorder.record(code, args)
    return trace1.trace.equals(trace2.trace)
}

function compile(prog: Data.Program) {
    return function (...a: any[]): any {
        return Function(prog.toString()).apply(null, a)
    }
}
