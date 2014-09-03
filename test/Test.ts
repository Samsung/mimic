/**
 * Tests.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

"use strict";

/// <reference path="./mocha.d.ts" />
/// <reference path="./assert.d.ts" />

import ass = require('assert')
import Ansi = require('../util/Ansicolors')
import Util = require('../util/Util')
import Random = require('../util/Random')
import Data = require('../Data')
import Metric = require('../Metric')
import InputGen = require('../InputGen')
import Recorder = require('../Recorder')
import ProgramGen = require('../ProgramGen')
import Search = require('../Search')

var print = Util.print
var log = Util.log
var line = Util.line
var Gray = Ansi.Gray
var proxify = Recorder.proxifyWithLogger


var fs:any = [
    [ // 0
        "random heap modifications",
        (obj1, obj2, str, int) => {
            obj1.a = obj2
            obj2[str] = obj2.g
            obj2[str] = "b"
            obj1.f2 = obj2.f
            return int
        },
        [{}, {g: "a", f: {}}, "a", 0],
        {
            categories: 1,
        }
    ],
    [ // 1
        "Array.prototype.pop",
        (arr) => arr.pop(),
        [['a', 'b', 'c']],
        {
            categories: 2,
        }
    ],
    [ // 2
        "Array.prototype.push",
        (arr, v) => arr.push(v),
        [['a', 'b', 'c'], 'd'],
        {
            categories: 1,
        }
    ],
    [ // 3
        "array index",
        (arr, i) => arr[i],
        [['a', 'b', 'c'], 2],
        {
            categories: 1,
        }
    ],
    [ // 4
        "array function with conditional",
        (arr, i) => {
            if (i) {
                return arr
            } else {
                return arr[arr.length-1]
            }
        },
        [['a', 'b', 'c'], 2],
        {
            categories: 2,
        }
    ],
    [ // 5
        "simple higher order function",
        (f, i) => f(i),
        [(x) => x, 2],
        [(x) => 2*x, 2],
        {
            categories: 1,
        }
    ],
    [ // 6
        "heap modifing higher order function",
        (setX, o, x, v) => setX(o, x, v),
        [(o, x, v) => o[x] = v, {}, 0, 0],
        [(o, x, v) => undefined, {}, 0, 0],
        {
            categories: 1,
        }
    ],
    [ // 7
        "empty function",
        () => undefined,
        [],
        {
            categories: 1,
        }
    ],
]

function recorder_test(f, a, a0, name, oracle) {
    it('should record for ' + name, () => {
        Recorder.record(f, a0)
    })
}

function inputgen_test(f, a, a0, name, oracle) {
    it('number of categories for ' + name, () => {
        var inputs = InputGen.generateInputs(f, a)
        ass.equal(InputGen.categorize(f, inputs.all).length, oracle.categories)
    })
}


var tests = [
    ["Recorder", recorder_test],
    ["InputGen.categorize", inputgen_test],
]


for (var k = 0; k < tests.length; k++) {
    describe(tests[k][0], () => {
        for (var i = 0; i < fs.length; i++) {
            var name = fs[i][0]
            var f = fs[i][1]
            var a = fs[i].slice(2, fs[i].length - 1)
            var a0 = a[0]
            var oracle = fs[i][fs[i].length - 1]
            var test: any = tests[k][1];
            test(f, a, a0, name, oracle)
        }
    })
}
