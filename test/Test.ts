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
import Compile = require('../Compile')
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
    [ // 8
        "Array.prototype.shift",
        (a) => a.shift(),
        [['a','b','c','d','e']],
        {
            categories: 2,
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
        var traces = inputs.map((i) => Recorder.record(f, i))
        ass.equal(InputGen.categorize(inputs, traces).length, oracle.categories)
    })
}

function compile_test(f, a, a0, name, oracle) {
    it('should compile for ' + name, () => {
        var t0 = Recorder.record(f, a0)
        var p = Compile.compileTrace(t0)
        var f1 = Compile.compile(p)
        var t1 = Recorder.record(f1, a0)
        var actual = t0.toString({novar: true});
        if (actual.indexOf("inspect") === -1) {
            ass.equal(actual, t1.toString({novar:true}))
        }
    })
}

function search_test(f, a, a0, name, oracle, k) {
    if ([8].indexOf(k) !== -1) return
    it("search should succeed for " + name, () => {
        var config = new Search.SearchConfig({
            iterations: 2000,
            cleanupIterations: 10,
            debug: 0,
        })
        var res = Search.search(f, a, config)
        ass.equal(res.score, 0)
    })
}


var tests = [
    ["Recorder", recorder_test],
    ["InputGen.categorize", inputgen_test],
    ["Compile", compile_test],
    ["Search", search_test],
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
            test(f, a, a0, name, oracle, k)
        }
    })
}


describe("Recorder", () => {
    var budget = 100
    it("should run out of budget", () => {
        var trace = Recorder.record((n, b) => {
            for (var i = 0; i < n; i++) {
                var k = b.f
            }
        }, [budget*1.2, {}], budget)
        Util.assert(trace.isExhaustedBudget)
    })
    it("should run out of budget", () => {
        var trace = Recorder.record((n, b) => {
            for (var i = 0; i < n; i++) {
                var k = b.f
            }
        }, [budget*0.5, {}], budget)
        Util.assert(!trace.isExhaustedBudget)
    })
})

describe("Search.combinePrograms", () => {
    var v0 = new Data.Var();
    var p0 = new Data.Seq([
        <Data.Stmt>new Data.Assign(v0, new Data.Field(new Data.Argument(0), new Data.Const("length")), true),
        <Data.Stmt>new Data.Assign(new Data.Var(), new Data.Const(2), true)
    ])

    var v1 = new Data.Var();
    var p1 = new Data.Seq([
        <Data.Stmt>new Data.Assign(v1, new Data.Field(new Data.Argument(0), new Data.Const("length")), true),
    ])

    var p = Search.combinePrograms([p0, p1])

    it("should find common statements", () => {
        ass.equal(p.numberOfStmts(),4)
        Util.assert(p.allStmts()[0].type === Data.StmtType.Assign, () => "should be an assignment")
        Util.assert(p.allStmts()[1].type === Data.StmtType.Assign, () => "should be an assignment")
        Util.assert(p.allStmts()[2].type === Data.StmtType.If, () => "should be an if")
    })

    it("should find common statements", () => {
        Util.assert((<Data.Assign>p.allStmts()[0]).isDecl, () => "should be a decl")
        Util.assert((<Data.Assign>p.allStmts()[1]).isDecl, () => "should be a decl")
    })
})
