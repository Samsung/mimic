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

    Ansi.Gray("Input generation...")
    var inputs = InputGen.generateInputs(f, args)
    var nCategories = inputs.categories.length;
    Ansi.Gray("Found " + nCategories + " categories of inputs (" + inputs.all.length + " inputs total).")
    //Ansi.Gray("  " + inputs.map((i) => i.map((j) => Util.inspect(j, false)).join(", ")).join("\n  "))

    function straightLineSearch(f: (...a: any[]) => any, inputs: any[][], iterations: number, p?: Data.Program) {
        if (!p) {
            var state = Recorder.record(f, inputs[0], true)
            p = state.trace.asProgram()
        }

        var candidates = InputGen.genCandidates(inputs, f)
        var mutationInfo = new ProgramGen.RandomMutationInfo(candidates, p.getVariables())

        Ansi.Gray("  Record correct behavior on " + inputs.length + " inputs...")
        var realTraces = inputs.map((i) => Recorder.record(f, i).trace)

        Ansi.Gray("  Starting search...")

        var result = core_search(p, {
            metric: (pp) => Metric.evaluate(pp, inputs, realTraces),
            iterations: iterations,
            randomChange: (pp) => ProgramGen.randomChange(mutationInfo, pp),
            base: config,
        }, inputs.length)

        Ansi.Gray("  Found a program in " + result.iterations + " iterations of score " + result.score.toFixed(2) + ".")
        return result
    }

    var p: Data.Program
    var mainSearch
    Ansi.Gray(Util.linereturn())
    if (nCategories > 1) {
        var res: SearchResult[] = []
        var iterations = Math.ceil(0.8*config.iterations/nCategories)
        for (var i = 0; i < nCategories; i++) {
            Ansi.Gray("Searching a program for input category " + (i+1) + "/" + nCategories + ".")
            res[i] = straightLineSearch(f, inputs.categories[i].inputs, iterations)
            Ansi.Gray(Util.linereturn())
        }
        Ansi.Gray("Searching a program for all " + inputs.all.length + " inputs.")
        Util.assert(nCategories === 2, () => "cannot handle more than 2 categories at the moment")
        p = new Data.Program(new Data.If(new Data.Const(true), res[0].result.body, res[1].result.body))
        mainSearch = straightLineSearch(f, inputs.all, 0.2*iterations, p)
        p = mainSearch.result
    } else {
        Ansi.Gray("Searching a program for all " + inputs.all.length + " inputs.")
        mainSearch = straightLineSearch(f, inputs.all, config.iterations)
        p = mainSearch.result
        Ansi.Gray(Util.linereturn())
    }

    var secondarySearch
    if (config.cleanupIterations > 0) {
        Ansi.Gray("Starting secondary cleanup search...")

        var candidates = InputGen.genCandidates(inputs.all, f)
        var mutationInfo = new ProgramGen.RandomMutationInfo(candidates, p.getVariables())
        var realTraces = inputs.all.map((i) => Recorder.record(f, i).trace)

        // shorten the program
        p = shorten(p, inputs.all, realTraces)

        // switch to the finalizing metric
        secondarySearch = core_search(p, {
            metric: (pp) => Metric.evaluate(pp, inputs.all, realTraces, true),
            iterations: config.cleanupIterations,
            randomChange: (pp) => ProgramGen.randomChange(mutationInfo, pp),
            base: config,
        }, inputs.all.length)
        p = secondarySearch.result
        Ansi.Gray(Util.linereturn())
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
        var newp = config.randomChange(p)

        var newbadness = config.metric(newp)
        if (newbadness < badness) {
            if (config.base.debug > 0) {
                Ansi.Gray("   improvement at iteration "+Util.pad(i, 5, ' ')+": " +
                    Util.pad(badness.toFixed(3), 7, ' ') + " -> " + Util.pad(newbadness.toFixed(3), 7, ' '))
            }
            p = newp
            badness = newbadness
        } else {
            var W_BETA = 60
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

