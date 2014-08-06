
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
export function line2(str?: any) {
    print("======================== " + (str || ""))
}
export function log(o: any) {
    print(util.inspect(o, { colors: true }))
}
export function inspect(o: any): string {
    return util.inspect(o)
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
export function dedup<T>(a: T[]): T[] {
    return a.filter(function(elem, pos) {
        return a.indexOf(elem) == pos;
    })
}
export function dedup2<T>(a: T[]): T[] {
    return a.filter(function(elem, pos) {
        return indexOfEquals(a, elem) == pos;
    })
}
export function indexOfEquals<T>(a: T[], item: T, start: number = 0): number {
    var j = start
    var count = a.length
    while (!a[j++].equals(item) && j < count) {}
    j--
    return (j === count) ? -1 : j
}
