/**
 * Data structures for programs, statements, expressions and traces.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Util = require('./util/Util')

/**
 * Common ancestor for expressions and statements.
 */
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

/**
 * An enum for expressions.
 */
export enum ExprType {
    Field = 1000, // make sure these don't collide with other types
    Arg,
    Var,
    Const,
    Add,
}

/**
 * Common ancestor for all expressions.
 */
export class Expr extends Node {
    // the value observed at runtime, if any
    private value: any
    private valueSet: boolean = false
    constructor(public type: ExprType, public depth: number) {
        super()
    }

    /**
     * Evaluate this expression over args.  Assumes this.isSafe(args) === true.
     */
    eval(args: any[]): any {
        Util.assert(false)
    }

    /**
     * Update the value of this expression in args to `val'.  Assumes that this.canBeUpdate(args) === true.
     */
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

    /**
     * Returns true if the expression (interpreted over args) can be updated.
     *
     * For instance, a constant cannot be updated, or a field of something that isn't an object or array.
     */
    canBeUpdated(args: any[]): boolean {
        Util.assert(false)
        return false
    }

    /**
     * Returns true if the expression (interpreted over arg) already has the value `val'.
     * Assumes that this.canBeUpdate(args) === true.
     */
    isUpdateNop(args: any[], val: any): boolean {
        Util.assert(false)
        return false
    }

    /**
     * Returns true if the expression interpreted over args makes sense and can safely be accessed.
     */
    isSafe(args: any[]): boolean {
        Util.assert(false)
        return false
    }
}

/**
 * A field access.
 */
export class Field extends Expr {
    constructor(public o: Expr, public f: Expr) {
        super(ExprType.Field, 1+Math.max(o.depth, f.depth))
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
    canBeUpdated(args: any[]): boolean {
        if (!this.isSafe(args)) {
            return false
        }
        var o = this.o.eval(args)
        var i = this.f.eval(args)
        if (Array.isArray(o) && (i < 0 || i >= o.length)) {
            return false
        }
        return true
    }
    isUpdateNop(args: any[], val: any): boolean {
        return this.eval(args) === val
    }
    isSafe(args: any[]): boolean {
        return this.o.isSafe(args) && this.canHaveFields(this.o.eval(args))
    }
    private canHaveFields(oVal: any) {
        var type = typeof oVal;
        return type === 'object' || type === 'function'
    }
}

/**
 * An addition.
 */
export class Add extends Expr {
    constructor(public a: Expr, public b: Expr) {
        super(ExprType.Add, 1+Math.max(a.depth, b.depth))
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
    canBeUpdated(args: any[]): boolean {
        return false
    }
    isSafe(args: any[]): boolean {
        return this.a.isSafe(args) && this.b.isSafe(args)
    }
}

/**
 * The i-th argument of a function.
 */
export class Argument extends Expr {
    constructor(public i: number) {
        super(ExprType.Arg, 0)
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
    canBeUpdated(args: any[]): boolean {
        return this.isSafe(args)
    }
    isUpdateNop(args: any[], val: any): boolean {
        return args[this.i] === val
    }
    isSafe(args: any[]): boolean {
        return this.i < args.length
    }
}

/**
 * A local variable.
 */
export class Var extends Expr {
    private static count = 0
    name: string
    constructor() {
        super(ExprType.Var, 0)
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
    canBeUpdated(args: any[]): boolean {
        return false
    }
    isSafe(args: any[]): boolean {
        return false
    }
}

/**
 * A constant (of a primitive type).
 */
export class Const extends Expr {
    constructor(public val: any) {
        super(ExprType.Const, 0)
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
    canBeUpdated(args: any[]): boolean {
        return false
    }
    isSafe(args: any[]): boolean {
        return true
    }
}

/**
 * An enum for all statements.
 */
export enum StmtType {
    Assign = 2000,
    Return,
    Throw,
    DeleteProp,
    DefineProp,
    VarDecl,
    If,
    Seq,
}

/**
 * Common ancestor of all statements.
 */
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
    allStmts(): Stmt[] {
        return [this]
    }
    numberOfStmts(): number {
        return 1
    }
    replace(i: number, news: Stmt): Stmt {
        Util.assert(i === 0, () => "out of bounds repl")
        return news
    }
}

/**
 * Conditional statement.
 */
export class If extends Stmt {
    constructor(public c: Expr, public thn: Stmt, public els: Stmt) {
        super(StmtType.If)
    }
    toString() {
        return "if (" + this.c.toString() + ") {\n  " +
            this.thn.toString().replace(/\n/g, "\n  ") +
            "\n} else {\n  " +
            this.els.toString().replace(/\n/g, "\n  ") +
            "\n}"
    }
    children(): Node[] {
        return (<Node[]>[this.c]).concat(this.thn).concat(this.els)
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
    numberOfStmts(): number {
        return 1 + this.thn.numberOfStmts() + this.els.numberOfStmts()
    }
    replace(i: number, news: Stmt) {
        Util.assert(i >= 0 && i < this.numberOfStmts(), () => "out of bound replacement")
        if (i === 0) {
            return news
        }
        i -= 1
        if (i < this.thn.numberOfStmts()) {
            // recurse for thn
            return new If(this.c, this.thn.replace(i, news), this.els)
        }
        i -= this.thn.numberOfStmts()
        // recurse for els
        return new If(this.c, this.thn, this.els.replace(i, news))
    }
    allStmts(): Stmt[] {
        return [<Stmt>this].concat(this.thn.allStmts()).concat(this.els.allStmts())
    }
}

/**
 * A sequence of statements (has no behavior other that that of it's children).
 */
export class Seq extends Stmt {
    static Empty = new Seq([])
    constructor(public stmts: Stmt[]) {
        super(StmtType.Seq)
    }
    toString() {
        return this.stmts.join("\n")
    }
    children(): Node[] {
        return this.stmts
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
    numberOfStmts(): number {
        return Util.sum(this.stmts.map((x) => x.numberOfStmts()))
    }
    replace(i: number, news: Stmt) {
        Util.assert(i >= 0 && i < this.numberOfStmts(), () => "out of bound replacement")
        var stmts = this.stmts
        var cur = 0
        function repl(ths, idx, ss) {
            var newss = ths.stmts.slice(0)
            if (ss === Seq.Empty) {
                newss.splice(idx, 1)
            } else {
                newss.splice(idx, 1, ss)
            }
            return new Seq(newss)
        }
        while (true) {
            if (i === 0) {
                // replace directly
                return repl(this, cur, news)
            } else {
                if (i < stmts[cur].numberOfStmts()) {
                    // recurse
                    return repl(this, cur, stmts[cur].replace(i, news))
                } else {
                    i -= stmts[cur].numberOfStmts()
                    cur += 1
                }
            }
        }
    }
    allStmts(): Stmt[] {
        var res = []
        this.stmts.forEach((s) => res = res.concat(s.allStmts()))
        return res
    }
}

/**
 * An assignment statement.
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

/**
 * A return statement.
 */
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

/**
 * A property deletion statement.
 */
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

/**
 * A property definition statement.
 */
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

/**
 * A program (just a way to group statements).
 */
export class Program {
    static Empty = new Program(Seq.Empty)
    constructor(public body: Stmt) {
        Util.assert(this.body != undefined)
    }
    toString() {
        return "  " + this.body.toString().replace(/\n/g, "\n  ")
    }
}

/**
 * A program trace.  Note that some statements like conditionals will never occur in traces.
 */
export class Trace {
    public stmts: Stmt[] = []
    constructor(s?: Stmt) {
        if (s) {
            if (s.type === StmtType.Seq) {
                this.stmts = (<Seq>s).stmts.slice(0)
            } else {
                this.stmts = [s]
            }
        }
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
    asProgram(): Program {
        return new Program(this.asStmt())
    }
    asStmt(): Stmt {
        return new Seq(this.stmts)
    }
}

/**
 * A variable map to compare two traces with potentially different variable names.
 */
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
