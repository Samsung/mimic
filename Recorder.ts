
import Data = require('./Data')

import harmonyrefl = require('harmony-reflect');
harmonyrefl;
declare var Proxy: (target: Object, handler: Object) => Object;
declare var Reflect: any

import Util = require('./util/Util')
var log = Util.log
var print = Util.print

import ansi = require('./util/Ansicolors')

export function record(f: (..._: any[]) => any, args: any[]) {
    var state = new State()

    // instrument args
    var iargs = []
    for (var i = 0; i < args.length; i++) {
        if (Util.isPrimitive(args[i])) {
            iargs[i] = args[i]
        } else {
            iargs[i] = proxify(state, args[i])
        }
        var ai = new Data.Argument(i)
        state.setPath(iargs[i], ai)
        state.addCandidate(iargs[i], ai)
    }
    var res = f.apply(null, iargs);

    state.record(new Data.Return(getAccessPath(state, res)))

    return state
}

export class State {
    // maps objects to their last know valid access path
    private paths: Map<any, Data.Expr> = new Map<any, Data.Expr>()
    // maps any value to a set of potential access paths
    private candidates: Map<any, Data.Expr[]> = new Map<any, Data.Expr[]>()
    // map objects to their proxified object
    private mapping: Map<Object, Object> = new Map<Object, Object>()
    private trace: Data.Stmt[] = []
    getPath(a: any): Data.Expr {
        var p = this.paths.get(a)
        if (p !== undefined) return p
        return this.paths.get(this.mapping.get(a))
    }
    setPath(a: any, v: Data.Expr) {
        this.paths.set(a, v)
    }
    getCandidates(a: any): Data.Expr[] {
        var c = this.candidates.get(a) || []
        c = c.slice(0)
        if (Util.isPrimitive((a))) {
            c.push(new Data.Const(a, null))
        }
        return c
    }
    addCandidate(a: any, v: Data.Expr) {
        this.candidates.set(a, [v].concat(this.getCandidates(a) || []))
    }
    setMapping(o: Object, p: Object) {
        Util.assert(!this.mapping.has(o));
        this.mapping.set(o, p)
    }
    getMapping(o: Object) {
        return this.mapping.get(o)
    }
    record(stmt: Data.Stmt) {
        this.trace.push(stmt)
    }
    toString() {
        return this.trace.join("\n")
    }
}

function getAccessPath(state: State, v: any): Data.Expr {
    if (Util.isPrimitive(v)) {
        return new Data.Const(v, state.getCandidates(v))
    }
    Util.assert(state.getPath(v) !== undefined)
    return state.getPath(v)
}

function proxify(state: State, o: Object) {
    if (state.getMapping(o) !== undefined) return state.getMapping(o)
    var common = function (target) {
        Util.assert(state.getPath(target) !== undefined, "target path undefined")
    }
    var ignorec = ansi.lightgrey
    var Handler = {
        get: function(target, name, receiver) {
            common(target)
            if (!(name in target) || target.hasOwnProperty(name)) {
                var val = target[name];
                var field = new Data.Field(state.getPath(target), name)
                state.addCandidate(val, field)
                if (Util.isPrimitive(val)) {
                    return val;
                } else {
                    var variable = new Data.Var()
                    var p = proxify(state, val)
                    var ass = new Data.Assign(variable, field, true)
                    state.record(ass)
                    state.setPath(p, variable)
                    return p
                }
            } else {
                // TODO handle properties that are somewhere else
                print(ignorec("ignoring access to '" + name + "'."))
            }
            return Reflect.get(target, name, receiver);
        },
        set: function(target, name, value, receiver) {
            common(target)
            // TODO: record ALL candidate paths (maybe?)
            var field = new Data.Field(state.getPath(target), name);
            var p = getAccessPath(state, value);
            var ass = new Data.Assign(field, p)
            state.record(ass)
            state.addCandidate(value, field)
            state.setPath(value, p)
            return Reflect.set(target, name, value, receiver);
        },
        has: function(target, name) {
            common(target)
            print(ignorec(".. unhandled call to has"))
            return Reflect.has(target, name);
        },
        apply: function(target, receiver, args) {
            print(ignorec(".. unhandled call to apply"))
            common(target)
            return Reflect.apply(target, receiver, args);
        },
        construct: function(target, args) {
            print(ignorec(".. unhandled call to construct"))
            common(target)
            return Reflect.construct(target, args);
        },
        getOwnPropertyDescriptor: function(target, name) {
            print(ignorec(".. unhandled call to getOwnPropertyDescriptor for " + name + " on " + Util.inspect(target)))
            common(target)
            return Reflect.getOwnPropertyDescriptor(target, name);
        },
        defineProperty: function(target, name, desc) {
            common(target)
            if ("value" in desc) {
                // TODO
                print(ignorec(".. unhandled call to defineProperty (ignore for now)"))
                //state.record(new Data.DefineProp(getAccessPath(state, o), name, getAccessPath(state, desc.value)))
            } else {
                print(ignorec(".. unhandled call to defineProperty (unhandled type of descriptor)"))
            }
            return Reflect.defineProperty(target, name, desc);
        },
        getOwnPropertyNames: function(target) {
            print(ignorec(".. unhandled call to getOwnPropertyNames"))
            common(target)
            return Reflect.getOwnPropertyNames(target);
        },
        getPrototypeOf: function(target) {
            print(ignorec(".. unhandled call to getPrototypeOf"))
            common(target)
            return Reflect.getPrototypeOf(target);
        },
        setPrototypeOf: function(target, newProto) {
            print(ignorec(".. unhandled call to setPrototypeOf"))
            common(target)
            return Reflect.setPrototypeOf(target, newProto);
        },
        deleteProperty: function(target, name) {
            common(target)
            state.record(new Data.DeleteProp(getAccessPath(state, o), name))
            return Reflect.deleteProperty(target, name);
        },
        enumerate: function(target) {
            print(ignorec(".. unhandled call to enumerate"))
            common(target)
            return Reflect.enumerate(target);
        },
        preventExtensions: function(target) {
            print(ignorec(".. unhandled call to preventExtensions"))
            common(target)
            return Reflect.preventExtensions(target);
        },
        isExtensible: function(target) {
            print(ignorec(".. unhandled call to isExtensible on "+Util.inspect(target)))
            common(target)
            return Reflect.isExtensible(target);
        },
        ownKeys: function(target) {
            print(ignorec(".. unhandled call to ownKeys"))
            common(target)
            return Reflect.ownKeys(target);
        }
    }
    var p = Proxy(o, Handler)
    state.setMapping(o, p)
    return p
}