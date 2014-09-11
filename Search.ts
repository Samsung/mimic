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
import StructureInference = require('./StructureInference')
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
    var nInputsPerSearch = 20

    if (config.debug) Ansi.Gray("Recording original execution...")
    var trace = Recorder.record(f, args[0])
    if (config.debug) print(trace)

    if (config.debug) Ansi.Gray("Input generation...")
    var inputs = InputGen.generateInputs(f, args)
    var traces = inputs.map((i) => Recorder.record(f, i))
    if (config.debug) Ansi.Gray("Found " + inputs.length + " inputs.")

    if (config.debug) Ansi.Gray("Loop inference...")
    var loops = StructureInference.infer(traces)
    var loop = null
    if (loops.length > 0) {
        // for now, only use first loop
        loop = loops[0]
    }
    if (config.debug) Ansi.Gray("Found " + loops.length + " possible loops.")

    if (config.debug) Ansi.Gray("Input categorization...")
    var categories = InputGen.categorize(inputs, traces, loop)
    if (config.debug) Ansi.Gray("Found " + categories.length + " categories of inputs.")

    function straightLineSearch(f: (...a: any[]) => any, inputs: any[][], iterations: number, loop: StructureInference.Proposal, p?: Data.Program) {
        inputs = Random.pickN(inputs, nInputsPerSearch)
        if (!p) {
            var i = 0
            while (true) {
                var t = Recorder.record(f, inputs[i])
                // make sure we pick an input that has more than 0 iterations
                if (loop != null && loop.getNumIterations(t) == 0) {
                    i++
                    continue
                }
                p = Compile.compileTrace(t, loop)
                break
            }
        }
        if (config.debug) print(p)

        var candidates: Data.Expr[] = InputGen.genConstants(inputs, f)
        var maxArgs = Util.max(inputs.map((i) => i.length))
        for (var i = 0; i < maxArgs; i++) {
            candidates.push(new Data.Argument(i))
        }
        var mutationInfo = new ProgramGen.RandomMutationInfo(candidates, p.getVariables())

        if (config.debug) Ansi.Gray("  Using the following inputs:")
        if (config.debug) Ansi.Gray("  " + inputs.map((i) => i.map((j) => Util.inspect(j, false)).join(", ")).join("\n  "))
        if (config.debug) Ansi.Gray("  Record correct behavior on " + inputs.length + " inputs...")
        var realTraces = inputs.map((i) => Recorder.record(f, i))

        if (config.debug) Ansi.Gray("  Starting search...")

        var result = core_search(p, {
            metric: (pp) => Metric.evaluate(pp, inputs, realTraces),
            iterations: iterations,
            randomChange: (pp) => ProgramGen.randomChange(mutationInfo, pp),
            base: config,
        })
        result.executions = inputs.length * result.iterations

        if (config.debug) Ansi.Gray("  Found a program in " + result.iterations + " iterations of score " + result.score.toFixed(2) + ".")
        if (config.debug) print(result.result)
        return result
    }

    var p: Data.Program
    var mainSearch = SearchResult.Empty
    if (config.debug) Ansi.Gray(Util.linereturn())
    if (categories.length > 1) {
        var res: SearchResult[] = []
        var iterations = Math.ceil(0.8*config.iterations/categories.length)
        for (var i = 0; i < categories.length; i++) {
            if (config.debug) Ansi.Gray("Searching a program for input category " + (i+1) + "/" + categories.length + ".")
            if (i > 0) {
                loop = null
            }
            res[i] = straightLineSearch(f, categories[i].inputs, iterations, loop)
            mainSearch = mainSearch.combine(res[i])
            if (config.debug) Ansi.Gray(Util.linereturn())
        }
        if (config.debug) Ansi.Gray("Searching a program for all " + inputs.length + " inputs.")
        p = new Data.Program(combinePrograms(res.map((p) => p.result.body)))
        mainSearch = straightLineSearch(f, inputs, 0.2*iterations, null, p).combine(mainSearch)
        p = mainSearch.result
    } else {
        if (config.debug) Ansi.Gray("Searching a program for all " + inputs.length + " inputs.")
        mainSearch = straightLineSearch(f, inputs, config.iterations, loop)
        p = mainSearch.result
        if (config.debug) Ansi.Gray(Util.linereturn())
    }

    var secondarySearch: SearchResult
    if (config.cleanupIterations > 0) {
        var cleanupInputs = Random.pickN(inputs, nInputsPerSearch)
        if (config.debug) Ansi.Gray("Starting secondary cleanup search...")

        var candidates: Data.Expr[] = InputGen.genConstants(inputs, f)
        var maxArgs = Util.max(inputs.map((i) => i.length))
        for (var i = 0; i < maxArgs; i++) {
            candidates.push(new Data.Argument(i))
        }
        var mutationInfo = new ProgramGen.RandomMutationInfo(candidates, p.getVariables())

        // shorten the program
        var cleanupTraces = cleanupInputs.map((i) => Recorder.record(f, i))
        p = shorten(p, cleanupInputs, cleanupTraces)

        // switch to the finalizing metric
        secondarySearch = core_search(p, {
            metric: (pp) => Metric.evaluate(pp, cleanupInputs, cleanupTraces, true),
            iterations: config.cleanupIterations,
            randomChange: (pp) => ProgramGen.randomChange(mutationInfo, pp),
            base: config,
        })
        secondarySearch.executions = cleanupInputs.length * secondarySearch.iterations
        p = secondarySearch.result
        if (config.debug) Ansi.Gray(Util.linereturn())
    } else {
        secondarySearch = SearchResult.Empty
    }

    //print(inputs.all.map((i) => Recorder.record(f, i)).join("\n"))
    //line()
    //var f2 = Compile.compile(p)
    //print(inputs.all.map((i) => Recorder.record(f2, i)).join("\n"))

    var result = mainSearch.combine(secondarySearch)
    result.result = p
    result.score = Metric.evaluate(p, inputs, traces)
    return result
}

function isEqualModulaVar(a: Data.Expr, b: Data.Expr, vm: Map<Data.Var, Data.Var>) {
    if (a.type !== b.type) {
        return false
    }
    var rec = (a, b) => isEqualModulaVar(a, b, vm)
    var aa, bb
    switch (a.type) {
        case Data.ExprType.Field:
            aa = <Data.Field>a
            bb = <Data.Field>b
            return rec(aa.o, bb.o) && rec(aa.f, bb.f)
        case Data.ExprType.Const:
            aa = <Data.Const>a
            bb = <Data.Const>b
            return aa.val === bb.val
        case Data.ExprType.Arg:
            aa = <Data.Argument>a
            bb = <Data.Argument>b
            return aa.i === bb.i
        case Data.ExprType.Var:
            aa = <Data.Var>a
            bb = <Data.Var>b
            return vm.get(aa) === bb
        default:
            return false
    }
}

export function combinePrograms(progs: Data.Stmt[]) {
    if (progs.length === 1) {
        return progs[0]
    }
    var b = progs.pop()
    var a = progs.pop()

    var isLocalVarAssign = (s: Data.Stmt) => s.type === Data.StmtType.Assign &&
        (<Data.Assign>s).isDecl &&
        (<Data.Assign>s).rhs.type === Data.ExprType.Field
    var getVar = (s: Data.Stmt) => <Data.Var>(<Data.Assign>s).lhs
    var getRhs = (s: Data.Stmt) => (<Data.Assign>s).rhs
    var prefix: Data.Stmt[] = []

    var vm = new Map<Data.Var, Data.Var>()

    while (true) {
        var as = a.allStmts()
        var bs = b.allStmts()
        if (as.length === 0 || bs.length === 0) {
            break
        }
        var a0 = as[0]
        var b0 = bs[0]
        if (!isLocalVarAssign(a0) || !isLocalVarAssign(b0)) {
            break
        }
        var av = getVar(a0)
        var arhs = getRhs(a0)
        var bv = getVar(b0)
        var brhs = getRhs(b0)
        if (isEqualModulaVar(arhs, brhs, vm)) {
            vm.set(av, bv)
            prefix.push(a0)
            prefix.push(new Data.Assign(bv, av, true))
            a = a.replace(0, Data.Seq.Empty)
            b = b.replace(0, Data.Seq.Empty)
        } else {
            break
        }
    }

    var t = new Data.Const(true)
    prefix.push(new Data.If(t, a, b))
    var res: Data.Stmt = new Data.Seq(prefix)

    if (progs.length === 0) {
        return res
    }

    return combinePrograms([res].concat(progs))
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

function core_search(p: Data.Program, config: CoreSearchConfig): SearchResult {
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
                print(newp)
            }
            p = newp
            badness = newbadness
        } else {
            var W_BETA = 20
            var alpha = Math.min(1, Math.exp(-W_BETA * newbadness / badness))
            if (maybe(alpha)) {
                if (config.base.debug > 0) {
                    Ansi.Gray(" ! improvement at iteration "+Util.pad(i, 5, ' ')+": " +
                        Util.pad(badness.toFixed(3), 7, ' ') + " -> " + Util.pad(newbadness.toFixed(3), 7, ' '))
                }
                p = newp
                badness = newbadness
            }
            if (newbadness < 1) {
                //print(badness)
                //print(newbadness)
                //print(newp)
            }
        }

        if (i % 1000 === 0) {
            if (config.base.debug) print("Time: " + Util.stop(start) + ", iteration: " + i)
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

