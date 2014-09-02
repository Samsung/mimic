/**
 * Functionality to record the execution of a javascript function by using proxies.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

"use strict";

import Util = require('./util/Util')
import Ansi = require('./util/Ansicolors')
import Data = require('./Data')

// enable proxies
import harmonyrefl = require('harmony-reflect');
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
export function record(f: (..._: any[]) => any, args: any[]): Data.Trace {
    var state = new State()
    var trace = state.trace

    args = Util.clone(args)

    // instrument args
    var iargs = []
    for (var i = 0; i < args.length; i++) {
        if (Util.isPrimitive(args[i])) {
            iargs[i] = args[i]
        } else {
            iargs[i] = proxify(state, args[i])
        }
        var ai = new Data.Argument(i)
        state.addCurState(ai, iargs[i])
        state.addPreState(ai, [iargs[i]])
    }
    try {
        var res = f.apply(null, iargs);
        trace.setResult(state.texpr(res))
    } catch (e) {
        if (e instanceof Util.AssertionError) {
            throw e // don't catch our own errors
        }
        if (e instanceof ReferenceError) {
            var ee = <ReferenceError>e
            trace.setException(state.texpr(ee.message.toString()))
        } else if (e instanceof TypeError) {
            var ee = <TypeError>e
            trace.setException(state.texpr(ee.message.toString()))
        } else if (e instanceof RangeError) {
            var ee = <RangeError>e
            trace.setException(state.texpr(ee.message.toString()))
        }
        else if (e instanceof SyntaxError) {
            var ee = <SyntaxError>e
            Util.assert(false, () => "syntax error: " + ee.toString() + "\n\nfor program: " + f.toString())
        } else {
            trace.setException(state.texpr(e))
        }
    }

    trace.setPrestates(state.preStates)

    return trace
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
    /** record an event */
    record(ev: Data.Event) {
        this.trace.extend(ev)
    }
    /** get the trace expression for an (unproxied) value */
    texpr(v: any): Data.TraceExpr {
        if (Util.isPrimitive(v)) {
            return new Data.TraceConst(v)
        }
        Util.assert(this.object2proxy.has(v), () => "texpr only accepts proxied inputs")
    }
    /** add an expression as the current state expression of a value */
    addCurState(v: any, e: Data.Expr) {
        if (Util.isPrimitive(v)) return
        var state = this.curState.get(v) || []
        state.push(e)
        this.curState.set(v, state)
    }
    /** add a list of expressions as the pre-state expression of a value */
    addPreState(v: any, es: Data.Prestate[]) {
        this.preStates = this.preStates.concat(es)
        if (Util.isPrimitive(v)) return
        var state = this.preState.get(v) || []
        state = state.concat(es)
        this.preState.set(v, state)
    }
}

function proxify<T>(state: State, o: T): T {
    if (Util.isPrimitive(o)) return o
    if (state.object2proxy.has(o) !== undefined) return <T>state.object2proxy.get(o)
    var common = function (target: Object): Data.TraceExpr {
        var res = state.texpr(target);
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
            var ttarget = common(target)
            if (state.doRecord) {
                if (!(name in target) || target.hasOwnProperty(name)) {
                    var val = target[name];
                    var pval = proxify(state, val)

                    if (state.doRecord) {
                        var event = new Data.EGet(ttarget, new Data.TraceConst(name))
                        state.record(event)
                        state.addCurState(pval, event.variable)
                        var fieldId = new Data.Const(name)
                        state.addPreState(pval, ttarget.preState.map((t) => new Data.Field(t, fieldId)))
                    }

                    return pval
                    /*
                    var field = new Data.Field(state.getPath(target), makeFieldName(target, name))
                    state.addCandidate(val, field)
                    //log("reading " + name + " and got " + val)
                    if (state.hasPrestate(target)) {
                        // we cannot use "field" directly, because that is only valid in the current state
                        // however, here we need an expression that is valid in the prestate
                        state.addPrestate(val, new Data.Field(state.getPrestate(target), makeFieldName(target, name)))
                    }
                    if (Util.isPrimitive(val)) {
                        if (state.extended) {
                            var variable = new Data.Var()
                            variable.setValue(val)
                            var ass = new Data.Assign(variable, field, true)
                            state.record(ass)
                        }
                        return val;
                    } else {
                        var variable = new Data.Var()
                        variable.setValue(val)
                        var ass = new Data.Assign(variable, field, true)
                        state.record(ass)
                        var p = proxify(state, val)
                        state.setPath(p, variable)
                        return p
                    }*/
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
                var event = new Data.ESet(ttarget, new Data.TraceConst(name), tval)
                state.record(event)
                res = Reflect.set(target, name, value, receiver)
                state.addCurState(res, event.variable)
                /*
                var field = new Data.Field(state.getPath(target), makeFieldName(target, name));
                if (state.extended) {
                    // record the old value in a variable
                    var variable = new Data.Var()
                    var ass = new Data.Assign(variable, field, true)
                    state.record(ass)
                }
                var p = getAccessPath(state, value);
                var ass = new Data.Assign(field, p)
                state.record(ass)
                state.addCandidate(value, field)
                state.setPath(value, p)
                */
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
                var event = new Data.EApply(ttarget, state.texpr(receiver), targs)
                state.record(event)
                result = Reflect.apply(target, receiver, args)
                state.addCurState(result, event.variable)
                /*ignorec(".. unhandled call to apply")
                var v = new Data.Var()
                var f = getAccessPath(state, target)
                var args2 = args.map((a) => getAccessPath(state, a))
                var recv = null
                if (receiver !== global) {
                    recv = getAccessPath(state, receiver)
                }
                state.record(new Data.FuncCall(v, f, args2, recv))
                var prevDoRecord = state.doRecord
                state.doRecord = false
                var result = Reflect.apply(target, receiver, args)
                state.doRecord = prevDoRecord*/
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
                    //state.record(new Data.DefineProp(getAccessPath(state, o), name, getAccessPath(state, desc.value)))
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

                state.record(new Data.EDeleteProperty(ttarget, new Data.TraceConst(name)))
                /*
                var obj = getAccessPath(state, o);
                var f = makeFieldName(target, name);
                var field = new Data.Field(obj, f);
                if (state.extended) {
                    // record the old value in a variable
                    var variable = new Data.Var()
                    var ass = new Data.Assign(variable, field, true)
                    state.record(ass)
                }
                state.record(new Data.DeleteProp(obj, f))
                */
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
    var p = Proxy(o, Handler)
    state.proxy2object.set(p, o)
    state.object2proxy.set(o, p)
    return p
}

/**
 * Proxify the object `o', and log all behavior (in addition to actually performing the actions).
 */
export function proxifyWithLogger<T>(o: T, tag: string = " ", level: number = 0, cache: WeakMap<any, any> = new WeakMap<any, any>()): T {
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
    var logaccess = (a: any) => print(Ansi.lightgrey(a))
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
            var v = Reflect.apply(target, receiver, args);
            var s = common(target)
            if (Util.isPrimitive(v)) {
                logaccess(s + "apply (result: " + v + ")")
            } else {
                logaccess(s + "apply")
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
