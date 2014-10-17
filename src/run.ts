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
import Ansi = require('./util/Ansicolors')
import Data = require('./Data')
import Search = require('./Search')
import StructureInference = require('./StructureInference')

var log = Util.log
var print = Util.print
var line = Util.line

// run search
var argc = Util.argvlength();
if (argc < 5) {
    print("Usage: model-synth arg-names function-body args0 [args1 [args2 ...]]")
    print('Example: model-synth "x,y" "return x+1" "[1]"')
} else {
    var fstr = Util.argv(2).split(",")
    fstr.push(Util.argv(3))
    try {
        var f = Function.apply(null, fstr)
    } catch (e) {
        print(Ansi.red("Error: Could not parse function '"+fstr+"'"))
        print("  " + e)
        Util.exit(1)
    }
    var args = []
    for (var i = 0; i < argc - 4; i++) {

        try {
            var arg = Util.argv(i+4)
            args.push(eval(arg))
        } catch (e) {
            print(Ansi.red("Error: Could not parse argument " + (i+1) + " '"+arg+"':"))
            print("  " + e)
            Util.exit(1)
        }
    }
    Search.runSearch(f, args)
}

