/**
 * AST node types for the geometry DSL.
 */

// =============================================================================
// Expressions
// =============================================================================

export interface DslNumberLiteral {
	readonly kind: 'number';
	readonly value: number;
	readonly line: number;
}

export interface DslStringLiteral {
	readonly kind: 'string';
	readonly value: string;
	readonly line: number;
}

export interface DslBoolLiteral {
	readonly kind: 'bool';
	readonly value: boolean;
	readonly line: number;
}

export interface DslIdentifier {
	readonly kind: 'identifier';
	readonly name: string;
	readonly line: number;
}

export interface DslIndexedAccess {
	readonly kind: 'indexedAccess';
	readonly name: string;
	readonly index: DslExpr;
	readonly line: number;
}

export interface DslPropertyAccess {
	readonly kind: 'propertyAccess';
	readonly object: string;
	readonly property: string;
	readonly line: number;
}

export interface DslBinaryExpr {
	readonly kind: 'binary';
	readonly op:
		| '+'
		| '-'
		| '*'
		| '/'
		| '%'
		| '^'
		| '=='
		| '!='
		| '<'
		| '>'
		| '<='
		| '>='
		| 'et'
		| 'ou';
	readonly left: DslExpr;
	readonly right: DslExpr;
	readonly line: number;
}

export interface DslUnaryExpr {
	readonly kind: 'unary';
	readonly op: '-' | 'non';
	readonly operand: DslExpr;
	readonly line: number;
}

export interface DslFunctionCallExpr {
	readonly kind: 'call';
	readonly name: string;
	readonly args: DslExpr[];
	readonly namedArgs: ReadonlyMap<string, DslExpr>;
	readonly line: number;
}

export interface DslTupleLiteral {
	readonly kind: 'tuple';
	readonly elements: DslExpr[];
	readonly line: number;
}

export interface DslListLiteral {
	readonly kind: 'list';
	readonly elements: DslExpr[];
	readonly line: number;
}

export type DslExpr =
	| DslNumberLiteral
	| DslStringLiteral
	| DslBoolLiteral
	| DslIdentifier
	| DslIndexedAccess
	| DslPropertyAccess
	| DslBinaryExpr
	| DslUnaryExpr
	| DslFunctionCallExpr
	| DslTupleLiteral
	| DslListLiteral;

// =============================================================================
// Statements
// =============================================================================

export interface DslAssignment {
	readonly kind: 'assignment';
	readonly name: string;
	readonly value: DslExpr;
	readonly line: number;
}

export interface DslIndexedAssignment {
	readonly kind: 'indexedAssignment';
	readonly name: string;
	readonly index: DslExpr;
	readonly value: DslExpr;
	readonly line: number;
}

export interface DslDestructuringAssignment {
	readonly kind: 'destructuring';
	readonly names: string[];
	readonly value: DslExpr;
	readonly line: number;
}

export interface DslExprStatement {
	readonly kind: 'exprStatement';
	readonly expr: DslExpr;
	readonly line: number;
}

export interface DslMacroDef {
	readonly kind: 'macroDef';
	readonly name: string;
	readonly params: DslParam[];
	readonly body: DslStatement[];
	readonly line: number;
}

export interface DslParam {
	readonly name: string;
	readonly defaultValue?: DslExpr;
}

export interface DslForRange {
	readonly kind: 'forRange';
	readonly variable: string;
	readonly from: DslExpr;
	readonly to: DslExpr;
	readonly body: DslStatement[];
	readonly line: number;
}

export interface DslForIn {
	readonly kind: 'forIn';
	readonly variable: string;
	readonly iterable: DslExpr;
	readonly body: DslStatement[];
	readonly line: number;
}

export interface DslIf {
	readonly kind: 'if';
	readonly condition: DslExpr;
	readonly body: DslStatement[];
	readonly elseBody?: DslStatement[];
	readonly line: number;
}

export interface DslReturn {
	readonly kind: 'return';
	readonly value: DslExpr;
	readonly line: number;
}

export type DslStatement =
	| DslAssignment
	| DslIndexedAssignment
	| DslDestructuringAssignment
	| DslExprStatement
	| DslMacroDef
	| DslForRange
	| DslForIn
	| DslIf
	| DslReturn;

// =============================================================================
// Program
// =============================================================================

export interface DslProgram {
	readonly kind: 'program';
	readonly statements: DslStatement[];
}
