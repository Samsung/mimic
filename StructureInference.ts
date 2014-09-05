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
    var traces = [
        "g",
        "ghghg",
        "ghghghghghg",
    ]
    traces = [
        "g",
        "gggg",
        "gggggggg",
    ]
    /*traces = [
        "ggsgidgsgdgsgdgsgdgsgdgsgdsgdsgd"
    ]*/
    //findLoop(traces.map((t) => t.split("")))
    findLoop(traces)
}




function findLoop(traces: string[], minIterations: number = 3, minBodyLength: number = 1, maxBodyLength: number = 100000) {
    // start with the longest trace
    traces.sort((a, b) => b.length - a.length)
    var candidates: string[] = []

    for (var k = 0; k < traces.length; k++) {
        var trace = traces[k]
        var tlen = trace.length
        for (var start = 0; start < trace.length-1; start++) {
            // not enough space for minIterations
            if (start + minIterations >= tlen) break;
            length: for (var len = minBodyLength; len < maxBodyLength; len++) {
                // not enough space for minIterations
                if (start + len*minIterations >= tlen) break;
                // get a candidate body
                var body = trace.substr(start, len)
                var iterations = 0
                // check that we have at least minIterations many times our candidate body
                while (iterations < minIterations-1) {
                    iterations++
                    if (body !== trace.substr(start + iterations*len, len)) {
                        continue length
                    }
                }
                // output all possible iteration counts
                while (true) {
                    iterations++
                    var regex = trace.substr(0, start) + "(" + body + ")*" + trace.substr(start+iterations*len)
                    candidates.push(regex)
                    if (body !== trace.substr(start + iterations*len, len)) {
                        break
                    }
                }
            }
        }
    }
    candidates = Util.dedup(candidates)
    var howMany = (a) => traces.filter((t) => new RegExp("^" + a + "$").test(t)).length
    candidates.sort((a,b) => {
        var r = howMany(b) - howMany(a)
        if (r === 0) {
            return a.length - b.length
        }
        return r
    })
    print(candidates.map((c)=> c + " - " + howMany(c)).join("\n"))
}
