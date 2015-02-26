/*
 * Copyright (c) 2014 Samsung Electronics Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */




import Data = require('./Data')
import Recorder = require('./Recorder')
import StructureInference = require('./StructureInference')

import Util = require('./util/Util')
import Random = require('./util/Random')
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
            var res = [[]]
            if (init.length > 0) {
                var oneless = Util.clone(init)
                oneless.pop()
                res.push(oneless)
            }
            return res
        }
        return []
    } else if (type === "undefined") {
        // TODO better strategy
        return []
    } else if (type === "function") {
        // TODO better strategy
        return []
    }

    Util.assert(false, () => "unknown type encountered: " + type)
    return []
}

export function categorize(inputs, traces: Data.Trace[], loop: StructureInference.Proposal = null) {
    var map = new Map<string, number>()
    var res = []
    var cat = 1
    if (loop === null) {
        cat = 0
    }
    for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i]
        var idx
        if (loop != null && loop.worksFor.indexOf(i) !== -1) {
            // belongs to loop category
            idx = "<loop>"
        } else {
            idx = traces[i].getSkeleton()
        }
        if (!map.has(idx)) {
            var catt = cat
            if (idx == "<loop>") {
                catt = 0
            } else {
                cat += 1
            }
            map.set(idx, catt)
            res[catt] = {
                id: catt,
                inputs: [],
            }
        }
        res[map.get(idx)].inputs.push(input)
    }
    return res
}

export function generateInputs(f: (...a: any[]) => any, args: any[][]) {
    var candidates = genCandidateExpr(f, args)
    return generateInputsAux(f, args, candidates)
}

function generateInputsAux(f: (...a: any[]) => any, initials: any[][], exprs: Data.Prestate[]): any[][] {
    var helper = function (ps: Data.Expr[]): any[][] {
        if (ps.length === 0) return initials
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
                if (p.isUpdateNop(r, vals[i])) {
                    continue
                }

                var nr = Util.clone(r)
                p.update(nr, vals[i])
                res.push(nr)
            }
        }
        return res
    }

    // order the expressions so that less specific updates happen first.
    // for instance, if we want to update both args[0] and args[0][0], then
    // we should do args[0] first, because otherwise we might update args[0][0],
    // and then update args[0] to the empty array, thereby losing the update
    // to args[0][0] (and thus creating equivalent inputs)

    // of course, this is just a best-effort mechanism;  if there are aliases,
    // we might not do the right thing

    var sorted = []
    var worklist: Data.Prestate[][] = exprs.map((e) => [e, e])
    while (worklist.length > 0) {
        worklist = worklist.filter(a => {
            var base = a[0].getBase()
            if (base === a[0]) {
                sorted.push(a[1])
                return false
            }
            a[0] = base
            return true
        })
    }

    return helper(sorted.reverse())
}

/**
 * Return a list of interesting expressions that should be used during program generation.
 */
export function genCandidates(realTraces: Data.Trace[]): Data.Prestate[] {
    var res: Data.Prestate[] = []
    for (var i = 0; i < realTraces.length; i++) {
        var ps = realTraces[i].getPrestates()
        res = res.concat(ps)
    }
    res = Util.dedup2(res)
    return res;
}

/**
 * Return a list of constants that were used in traces.
 */
export function genConstants(realTraces: Data.Trace[]): Data.Const[] {
    var res: Data.Const[] = []
    for (var i = 0; i < realTraces.length; i++) {
        var ps = realTraces[i].getConstants()
        res = res.concat(ps)
    }
    res = Util.dedup2(res)
    return res;
}

/**
 * Returns a list of interesting expressions that should be modified to get inputs. Unlike genCandidates,
 * this method performs some filtering of things that aren't necessary for input generation.
 */
function genCandidateExpr(f: (...a: any[]) => any, initials: any[][]): Data.Prestate[] {
    function filter(input: Data.Prestate[]): Data.Prestate[] {
        var filtered: Data.Prestate[] = []
        for (var i = 0; i < input.length; i++) {
            var e
            if (input[i].type === Data.ExprType.Field) {
                e = <Data.Field>input[i]
                /*if (Array.isArray(e.o.getValue()) && typeof e.f.getValue() === 'number') {
                 filtered.push(e.o)
                 continue
                 }*/
                if (e.o.getType() === "object" && e.f.getValue() === 'length') {
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

    var first = Util.dedup2(Util.flatten(initials.map((i) => Recorder.record(f, i).getPrestates())))
    var newArgs = generateInputsAux(f, initials, filter(first))
    var res = genCandidates(Recorder.all(f, newArgs))
    return filter(res)
}

/**
 * Select a number of inputs that (hopefully) cover the behavior of the function well.
 */
export function selectInputs(inputs: any[][],
                             traces: Data.Trace[],
                             metric: (i: any[], t: Data.Trace) => number,
                             maxCategories: number = 10,
                             maxInputsPerCat: number = 2,
                             idealNumberOfInputs: number = 20): any[][] {
    if (inputs.length < idealNumberOfInputs) {
        return inputs
    }
    var lookup = new Map<number, Object[]>()
    var categories = []
    for (var i = 0; i < inputs.length; i++) {
        var category = traces[i].events.length*1000 + metric(inputs[i], traces[i])
        if (!lookup.has(category)) {
            lookup.set(category, [])
            categories.push(category)
        }
        lookup.get(category).push(inputs[i])
    }
    if (categories.length > maxCategories) {
        categories = Random.pickN(categories, maxCategories)
    }

    var res = []
    for (var i = 0; i < categories.length; i++) {
        var cat = categories[i]
        var ci = lookup.get(cat)
        if (ci.length > maxInputsPerCat) {
            ci = Random.pickN(ci, maxInputsPerCat)
        }
        res = res.concat(ci)
    }

    return res
}
