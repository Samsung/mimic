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
    print(traces.map((t)=>t.getSkeleton()).join("\n"))
    findLoop(traces)
}




function findLoop(traces: Data.Trace[], minIterations: number = 3, minBodyLength: number = 1, maxBodyLength: number = 100000) {
    // start with the longest trace
    var candidates: string[] = []

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
                    candidates.push(regex)
                    if (body !== trace.getSubSkeleton(start + iterations*len, len)) {
                        break
                    }
                }
            }
        }
    }
    candidates = Util.dedup(candidates)
    var howMany = (a: string) => traces.filter((t) => new RegExp("^" + a + "$").test(t.getSkeleton())).length
    candidates.sort((a,b) => {
        var r = howMany(b) - howMany(a)
        if (r === 0) {
            return a.length - b.length
        }
        return r
    })
    print(candidates.map((c)=> c + " - " + howMany(c)).join("\n"))
}
