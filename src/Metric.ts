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
 * Functionality to evaluate programs.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Data = require('./Data')
import Util = require('./util/Util')
import Recorder = require('./Recorder')
import Compile = require('./Compile')

var print = Util.print
var log = Util.log
var line = Util.line

var DISTANCE_NORM = 100

var W_ERROR_EXIT = 2
var W_EXIT = 1

var W_EXHAUSTED = 5

var W_ASSIGN_FIELD = 0.6
var W_ASSIGN_VALUE = 0.5
var W_ASSIGN_WRONG = 0.9
var W_ASSIGN_MISSING = 1

var W_DELETE_FIELD = 0.5
var W_DELETE_WRONG = 0.9
var W_DELETE_MISSING = 1

var W_GET_FIELD = 0.2
var W_GET_WRONG = 0.3
var W_GET_MISSING = 0.4

var W_WRONG_PARAM = 0.5
var W_CALL_WRONG = 0.9
var W_CALL_MISSING = 1


/**
 * Evaluate how well program `p' behaves on the given inputs (the traces in `realTraces' are used as the
 * gold standard).  Returns a non-negative value, where 0 means the program behaves identically (w.r.t. to our
 * metric) and the higher the number, the less similar `p's behavior.
 */
export function evaluate(p: Data.Program, inputs: any[][], realTraces: Data.Trace[], finalizing: boolean = false): number {
    return evaluate2(Compile.compile(p), inputs, realTraces, p.body.transitiveAnychildren().length, finalizing, p)
}
export function evaluate2(f: (...a: any[]) => any, inputs: any[][], realTraces: Data.Trace[], programLength: number = 10, finalizing: boolean = false, p = null): number {
    var badness = 0
    for (var i = 0; i < inputs.length; i++) {
        var base = realTraces[i].events.length
        // give a budget of 150% compared to the real trace, but always
        // give at least 20 more, but don't exceed than 100 more
        var budget = base + Math.min(100, Math.max(20, 0.5 * base))
        var candidateTrace = Recorder.record(f, inputs[i], budget)
        var td = traceDistance(realTraces[i], candidateTrace, p)
        Util.assert(td >= 0, () => "negative distance for " + realTraces[i] + " vs " + candidateTrace)
        badness += td
    }
    badness /= inputs.length
    if (finalizing) {
        var W_LENGTH = 0.0001
        badness += W_LENGTH * programLength
    }
    return badness
}

/**
 * Determine how 'close' two traces are, and return a number describing the closeness.  0 is identical,
 * and the higher, the less similar the traces are.  This is a metric.
 */
export function traceDistance(a: Data.Trace, b: Data.Trace, p = null): number {
    var debug = false

    var newDistance = true
    if (newDistance) {
        return traceDistanceNew(a, b, p)
    }

    if (debug) {
        print(p)
    }

    var badness = 0

    // exhausting computational budget is bad
    Util.assert(!a.isExhaustedBudget, () => "a should not have exhausted it's budget")
    if (b.isExhaustedBudget) {
        return W_EXHAUSTED
    }

    // compare all set events
    var aa0 = <Data.ESet[]>a.eventsOfKind(Data.EventKind.ESet)
    var bb0 = <Data.ESet[]>b.eventsOfKind(Data.EventKind.ESet)
    var notInB = 0
    var used = new Map<number, boolean>()
    var notInA = bb0.length
    aa0.forEach((aevent) => {
        var ao = aevent.target
        var af = aevent.name
        var av = aevent.value
        var found = false
        for (var i = 0; i < bb0.length; i++) {
            if (!used.has(i)) {
                var bevent = bb0[i]
                var bo = bevent.target
                var bf = bevent.name
                var bv = bevent.value
                if (exprEquiv(ao, bo)) {
                    if (exprEquiv(af, bf)) {
                        if (!exprEquiv(av, bv)) {
                            // receiver and field matches, but not the value
                            badness += W_ASSIGN_VALUE * exprDistance(av, bv) / DISTANCE_NORM
                        }
                    } else {
                        // receiver matches, but not field
                        badness += W_ASSIGN_FIELD * exprDistance(af, bf) / DISTANCE_NORM
                    }
                    used.set(i, true)
                    found = true
                    notInA--
                    break
                }
            }
        }
        if (!found) {
            notInB++
        }
    })
    badness += Math.abs(notInA-notInB) * W_ASSIGN_MISSING
    badness += Math.min(notInA,notInB) * W_ASSIGN_WRONG

    if (debug) print("after set: " + badness)

    // compare all delete property events
    var aa1 = <Data.EDeleteProperty[]>a.eventsOfKind(Data.EventKind.EDeleteProperty)
    var bb1 = <Data.EDeleteProperty[]>b.eventsOfKind(Data.EventKind.EDeleteProperty)
    notInB = 0
    used = new Map<number, boolean>()
    notInA = bb1.length
    aa1.forEach((aevent) => {
        var ao = aevent.target
        var af = aevent.name
        var found = false
        for (var i = 0; i < bb1.length; i++) {
            if (!used.has(i)) {
                var bevent = bb1[i]
                var bo = bevent.target
                var bf = bevent.name
                if (exprEquiv(ao, bo)) {
                    if (!exprEquiv(af, bf)) {
                        // receiver matches, but not field
                        badness += W_DELETE_FIELD * exprDistance(af, bf) / DISTANCE_NORM
                    }
                    used.set(i, true)
                    found = true
                    notInA--
                    break
                }
            }
        }
        if (!found) {
            notInB++
        }
    })
    badness += Math.abs(notInA-notInB) * W_DELETE_MISSING
    badness += Math.min(notInA,notInB) * W_DELETE_WRONG

    if (debug) print("after delete: " + badness)

    // compare all get property events
    var aa1 = <Data.EGet[]>a.eventsOfKind(Data.EventKind.EGet)
    var bb1 = <Data.EGet[]>b.eventsOfKind(Data.EventKind.EGet)
    notInB = 0
    used = new Map<number, boolean>()
    notInA = bb1.length
    aa1.forEach((aevent) => {
        var ao = aevent.target
        var af = aevent.name
        var found = false
        for (var i = 0; i < bb1.length; i++) {
            if (!used.has(i)) {
                var bevent = bb1[i]
                var bo = bevent.target
                var bf = bevent.name
                if (exprEquiv(ao, bo)) {
                    if (!exprEquiv(af, bf)) {
                        // receiver matches, but not field
                        badness += W_GET_FIELD * exprDistance(af, bf) / DISTANCE_NORM
                    }
                    notInA--
                    found = true
                    used.set(i, true)
                    break
                }
            }
        }
        if (!found) {
            notInB++
        }
    })
    badness += Math.abs(notInA-notInB) * W_GET_MISSING
    badness += Math.min(notInA,notInB) * W_GET_WRONG

    if (debug) print("after get: " + badness)

    // compare all apply events
    var aa2 = <Data.EApply[]>a.eventsOfKind(Data.EventKind.EApply)
    var bb2 = <Data.EApply[]>b.eventsOfKind(Data.EventKind.EApply)
    notInB = 0
    used = new Map<number, boolean>()
    notInA = bb2.length
    aa2.forEach((aevent) => {
        var arecv = aevent.receiver
        var af = aevent.target
        var aargs = aevent.args
        var found = false
        for (var i = 0; i < bb2.length; i++) {
            if (!used.has(i)) {
                var bevent = bb2[i]
                var brecv = bevent.receiver
                var bf = bevent.target
                var bargs = bevent.args
                if (arecv === brecv || exprEquiv(arecv, brecv)) {
                    if (exprEquiv(af, bf)) {
                        Util.assert(aargs.length === bargs.length, () => "different length of argument list")
                        var argbadness = 0
                        for (var k = 0; k < aargs.length; k++) {
                            if (!exprEquiv(aargs[k], bargs[k])) {
                                // receiver and function matches, but not this argument
                                argbadness += W_WRONG_PARAM * exprDistance(aargs[k], bargs[k]) / DISTANCE_NORM
                            } else {
                            }
                        }
                        if (aargs.length > 0) {
                            badness += argbadness / aargs.length
                        }
                        used.set(i, true)
                        found = true
                        notInA--
                        break
                    }
                }
            }
        }
        if (!found) {
            notInB++
        }
    })
    badness += Math.abs(notInA-notInB) * W_CALL_MISSING
    badness += Math.min(notInA,notInB) * W_CALL_WRONG

    if (debug) print("after call: " + badness)

    // normalize by the length of a
    if (a.events.length > 0) {
        badness /= a.events.length
    }

    // compare the last statement (return or throw)
    if (a.isNormalReturn === b.isNormalReturn) {
        if (a.isNormalReturn) {
            badness += W_EXIT * exprDistance(a.getResult(), b.getResult())/DISTANCE_NORM
        } else {
            badness += W_EXIT * exprDistance(a.getException(), b.getException())/DISTANCE_NORM
        }
    } else {
        // different way to return
        badness += W_ERROR_EXIT
    }

    if (debug) print("result: " + badness)

    return badness
}

function dist(a: Data.Event, b: Data.Event) {
    var aa = a.getParts()
    var bb = b.getParts()
    var badness = 0
    for (var i = 0; i < aa.length; i++) {
        badness += exprDistance(aa[i], bb[i])/DISTANCE_NORM
    }
    return badness / aa.length
}

/**
 * Determine how 'close' two traces are, and return a number describing the closeness.  0 is identical,
 * and the higher, the less similar the traces are.  This is a metric.
 */
export function traceDistanceNew(a: Data.Trace, b: Data.Trace, p = null): number {
    var debug = false

    if (debug) {
        print(p)
    }

    var badness = 0

    // exhausting computational budget is bad
    Util.assert(!a.isExhaustedBudget, () => "a should not have exhausted it's budget")
    if (b.isExhaustedBudget) {
        return W_EXHAUSTED
    }

    var kinds = [Data.EventKind.EGet, Data.EventKind.ESet, Data.EventKind.EApply, Data.EventKind.EDeleteProperty]
    var events = kinds.map((kind) => [a.eventsOfKind(kind), b.eventsOfKind(kind)])
    for (var tmp in events) {
        var aa = events[tmp][0]
        var bb = events[tmp][1]
        for (var i = 0; i < Math.min(aa.length, bb.length); i++) {
            badness += 0.5 * dist(aa[i], bb[i])
        }
        badness += Math.abs(aa.length - bb.length)
    }

    // normalize by the length of a
    if (a.events.length > 0) {
        //badness /= a.events.length
    }

    // compare the last statement (return or throw)
    if (a.isNormalReturn === b.isNormalReturn) {
        if (a.isNormalReturn) {
            badness += W_EXIT * exprDistance(a.getResult(), b.getResult())/DISTANCE_NORM
        } else {
            badness += W_EXIT * exprDistance(a.getException(), b.getException())/DISTANCE_NORM
        }
    } else {
        // different way to return
        badness += W_ERROR_EXIT
    }

    if (debug) print("result: " + badness)

    return badness
}

/** Returns a distance metric for two trace allocations */
function allocDist(va: Data.TraceAlloc, vb: Data.TraceAlloc): number {
    var fieldsA = []
    var fieldsB = []
    for (var f in va) {
        if (va.hasOwnProperty(f)) {
            fieldsA.push(f)
        }
    }
    for (var f in vb) {
        if (vb.hasOwnProperty(f)) {
            fieldsB.push(f)
        }
    }
    // TODO: this only works for primitive values at the moment
    var found = 0
    var wrongVal = 0
    var missing = 0
    for (var fa in fieldsA) {
        if (fa in fieldsB) {
            found += 1
            if (va[fa] !== vb[fa]) {
                // field present, but value is different
                wrongVal += 1
            } else {
                // field equivalent, happy
            }
        } else {
            missing += 1
        }
    }
    var tooMany = fieldsB.length - found
    var div = fieldsA.length
    if (div == 0) div = 1
    return (wrongVal * 0.6 + missing + tooMany) * DISTANCE_NORM / div
}

/**
 * Compare two TraceExpr by considering their pre-state expressions.
 * Returns true if the two expressions are either the same primitive constant, or refer to the same
 * object (in the pre-state).
 */
function exprEquiv(a: Data.TraceExpr, b: Data.TraceExpr): boolean {
    if (a.type !== b.type) {
        return false
    }
    if (a.type === Data.TraceExprType.Const) {
        var va = (<Data.TraceConst>a).val
        var vb = (<Data.TraceConst>b).val
        if (va !== va) {
            // correct handling of NaN
            return vb !== vb
        }
        return va === vb
    } else if (a.type === Data.TraceExprType.General) {
        var as = a.preStateStrings()
        var bs = b.preStateStrings()
        return as.some((a) => bs.indexOf(a) !== -1)
    } else if (a.type === Data.TraceExprType.Alloc) {
        var va = (<Data.TraceAlloc>a).val
        var vb = (<Data.TraceAlloc>b).val
        return allocDist(va, vb) === 0
    }
    Util.assert(false)
    return false
}


function exprDistance(a: Data.TraceExpr, b: Data.TraceExpr) {
    if (exprEquiv(a, b)) {
        return 0
    }
    if (a.type === Data.TraceExprType.Alloc && b.type === Data.TraceExprType.Alloc) {
        var va = (<Data.TraceAlloc>a).val
        var vb = (<Data.TraceAlloc>b).val
        return allocDist(va, vb)
    }
    return DISTANCE_NORM
}
