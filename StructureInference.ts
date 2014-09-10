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
    constructor(public regex: string, public loopStart: number, public loopLength: number) {
    }
    equals(o) {
        if (!(o instanceof Proposal)) {
            return false
        }
        return this.regex === o.regex
    }
    toString(): string {
        return this.regex
    }
    getNumIterations(trace: Data.Trace) {
        var myRe = new RegExp("^([^(]*)(\(.+\)\*)([^(]*)$", "g")
        var res = myRe.exec(this.regex)
        var pre = res[1].split(";").length - 1
        var post = res[1].split(";").length - 1
        var body = res[1].split(";").length - 1
        var total = trace.events.length
        return (total - pre - post) / body
    }
}

/**
 * Tries to infer a loop structure of the given traces.  Returns a set of proposals, ordered by
 * confidence in them (best proposal first).
 */
export function infer(traces: Data.Trace[], minIterations: number = 3, minBodyLength: number = 1, maxBodyLength: number = 100000) {
    var candidates: Proposal[] = []
    for (var k = 0; k < traces.length; k++) {
        var trace = traces[k]
        var tlen = trace.getLength()
        for (var start = 0; start < tlen-1; start++) {
            // not enough space for minIterations
            if (start + minIterations > tlen) break;
            length: for (var len = minBodyLength; len < maxBodyLength; len++) {
                // not enough space for minIterations
                if (start + len*minIterations > tlen) break;
                // get a candidate body
                var body = trace.getSubSkeleton(start, len)
                var iterations = 0
                // check that we have at least minIterations many times our candidate body
                while (iterations < minIterations-1) {
                    iterations++
                    if (body !== trace.getSubSkeleton(start + iterations*len, len)) {
                        continue length
                    }
                }
                // output all possible iteration counts
                while (start+(iterations+1)*len <= tlen) {
                    iterations++
                    var regex = trace.getSubSkeleton(0, start) + "(" + body + ")*" + trace.getSubSkeleton(start+iterations*len)
                    candidates.push(new Proposal(regex, start, len))
                    if (start+(iterations+2)*len > tlen || body !== trace.getSubSkeleton(start + iterations*len, len)) {
                        break
                    }
                }
            }
        }
    }
    candidates = Util.dedup2(candidates)
    var howMany = (a) => {
        if (a.worksFor !== undefined) {
            return a.worksFor.length
        }
        var i = 0
        a.worksFor = []
        var res = traces.filter((t) => {
            var res = new RegExp("^" + a.regex + "$").test(t.getSkeleton())
            if (res) {
                a.worksFor.push(i)
            }
            i++
            return res
        }).length
        return res
    }
    // sort by number of traces it matches, and then by the length of the regular expression
    Util.sortBy(candidates, [(a) => -howMany(a), (a) => a.regex.length])
    return candidates
}
