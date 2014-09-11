/**
 * Data structures for programs, statements, expressions and traces.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Util = require('./util/Util')

var print = Util.print
var log = Util.log
var line = Util.line

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
    transitiveChildren(): Node[] {
        var res = this.children()
        var l = res.length;
        for (var i = 0; i < l; i++) {
            res = res.concat(res[i].transitiveChildren())
        }
        return res
    }
    /* Returns all direct children (that are somehow relevant for equality) */
    anychildren(): any[] {
        Util.assert(false)
        return []
    }
    toSkeleton(): string {
        Util.assert(false, () => "getSkeleton not implemented for " + this)
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

    toString(config = {}): string {
        Util.assert(false)
        return ""
    }
}

/**
 * A marker class for Field and Argument
 */
export class Prestate extends Expr {
    getBase(): Prestate {
        return this
    }
}

/**
 * A field access.
 */
export class Field extends Prestate {
    constructor(public o: Expr, public f: Expr) {
        super(ExprType.Field, 1+Math.max(o.depth, f.depth))
    }
    toString(config = {}) {
        if (this.f.type === ExprType.Const) {
            var c = <Const>this.f
            if (typeof c.val === "string") {
                if (/[a-zA-Z_][_a-zA-Z0-9]*/.test(c.val)) {
                    return this.o.toString(config) + "." + c.val
                }
                if (/[0-9]+/.test(c.val)) {
                    return this.o.toString(config) + "[" + c.val + "]"
                }
            }
        }
        return this.o.toString(config) + "[" + this.f.toString(config) + "]"
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
    getBase() {
        Util.assert(this.o instanceof Prestate)
        return (<Prestate>this.o).getBase()
    }
}

/**
 * An addition.
 */
export class Add extends Expr {
    constructor(public a: Expr, public b: Expr) {
        super(ExprType.Add, 1+Math.max(a.depth, b.depth))
    }
    toString(config = {}) {
        if (this.b.type === ExprType.Const) {
            var c = <Const>this.b
            if (c.val < 0) {
                return this.a.toString(config) + "-" + (new Const(-c.val)).toString(config)
            }
        }
        return this.a.toString(config) + "+" + this.b.toString(config)
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
export class Argument extends Prestate {
    constructor(public i: number) {
        super(ExprType.Arg, 0)
    }
    toString(config = {}) {
        if (this.i < 6) {
            return "arg" + this.i
        }
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
    static _count = 0
    name: string
    constructor(prefix: string = "n") {
        super(ExprType.Var, 0)
        this.name = prefix + Var._count
        Var._count++
    }
    toString(config = {}) {
        if ("novar" in config) {
            return "*"
        }
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
    toString(config = {}) {
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
    For,
    Seq,
    FuncCall,
    Break,
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
        if (this.thn.numberOfStmts() === 0) {
            return "if (" + this.c.toString() + ") {} else {\n" +
            Util.indent(this.els.toString()) +
            "\n}"
        }
        if (this.els.numberOfStmts() === 0) {
            return "if (" + this.c.toString() + ") {\n" +
            Util.indent(this.thn.toString()) +
            "\n}"
        }
        return "if (" + this.c.toString() + ") {\n" +
            Util.indent(this.thn.toString()) +
            "\n} else {\n" +
            Util.indent(this.els.toString()) +
            "\n}"
    }
    children(): Node[] {
        return [this.c, this.thn, this.els]
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
 * Conditional statement.
 */
export class For extends Stmt {
    constructor(public start: Expr, public end: Expr, public inc: Expr, public body: Stmt, public variable: Var = new Var("i")) {
        super(StmtType.For)
    }
    toString() {
        var res = ""
        res += "for (var "
        res += this.variable.toString()
        res += " = "
        res += this.start.toString()
        res += "; "
        res += this.variable.toString()
        res += " < "
        res += this.end.toString()
        res += "; "
        res += this.variable.toString()
        res += " += "
        res += this.inc.toString()
        res += ") {\n"
        res += Util.indent(this.body.toString())
        res += "\n}"
        return res
    }
    children(): Node[] {
        return [this.variable, this.start, this.end, this.inc, this.body]
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
    numberOfStmts(): number {
        return 1 + this.body.numberOfStmts()
    }
    replace(i: number, news: Stmt) {
        Util.assert(i >= 0 && i < this.numberOfStmts(), () => "out of bound replacement")
        if (i === 0) {
            return news
        }
        return new For(this.start, this.end, this.inc, this.body.replace(i-1, news), this.variable)
    }
    allStmts(): Stmt[] {
        return [<Stmt>this].concat(this.body.allStmts())
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
        if (this.numberOfStmts() === 0) {
            return "/* nop */"
        }
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
 * A function call.
 */
export class FuncCall extends Stmt {
    constructor(public v: Var, public f: Expr, public args: Expr[], public recv: Expr = null) {
        super(StmtType.FuncCall)
    }
    toString() {
        var s = "var " + this.v.toString() + " = "
        var rcvArg = this.recv === null ? "global" : this.recv.toString();
        var args = this.args.map((a) => a.toString())
        s += this.f.toString() + ".apply(" + rcvArg + ", [ " + Util.join(args, ", ") + " ])"
        return s
    }
    equals(o) {
        if (!(o instanceof FuncCall)) {
            return false
        }
        if (!(o.v.equals(this.v) && o.f.equals(this.f))) {
            return false
        }
        if (!(this.args.length === o.args.length)) {
            return false
        }
        for (var i = 0; i < this.args.length; i++) {
            if (!this.args[i].equals(o.args[i])) {
                return false
            }
        }
        return true
    }
    children(): Node[] {
        var res = [this.v, this.f].concat(this.args);
        if (this.recv !== null) {
            res.push(this.recv)
        }
        return res
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
    toSkeleton(): string {
        var s = "var " + this.v.toSkeleton() + " = "
        if (this.recv !== null) {
            s += this.recv.toSkeleton() + "."
        }
        var rcvArg = this.recv === null ? "null" : this.recv.toSkeleton();
        var args = this.args.map((a) => a.toSkeleton())
        s += this.f.toSkeleton() + ".apply(" + rcvArg + ", [ " + Util.join(args, ", ") + " ])"
        return s
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
 * A break statement
 */
export class Break extends Stmt {
    constructor() {
        super(StmtType.Break)
    }
    toString() {
        return "break"
    }
    equals(o) {
        return o instanceof Break
    }
    children(): Node[] {
        return []
    }
    anychildren(): any[] {
        var res: any[] = this.children()
        return res
    }
    toSkeleton(): string {
        return "break"
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
        if (this.f.type === ExprType.Const) {
            var c = <Const>this.f
            if (typeof c.val === "string") {
                if (/[a-zA-Z_][_a-zA-Z0-9]*/.test(c.val)) {
                    return "delete " + this.o.toString() + "." + c.val
                }
                if (/[0-9]+/.test(c.val)) {
                    return "delete " + this.o.toString() + "[" + c.val + "]"
                }
            }
        }
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
        if (this.body.numberOfStmts() === 0) {
            return "  // <empty program>"
        }
        return Util.indent(this.body.toString())
    }
    getVariables(): Var[] {
        var res = []
        this.body.transitiveChildren().forEach((n) => {
            if (n.type === ExprType.Var) {
                res.push(<Var>n)
            }
        })
        return res
    }
}

/**
 * A program trace.  Note that some statements like conditionals will never occur in traces.
 */
export class Trace {
    public events: Event[] = []
    public isNormalReturn: boolean = false
    public isExceptionReturn: boolean = false
    public isExhaustedBudget: boolean = false
    private result: TraceExpr = null
    private exception: TraceExpr = null
    public prestates: Prestate[] = null
    public constants: Const[] = null
    constructor() {
    }
    getLength(): number {
        return this.events.length
    }
    extend(e: Event) {
        this.events.push(e)
    }
    setException(ex: TraceExpr) {
        this.isExceptionReturn = true
        this.exception = ex
        this.result = null
    }
    setResult(val: TraceExpr) {
        this.isNormalReturn = true
        this.exception = null
        this.result = val
    }
    setExhaustedBudget() {
        this.isExhaustedBudget = true
    }
    getResult() {
        Util.assert(this.isNormalReturn)
        return this.result
    }
    getException() {
        Util.assert(this.isExceptionReturn)
        return this.exception
    }
    setPrestates(ps: Prestate[]) {
        this.prestates = ps
    }
    getPrestates() {
        return this.prestates
    }
    setConstants(ps: Const[]) {
        this.constants = ps
    }
    getConstants() {
        return this.constants
    }
    eventsOfKind(kind: EventKind): Event[] {
        return this.events.filter((s) => s.kind === kind)
    }
    toString(config = {}) {
        var res

        if (this.isExhaustedBudget) {
            return "// exhausted computational budget"
        }

        if (this.isNormalReturn) {
            res = this.result.toString(config)
        } else {
            res = "Exception: " + this.exception.toString(config)
        }
        return "Trace:\n  " + this.events.map((e) => e.toString(config)).join("\n  ") +
            "\n  Result: " + res
    }
    getSkeleton(): string {
        return this.events.map((s) => s.getSkeleton()).join("")
    }
    getSubSkeleton(start: number, length?: number): string {
        if (length === undefined) {
            length = this.events.length - start
        }
        var res = ""
        for (var i = 0; i < length; i++) {
            res += this.events[start+i].getSkeleton()
        }
        return res
    }
}

/**
 * An enum for all statements.
 */
export enum EventKind {
    EGet = 2000,
    ESet,
    EApply,
    EDeleteProperty,
}

/**
 * An event that occurred when recording a trace.
 */
export class Event {
    public variable: Var = null
    constructor(public kind: EventKind, public target: TraceExpr, public otherArgs: TraceExpr[]) {
        if (kind === EventKind.EApply || kind === EventKind.EGet) {
            this.variable = new Var()
        }
    }
    getSkeleton(): string {
        Util.assert(false)
        return ""
    }
    toString(config = {}): string {
        var s = ""
        s += this.variable.toString(config)
        s += " := "
        return s
    }
}

export class EGet extends Event {
    constructor(public target: TraceExpr, public name: TraceExpr) {
        super(EventKind.EGet, target, [name])
    }
    getSkeleton(): string {
        return "get;"
    }
    toString(config = {}): string {
        var s = ""
        s += super.toString(config)
        s += "get property "
        s += this.name.toString(config)
        s += " of "
        s += this.target.toString(config)
        return s
    }
}
export class ESet extends Event {
    constructor(public target: TraceExpr, public name: TraceExpr, public value: TraceExpr) {
        super(EventKind.ESet, target, [name, value])
    }
    getSkeleton(): string {
        return "set;"
    }
    toString(config = {}): string {
        var s = ""
        //s += super.toString(config)
        s += "set property "
        s += this.name.toString(config)
        s += " of "
        s += this.target.toString(config)
        s += " to "
        s += this.value.toString(config)
        return s
    }
}
export class EApply extends Event {
    constructor(public target: TraceExpr, public receiver: TraceExpr, public args: TraceExpr[]) {
        super(EventKind.EApply, target, [receiver].concat(args))
    }
    getSkeleton(): string {
        return "apply;"
    }
    toString(config = {}): string {
        var s = ""
        s += super.toString(config)
        s += "apply "
        s += this.target.toString(config)
        if (this.receiver != null) {
            s += " with receiver "
            s += this.receiver.toString(config)
            s += " and arguments ( "
        } else {
            s += " with arguments ( "
        }
        s += Util.join(this.args.map((a) => a.toString(config)), ", ")
        s += " )"
        return s
    }
}
export class EDeleteProperty extends Event {
    constructor(public target: TraceExpr, public name: TraceExpr) {
        super(EventKind.EDeleteProperty, target, [name])
    }
    getSkeleton(): string {
        return "deleteProperty;"
    }
    toString(config = {}): string {
        var s = ""
        //s += super.toString(config)
        s += "delete property "
        s += this.name.toString(config)
        s += " of "
        s += this.target.toString(config)
        return s
    }
}

/**
 * An expression used when recording a trace.  Because there are often many possible expression
 * when recording a trace (e.g., because there were aliases in the input), a list of expressions
 * is used.  Furthermore, both expressions that are valid (only) in the pre-state are recorded
 * (used for equality checking of traces), as well as expressions that may only be valid at
 * that particular point in the trace (used for program generation from a trace).
 */
export class TraceExpr {
    constructor(public preState: Expr[], public curState: Expr[]) {
        var isConst = false
        Util.assert(preState.length > 0 && curState.length > 0)
        if (preState.length === 1 && curState.length === 1) {
            // only allow constants if both are constants
            if (preState[0].type === ExprType.Const) {
                Util.assert(curState[0].type === ExprType.Const)
                isConst = true
            }
        }
        Util.assert(isConst || preState.every((e) => e.type !== ExprType.Const))
        Util.assert(isConst || curState.every((e) => e.type !== ExprType.Const))
    }
    private pss_cache: string[] = null
    preStateStrings(): string[] {
        if (this.pss_cache === null) {
            this.pss_cache = this.preState.map((s) => s.toString())
        }
        return this.pss_cache
    }
    toString(config = {}): string {
        var f = (exprs: Expr[]) => {
            if (exprs.length === 1) {
                return exprs[0].toString(config)
            } else {
                return "[" + Util.join(exprs.map((e) => e.toString(config)), ",") + "]"
            }
        }
        if (this.preState.join("|") === this.curState.join("|")) {
            return f(this.preState)
        }
        var s = ""
        s += "<"
        s += f(this.preState)
        s += ", "
        s += f(this.curState)
        s += ">"
        return s
    }
}
export class TraceConst extends TraceExpr {
    constructor(public val: any) {
        super([<Expr>new Const(val)], [<Expr>new Const(val)])
    }
    toString(config = {}): string {
        var s = ""
        //s += "<"
        s += this.val
        //s += ">"
        return s
    }
}
