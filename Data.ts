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
export class Argument extends Prestate {
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
    FuncCall,
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
        return "if (" + this.c.toString() + ") {\n" +
            Util.indent(this.thn.toString()) +
            "\n} else {\n" +
            Util.indent(this.els.toString()) +
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
 * A function call.
 */
export class FuncCall extends Stmt {
    constructor(public v: Var, public f: Expr, public args: Expr[], public recv: Expr = null) {
        super(StmtType.FuncCall)
    }
    toString() {
        var s = "var " + this.v.toString() + " = "
        if (this.recv !== null) {
            s += this.recv.toString() + "."
        }
        var rcvArg = this.recv === null ? "global" : this.recv.toString();
        var args = this.args.map((a) => a.toString())
        s += this.f.toString() + ".apply(" + rcvArg + ", [ " + args.join(", ") + " ])"
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
        s += this.f.toSkeleton() + ".apply(" + rcvArg + ", [ " + args.join(", ") + " ])"
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
    public isNormalReturn: boolean
    public result: TraceExpr = null
    public exception: TraceExpr = null
    public prestates: Prestate[] = null
    constructor() {
    }
    getLength(): number {
        return this.events.length
    }
    extend(e: Event) {
        this.events.push(e)
    }
    setException(ex: TraceExpr) {
        this.isNormalReturn = false
        this.exception = ex
        this.result = null
    }
    setResult(val: TraceExpr) {
        this.isNormalReturn = true
        this.exception = null
        this.result = val
    }
    setPrestates(ps: Prestate[]) {
        this.prestates = ps
    }
    getPrestates() {
        return this.prestates
    }
    eventsOfKind(kind: EventKind): Event[] {
        return this.events.filter((s) => s.kind === kind)
    }
    toString() {
        var res
        if (this.isNormalReturn) {
            res = this.result.toString()
        } else {
            res = "Exception: " + this.exception.toString()
        }
        return "Trace:\n  " + this.events.join("\n  ") +
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
    asProgram(): Program {
        return new Program(this.asStmt())
    }
    asStmt(): Stmt {
        var stmts: Stmt[] = []
        var expr = (e: TraceExpr) => {
            return e.curState[e.curState.length-1]
        }
        this.events.forEach((e) => {
            var ev
            switch (e.kind) {
                case EventKind.EGet:
                    ev = <EGet>e
                    stmts.push(new Assign(e.variable, new Field(expr(ev.target), expr(ev.name)), true))
                    break
                case EventKind.ESet:
                    ev = <ESet>e
                    // save old value in local variable
                    stmts.push(new Assign(new Var(), new Field(expr(ev.target), expr(ev.name)), true))
                    stmts.push(new Assign(new Field(expr(ev.target), expr(ev.name)), expr(ev.value)))
                    break
                case EventKind.EApply:
                    ev = <EApply>e
                    var recv = null
                    if (ev.receiver !== null) {
                        recv = expr(ev.receiver)
                    }
                    stmts.push(new FuncCall(ev.variable, expr(ev.target), ev.args.map(expr), recv))
                    break
                case EventKind.EDeleteProperty:
                    ev = <EDeleteProperty>e
                    // save old value in local variable
                    stmts.push(new Assign(new Var(), new Field(expr(ev.target), expr(ev.name)), true))
                    stmts.push(new DeleteProp(expr(ev.target), expr(ev.name)))
                    break
                default:
                    Util.assert(false, () => "unknown event kind: " + e)
            }
        })
        if (this.isNormalReturn) {
            stmts.push(new Return(expr(this.result)))
        } else {
            stmts.push(new Throw(expr(this.exception)))
        }
        return new Seq(stmts)
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
    toString(): string {
        var s = ""
        s += this.variable.toString()
        s += " := "
        return s
    }
}

export class EGet extends Event {
    constructor(public target: TraceExpr, public name: TraceConst) {
        super(EventKind.EGet, target, [name])
    }
    getSkeleton(): string {
        return "get;"
    }
    toString(): string {
        var s = ""
        s += super.toString()
        s += "get property "
        s += this.name.toString()
        s += " of "
        s += this.target.toString()
        return s
    }
}
export class ESet extends Event {
    constructor(public target: TraceExpr, public name: TraceConst, public value: TraceExpr) {
        super(EventKind.ESet, target, [name, value])
    }
    getSkeleton(): string {
        return "set;"
    }
    toString(): string {
        var s = ""
        //s += super.toString()
        s += "set property "
        s += this.name.toString()
        s += " of "
        s += this.target.toString()
        s += " to "
        s += this.value.toString()
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
    toString(): string {
        var s = ""
        s += super.toString()
        s += "apply "
        s += this.target.toString()
        if (this.receiver != null) {
            s += " with receiver "
            s += this.receiver.toString()
            s += " and arguments ( "
        } else {
            s += " with arguments ( "
        }
        s += this.args.join(", ")
        s += " )"
        return s
    }
}
export class EDeleteProperty extends Event {
    constructor(public target: TraceExpr, public name: TraceConst) {
        super(EventKind.EDeleteProperty, target, [name])
    }
    getSkeleton(): string {
        return "deleteProperty;"
    }
    toString(): string {
        var s = ""
        //s += super.toString()
        s += "delete property"
        s += this.name.toString()
        s += " of "
        s += this.target.toString()
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
    toString(): string {
        var f = (exprs: Expr[]) => {
            if (exprs.length === 1) {
                return exprs[0].toString()
            } else {
                return "[" + exprs.join(",") + "]"
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
        super([new Const(val)], [new Const(val)])
    }
    toString(): string {
        var s = ""
        //s += "<"
        s += this.val
        //s += ">"
        return s
    }
}
