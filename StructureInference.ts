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


export function test() {
    var f = (a) => a.shift()
    var inputs = [
        [[]],
        [[1,2,3]],
        [[1,2,3,4,5,6]],
    ]
    var traces = inputs.map((i) => Recorder.record(f, i))
    var candidates = findLoop(traces)
    print(candidates.join("\n"))
}


export class StructureProposal {
    constructor(public regex: string, public loopStart: number, public loopLength: number) {
    }
    equals(o) {
        if (!(o instanceof StructureProposal)) {
            return false
        }
        return this.regex === o.regex
    }
    toString(): string {
        return this.regex
    }
}



export function findLoop(traces: Data.Trace[], minIterations: number = 3, minBodyLength: number = 1, maxBodyLength: number = 100000) {
    var candidates: StructureProposal[] = []
    for (var k = 0; k < traces.length; k++) {
        var trace = traces[k]
        var tlen = trace.getLength()
        for (var start = 0; start < tlen-1; start++) {
            // not enough space for minIterations
            if (start + minIterations >= tlen) break;
            length: for (var len = minBodyLength; len < maxBodyLength; len++) {
                // not enough space for minIterations
                if (start + len*minIterations >= tlen) break;
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
                while (true) {
                    iterations++
                    var regex = trace.getSubSkeleton(0, start) + "(" + body + ")*" + trace.getSubSkeleton(start+iterations*len)
                    candidates.push(new StructureProposal(regex, start, len))
                    if (body !== trace.getSubSkeleton(start + iterations*len, len)) {
                        break
                    }
                }
            }
        }
    }
    candidates = Util.dedup2(candidates)
    var howMany = (a) => traces.filter((t) => new RegExp("^" + a.regex + "$").test(t.getSkeleton())).length
    // sort by number of traces it matches, and then by the length of the regular expression
    Util.sortBy(candidates, [(a) => -howMany(a), (a) => a.regex.length])
    return candidates
}
