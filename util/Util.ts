/**
 * Various utility functions.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

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
export function linereturn(str?: any) {
    return ("------------------------ " + (str || ""))
}
export function line2(str?: any) {
    print("======================== " + (str || ""))
}
export function log(o: any, colors?: boolean) {
    print(util.inspect(o, { colors: colors }))
}
export function log2(o: any, colors?: boolean) {
    print(util.inspect(o, { colors: colors, depth: 3 }))
}
export function log3(o: any, colors?: boolean) {
    print(util.inspect(o, { colors: colors, depth: 4 }))
}
export function logall(o: any, colors?: boolean) {
    print(util.inspect(o, { colors: colors, depth: null }))
}
export function inspect(o: any, colors: boolean = true): string {
    return util.inspect(o, { colors: colors })
}

export function argv(i: number) {
    return process.argv[i]
}

// for now we keep this here, as it creates various spurious errors
export function rrr() {
    return new random(random.engines.mt19937().seed(process.argv[2]))
}

export function isPrimitive(arg: any) {
    var type = typeof arg;
    return arg == null || (type != "object" && type != "function");
}
export function assert(condition: boolean, message?: () => string) {
    if (!condition) {
        if (message) {
            throw new AssertionError("" + message() + "\n" + console.trace())
        }
        throw new AssertionError("Assertion failed\n" + console.trace())
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

export class AssertionError {
    constructor(public message: string) {
    }
    toString() {
        return "Assertion failure: " + this.message
    }
}

export function sum(a: number[]) {
    return a.reduce((a,b) => a+b, 0)
}

export function start(): number {
    return new Date().getTime()
}
export function stop(s: number): number {
    return start() - s
}

export function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

export function isInt(s: string) {
    return /^(\-|\+)?([0-9]+)$/.test(s)
}

export function hash(s: string) {
    var hash = 0, i, chr, len;
    if (s.length == 0) return hash;
    for (i = 0, len = s.length; i < len; i++) {
        chr   = s.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export function indent(s: string, ind: string = '  ') {
    return ind + s.replace(/\n/g, "\n" + ind)
}
