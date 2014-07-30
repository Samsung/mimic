/// <reference path="util/assert.d.ts" />

// abstract description of an access path that a method took to, say, modify a field
export class AccessPath {
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

// access path through a field
export class Field extends AccessPath {
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

// access path by looking at the ith argument
export class Argument extends AccessPath {
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

// access to e in the function pre-state
export class Old extends AccessPath {
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

// factory methods for access paths
export function makeField(o: AccessPath, f: string) { return new Field(o, f) }
export function makeArgument(i: number) { return new Argument(i) }
export function makeOld(e: AccessPath) {
    if (e.isArgument() === true || e.isOld() === true) {
        return e
    }
    return new Old(e)
}
