
import Util = require('./util/Util')

export enum ExprType {
    Field,
    Arg,
    Var,
    Const
}

// abstract description of an access path that a method took to, say, modify a field
export class Expr {
    constructor(public type: ExprType) {
    }
    eval(args: any[], oldArgs: any[]): any {
        Util.assert(false)
    }
    update(args: any[], val: any): any {
        Util.assert(false)
    }
}

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
}

// access path by looking at the ith argument
export class Argument extends Expr {
    constructor(public i: number) {
        super(ExprType.Arg)
    }
    toString() {
        return "args[" + this.i + "]"
    }
    eval(args: any[], oldArgs: any[]): any {
        return args[this.i]
    }
    update(args: any[], val: any): any {
        args[this.i] = val;
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
}

export enum StmtType {
    Assign,
    Return,
    DeleteProp,
    DefineProp,
    VarDecl,
}

export class Stmt {
    constructor(public type: StmtType) {
    }
}
export class Assign extends Stmt {
    constructor(public lhs: Expr, public rhs: Expr, public decl: boolean = false) {
        super(StmtType.Assign)
    }
    toString() {
        var prefix = ""
        if (this.decl) {
            prefix = "var "
        }
        return prefix + this.lhs.toString() + " = " + this.rhs.toString()
    }
}
export class Return extends Stmt {
    constructor(public rhs: Expr) {
        super(StmtType.Return)
    }
    toString() {
        return "return " + this.rhs.toString()
    }
}
export class DeleteProp extends Stmt {
    constructor(public o: Expr, public f: string) {
        super(StmtType.DeleteProp)
    }
    toString() {
        return "delete " + this.o.toString() + "[\"" + this.f.toString() + "\"]"
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
}
export class VarDecl extends Stmt {
    constructor(public v: Var) {
        super(StmtType.VarDecl)
    }
    toString() {
        return "var " + this.v.name
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
