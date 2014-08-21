/**
 * Randomness utilities - various small wrapper function for generating random values
 * and making random decicions
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */


import Util = require('./Util')

// our source of randomness
var randomness = Util.rrr()

/**
 * Returns a random number in [min,max), or [0,min) if max is not specified.
 */
export function randInt(min: number, max?: number): number {
    if (max == null) {
        max = min;
        min = 0;
    }
    return randomness.integer(min, max-1);
}

/** Returns a random floating point number. */
export function randFloat(min: number, max: number, inclusive: boolean = false): number {
    return randomness.real(min, max, inclusive);
}

/** Returns a random element from an array. */
export function randArr<T>(arr: T[]): T {
    Util.assert(arr.length > 0)
    return arr[randInt(arr.length)]
}

/** A class for weighted random samples, see pick below. */
export class WeightedPair<T> {
    constructor(public w: number, public e: T) {
    }
}

/** Return a random element from an array of weight/element pairs */
export function randArrW<T>(arr: T[], weights: number[]): T {
    Util.assert(arr.length > 0 && arr.length === weights.length)
    var total = weights.reduce((s, w) => w + s, 0)
    var rand = randFloat(0, total)
    var choice = 0
    var sofar = 0
    while (sofar <= rand) {
        sofar += weights[choice]
        choice += 1
    }
    Util.assert(choice-1 < arr.length)
    return arr[choice-1]
}

/** Returns true with probability 'yesProbability'. */
export function maybe(yesProbability: number = 0.5) {
    return randFloat(0, 1) < yesProbability
}

/** Return a random element (respecting their weight). */
export function pick<T>(arr: WeightedPair<T>[]): T {
    return randArrW(arr.map((x) => x.e), arr.map((x) => x.w))
}
