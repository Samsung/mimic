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
/**
 * Inferring the structure of a program from traces.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Data = require('./Data')
import Util = require('./util/Util')
import Recorder = require('./Recorder')
import Compile = require('./Compile')

var print = Util.print
var log = Util.log
var line = Util.line

export class Proposal {
    worksFor: number[]
    long: string
    numStmts: number
    constructor(public regex: string, public trace: Data.Trace,
                prefixStart: number, prefixEnd: number,
                thenStart: number, thenLen: number,
                elseStart: number, elseLen: number) {
        this.numStmts = 0
        this.long = ""
        for (var i = 0; i < regex.length; i++) {
            this.numStmts += 1
            switch (regex[i]) {
                case 'g':
                    this.long += "get;"
                    break
                case 's':
                    this.long += "set;"
                    break
                case 'h':
                    this.long += "has;"
                    break
                case 'd':
                    this.long += "delete;"
                    break
                case 'a':
                    this.long += "apply;"
                    break;
                default:
                    this.numStmts -= 1
            }
        }
    }
    equals(o) {
        if (!(o instanceof Proposal)) {
            return false
        }
        return this.regex === o.regex
    }
    toString(): string {
        return this.long
    }
    matches(trace: Data.Trace): boolean {
        return new RegExp("^" + this.regex + "$").test(trace.getSkeletonShort())
    }
}

/**
 * Tries to infer a loop structure of the given traces.  Returns a set of proposals, ordered by
 * confidence in them (best proposal first).
 */
export function infer(traces: Data.Trace[], minIterations: number = 3, minBodyLength: number = 1, maxBodyLength: number = 100000) {
    function find_candidates(trace0: Data.Trace) {
        var trace = trace0.getSkeletonShort()
        var candidates: Proposal[] = []
        var tlen = trace.length
        var minIterations = 3
        var minBodyLength = 1
        var maxBranchLength = 1000000
        var minBranchLengh = 1
        for (var start = 0; start < tlen - 1; start++) {
            // not enough space for minIterations
            if (start + minIterations > tlen) break;

            for (var unrolledLen = minBodyLength; unrolledLen < tlen - start + 1; unrolledLen++) {
                // not enough space for minIterations
                if (minBodyLength * minIterations > unrolledLen) continue;

                var regexStart = trace.substr(0, start)
                var regexEnd = trace.substr(start + unrolledLen)

                for (var thenLen = minBranchLengh; thenLen < maxBranchLength; thenLen++) {
                    // not enough space for minIterations
                    if (thenLen+minBranchLengh > unrolledLen) break;

                    // try to match as many then branches as possible
                    var thenBranch = trace.substr(start, thenLen)
                    Util.assert(thenBranch.length == thenLen, () => "invalid then branch")
                    var thenLeadingIters = 1
                    while (trace.substr(start + thenLeadingIters*thenLen, thenLen) == thenBranch &&
                            (thenLeadingIters+1)*thenLen <= unrolledLen) {
                        thenLeadingIters += 1
                    }

                    // special case for no conditional in loop
                    var regex
                    if (unrolledLen == thenLeadingIters*thenLen) {
                        regex = regexStart + "(" + thenBranch + ")*" + regexEnd;
                        candidates.push(new Proposal(regex, trace0, start, thenLen, 0, 0, 0, 0))
                    }

                    for (var elseLen = minBranchLengh; elseLen < maxBranchLength; elseLen++) {
                        // need at least one of each
                        if (thenLen+elseLen > unrolledLen) break;
                        // not enough space for minIterations
                        if (Math.min(thenLen, elseLen) * (minIterations-1) + Math.max(thenLen, elseLen) > unrolledLen) break;

                        // TODO: special case: else branch is subset of then branch

                        // not enough room for else branch
                        if (thenLeadingIters*thenLen + elseLen > unrolledLen) break;

                        var elseFirstStart = start + thenLeadingIters * thenLen;
                        var elseBranch = trace.substr(elseFirstStart, elseLen);
                        Util.assert(elseBranch.length == elseLen, () => "invalid else branch")

                        regex = regexStart + "(" + thenBranch + "|" + elseBranch + ")*" + regexEnd;
                        var res = new RegExp("^" + regex + "$").test(trace)
                        if (!res) {
                            break
                        }
                        candidates.push(new Proposal(regex, trace0, 0, 0, start, thenLen, elseFirstStart, elseLen))

                        // find common prefix for then and else branch
                        var prefixLen = 1
                        while (true) {
                            if (prefixLen > thenBranch.length || prefixLen > elseBranch.length) break;
                            if (prefixLen == thenBranch.length && prefixLen == elseBranch.length) break;
                            var prefix = thenBranch.substr(0, prefixLen);
                            if (prefix != elseBranch.substr(0, prefixLen)) break;
                            regex = regexStart + "(" + prefix + "(" + thenBranch.substr(prefixLen) +
                            "|" + elseBranch.substr(prefixLen) + "))*" + regexEnd;
                            candidates.push(new Proposal(regex, trace0, start, prefixLen, start+prefixLen, thenLen-prefixLen, elseFirstStart+prefixLen, elseLen-prefixLen))
                            prefixLen += 1
                        }
                    }
                }
            }
        }
        return candidates;
    }

    var candidates: Proposal[] = []
    for (var k = 0; k < traces.length; k++) {
        candidates = candidates.concat(find_candidates(traces[k]))
    }
    candidates = Util.dedup2(candidates)
    var howMany = (a: Proposal) => {
        if (a.worksFor !== undefined) {
            return a.worksFor.length
        }
        var i = 0
        a.worksFor = []
        var res = traces.filter((t) => {
            if (a.matches(t)) {
                a.worksFor.push(i)
            }
            i++
            return res
        }).length
        return res
    }
    candidates.map((c) => howMany(c)) // initialize c.worksFor
    // sort by number of traces it matches, and then by the length of the regular expression, and then by having the loop as late as possible
    Util.sortBy(candidates, [(a) => -howMany(a), (a) => a.numStmts, (a) => -a.regex.indexOf("(")])
    return candidates
}
