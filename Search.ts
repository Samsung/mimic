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
import Compile = require('./Compile')
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


export function search(f: (...a: any[]) => any, args: any[][], config: SearchConfig = new SearchConfig()): SearchResult {
    Ansi.Gray("Recording original execution...")
    var trace = Recorder.record(f, args[0])
    print(trace)

    Ansi.Gray("Input generation...")
    var inputs = InputGen.generateInputs(f, args)
    var nCategories = inputs.categories.length;
    Ansi.Gray("Found " + nCategories + " categories of inputs (" + inputs.all.length + " inputs total).")

    function straightLineSearch(f: (...a: any[]) => any, inputs: any[][], iterations: number, p?: Data.Program) {
        if (!p) {
            p = Compile.compileTrace(Recorder.record(f, inputs[0]))
        }
        print(p)

        var candidates = InputGen.genCandidates(inputs, f)
        var mutationInfo = new ProgramGen.RandomMutationInfo(candidates, p.getVariables())

        Ansi.Gray("  Using the following inputs:")
        Ansi.Gray("  " + inputs.map((i) => i.map((j) => Util.inspect(j, false)).join(", ")).join("\n  "))
        Ansi.Gray("  Record correct behavior on " + inputs.length + " inputs...")
        var realTraces = inputs.map((i) => Recorder.record(f, i))

        Ansi.Gray("  Starting search...")

        var result = core_search(p, {
            metric: (pp) => Metric.evaluate(pp, inputs, realTraces),
            iterations: iterations,
            randomChange: (pp) => ProgramGen.randomChange(mutationInfo, pp),
            base: config,
        }, inputs.length)
        result.executions = inputs.length * result.iterations

        Ansi.Gray("  Found a program in " + result.iterations + " iterations of score " + result.score.toFixed(2) + ".")
        print(result.result)
        return result
    }

    var p: Data.Program
    var mainSearch = SearchResult.Empty
    Ansi.Gray(Util.linereturn())
    if (nCategories > 1) {
        var res: SearchResult[] = []
        var iterations = Math.ceil(0.8*config.iterations/nCategories)
        for (var i = 0; i < nCategories; i++) {
            Ansi.Gray("Searching a program for input category " + (i+1) + "/" + nCategories + ".")
            res[i] = straightLineSearch(f, inputs.categories[i].inputs, iterations)
            mainSearch = mainSearch.combine(res[i])
            Ansi.Gray(Util.linereturn())
        }
        Ansi.Gray("Searching a program for all " + inputs.all.length + " inputs.")
        Util.assert(nCategories === 2, () => "cannot handle more than 2 categories at the moment")
        p = new Data.Program(new Data.If(new Data.Const(true), res[0].result.body, res[1].result.body))
        mainSearch = straightLineSearch(f, inputs.all, 0.2*iterations, p).combine(mainSearch)
        p = mainSearch.result
    } else {
        Ansi.Gray("Searching a program for all " + inputs.all.length + " inputs.")
        mainSearch = straightLineSearch(f, inputs.all, config.iterations)
        p = mainSearch.result
        Ansi.Gray(Util.linereturn())
    }

    var secondarySearch: SearchResult
    var realTraces = inputs.all.map((i) => Recorder.record(f, i))
    if (config.cleanupIterations > 0) {
        Ansi.Gray("Starting secondary cleanup search...")

        var candidates = InputGen.genCandidates(inputs.all, f)
        var mutationInfo = new ProgramGen.RandomMutationInfo(candidates, p.getVariables())

        // shorten the program
        p = shorten(p, inputs.all, realTraces)

        // switch to the finalizing metric
        secondarySearch = core_search(p, {
            metric: (pp) => Metric.evaluate(pp, inputs.all, realTraces, true),
            iterations: config.cleanupIterations,
            randomChange: (pp) => ProgramGen.randomChange(mutationInfo, pp),
            base: config,
        }, inputs.all.length)
        secondarySearch.executions = inputs.all.length * secondarySearch.iterations
        p = secondarySearch.result
        Ansi.Gray(Util.linereturn())
    } else {
        secondarySearch = SearchResult.Empty
    }

    //print(inputs.all.map((i) => Recorder.record(f, i)).join("\n"))
    //line()
    //var f2 = Compile.compile(p)
    //print(inputs.all.map((i) => Recorder.record(f2, i)).join("\n"))

    var result = mainSearch.combine(secondarySearch)
    result.result = p
    result.score = Metric.evaluate(p, inputs.all, realTraces)
    return result
}

export class SearchResult {
    static Empty = new SearchResult({
        iterations: 0,
        result: <Data.Program>null,
        score: -1,
        executions: 0,
        time: 0,
    })
    public iterations: number
    public result: Data.Program
    public score: number
    public executions: number
    public time: number
    constructor(o: { iterations: any; result: Data.Program; score: number; executions: number; time: number; }) {
        this.iterations = o.iterations
        this.result = o.result
        this.score = o.score
        this.executions = o.executions
        this.time = o.time
    }
    combine(o: SearchResult): SearchResult {
        return new SearchResult({
            iterations: this.iterations + o.iterations,
            result: this.result,
            score: this.score,
            executions: this.executions + o.executions,
            time: this.time + o.time
        })
    }
    getStats(): string {
        var ex = (this.executions * 1000 / this.time).toFixed(2)
        var it = (this.iterations * 1000 / this.time).toFixed(2)
        return ex + " executions per second\n" + it + " iterations per second"
    }
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
        if (p.body.numberOfStmts() === 0) break;
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

    var time = Util.stop(start)

    return new SearchResult({
        iterations: i,
        result: p,
        score: badness,
        executions: -1,
        time:time,
    })
}

function shorten(p: Data.Program, inputs: any[][], realTraces: Data.Trace[]) {

    var badness = Metric.evaluate(p, inputs, realTraces)
    for (var i = 0; i < 300; i++) {
        if (p.body.numberOfStmts() === 0) return p

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

