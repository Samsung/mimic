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
 * Main entry point.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

"use strict";

import main = require('./main')
import Util = require('./util/Util')
import Random = require('./util/Random')
import Ansi = require('./util/Ansicolors')
import Data = require('./Data')
import Search = require('./Search')
import Recorder = require('./Recorder')
import StructureInference = require('./StructureInference')
var fs = require('fs')

var log = Util.log
var print = Util.print
var line = Util.line

var commands = ["synth", "record"]

function error(message) {
    print(Ansi.red("Error: " + message))
    Util.exit(1)
}

var argc = Util.argvlength();
if (argc < 6) {
    print("Usage: model-synth (" + commands.join("|") + ") arg-names function-body args0 [args1 [args2 ...]]")
    print('Example: model-synth synth "x,y" "return x+1" "1"')
    print("")
    print("  synth   synthesize a model for a given function")
    print("  record  record a trace for a given function")
} else {
    var subcommand = Util.argv(2)
    if (commands.indexOf(subcommand) == -1) {
        error("unknown subcommand '" + subcommand + "', use one of: " + commands.join(", "))
    }

    var argv = require('minimist')(process.argv.slice(3))
    if ('seed' in argv) {
        Random.resetRandomness(+argv.seed)
    } else {
        Random.resetRandomness(-1)
    }

    var fstr = argv._[0].split(",")
    fstr.push(argv._[1])
    try {
        var f = Function.apply(null, fstr)
    } catch (e) {
        error("Could not parse function '"+fstr+"'\n  " + e)
    }
    var args = []
    for (var i = 0; i < argv._.length - 2; i++) {
        try {
            var arg = argv._[2+i]
            args.push(eval("[" + arg + "]"))
        } catch (e) {
            error("Error: Could not parse argument " + (i) + " '"+arg+"':\n  " + e)
        }
    }

    if (subcommand === "synth") {
        var config = new Search.SearchConfig()
        Ansi.Gray("Configuration: " + config.toString())
        var res = Search.search(f, args, config)
        Ansi.Gray("Found in " + res.iterations + " iterations:")
        Ansi.Gray(Util.indent(res.getStats()))
        var exit = 1
        if (res.score > 0) {
            Ansi.Red("  Score: " + res.score)
        } else {
            exit = 0
            Ansi.Gray("  Score: " + res.score)
            if ("out" in argv) {
                fs.writeFileSync(argv.out, res.result.toString() + "\n");
            }
        }
        print(res.result.toString())
        Util.exit(exit)
    } else if (subcommand === "record") {
        if (args.length > 1) {
            error("Can only record a trace for one set of arguments.")
        }
        if (args.length < 1) {
            error("No arguments provided.")
        }
        var trace = Recorder.record(f, args[0])
        print(trace)
    }
}
