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


export function search(f: (...a: any[]) => any, args: any[], config: SearchConfig = new SearchConfig()): SearchResult {
    Ansi.Gray("Recording original execution...")

    var state = Recorder.record(f, args, true)
    var p = state.trace.asProgram()

    Ansi.Gray("Input generation...")
    var inputs = InputGen.generateInputs(state, args)
    //inputs = [[['a']], [['b', 'c']], [[]]]
    Ansi.Gray("  " + inputs.map((i) => i.map((j) => Util.inspect(j, false)).join(", ")).join("\n  "))

    Ansi.Gray("Record correct behavior on inputs...")
    var realTraces = inputs.map((i) => Recorder.record(f, i).trace)

    Ansi.Gray("Starting core search...")

    var randomChange = (pp) => ProgramGen.randomChange(state, pp)
    var mainSearch = core_search(p, {
        metric: (pp) => Metric.evaluate(pp, inputs, realTraces),
        iterations: config.iterations,
        randomChange: randomChange,
        introIf: (pp) => introIf(f, pp, inputs, realTraces),
        base: config,
    }, inputs.length)
    p = mainSearch.result

    var secondarySearch
    if (config.cleanupIterations > 0) {
        Ansi.Gray("Starting secondary cleanup search...")

        // shorten the program
        p = shorten(p, inputs, realTraces)

        // switch to the finalizing metric
        secondarySearch = core_search(p, {
            metric: (pp) => Metric.evaluate(pp, inputs, realTraces, true),
            iterations: config.cleanupIterations,
            randomChange: randomChange,
            introIf: (pp) => pp,
            base: config,
        }, inputs.length)
        p = secondarySearch.result
    } else {
        secondarySearch = {
            iterations: 0
        }
    }

    return {
        result: p,
        iterations: mainSearch.iterations + secondarySearch.iterations,
        score: mainSearch.score,
        speed: mainSearch.speed,
    }
}

export interface SearchResult {
    iterations: number
    result: Data.Program
    score: number
    speed: string
}

export class SearchConfig {
    static DEFAULT = {
        iterations: 5000,
        cleanupIterations: 700,
        debug: 0,
    }
    constructor(o: SearchConfig = SearchConfig.DEFAULT) {
        this.iterations = o.iterations
        this.cleanupIterations = o.cleanupIterations
        this.debug = o.debug
    }
    iterations: number
    cleanupIterations: number
    debug: number

    toString(): string {
        return this.iterations + " core iterations, and " + this.cleanupIterations + " for cleanup"
    }
}

interface CoreSearchConfig {
    metric: (p: Data.Program) => number
    iterations: number
    randomChange: (p: Data.Program) => Data.Program
    introIf: (p: Data.Program) => Data.Program
    base: SearchConfig
}

function core_search(p: Data.Program, config: CoreSearchConfig, nexecutions: number): SearchResult {
    var start = Util.start()
    var badness = config.metric(p)
    var n = config.iterations
    var i
    for (i = 0; i < n; i++) {
        if (badness === 0) {
            // stop search if we found a perfect program
            break;
        }
        var newp
        if (i === Math.floor(n*0.5) && badness > 0) {
            // maybe we should have an if?
            p = config.introIf(p)
        } else {
            newp = config.randomChange(p)

            var newbadness = config.metric(newp)
            if (newbadness < badness) {
                if (config.base.debug > 0) {
                    Ansi.Gray("   improvement at iteration "+Util.pad(i, 5, ' ')+": " +
                        Util.pad(badness.toFixed(3), 7, ' ') + " -> " + Util.pad(newbadness.toFixed(3), 7, ' '))
                }
                p = newp
                badness = newbadness
            } else {
                var W_BETA = 6
                var alpha = Math.min(1, Math.exp(-W_BETA * newbadness / badness))
                if (maybe(alpha)) {
                    if (config.base.debug > 0) {
                        Ansi.Gray(" ! improvement at iteration "+Util.pad(i, 5, ' ')+": " +
                            Util.pad(badness.toFixed(3), 7, ' ') + " -> " + Util.pad(newbadness.toFixed(3), 7, ' '))
                    }
                    p = newp
                    badness = newbadness
                }
            }
        }
    }

    var time = Util.stop(start)

    return {
        iterations: i,
        result: p,
        score: badness,
        speed: (i*nexecutions*1000/time).toFixed(2) + " executions per second, or " +
            (i*1000/time).toFixed(2) + " iterations per second",
    }
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

