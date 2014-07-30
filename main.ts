/// <reference path="util/assert.d.ts" />

import Util = require('./util/Util')
import Data = require('./Data')
import Recorder = require('./Recorder')
import ansi = require('./util/Ansicolors')

function push(a, b) {
    return a.push(b);
}

function pop(a) {
    return a.pop();
}

function defineProp(o, f, v) {
    Object.defineProperty(o, f, {value : v});
    return o[f]
}

function id(a, b) {
    return b
}

Util.print(Recorder.record(pop, [["a", "a"]]))
Util.print(Recorder.record(push, [["a"], "b"]))
Util.print(Recorder.record(defineProp, [{}, "field", 42]))
Util.print(Recorder.record(id, ["a", "a"]))
Util.print(ansi.red("green"))
