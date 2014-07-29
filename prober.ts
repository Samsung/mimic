

// activate ES6 proxy proposal
///<reference path="harmony-reflect.d.ts" />
import reflect = require('harmony-reflect');
var unused = reflect.get;
function proxy<T>(target: T, handler: any): T {
    return Proxy(target, handler);
}
//function anyproxy(target: any, handler: any): any {
//    return proxy(target, handler);
//}

// colored output
// /<reference path="ansicolors.d.ts" />
//import ansi = require('ansicolors');

// /<reference path="assert.d.ts" />
//import assrt = require("assert");
function assert(condition: any, message?: string) {
    if (!condition) {
        throw (message || "Assertion failed") + "\n" + console.trace()
    }
}

module Ansicolors {
    export function green(s: string) {
        return xterm(2)(s);
    }
    export function red(s: string) {
        return xterm(1)(s);
    }
    export function xterm(n: number): (s: string) => string {
        return (s: string) => {
            return '\033[38;5;'+n+'m' + s + '\033[0m'
        }
    }
}
import ansi = Ansicolors

// utility functions
function print(s: string) {
    console.log(s)
}
function line(str?: string) {
    print("------------------------ " + (str || ""))
}
function isPrimitive(arg: any) {
    var type = typeof arg;
    return arg == null || (type != "object" && type != "function");
}
function toString(x) {
    return x.toString()
}
function dedup<T>(a: T[]): T[] {
    return a.filter(function(elem, pos) {
        return a.indexOf(elem) == pos;
    })
}

// non-ideal clone method
// taken from: http://stackoverflow.com/questions/728360/most-elegant-way-to-clone-a-javascript-object
function clone<T>(obj: T): T {
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

// data structure to keep access paths
class AccessPath {
    isField(): boolean {
        return false
    }
    isArgument(): boolean {
        return false
    }
    isOld(): boolean {
        return false
    }
    eval(args: any[], oldArgs: any[]): any {
        assert(false)
    }
    update(args: any[], val: any): any {
        assert(false)
    }
}
class Field extends AccessPath {
    constructor(public o: AccessPath, public f: string) {
        super()
    }
    toString() {
        return this.o.toString() + "[\"" + this.f + "\"]"
    }
    isField() {
        return true
    }
    eval(args: any[], oldArgs: any[]): any {
        return this.o.eval(args, oldArgs)[this.f]
    }
    update(args: any[], val: any): any {
        this.o.eval(args, args)[this.f] = val
    }
}
class Argument extends AccessPath {
    constructor(public i: number) {
        super()
    }
    toString() {
        return "args[" + this.i + "]"
    }
    isArgument() {
        return true
    }
    eval(args: any[], oldArgs: any[]): any {
        return args[this.i]
    }
    update(args: any[], val: any): any {
        args[this.i] = val;
    }
}
class Old extends AccessPath {
    constructor(public e: AccessPath) {
        super()
    }
    toString() {
        return "old(" + this.e.toString() + ")"
    }
    isOld() {
        return true
    }
    eval(args: any[], oldArgs: any[]): any {
        return this.e.eval(oldArgs, oldArgs)
    }
    update(args: any[], val: any): any {
        this.e.update(args, val)
    }
}
function makeField(o: AccessPath, f: string) { return new Field(o, f) }
function makeArgument(i: number) { return new Argument(i) }
function makeOld(e: AccessPath) {
    if (e.isArgument() === true || e.isOld() === true) {
        return e
    }
    return new Old(e)
}

// take a function, and try to determine it's value flow
function probe(f: (a: any) => any, args: any[]) {

    line("start probe for args=" + args)

    var paths: Map<any, AccessPath[]> = new Map<any, AccessPath[]>() // maps wrapped objects and literals to a list of paths
    var mapping: Map<any, any> = new Map<any, any>() // maps unwrapped object to wrapped ones

    var addPath = function (o: any, path: AccessPath) {
        var newpaths: AccessPath[] = (paths.get(o) || [])
        newpaths.push(path)
        paths.set(o, dedup(newpaths))
    }
    var addPaths = function (o: any, path: AccessPath[]) {
        path.map((p: AccessPath) => addPath(o, p))
    }

    // instrument the object o so that accesses to it can be monitored
    // name is used for debugging only
    var instrument = function(o, oname) {
        if (mapping.has(o)) return mapping.get(o);
        var color = ansi.xterm(240)
        var common = function(target) {
            assert(mapping.has(target))
        }
        var p = proxy(o, {
            set: function(target, name, val) {
                common(target)
                print(color("  set '"+name+"' to "+val+" ["+oname+"]"))
                target[name] = val;
            },
            deleteProperty: function(target, name) {
                common(target)
                print(color("  delete '"+name+"' ["+oname+"]"))
                delete target[name]
            },
            get: function(target, name) {
                common(target)
                var v = target[name]
                print(color("  get '"+name+"' (result is "+v+")"+" ["+oname+"]"))
                if (!paths.has(v)) {
                    var morepaths = paths.get(mapping.get(target)).map((p: AccessPath) => {
                        return makeField(p , name)
                    })
                    if (isPrimitive(v)) {
                        // cannot wrap, but still record it's path
                    } else {
                        // wrap things we have not already wrapped
                        // TODO
                    }
                    addPaths(v, morepaths)
                }
                return v
            },
            defineProperty: function(target, name, propertyDescriptor) {
                common(target)
                print(color("  defineProperty '"+name+"' as "+propertyDescriptor+" ["+oname+"]"))
                Object.defineProperty(target, name, propertyDescriptor)
                return true
            }
        })
        mapping.set(o, p)
        return p
    }

    // function Field(val){
    //     this.value = val;
    // }
    // Field.prototype = {
    //     get value(){
    //         return this._value;
    //     },
    //     set value(val){
    //         this._value = val;
    //     }
    // };
    // var f = instrument(new Field(10))
    // f.value = 11
    // print(f.value)

    // instrument args
    var iargs = []
    for (var i = 0; i < args.length; i++) {
        if (isPrimitive(args[i])) {
            iargs[i] = args[i]
        } else {
            iargs[i] = instrument(args[i], "arg" + i)
        }
        addPath(iargs[i], makeArgument(i))
    }

    var res = f.apply(null, iargs);

    line("end probe")
    return {
        mapping: mapping,
        paths: paths,
        result: res
    }
}


// generate a new primitive candidate value to probe a function
// further
function getPrimitiveCandidate(oldVal: any) {
    if (typeof oldVal === 'number') {
        return oldVal + 1;
    }
    if (typeof oldVal === 'string') {
        return oldVal + "2"
    }
    assert(false, "don't know how to generate primitive value for "+(typeof oldVal));
}

// main function that probes f with the initial arguments args
// args are modified as necessary, and the result it logged
function driver(f, args) {

    var origArgs = args
    args = clone(origArgs)

    var r = probe(f, args)

    var summaryc = ansi.green
    var candidates = <AccessPath[]> r.paths.get(r.result)
    for (var i = 0, j = candidates.length; i < j; i++) {
        candidates.push(makeOld(candidates[i]))
    }
    candidates = dedup(candidates)
    if (isPrimitive(r.result)) {
        if (r.paths.get(r.result)) {
            print(("The result is primitive, and might be one of the following:"))
            print(("  "+candidates.map(toString)))

            var stillcandidate = []
            for (var i = 0; i < candidates.length; i++) {
                var c = candidates[i]
                args = clone(origArgs)
                var newval = getPrimitiveCandidate(r.result)
                c.update(args, newval)
                var oldArgs = clone(args)
                var nr = probe(f, args)
                if (nr.result === c.eval(args, oldArgs)) {
                    stillcandidate.push(c)
                } else {
                    // print(c.toString())
                    // print("  " + nr.result)
                    // print("  " + evaluateAccessPath(c, args, oldArgs))
                    // print("  " + args)
                    // print("  " + oldArgs)
                }
            }
            print(summaryc("After some additional probing, the following candidates remained:"))
            print(summaryc("  "+stillcandidate.map(toString)))
        } else {
            print(summaryc("The result is primitive and was created inside the method."))
        }
    } else {
        if (r.paths.get(r.result)) {
            print(summaryc("The result was an input, and can be read through any of the following:"))
            print(summaryc("  "+candidates.map(toString)))
        } else {
            print(summaryc("The result is non-primitive and was created inside the method."))
        }
    }
}





// ---- some tests

function push(a, b) {
    return a.push(b);
}

function pop(a) {
    return a.pop();
}

function defineProp(o, f, v) {
    Object.defineProperty(o, f, {value : v});
    return o[f]
}

driver(pop, [["a", "a"]])
driver(push, [["a"], "b"])
driver(defineProp, [{}, "field", 42])
