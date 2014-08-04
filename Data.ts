
import Util = require('./util/Util')

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
        Util.assert(false)
    }
    update(args: any[], val: any): any {
        Util.assert(false)
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

export class Var extends AccessPath {
    private static count = 0
    name: string
    constructor() {
        super()
        this.name = "n" + Var.count
        Var.count++
    }
    toString() {
        return this.name
    }
}

export class Primitive extends AccessPath {
    constructor(public val: any) {
        super()
        Util.assert(Util.isPrimitive(this.val))
    }
    toString() {
        if (typeof this.val === "string") {
            return "\"" + this.val + "\""
        }
        return this.val
    }
}

export class Statement {

}
export class Assignment extends Statement {
    constructor(public lhs: AccessPath, public rhs: AccessPath) {
        super()
    }
    toString() {
        return this.lhs.toString() + " = " + this.rhs.toString()
    }
}
export class Return extends Statement {
    constructor(public rhs: AccessPath) {
        super()
    }
    toString() {
        return "return " + this.rhs.toString()
    }
}
export class DeleteProperty extends Statement {
    constructor(public o: AccessPath, public f: string) {
        super()
    }
    toString() {
        return "delete " + this.o.toString() + "[\"" + this.f.toString() + "\"]"
    }
}
export class DefineProperty extends Statement {
    constructor(public o: AccessPath, public f: string, public v: any) {
        super()
    }
    toString() {
        return "Object.defineProperty(" + this.o.toString() +
            ", \"" + this.f.toString() + "\", {value: " + this.v.toString() + "})"
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
