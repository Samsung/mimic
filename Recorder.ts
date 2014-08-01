
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
        state.setPath(iargs[i], new Data.Argument(i))
    }
    var res = f.apply(null, iargs);

    state.recordReturn(getAccessPath(state, res))

    return state
}

export class State {
    // maps objects to their last know valid access path
    private paths: Map<any, Data.AccessPath> = new Map<any, Data.AccessPath>()
    // map objects to their proxified object
    private mapping: Map<Object, Object> = new Map<Object, Object>()
    private trace: Data.Statement[] = []
    getPath(a: any): Data.AccessPath {
        var p = this.paths.get(a)
        if (p !== undefined) return p
        return this.paths.get(this.mapping.get(a))
    }
    setPath(a: any, v: Data.AccessPath) {
        this.paths.set(a, v)
    }
    setMapping(o: Object, p: Object) {
        Util.assert(!this.mapping.has(o));
        this.mapping.set(o, p)
    }
    getMapping(o: Object) {
        return this.mapping.get(o)
    }
    recordAssignment(lhs: Data.AccessPath, rhs: Data.AccessPath) {
        this.trace.push(new Data.Assignment(lhs, rhs))
    }
    recordReturn(result: Data.AccessPath) {
        this.trace.push(new Data.Return(result))
    }
    toString() {
        return this.trace.join("\n")
    }
}

function getAccessPath(state: State, v: any): Data.AccessPath {
    if (Util.isPrimitive(v)) {
        return new Data.Primitive(v)
    }
    Util.assert(state.getPath(v) !== undefined)
    return state.getPath(v)
}

function proxify(state: State, o: Object) {
    if (state.getMapping(o) !== undefined) return state.getMapping(o)
    var common = function (target) {
        Util.assert(state.getPath(target) !== undefined, "target path undefined")
    }
    var Handler = {
        get: function(target, name, receiver) {
            common(target)
            // TODO handle properties that are somewhere else
            if (!(name in target) || target.hasOwnProperty(name)) {
                var val = target[name];
                if (Util.isPrimitive(val)) {
                    return val;
                } else {
                    var variable = new Data.Var()
                    var p = proxify(state, val)
                    state.recordAssignment(variable, new Data.Field(state.getPath(target), name))
                    state.setPath(p, variable)
                    return p
                }
            } else {
                print(ansi.lightgrey("ignoring access to '" + name + "'."))
            }
            return Reflect.get(target, name, receiver);
        },
        set: function(target, name, value, receiver) {
            common(target)
            state.recordAssignment(new Data.Field(state.getPath(target), name), getAccessPath(state, value))
            return Reflect.set(target, name, value, receiver);
        },
        has: function(target, name) {
            common(target)
            return Reflect.has(target, name);
        },
        apply: function(target, receiver, args) {
            common(target)
            return Reflect.apply(target, receiver, args);
        },
        construct: function(target, args) {
            common(target)
            return Reflect.construct(target, args);
        },
        getOwnPropertyDescriptor: function(target, name) {
            common(target)
            return Reflect.getOwnPropertyDescriptor(target, name);
        },
        defineProperty: function(target, name, desc) {
            common(target)
            return Reflect.defineProperty(target, name, desc);
        },
        getOwnPropertyNames: function(target) {
            common(target)
            return Reflect.getOwnPropertyNames(target);
        },
        getPrototypeOf: function(target) {
            common(target)
            return Reflect.getPrototypeOf(target);
        },
        setPrototypeOf: function(target, newProto) {
            common(target)
            return Reflect.setPrototypeOf(target, newProto);
        },
        deleteProperty: function(target, name) {
            common(target)
            return Reflect.deleteProperty(target, name);
        },
        enumerate: function(target) {
            common(target)
            return Reflect.enumerate(target);
        },
        preventExtensions: function(target) {
            common(target)
            return Reflect.preventExtensions(target);
        },
        isExtensible: function(target) {
            common(target)
            return Reflect.isExtensible(target);
        },
        ownKeys: function(target) {
            common(target)
            return Reflect.ownKeys(target);
        }
    }
    var p = Proxy(o, Handler)
    state.setMapping(o, p)
    return p
}