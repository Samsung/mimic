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


export function search(f: (...a: any[]) => any, args: any[], config: SearchConfig = SearchConfig.DEFAULT): SearchResult {
    var state = Recorder.record(f, args, true)
    var p = state.trace.asProgram()
    var inputs = InputGen.generateInputs(state, args)
    /*inputs = [
        [['a', 'b', 'c'], 'd'],
        [['a', 'b'], 'e'],
        [[], 'f'],
    ]*/
    var realTraces = inputs.map((i) => Recorder.record(f, i).trace)

    var randomChange = (pp) => ProgramGen.randomChange(state, pp)
    var mainSearch = core_search(p, {
        metric: (pp) => Metric.evaluate(pp, inputs, realTraces),
        iterations: config.iterations,
        randomChange: randomChange,
        introIf: (pp) => introIf(f, pp, inputs, realTraces),
        base: config,
    })
    p = mainSearch.result

    var secondarySearch
    if (config.cleanupIterations > 0) {
        // shorten the program
        p = shorten(p, inputs, realTraces)

        // switch to the finalizing metric
        secondarySearch = core_search(p, {
            metric: (pp) => Metric.evaluate(pp, inputs, realTraces, true),
            iterations: config.cleanupIterations,
            randomChange: randomChange,
            introIf: (pp) => pp,
            base: config,
        })
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
    }
}

export interface SearchResult {
    iterations: number
    result: Data.Program
    score: number
}

export class SearchConfig {
    static DEFAULT = {
        iterations: 5000,
        cleanupIterations: 700,
        debug: 0,
    }
    iterations: number
    cleanupIterations: number
    debug: number
}

interface CoreSearchConfig {
    metric: (p: Data.Program) => number
    iterations: number
    randomChange: (p: Data.Program) => Data.Program
    introIf: (p: Data.Program) => Data.Program
    base: SearchConfig
}

function core_search(p: Data.Program, config: CoreSearchConfig): SearchResult {
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
                    print("  iteration "+i+": " + badness.toFixed(3) + " -> " + newbadness.toFixed(3))
                }
                p = newp
                badness = newbadness
            } else {
                var W_BETA = 6
                var alpha = Math.min(1, Math.exp(-W_BETA * newbadness / badness))
                if (maybe(alpha)) {
                    if (config.base.debug > 0) {
                        print("! iteration "+i+": " + badness.toFixed(3) + " -> " + newbadness.toFixed(3))
                    }
                    p = newp
                    badness = newbadness
                }
            }
        }
    }

    return {
        iterations: i,
        result: p,
        score: badness
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

