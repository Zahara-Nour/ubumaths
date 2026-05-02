/**
 * AST node types for the geometry DSL.
 *
 * Each DslExpr produced by the parser carries optional `start` / `end`
 * absolute source offsets. They are populated by the parser and used by
 * `getRawSource()` to retrieve the original source slice — required to
 * route math-pure expressions through mathAST's `parseCustom()`.
 */

// =============================================================================
// Expressions
// =============================================================================

/** Optional source-position fields shared by every DslExpr variant. */
export interface DslExprPos {
	readonly start?: number;
	readonly end?: number;
}

export interface DslNumberLiteral extends DslExprPos {
	readonly kind: 'number';
	readonly value: number;
	readonly line: number;
}

export interface DslStringLiteral extends DslExprPos {
	readonly kind: 'string';
	readonly value: string;
	readonly line: number;
}

export interface DslBoolLiteral extends DslExprPos {
	readonly kind: 'bool';
	readonly value: boolean;
	readonly line: number;
}

export interface DslIdentifier extends DslExprPos {
	readonly kind: 'identifier';
	readonly name: string;
	readonly line: number;
}

export interface DslIndexedAccess extends DslExprPos {
	readonly kind: 'indexedAccess';
	readonly name: string;
	readonly index: DslExpr;
	readonly line: number;
}

export interface DslPropertyAccess extends DslExprPos {
	readonly kind: 'propertyAccess';
	readonly object: string;
	readonly property: string;
	readonly line: number;
}

export interface DslBinaryExpr extends DslExprPos {
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

export interface DslUnaryExpr extends DslExprPos {
	readonly kind: 'unary';
	readonly op: '-' | 'non';
	readonly operand: DslExpr;
	readonly line: number;
}

export interface DslFunctionCallExpr extends DslExprPos {
	readonly kind: 'call';
	readonly name: string;
	readonly args: DslExpr[];
	readonly namedArgs: ReadonlyMap<string, DslExpr>;
	readonly line: number;
}

export interface DslTupleLiteral extends DslExprPos {
	readonly kind: 'tuple';
	readonly elements: DslExpr[];
	readonly line: number;
}

export interface DslListLiteral extends DslExprPos {
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

export interface DslDirective {
	readonly kind: 'directive';
	readonly name: string;
	readonly args: DslExpr[];
	readonly namedArgs: ReadonlyMap<string, DslExpr>;
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
	| DslReturn
	| DslDirective;

// =============================================================================
// Program
// =============================================================================

export interface DslProgram {
	readonly kind: 'program';
	readonly statements: DslStatement[];
	/** Original source string passed to the parser. Used by `getRawSource()`. */
	readonly source?: string;
}
