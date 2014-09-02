/**
 * Functionality to compile a Data.Program to JavaScript, and to compile a Data.Trace to a Data.Program.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Util = require('./util/Util')
import Ansi = require('./util/Ansicolors')
import Data = require('./Data')

var log = Util.log
var print = Util.print

/**
 * Given a program, compile it into a regular function.
 */
export function compile(prog: Data.Program): (...a: any[]) => any {
    return compile2(prog.toString())
}
/**
 * Like `compile', directly takes a string as input.
 */
export function compile2(prog: string): (...a: any[]) => any {
    return function (...a: any[]): any {
        return new Function('"use strict";' + prog).apply(null, a)
    }
}
