
import Util = require('./util/Util')

export enum ExprType {
    Field = 1000, // make sure these don't collide with other types
    Arg,
    Var,
    Const
}

export class Node {
    type: any
    /* Returns all direct child nodes (of type Node) */
    children(): Node[] {
        Util.assert(false)
        return []
    }
    /* Returns all direct children (that are somehow relevant for equality) */
    anychildren(): any[] {
        Util.assert(false)
        return []
    }
}

export class Expr extends Node {
    constructor(public type: ExprType) {
        super()
    }
    eval(args: any[], oldArgs: any[]): any {
        Util.assert(false)
    }
    update(args: any[], val: any): any {
        Util.assert(false)
    }
    equals(o): boolean {
        Util.assert(false)
        return false
    }
}

/*
skeleton for pattern match:

var e
switch (expr.type) {
    case Data.ExprType.Field:
        e = <Data.Field>expr
        break
    case Data.ExprType.Const:
        e = <Data.Const>expr
        break
    case Data.ExprType.Arg:
        e = <Data.Arg>expr
        break
    case Data.ExprType.Var:
        e = <Data.Var>expr
        break
    default:
        Util.assert(false, "unknown type "+expr.type)
}
*/

// access path through a field
export class Field extends Expr {
    constructor(public o: Expr, public f: string) {
        super(ExprType.Field)
    }
    toString() {
        return this.o.toString() + "[\"" + this.f + "\"]"
    }
    eval(args: any[], oldArgs: any[]): any {
        return this.o.eval(args, oldArgs)[this.f]
    }
    update(args: any[], val: any): any {
        this.o.eval(args, args)[this.f] = val
    }
    equals(o) {
        return o instanceof Field && o.f === this.f && o.o.equals(this.o)
    }
    children(): Node[] {
        return [this.o]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        res = res.concat([this.f])
        return res
    }
}

// access path by looking at the ith argument
export class Argument extends Expr {
    constructor(public i: number) {
        super(ExprType.Arg)
    }
    toString() {
        return "arguments[" + this.i + "]"
    }
    eval(args: any[], oldArgs: any[]): any {
        return args[this.i]
    }
    update(args: any[], val: any): any {
        args[this.i] = val;
    }
    equals(o): boolean {
        return o instanceof Argument && o.i === this.i
    }
    children(): Node[] {
        return []
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        res = res.concat([this.i])
        return res
    }
}

export class Var extends Expr {
    private static count = 0
    name: string
    constructor() {
        super(ExprType.Var)
        this.name = "n" + Var.count
        Var.count++
    }
    toString() {
        return this.name
    }
    equals(o): boolean {
        return o instanceof Var && o.name === this.name
    }
    children(): Node[] {
        return []
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        res = res.concat([this.name])
        return res
    }
}

// a primitive value
export class Const extends Expr {
    constructor(public val: any, public candidates: Expr[]) {
        super(ExprType.Const)
        Util.assert(Util.isPrimitive(this.val))
    }
    toString() {
        if (typeof this.val === "string") {
            return "\"" + this.val + "\""
        }
        return this.val
    }
    equals(o): boolean {
        return o instanceof Const && o.val === this.val
    }
    children(): Node[] {
        return []
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        res = res.concat([this.val])
        return res
    }
}

export enum StmtType {
    Assign = 2000,
    Return,
    DeleteProp,
    DefineProp,
    VarDecl,
}

export class Stmt extends Node {
    constructor(public type: StmtType) {
        super()
    }
    equals(o): boolean {
        Util.assert(false)
        return false
    }
    /*visit(f: (s: Stmt) => any) {
        if (f(this) !== false) {
            var cs = this.children()
            for (var i = 0; i < cs.length; i++) {
                cs[i].visit(f)
            }
        }
    }*/
}

/*
 skeleton for pattern match:

var s
switch (stmt.type) {
    case Data.StmtType.Assign:
        e = <Data.Assign>stmt
        break
    case Data.StmtType.DefineProp:
        e = <Data.DefineProp>stmt
        break
    case Data.StmtType.DeleteProp:
        e = <Data.DeleteProp>stmt
        break
    case Data.StmtType.Return:
        e = <Data.Return>stmt
        break
    case Data.StmtType.VarDecl:
        e = <Data.VarDecl>stmt
        break
    default:
        Util.assert(false, "unknown type "+expr.type)
}
*/

export class Assign extends Stmt {
    constructor(public lhs: Expr, public rhs: Expr, public isDecl: boolean = false) {
        super(StmtType.Assign)
    }
    toString() {
        var prefix = ""
        if (this.isDecl) {
            prefix = "var "
        }
        return prefix + this.lhs.toString() + " = " + this.rhs.toString()
    }
    equals(o) {
        return o instanceof Assign && o.lhs.equals(this.lhs) && o.rhs.equals(this.rhs)
    }
    children(): Node[] {
        return [this.lhs, this.rhs]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
}
export class Return extends Stmt {
    constructor(public rhs: Expr) {
        super(StmtType.Return)
    }
    toString() {
        return "return " + this.rhs.toString()
    }
    equals(o) {
        return o instanceof Return && o.rhs.equals(this.rhs)
    }
    children(): Node[] {
        return [this.rhs]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
}
export class DeleteProp extends Stmt {
    constructor(public o: Expr, public f: string) {
        super(StmtType.DeleteProp)
    }
    toString() {
        return "delete " + this.o.toString() + "[\"" + this.f.toString() + "\"]"
    }
    equals(o) {
        return o instanceof DeleteProp && o.o.equals(this.o) && o.f === this.f
    }
    children(): Node[] {
        return [this.o]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        res = res.concat([this.f])
        return res
    }
}
export class DefineProp extends Stmt {
    constructor(public o: Expr, public f: string, public v: any) {
        super(StmtType.DefineProp)
    }
    toString() {
        return "Object.defineProperty(" + this.o.toString() +
            ", \"" + this.f.toString() + "\", {value: " + this.v.toString() + "})"
    }
    equals(o) {
        return o instanceof DefineProp && o.o.equals(this.o) && o.f === this.f && o.v === this.v
    }
    children(): Node[] {
        return [this.o]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        res = res.concat([this.f, this.v])
        return res
    }
}
export class VarDecl extends Stmt {
    constructor(public v: Var) {
        super(StmtType.VarDecl)
    }
    toString() {
        return "var " + this.v.name
    }
    equals(o): boolean {
        return o instanceof VarDecl && o.v.equals(this.v)
    }
    children(): Node[] {
        return [this.v]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
}


export class Program {
    static Empty = new Program([])
    public stmts: Stmt[]
    constructor(stmts: Stmt[]) {
        this.stmts = stmts.slice(0)
    }
    toString() {
        return this.stmts.join("\n")
    }
}



export class Trace {
    constructor(public stmts: Stmt[]) {
    }
    extend(s: Stmt) {
        this.stmts.push(s)
    }
    toString() {
        return "Trace:\n  " + this.stmts.join("\n  ")
    }
    equals(o) {
        if (!(o instanceof Trace))
            return false
        if (o.stmts.length !== this.stmts.length)
            return false
        for (var i = 0; i < o.stmts.length; i++) {
            if (!o.stmts[i].equals(this.stmts[i]))
                return false
        }
        return true
    }
}
