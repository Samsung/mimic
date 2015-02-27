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
 * Functionality to record the execution of a javascript function by using proxies.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

"use strict";

import Util = require('./util/Util')
import Ansi = require('./util/Ansicolors')
import Data = require('./Data')
import Random = require('./util/Random')

// enable proxies
var harmonyrefl = require('harmony-reflect');
harmonyrefl;
declare var Proxy: <T>(target: T, handler: Object) => T;
declare var Reflect: any
declare var global: any

var log = Util.log
var print = Util.print

/**
 * Record a trace for the given function and arguments.  In the `extended' mode, we additionally
 * store various intermediate results (e.g. those from all field reads, or the old value of field
 * writes) in local variables.  This is used to make program generation easier.
 */
export function record(f: (..._: any[]) => any, args: any[], budget: number = 100): Data.Trace {
    state = new State(budget)
    var trace = state.trace

    Data.Var._count = 0

    args = Util.clone(args)

    // instrument args
    var iargs = []
    for (var i = 0; i < args.length; i++) {
        iargs[i] = proxify(args[i])
        var ai = new Data.Argument(new Data.Const(i))
        state.addCurState(iargs[i], ai)
        state.addPreState(iargs[i], [ai])
    }
    try {
        var res = f.apply(null, iargs)
        trace.setResult(state.texpr(res))
    } catch (e) {
        if (e instanceof Util.AssertionError) {
            throw e // don't catch our own errors
        } else if (e instanceof BudgetExhausted) {
            trace.setExhaustedBudget()
        } else if (e instanceof ReferenceError) {
            var ee = <ReferenceError>e
            trace.setException(state.texpr(ee.message.toString()))
        } else if (e instanceof TypeError) {
            var ee = <TypeError>e
            trace.setException(state.texpr(ee.message.toString()))
        } else if (e instanceof RangeError) {
            var ee = <RangeError>e
            trace.setException(state.texpr(ee.message.toString()))
        } else if (e instanceof SyntaxError) {
            var ee = <SyntaxError>e
            Util.assert(false, () => "syntax error: " + ee.toString() + "\n\nfor program: " + f.toString())
        } else {
            trace.setException(state.texpr(e))
        }
    }

    trace.setPrestates(state.preStates)
    trace.setConstants(state.constants)

    state = null
    //state = new State(100000)
    //state.doRecord = false

    return trace
}

class BudgetExhausted {
}

class State {
    /** Are we currently recording? */
    public doRecord: boolean = true
    /** map objects to their proxified object */
    public proxy2object: Map<Object, Object> = new Map<Object, Object>()
    /** map proxified objects to their target */
    public object2proxy: Map<Object, Object> = new Map<Object, Object>()
    /** the current trace */
    public trace: Data.Trace = new Data.Trace()
    public preState = new Map<Object, Data.Prestate[]>()
    public curState = new Map<Object, Data.Expr[]>()
    public preStates: Data.Prestate[] = []
    public constants: Data.Const[] = []
    constructor(public budget: number) {
    }
    /** record an event */
    record(ev: Data.Event) {
        if (this.trace.events.length > this.budget) {
            throw new BudgetExhausted()
        }
        this.trace.extend(ev)
    }
    /** get the trace expression for an (unproxied) value */
    texpr(v: any): Data.TraceExpr {
        if (Util.isPrimitive(v)) {
            this.constants.push(new Data.Const(v))
            return new Data.TraceConst(v)
        }
        if (!this.proxy2object.has(v)) {
            // newly allocated object
            return new Data.TraceAlloc(v)
        }
        Util.assert(this.proxy2object.has(v), () => "texpr only accepts proxied inputs")
        return new Data.TraceExpr(this.preState.get(v), this.curState.get(v))
    }
    /** add an expression as the current state expression of a value */
    addCurState(v: any, e: Data.Expr) {
        if (Util.isPrimitive(v)) return
        Util.assert(this.proxy2object.has(v), () => "addCurState only accepts proxied inputs")
        var state = this.curState.get(v) || []
        state.push(e)
        this.curState.set(v, state)
    }
    /** add a list of expressions as the pre-state expression of a value */
    addPreState(v: any, es: Data.Prestate[]) {
        this.preStates = this.preStates.concat(es)
        if (Util.isPrimitive(v)) return
        Util.assert(this.proxy2object.has(v), () => "addPreState only accepts proxied inputs")
        var state = this.preState.get(v) || []
        state = state.concat(es)
        this.preState.set(v, state)
    }
}

var state: State = null
var common = function (target: Object): Data.TraceExpr {
    //if (!state.object2proxy.has(target)) {
    //    return;
    //}
    Util.assert(state.object2proxy.has(target), () => "target not proxied")
    var res = state.texpr(state.object2proxy.get(target))
    Util.assert(res !== undefined, () => "target TraceExpr undefined")
    return res
}
var ignorec = (a: any) => print(Ansi.lightgrey(a))
ignorec = (a: any) => a
function makeFieldName(target: any, name: string) {
    if (Array.isArray(target) && Util.isInt(name)) {
        return new Data.Const(parseInt(name, 10))
    }
    return new Data.Const(name)
}
var Handler = {
    get: function(target, name: string, receiver) {
        if (name === "inspect") {
            // TODO: why is this happening? improve/fix
            return undefined
        }
        var ttarget = common(target)
        if (state.doRecord) {
            if (!(name in target) || target.hasOwnProperty(name)) {
                var val = target[name];
                var pval = proxify(val)

                if (state.doRecord) {
                    var event = new Data.EGet(ttarget, state.texpr(name))
                    state.record(event)
                    state.addCurState(pval, event.variable)
                    var fieldId = new Data.Const(name)
                    state.addPreState(pval, ttarget.preState.map((t) => new Data.Field(t, fieldId)))
                }

                return pval
            } else {
                // TODO handle properties that are somewhere else
                ignorec("ignoring access to '" + name + "'.")
            }
        }
        return Reflect.get(target, name, receiver);
    },
    set: function(target, name: string, value, receiver) {
        var ttarget = common(target)
        var res
        if (state.doRecord) {

            var tval = state.texpr(value)
            var event = new Data.ESet(ttarget, state.texpr(name), tval)
            state.record(event)
            res = Reflect.set(target, name, value, receiver)
            state.addCurState(res, event.variable)
        } else {
            res = Reflect.set(target, name, value, receiver)
        }
        return res
    },
    has: function(target, name: string) {
        var ttarget = common(target)
        ignorec(".. unhandled call to has")
        return Reflect.has(target, name);
    },
    apply: function(target, receiver, args) {
        var ttarget = common(target)
        var result
        if (state.doRecord) {
            var targs = args.map((a) => state.texpr(a))
            var recv = null
            if (receiver !== global) {
                recv = state.texpr(receiver)
            }
            var event = new Data.EApply(ttarget, recv, targs)
            state.record(event)
            var prevDoRecord = state.doRecord
            state.doRecord = false
            result = Reflect.apply(target, receiver, args)
            state.doRecord = prevDoRecord
            state.addCurState(result, event.variable)
        } else {
            result = Reflect.apply(target, receiver, args)
        }
        return result
    },
    construct: function(target, args) {
        ignorec(".. unhandled call to construct")
        var ttarget = common(target)
        return Reflect.construct(target, args);
    },
    getOwnPropertyDescriptor: function(target, name: string) {
        ignorec(".. unhandled call to getOwnPropertyDescriptor for " + name + " on " + Util.inspect(target))
        var ttarget = common(target)
        return Reflect.getOwnPropertyDescriptor(target, name);
    },
    defineProperty: function(target, name: string, desc) {
        var ttarget = common(target)
        if (state.doRecord) {
            if ("value" in desc) {
                // TODO
                ignorec(".. unhandled call to defineProperty (ignore for now)")
            } else {
                ignorec(".. unhandled call to defineProperty (unhandled type of descriptor)")
            }
        }
        return Reflect.defineProperty(target, name, desc);
    },
    getOwnPropertyNames: function(target) {
        ignorec(".. unhandled call to getOwnPropertyNames")
        var ttarget = common(target)
        return Reflect.getOwnPropertyNames(target);
    },
    getPrototypeOf: function(target) {
        ignorec(".. unhandled call to getPrototypeOf")
        var ttarget = common(target)
        return Reflect.getPrototypeOf(target);
    },
    setPrototypeOf: function(target, newProto) {
        ignorec(".. unhandled call to setPrototypeOf")
        var ttarget = common(target)
        return Reflect.setPrototypeOf(target, newProto);
    },
    deleteProperty: function(target, name: string) {
        var ttarget = common(target)
        if (state.doRecord) {
            state.record(new Data.EDeleteProperty(ttarget, state.texpr(name)))
        }
        return Reflect.deleteProperty(target, name);
    },
    enumerate: function(target) {
        ignorec(".. unhandled call to enumerate")
        var ttarget = common(target)
        return Reflect.enumerate(target);
    },
    preventExtensions: function(target) {
        ignorec(".. unhandled call to preventExtensions")
        var ttarget = common(target)
        return Reflect.preventExtensions(target);
    },
    isExtensible: function(target) {
        ignorec(".. unhandled call to isExtensible on "+Util.inspect(target))
        var ttarget = common(target)
        return Reflect.isExtensible(target);
    },
    ownKeys: function(target) {
        ignorec(".. unhandled call to ownKeys")
        var ttarget = common(target)
        return Reflect.ownKeys(target);
    }
}

function proxify<T>(o: T): T {
    if (Util.isPrimitive(o)) return o
    if (state.object2proxy.has(o)) return <T>state.object2proxy.get(o)
    if (state.proxy2object.has(o)) return o

    var p = Proxy(o, Handler)
    state.proxy2object.set(p, o)
    state.object2proxy.set(o, p)
    return p
}

/**
 * Proxify the object `o', and log all behavior (in addition to actually performing the actions).
 */
export function proxifyWithLogger<T>(o: T, tag: string = " ", level: number = 0, cache: WeakMap<any, any> = new WeakMap<any, any>()): T {
    var debug = false
    if (Util.isPrimitive(o)) return o
    if (cache.has(o)) {
        return cache.get(o)
    }
    var common = function (target): string {
        var s = tag + " "
        if (level === 0) {
        } else {
            s += "" + level + " "
        }
        return s
    }
    var recurse = (o) => proxifyWithLogger(o, tag, level+1, cache)
    var logaccess = (a: any) => {
        if (debug) print(Ansi.lightgrey(a))
    }
    var Handler = {
        get: function(target, name: string, receiver) {
            var value = Reflect.get(target, name, receiver);
            var s = common(target) + "get of " + name;
            if (Util.isPrimitive(value)) {
                s += " (yields " + value + ")"
            } else {
                value = recurse(value)
            }
            logaccess(s)
            return value;
        },
        set: function(target, name: string, value, receiver) {
            var s = common(target)
            s += "set of " + name;
            if (Util.isPrimitive(value)) {
                s += " (with value " + value + ")"
            }
            logaccess(s)
            return Reflect.set(target, name, value, receiver);
        },
        has: function(target, name: string) {
            var s = common(target)
            logaccess(s + "has of " + name)
            return Reflect.has(target, name);
        },
        apply: function(target, receiver, args) {
            var s = common(target)
            var id = "0x" + Util.pad(Random.randInt(Math.pow(16, 4)).toString(16), 4, "0")
            logaccess(s + "apply start "+id)
            var v = Reflect.apply(target, receiver, args);
            if (Util.isPrimitive(v)) {
                logaccess(s + "apply end " + id + " (result: " + v + ")")
            } else {
                logaccess(s + "apply end " + id)
                v = recurse(v)
            }
            return  v;
        },
        construct: function(target, args) {
            var s = common(target)
            logaccess(s + "construct")
            return Reflect.construct(target, args);
        },
        getOwnPropertyDescriptor: function(target, name: string) {
            var s = common(target)
            logaccess(s + "getOwnPropertyDescriptor for " + name)
            return Reflect.getOwnPropertyDescriptor(target, name);
        },
        defineProperty: function(target, name: string, desc) {
            var s = common(target)
            logaccess(s + "defineProperty for " + name)
            return Reflect.defineProperty(target, name, desc);
        },
        getOwnPropertyNames: function(target) {
            var s = common(target)
            logaccess(s + "getOwnPropertyNames")
            return Reflect.getOwnPropertyNames(target);
        },
        getPrototypeOf: function(target) {
            var s = common(target)
            logaccess(s + "getPrototypeOf")
            return Reflect.getPrototypeOf(target);
        },
        setPrototypeOf: function(target, newProto) {
            var s = common(target)
            logaccess(s + "setPrototypeOf")
            return Reflect.setPrototypeOf(target, newProto);
        },
        deleteProperty: function(target, name: string) {
            var s = common(target)
            logaccess(s + "deleteProperty for " + name)
            return Reflect.deleteProperty(target, name);
        },
        enumerate: function(target) {
            var s = common(target)
            logaccess(s + "enumerate")
            return recurse(Reflect.enumerate(target))
        },
        preventExtensions: function(target) {
            var s = common(target)
            logaccess(s + "preventExtensions")
            return Reflect.preventExtensions(target);
        },
        isExtensible: function(target) {
            var s = common(target)
            logaccess(s + "isExtensible")
            return Reflect.isExtensible(target);
        },
        ownKeys: function(target) {
            var s = common(target)
            logaccess(s + "ownKeys")
            return Reflect.ownKeys(target);
        }
    }
    var p = Proxy(o, Handler)
    cache.set(o, p)
    return <T>p
}
/*
var Handler = {
    get: function(target, name: string, receiver) {
    },
    set: function(target, name: string, value, receiver) {
    },
    has: function(target, name: string) {
    },
    apply: function(target, receiver, args) {
    },
    construct: function(target, args) {
    },
    getOwnPropertyDescriptor: function(target, name: string) {
    },
    defineProperty: function(target, name: string, desc) {
    },
    getOwnPropertyNames: function(target) {
    },
    getPrototypeOf: function(target) {
    },
    setPrototypeOf: function(target, newProto) {
    },
    deleteProperty: function(target, name: string) {
    },
    enumerate: function(target) {
    },
    preventExtensions: function(target) {
    },
    isExtensible: function(target) {
    },
    ownKeys: function(target) {
    }
}
export function proxifyWithLogger2<T>(o: T): T {
    var p = Proxy(o, Handler)
    return <T>p
}*/

export function all(f, inputs): Data.Trace[] {
    return inputs.map((i) => record(f, i))
}
