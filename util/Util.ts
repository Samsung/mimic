
// some utility functions

import util = require('util');

export function print(s: any) {
    if (typeof s === "object" && "toString" in s) {
        console.log(s.toString())
    } else {
        console.log(s)
    }
}
export function line(str?: any) {
    print("------------------------ " + (str || ""))
}
export function log(o: any) {
    print(util.inspect(o, { colors: true }))
}
export function isPrimitive(arg: any) {
    var type = typeof arg;
    return arg == null || (type != "object" && type != "function");
}
export function assert(condition: any, message?: string) {
    if (!condition) {
        throw (message || "Assertion failed") + "\n" + console.trace()
    }
}
