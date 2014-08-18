
import Data = require('./Data')

import harmonyrefl = require('harmony-reflect');
harmonyrefl;
declare var Proxy: (target: Object, handler: Object) => Object;
declare var Reflect: any

import Util = require('./util/Util')
var log = Util.log
var print = Util.print

import ansi = require('./util/Ansicolors')

export function record(f: (..._: any[]) => any, args: any[]): State {
    var state = new State()

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
        state.setPath(iargs[i], ai)
        state.addPrestate(iargs[i], ai)
        state.addCandidate(iargs[i], ai)
    }
    try {
        var res = f.apply(null, iargs);
        state.record(new Data.Return(getAccessPath(state, res)))
    } catch (e) {
        if (e instanceof Util.AssertionError) {
            throw e // don't catch our own errors
        }
        if (e instanceof ReferenceError) {
            var ee = <ReferenceError>e
            state.record(new Data.Throw(getAccessPath(state, ee.message.toString())))
        } else if (e instanceof RangeError) {
            var ee = <RangeError>e
            state.record(new Data.Throw(getAccessPath(state, ee.message.toString())))
        } else if (e instanceof SyntaxError) {
            var ee = <SyntaxError>e
            Util.assert(false, () => "syntax error: " + ee.toString() + "\n\nfor program: " + f.toString())
        } else {
            state.record(new Data.Throw(getAccessPath(state, e)))
        }
    }

    return state
}

export class State {
    // maps objects to an expression that can be used to access it
    private exprs: Map<any, Data.Expr> = new Map<any, Data.Expr>()
    // maps any value to a set of potential expressions that might be the
    // source of that value. for primitive, there is uncertainty in whether
    // these expressions really were the source, or whether they are the same
    // just by coincidence
    private candidates: Map<any, Data.Expr[]> = new Map<any, Data.Expr[]>()
    // map objects to their proxified object
    private mapping: Map<Object, Object> = new Map<Object, Object>()
    // map proxified objects to their target
    private mapping2: Map<Object, Object> = new Map<Object, Object>()
    public trace: Data.Trace = new Data.Trace([])
    // all prestate expressions that are read
    private readPrestateObj: Map<any, Data.Expr> = new Map<any, Data.Expr>()
    private readPrestate: Data.Expr[] = []
    addPrestate(a: any, e: Data.Expr) {
        if (Util.isPrimitive(a)) {
            this.readPrestate.push(e)
        } else {
            this.readPrestate.push(e)
            this.readPrestateObj.set(a, e)
        }
    }
    hasPrestate(a: any) {
        return this.readPrestateObj.has(this.mapping.get(a))
    }
    getPrestate(a: any) {
        return this.readPrestateObj.get(this.mapping.get(a))
    }
    getPrestates() {
        var res = this.readPrestate.slice(0)
        //this.readPrestateObj.forEach((v, k) => res.push(v))
        return Util.dedup2(res)
    }
    getPath(a: any): Data.Expr {
        Util.assert(!Util.isPrimitive(a))
        var p = this.exprs.get(a)
        if (p !== undefined) return p
        return this.exprs.get(this.mapping.get(a))
    }
    setPath(a: any, v: Data.Expr) {
        this.exprs.set(a, v)
    }
    getCandidates(a: any): Data.Expr[] {
        var c = this.candidates.get(a) || []
        c = c.slice(0)
        if (Util.isPrimitive(a)) {
            c.push(new Data.Const(a))
        }
        return Util.dedup2(c)
    }
    addCandidate(a: any, v: Data.Expr) {
        this.candidates.set(a, [v].concat(this.getCandidates(a) || []))
    }
    setMapping(o: Object, p: Object) {
        Util.assert(!this.mapping.has(o));
        this.mapping.set(o, p)
        this.mapping2.set(p, o)
    }
    getMapping(o: Object) {
        return this.mapping.get(o)
    }
    getMapping2(o: Object) {
        return this.mapping2.get(o)
    }
    record(stmt: Data.Stmt) {
        this.trace.extend(stmt)
    }
    toString() {
        return "State:\n  " + this.trace.stmts.join("\n  ")
    }
}


function getAccessPath(state: State, v: any): Data.Expr {
    if (Util.isPrimitive(v)) {
        return new Data.Const(v)
    }
    Util.assert(state.getPath(v) !== undefined, () => "getAccessPath(" + state + "," + Util.inspect(v, true) + ")")
    return state.getPath(v)
}

function proxify(state: State, o: Object) {
    if (state.getMapping(o) !== undefined) return state.getMapping(o)
    var common = function (target) {
        Util.assert(state.getPath(target) !== undefined, () => "target path undefined")
    }
    var ignorec = (a: any) => print(ansi.lightgrey(a))
    ignorec = (a: any) => a
    var Handler = {
        get: function(target, name: string, receiver) {
            common(target)
            if (!(name in target) || target.hasOwnProperty(name)) {
                var val = target[name];
                var field = new Data.Field(state.getPath(target), new Data.Const(name))
                state.addCandidate(val, field)
                //log("reading " + name + " and got " + val)
                if (state.hasPrestate(target)) {
                    // we cannot use "field" directly, because that is only valid in the current state
                    // however, here we need an expression that is valid in the prestate
                    state.addPrestate(val, new Data.Field(state.getPrestate(target), new Data.Const(name)))
                }
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
                ignorec("ignoring access to '" + name + "'.")
            }
            return Reflect.get(target, name, receiver);
        },
        set: function(target, name: string, value, receiver) {
            common(target)
            // TODO: record ALL candidate paths (maybe?)
            var field = new Data.Field(state.getPath(target), new Data.Const(name));
            var p = getAccessPath(state, value);
            var ass = new Data.Assign(field, p)
            state.record(ass)
            state.addCandidate(value, field)
            state.setPath(value, p)
            return Reflect.set(target, name, value, receiver);
        },
        has: function(target, name: string) {
            common(target)
            ignorec(".. unhandled call to has")
            return Reflect.has(target, name);
        },
        apply: function(target, receiver, args) {
            ignorec(".. unhandled call to apply")
            common(target)
            return Reflect.apply(target, receiver, args);
        },
        construct: function(target, args) {
            ignorec(".. unhandled call to construct")
            common(target)
            return Reflect.construct(target, args);
        },
        getOwnPropertyDescriptor: function(target, name: string) {
            ignorec(".. unhandled call to getOwnPropertyDescriptor for " + name + " on " + Util.inspect(target))
            common(target)
            return Reflect.getOwnPropertyDescriptor(target, name);
        },
        defineProperty: function(target, name: string, desc) {
            common(target)
            if ("value" in desc) {
                // TODO
                ignorec(".. unhandled call to defineProperty (ignore for now)")
                //state.record(new Data.DefineProp(getAccessPath(state, o), name, getAccessPath(state, desc.value)))
            } else {
                ignorec(".. unhandled call to defineProperty (unhandled type of descriptor)")
            }
            return Reflect.defineProperty(target, name, desc);
        },
        getOwnPropertyNames: function(target) {
            ignorec(".. unhandled call to getOwnPropertyNames")
            common(target)
            return Reflect.getOwnPropertyNames(target);
        },
        getPrototypeOf: function(target) {
            ignorec(".. unhandled call to getPrototypeOf")
            common(target)
            return Reflect.getPrototypeOf(target);
        },
        setPrototypeOf: function(target, newProto) {
            ignorec(".. unhandled call to setPrototypeOf")
            common(target)
            return Reflect.setPrototypeOf(target, newProto);
        },
        deleteProperty: function(target, name: string) {
            common(target)
            state.record(new Data.DeleteProp(getAccessPath(state, o), name))
            return Reflect.deleteProperty(target, name);
        },
        enumerate: function(target) {
            ignorec(".. unhandled call to enumerate")
            common(target)
            return Reflect.enumerate(target);
        },
        preventExtensions: function(target) {
            ignorec(".. unhandled call to preventExtensions")
            common(target)
            return Reflect.preventExtensions(target);
        },
        isExtensible: function(target) {
            ignorec(".. unhandled call to isExtensible on "+Util.inspect(target))
            common(target)
            return Reflect.isExtensible(target);
        },
        ownKeys: function(target) {
            ignorec(".. unhandled call to ownKeys")
            common(target)
            return Reflect.ownKeys(target);
        }
    }
    var p = Proxy(o, Handler)
    state.setMapping(o, p)
    return p
}

export function proxifyWithLogger<T>(o: T): T {
    var common = function (target) {
    }
    var logaccess = (a: any) => print(ansi.lightgrey(a))
    var Handler = {
        get: function(target, name: string, receiver) {
            common(target)
            var value = Reflect.get(target, name, receiver);
            var s = "get of " + name;
            if (Util.isPrimitive(value)) {
                s += " (yields " + value + ")"
            }
            logaccess(s)
            return value;
        },
        set: function(target, name: string, value, receiver) {
            common(target)
            var s = "set of " + name;
            if (Util.isPrimitive(value)) {
                s += " (with value " + value + ")"
            }
            logaccess(s)
            return Reflect.set(target, name, value, receiver);
        },
        has: function(target, name: string) {
            common(target)
            logaccess("has of " + name)
            return Reflect.has(target, name);
        },
        apply: function(target, receiver, args) {
            logaccess("apply")
            common(target)
            return Reflect.apply(target, receiver, args);
        },
        construct: function(target, args) {
            logaccess("construct")
            common(target)
            return Reflect.construct(target, args);
        },
        getOwnPropertyDescriptor: function(target, name: string) {
            logaccess("getOwnPropertyDescriptor for " + name)
            common(target)
            return Reflect.getOwnPropertyDescriptor(target, name);
        },
        defineProperty: function(target, name: string, desc) {
            common(target)
            logaccess("defineProperty for " + name)
            return Reflect.defineProperty(target, name, desc);
        },
        getOwnPropertyNames: function(target) {
            logaccess("getOwnPropertyNames")
            common(target)
            return Reflect.getOwnPropertyNames(target);
        },
        getPrototypeOf: function(target) {
            logaccess("getPrototypeOf")
            common(target)
            return Reflect.getPrototypeOf(target);
        },
        setPrototypeOf: function(target, newProto) {
            logaccess("setPrototypeOf")
            common(target)
            return Reflect.setPrototypeOf(target, newProto);
        },
        deleteProperty: function(target, name: string) {
            common(target)
            logaccess("deleteProperty for " + name)
            return Reflect.deleteProperty(target, name);
        },
        enumerate: function(target) {
            logaccess("enumerate")
            common(target)
            return Reflect.enumerate(target);
        },
        preventExtensions: function(target) {
            logaccess("preventExtensions")
            common(target)
            return Reflect.preventExtensions(target);
        },
        isExtensible: function(target) {
            logaccess("isExtensible")
            common(target)
            return Reflect.isExtensible(target);
        },
        ownKeys: function(target) {
            logaccess("ownKeys")
            common(target)
            return Reflect.ownKeys(target);
        }
    }
    var p = Proxy(o, Handler)
    return <T>p
}

// given a trace, generate all possible candidate implementations
// for the primitive values that occur
export function generateCandidates(state: State): Data.Program[] {
    return generateCandidatePrograms(state, state.trace.stmts)
}

function generateCandidatePrograms(state: State, stmts: Data.Stmt[]): Data.Program[] {
    var res = []

    if (stmts.length === 0) return []
    var head = stmts[0]
    var tail = stmts.slice(1)

    var heads = generateCandidateStmts(state, head)
    var tails = generateCandidatePrograms(state, tail)
    heads.forEach((s) => {
        if (tails.length === 0) {
            res.push(new Data.Program([s]))
        }
        else {
            tails.forEach((p) => {
                res.push(new Data.Program([s].concat(p.stmts)))
            })
        }
    })

    return res
}

function generateCandidateStmts(state: State, stmt: Data.Stmt): Data.Stmt[] {
    var res = []
    var s
    switch (stmt.type) {
        case Data.StmtType.Assign:
            s = <Data.Assign>stmt
            var rhss = generateCandidateExprs(state, s.rhs)
            var lhss = generateCandidateExprs(state, s.lhs)
            lhss.forEach((e1) => {
                rhss.forEach((e2) => {
                    res.push(new Data.Assign(e1, e2))
                })
            })
            break
        case Data.StmtType.Return:
            s = <Data.Return>stmt
            generateCandidateExprs(state, s.rhs).forEach((e) => {
                res.push(new Data.Return(e))
            })
            break
        default: Util.assert(false, () => "unknown type "+stmt.type)
    }
    return res
}
function generateCandidateExprs(state: State, expr: Data.Expr): Data.Expr[] {
    var res = []
    var e
    switch (expr.type) {
        case Data.ExprType.Field:
            e = <Data.Field>expr
            var os = generateCandidateExprs(state, e.o)
            var fs = generateCandidateExprs(state, e.f)
            os.forEach((o) => {
                fs.forEach((f) => {
                    res.push(new Data.Field(o, f))
                })
            })
            break
        case Data.ExprType.Const:
            e = <Data.Const>expr
            res = state.getCandidates(e.val)
            break
        case Data.ExprType.Arg:
            res.push(expr)
            break
        case Data.ExprType.Var:
            e = <Data.Var>expr
            res.push(e)
            break
        default:
            Util.assert(false, () => "unknown type "+expr.type)
    }
    return res
}
