
import Util = require('./util/Util')

export enum ExprType {
    Field = 1000, // make sure these don't collide with other types
    Arg,
    Var,
    Const,
    Add,
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
    toSkeleton(): string {
        Util.assert(false, () => "toSkeleton not implemented for " + this)
        return null
    }
}

export class Expr extends Node {
    // the value observed at runtime, if any
    private value: any
    private valueSet: boolean = false
    constructor(public type: ExprType) {
        super()
    }
    eval(args: any[]): any {
        Util.assert(false)
    }
    update(args: any[], val: any): any {
        Util.assert(false)
    }
    equals(o): boolean {
        Util.assert(false)
        return false
    }
    hasValue() {
        return this.valueSet
    }
    getValue() {
        return this.value
    }
    setValue(val: any) {
        this.value = val
        this.valueSet = true
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
    constructor(public o: Expr, public f: Expr) {
        super(ExprType.Field)
    }
    toString() {
        return this.o.toString() + "[" + this.f.toString() + "]"
    }
    eval(args: any[]): any {
        return this.o.eval(args)[this.f.eval(args)]
    }
    update(args: any[], val: any): any {
        this.o.eval(args)[this.f.eval(args)] = val
    }
    equals(o) {
        return o instanceof Field && o.f.equals(this.f) && o.o.equals(this.o)
    }
    children(): Node[] {
        return [this.o, this.f]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
    toSkeleton(): string {
        return this.o.toSkeleton() + "[" + this.f.toSkeleton() + "]"
    }
}

export class Add extends Expr {
    constructor(public a: Expr, public b: Expr) {
        super(ExprType.Add)
    }
    toString() {
        return this.a.toString() + "+" + this.b.toString()
    }
    eval(args: any[]): any {
        return this.a.eval(args)+this.b.eval(args)
    }
    equals(o) {
        return o instanceof Add && o.a.equals(this.a) && o.b.equals(this.b)
    }
    children(): Node[] {
        return [this.a, this.b]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
    toSkeleton(): string {
        return this.a.toSkeleton() + "+" + this.b.toSkeleton()
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
    eval(args: any[]): any {
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
    toSkeleton(): string {
        return "arg(" + this.i + ")"
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
    toSkeleton(): string {
        return "var"
    }
}

// a primitive value
export class Const extends Expr {
    constructor(public val: any) {
        super(ExprType.Const)
        this.setValue(val)
        Util.assert(Util.isPrimitive(this.val))
    }
    toString() {
        if (typeof this.val === "string") {
            return "\"" + this.val + "\""
        }
        return this.val
    }
    eval(args: any[]): any {
        return this.val
    }
    update(args: any[], val: any): any {
        Util.assert(false, () => "cannot update constant")
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
    toSkeleton(): string {
        return "const"
    }
}

export enum StmtType {
    Assign = 2000,
    Return,
    Throw,
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
    toSkeleton(): string {
        return this.lhs.toSkeleton() + "=" + this.rhs.toSkeleton()
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
    toSkeleton(): string {
        return "ret " + this.rhs.toSkeleton()
    }
}
export class Throw extends Stmt {
    constructor(public rhs: Expr) {
        super(StmtType.Throw)
    }
    toString() {
        return "throw " + this.rhs.toString()
    }
    equals(o) {
        return o instanceof Throw && o.rhs.equals(this.rhs)
    }
    children(): Node[] {
        return [this.rhs]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
    toSkeleton(): string {
        return "throw " + this.rhs.toSkeleton()
    }
}
export class DeleteProp extends Stmt {
    constructor(public o: Expr, public f: Expr) {
        super(StmtType.DeleteProp)
    }
    toString() {
        return "delete " + this.o.toString() + "[" + this.f.toString() + "]"
    }
    equals(o) {
        return o instanceof DeleteProp && o.o.equals(this.o) && o.f.equals(this.f)
    }
    children(): Node[] {
        return [this.o, this.f]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
    toSkeleton(): string {
        return "del " + this.f.toSkeleton() + " of " + this.o.toSkeleton()
    }
}
export class DefineProp extends Stmt {
    constructor(public o: Expr, public f: Expr, public v: Expr) {
        super(StmtType.DefineProp)
    }
    toString() {
        return "Object.defineProperty(" + this.o.toString() +
            ", " + this.f.toString() + ", {value: " + this.v.toString() + "})"
    }
    equals(o) {
        return o instanceof DefineProp && o.o.equals(this.o) && o.f.equals(this.f) && o.v.equals(this.v)
    }
    children(): Node[] {
        return [this.o, this.f, this.v]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
    toSkeleton(): string {
        return "def " + this.f.toSkeleton() + " of " + this.o.toSkeleton() + " as " + this.v.toSkeleton()
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
        return "  " + this.stmts.join("\n  ")
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
    toSkeleton(): string[] {
        return this.stmts.map((s) => s.toSkeleton())
    }
    getSkeletonIdx(i: number): Stmt {
        return this.stmts[i]
    }
    lastStmt(): Stmt {
        return this.stmts[this.stmts.length-1]
    }
}



export class VariableMap {
    private a: Map<string, Var[]> = new Map<string, Var[]>()
    private b: Map<string, Var[]> = new Map<string, Var[]>()
    private eq: Map<string, boolean> = new Map<string, boolean>()
    addFromA(v: Var, e: Expr) {
        var s = e.toString()
        if (this.b.has(s)) {
            this.b.get(s).forEach((v2) => this.eq.set(v.name + "|" + v2.name, true))
        }
        var old = this.a.get(s) || []
        old.push(v)
        this.a.set(s, old)
    }
    addFromB(v: Var, e: Expr) {
        var s = e.toString()
        if (this.a.has(s)) {
            this.a.get(s).forEach((v2) => this.eq.set(v2.name + "|" + v.name, true))
        }
        var old = this.b.get(s) || []
        old.push(v)
        this.b.set(s, old)
    }
    areEqual(a: Var, b: Var) {
        return this.eq.has(a.name + "|" + b.name)
    }
}