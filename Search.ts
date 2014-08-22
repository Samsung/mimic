/**
 * Random search over javascript programs to find models.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Data = require('./Data')
import Util = require('./util/Util')
import Random = require('./util/Random')
import Recorder = require('./Recorder')
import Metric = require('./Metric')
import InputGen = require('./InputGen')
import ProgramGen = require('./ProgramGen')
import Ansi = require('./util/Ansicolors')

var randInt = Random.randInt
var WeightedPair = Random.WeightedPair
var maybe = Random.maybe
var pick = Random.pick
var randArr = Random.randArr

var print = Util.print
var log = Util.log
var line = Util.line


export function search(f, args) {
    var state = Recorder.record(f, args, true)
    var p = state.trace.asProgram()
    var inputs = InputGen.generateInputs(state, args)
    /*inputs = [
        [['a', 'b', 'c'], 'd'],
        [['a', 'b'], 'e'],
        [[], 'f'],
    ]*/
    var realTraces = inputs.map((i) => Recorder.record(f, i).trace)

    var badness = Metric.evaluate(p, inputs, realTraces)
    print("Starting search with the following inputs:")
    print("  " + inputs.map((a) => Util.inspect(a)).join("\n  "))

    var cache: any = {}
    var n = 2000
    var do_finalize = true
    for (var i = 0; i < n; i++) {
        var newp
        if (i === Math.floor(n/2) && badness > 0) {
            // maybe we should have an if?
            p = introIf(f, p, inputs, realTraces)

            print("--> introduce if")
        } else {
            newp = ProgramGen.randomChange(state, p)

            cache[newp.toString()] = (cache[newp.toString()] || 0) + 1
            if (do_finalize && !finalizing && (i / n > 0.8)) {
                // switch metric
                p = shorten(p, inputs, realTraces)
                badness = Metric.evaluate(p, inputs, realTraces, true)
            }
            var finalizing = do_finalize && (i / n > 0.8)
            var newbadness = Metric.evaluate(newp, inputs, realTraces, finalizing)
            if (newbadness < badness) {
                print("  iteration "+i+": " + badness.toFixed(3) + " -> " + newbadness.toFixed(3))
                p = newp
                badness = newbadness
            } else {
                var W_BETA = 6
                var alpha = Math.min(1, Math.exp(-W_BETA * newbadness / badness))
                //print("r: " + ( alpha).toFixed(4) + " from " + newbadness)
                if (maybe(alpha)) {
                    print("! iteration "+i+": " + badness.toFixed(3) + " -> " + newbadness.toFixed(3))
                    p = newp
                    badness = newbadness
                }
            }
        }
    }
    if (false) {
        var res = []
        for (var i in cache) {
            res.push(cache[i])
        }
        print(res.sort((a,b) => b-a).slice(0, 100))
        print(res.length)
    }

    /*
     line()
     print(evaluate(p, inputs, realTraces))
     print(p)
     line()
     var s: any = p.stmts[5]
     s.rhs = new Data.Add(s.rhs, new Data.Const(-1))
     print(evaluate(p, inputs, realTraces))
     print(p)
     */

    /*
     line()
     print(realTraces.join("\n"))
     line()
     print(inputs.map((i) => Recorder.record(Verifier.compile(p), i).trace).join("\n"))
     line()
     */

    print("Initial:")
    var initial = state.trace.asProgram()
    print(Ansi.lightgrey(initial.toString()))
    line()
    print("Found:")
    print(p)
    line()
    /*
     print("Goal:")
     print(Ansi.lightgrey("  arguments[0][\"a\"] = arguments[1]\n"+
     "  arguments[1][arguments[2]] = arguments[1][\"g\"]\n"+
     "  arguments[1][arguments[2]] = \"b\"\n"+
     "  var n0 = arguments[1][\"f\"]\n" +
     "  arguments[0][\"f2\"] = n0\n"+
     "  return arguments[3]"))*/
}

function shorten(p: Data.Program, inputs: any[][], realTraces: Data.Trace[]) {

    var badness = Metric.evaluate(p, inputs, realTraces)
    for (var i = 0; i < 300 && p.body.numberOfStmts() > 0; i++) {
        var j = randInt(p.body.numberOfStmts())
        var newp = new Data.Program(p.body.replace(j, Data.Seq.Empty))
        var newbadness = Metric.evaluate(newp, inputs, realTraces)
        if (newbadness <= badness) {
            p = newp
            badness = newbadness
        }
    }
    return p
}

function introIf(f, p: Data.Program, inputs: any[][], realTraces: Data.Trace[], finalizing: boolean = false): Data.Program {
    var code = Recorder.compile(p)
    var tds = []
    for (var i = 0; i < inputs.length; i++) {
        var candidateTrace = Recorder.record(code, inputs[i]).trace
        tds[i] = {
            i: i,
            val: Metric.traceDistance(realTraces[i], candidateTrace),
        }
    }
    tds = tds.sort((a, b) => b.val - a.val)
    var fulltrace = Recorder.record(f, inputs[tds[0].i], true)
    var stmt = new Data.If(new Data.Const(true), p.body, fulltrace.trace.asStmt())
    return new Data.Program(stmt)
}

