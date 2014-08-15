
// some utility functions

import util = require('util');
import random = require('random-js')

export function print(s: any) {
    if (typeof s === "object" && "toString" in s) {
        console.log(s.toString())
    } else {
        console.log(s)
    }
}
export function printnln(s: any) {
    process.stdout.write(s)
}
export function line(str?: any) {
    print("------------------------ " + (str || ""))
}
export function line2(str?: any) {
    print("======================== " + (str || ""))
}
export function log(o: any, colors?: boolean) {
    print(util.inspect(o, { colors: colors }))
}
export function inspect(o: any): string {
    return util.inspect(o)
}

var rrr = new random(random.engines.mt19937().seed(process.argv[2]));

/* Returns a random number in [min,max), or [0,min) if max is not specified. */
export function randInt(min: number, max?: number): number {
    if (max == null) {
        max = min;
        min = 0;
    }
    return rrr.integer(min, max-1);
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
// non-ideal clone method
// taken from: http://stackoverflow.com/questions/728360/most-elegant-way-to-clone-a-javascript-object
export function clone<T>(obj: T): T {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        var copy1 = new Date();
        copy1.setTime((<Date> <any> obj).getTime());
        return <T> <any> copy1;
    }

    // Handle Array
    if (obj instanceof Array) {
        var copy2 = [];
        for (var i = 0, len = (<any> obj).length; i < len; i++) {
            copy2[i] = clone(obj[i]);
        }
        return <T> <any> copy2;
    }

    // Handle Object
    if (obj instanceof Object) {
        var copy3 = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy3[attr] = clone(obj[attr]);
        }
        return <T> <any> copy3;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

