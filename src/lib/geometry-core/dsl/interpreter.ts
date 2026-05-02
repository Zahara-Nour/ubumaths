/**
 * DSL Interpreter — walks the AST and produces a Figure.
 *
 * Maps DSL function calls to Figure factory methods via builtins.
 */

import { Figure } from '../graph/figure';
import type { GeoValue } from '../types/geo-value';
import { numeric } from '../types/geo-value';
import type { GeoPoint } from '../types/primitives';
import { geoToNumber } from '../compute/to-number';
import { DslRuntimeError } from './errors';
import { SymbolTable } from './symbol-table';
import type { SymbolEntry } from './symbol-table';
import {
	executeBuiltin,
	BUILTIN_NAMES,
	MATH_FUNCTIONS,
	type ResolvedValue,
	type ResolvedArgs,
	type BuiltinMultiResult,
	type BuiltinScalarResult
} from './builtins';
import type { DslProgram, DslStatement, DslExpr, DslFunctionCallExpr } from './types';
import { MacroRegistry } from './macro-registry';
import { STDLIB_MACROS } from './stdlib';
import { parse } from './parser';
import { isMathPureExpr } from './math-pure-expr';
import { getRawSource } from './source-utils';
import { parseCustom, getVariables } from '$lib/mathAST';
import { compile } from '$lib/mathAST/eval/compile';
import { applyAngleMode, type AngleMode } from './apply-angle-mode';

/** Check if a resolved value is a vector element reference. */
function isVectorValue(val: ResolvedValue): boolean {
	return val.type === 'element' && val.elementType === 'vecteur';
}

/** Check if a resolved value is a scalar element reference. */
function isScalarValue(
	val: ResolvedValue
): val is ResolvedValue & { type: 'element'; figureId: string } {
	return val.type === 'element' && val.elementType === 'scalar';
}

/**
 * Math operations applied to scalar values. Trig functions consult the
 * interpreter's active angle mode so the legacy DSL path (used for cases
 * the mathAST router cannot handle, e.g. `sin(P.x)`) stays consistent.
 */
function scalarMathOpFor(name: string, mode: AngleMode): ((x: number) => number) | undefined {
	switch (name) {
		case 'sqrt':
			return Math.sqrt;
		case 'abs':
			return Math.abs;
		case 'sin':
			return mode === 'deg' ? (x) => Math.sin((x * Math.PI) / 180) : Math.sin;
		case 'cos':
			return mode === 'deg' ? (x) => Math.cos((x * Math.PI) / 180) : Math.cos;
		case 'tan':
			return mode === 'deg' ? (x) => Math.tan((x * Math.PI) / 180) : Math.tan;
		case 'asin':
			return mode === 'deg' ? (x) => (Math.asin(x) * 180) / Math.PI : Math.asin;
		case 'acos':
			return mode === 'deg' ? (x) => (Math.acos(x) * 180) / Math.PI : Math.acos;
		case 'atan':
			return mode === 'deg' ? (x) => (Math.atan(x) * 180) / Math.PI : Math.atan;
		default:
			return undefined;
	}
}

/** Coerce a ResolvedValue to a number, throwing if not numeric. */
function coerceToNumber(val: ResolvedValue, line: number): number {
	if (val.type === 'nombre') return val.value;
	if (val.type === 'geoValue') return geoToNumber(val.value);
	throw new DslRuntimeError('Nombre attendu', line);
}

export type DirectiveHandler = (name: string, args: ResolvedArgs, line: number) => void;

export interface InterpretResult {
	figure: Figure;
	symbols: SymbolTable;
}

function loadStdlib(macros: MacroRegistry): void {
	const program = parse(STDLIB_MACROS);
	for (const stmt of program.statements) {
		if (stmt.kind === 'macroDef') {
			macros.define(stmt);
		}
	}
}

export function interpret(
	program: DslProgram,
	figure?: Figure,
	onDirective?: DirectiveHandler
): InterpretResult {
	const fig = figure ?? new Figure();
	const symbols = new SymbolTable();
	const macros = new MacroRegistry();
	loadStdlib(macros);
	const interpreter = new Interpreter(fig, symbols, macros, onDirective, program.source ?? '');
	interpreter.executeBlock(program.statements);
	return { figure: fig, symbols };
}

/**
 * Reserved DSL names that cannot be assigned to. `\pi` is the math constant π;
 * `e` is Euler's number (Q7 = α: strict reservation). Both can still be used
 * in any RHS/expression context — they're routed to mathAST and resolve to
 * Math.PI / Math.E respectively.
 */
const RESERVED_NAMES = new Set(['\\pi', 'e']);

function assertNameNotReserved(name: string, line: number): void {
	if (RESERVED_NAMES.has(name)) {
		throw new DslRuntimeError(`"${name}" est une constante réservée`, line);
	}
}

/** Collect every identifier name used in a DslExpr (recursive). */
function collectIdentifiers(expr: DslExpr, out: Set<string>): void {
	switch (expr.kind) {
		case 'identifier':
			out.add(expr.name);
			return;
		case 'unary':
			collectIdentifiers(expr.operand, out);
			return;
		case 'binary':
			collectIdentifiers(expr.left, out);
			collectIdentifiers(expr.right, out);
			return;
		case 'call':
			for (const a of expr.args) collectIdentifiers(a, out);
			return;
		case 'tuple':
		case 'list':
			for (const e of expr.elements) collectIdentifiers(e, out);
			return;
		case 'indexedAccess':
			collectIdentifiers(expr.index, out);
			return;
	}
}

class Interpreter {
	/** Label to assign to the next geometry element created (from assignment LHS). */
	private _assignmentLabel: string | undefined;

	/** Active angle mode. Default `'deg'` (matches existing builtins). */
	private angleMode: AngleMode = 'deg';

	constructor(
		private figure: Figure,
		private symbols: SymbolTable,
		private macros: MacroRegistry,
		private onDirective?: DirectiveHandler,
		private source: string = ''
	) {
		// Pre-load mathematical infinity so `inf`, `+inf`, `-inf` work as DSL literals
		// (V5 improper integrals — see docs/wip/geometry/improper-integrals-study.md §2.1).
		this.symbols.set('inf', { type: 'nombre', value: Infinity });
	}

	executeBlock(statements: DslStatement[]): ResolvedValue | undefined {
		for (const stmt of statements) {
			const result = this.executeStatement(stmt);
			if (result !== undefined) return result; // return from macro
		}
		return undefined;
	}

	executeStatement(stmt: DslStatement): ResolvedValue | undefined {
		switch (stmt.kind) {
			case 'assignment': {
				assertNameNotReserved(stmt.name, stmt.line);
				this._assignmentLabel = this.macros.insideMacro ? undefined : stmt.name;
				const value = this.evaluateExpr(stmt.value, stmt.line);
				this._assignmentLabel = undefined;
				if (this.macros.insideMacro) {
					this.hideResolvedElements(value);
				} else {
					this.labelElement(value, stmt.name);
				}
				this.symbols.set(stmt.name, this.toSymbolEntry(value));
				break;
			}

			case 'indexedAssignment': {
				assertNameNotReserved(stmt.name, stmt.line);
				const index = Math.round(this.evaluateToNumber(stmt.index, stmt.line));
				const value = this.evaluateExpr(stmt.value, stmt.line);
				this.symbols.setIndexed(stmt.name, index, this.toSymbolEntry(value));
				break;
			}

			case 'destructuring': {
				for (const name of stmt.names) assertNameNotReserved(name, stmt.line);
				const inMacro = this.macros.insideMacro;
				const value = this.evaluateExpr(stmt.value, stmt.line);
				if (value.type !== 'tuple') {
					throw new DslRuntimeError('La destructuration necessite un tuple', stmt.line);
				}
				if (value.elements.length !== stmt.names.length) {
					throw new DslRuntimeError(
						`Attendu ${stmt.names.length} valeurs, recu ${value.elements.length}`,
						stmt.line
					);
				}
				for (let i = 0; i < stmt.names.length; i++) {
					if (inMacro) {
						this.hideResolvedElements(value.elements[i]);
					} else {
						this.labelElement(value.elements[i], stmt.names[i]);
					}
					this.symbols.set(stmt.names[i], this.toSymbolEntry(value.elements[i]));
				}
				break;
			}

			case 'exprStatement': {
				const exprResult = this.evaluateExpr(stmt.expr, stmt.line);
				// In nested macros (depth > 1), hide side-effect elements too
				if (this.macros.insideNestedMacro && exprResult) {
					this.hideResolvedElements(exprResult);
				}
				break;
			}

			case 'macroDef': {
				this.macros.define(stmt);
				break;
			}

			case 'forRange': {
				const from = Math.round(this.evaluateToNumber(stmt.from, stmt.line));
				const to = Math.round(this.evaluateToNumber(stmt.to, stmt.line));
				const maxIter = 1000;
				let count = 0;
				for (let i = from; i <= to; i++) {
					if (++count > maxIter) {
						throw new DslRuntimeError('Limite de 1000 iterations atteinte', stmt.line);
					}
					this.symbols.set(stmt.variable, { type: 'nombre', value: i });
					this.executeBlock(stmt.body);
				}
				break;
			}

			case 'forIn': {
				const iterable = this.evaluateExpr(stmt.iterable, stmt.line);
				if (iterable.type !== 'tuple') {
					throw new DslRuntimeError("'pour...dans' necessite une liste", stmt.line);
				}
				const maxIter = 1000;
				let count = 0;
				for (const item of iterable.elements) {
					if (++count > maxIter) {
						throw new DslRuntimeError('Limite de 1000 iterations atteinte', stmt.line);
					}
					this.symbols.set(stmt.variable, this.toSymbolEntry(item));
					this.executeBlock(stmt.body);
				}
				break;
			}

			case 'if': {
				const condition = this.evaluateToNumber(stmt.condition, stmt.line);
				if (condition) {
					this.executeBlock(stmt.body);
				} else if (stmt.elseBody) {
					this.executeBlock(stmt.elseBody);
				}
				break;
			}

			case 'return': {
				return this.evaluateExpr(stmt.value, stmt.line);
			}

			case 'directive': {
				if (this.onDirective) {
					const resolvedArgs = this.resolveCallArgs(stmt.args, stmt.namedArgs, stmt.line);
					this.onDirective(stmt.name, resolvedArgs, stmt.line);
				}
				break;
			}
		}
		return undefined;
	}

	/**
	 * Try to evaluate a math-pure expression by routing its raw source through
	 * mathAST's `parseCustom()`. Returns `null` when the expression is not
	 * math-pure or cannot be routed (free var refers to a non-number, contains
	 * a trig function which Phase 5 will handle, parse/compile fails, etc.),
	 * in which case the caller falls back to the legacy DSL path.
	 */
	private tryEvaluateAsMathExpr(expr: DslExpr): ResolvedValue | null {
		// Inside macro bodies the source positions point into the macro definition
		// (e.g. STDLIB_MACROS), not into the interpreter's `this.source`. Routing
		// would extract a stray slice and may produce wrong values. The legacy DSL
		// path handles macro evaluation correctly.
		if (this.macros.insideMacro) return null;

		// Bare identifier referencing an existing symbol: return it as-is. This
		// preserves dependsOn semantics for callers like `courbe(t_max=m)` —
		// they want the slider's id directly, not a new derived scalar.
		// (\pi, e, and unknown identifiers fall through to mathAST routing.)
		if (expr.kind === 'identifier') {
			const entry = this.symbols.get(expr.name);
			if (entry) return this.fromSymbolEntry(entry);
		}

		if (!isMathPureExpr(expr, { macroNames: this.macros.allNames() })) return null;

		const rawSource = getRawSource(expr, this.source);
		if (rawSource === null) return null;
		// Defensive: positions out of source bounds → skip routing
		if (expr.start! < 0 || expr.end! > this.source.length) return null;

		// If any DSL identifier in the expression refers to a geometric element
		// (point, droite, …) — but not a scalar/slider, which the reactive path
		// handles — fall back to the DSL path so the user's symbol-table value
		// wins over mathAST's constant-folding (e.g. `e` as Euler when user
		// defined `e = droite(...)`).
		const dslIdentifiers = new Set<string>();
		collectIdentifiers(expr, dslIdentifiers);
		for (const name of dslIdentifiers) {
			const entry = this.symbols.get(name);
			if (entry && entry.type !== 'nombre' && entry.type !== 'scalar') return null;
		}

		let node;
		try {
			node = parseCustom(rawSource);
		} catch {
			return null;
		}

		// Apply the active angle mode to wrap any trig calls.
		node = applyAngleMode(node, this.angleMode);

		// Resolve free variables: split into static bindings and scalar deps.
		const freeVars = getVariables(node);
		const staticBindings: Record<string, number> = {};
		const scalarDeps: { name: string; figureId: string }[] = [];
		for (const varName of freeVars) {
			const entry = this.symbols.get(varName);
			if (!entry) return null; // unknown — let DSL path raise its standard error
			if (entry.type === 'nombre') {
				staticBindings[varName] = entry.value ?? 0;
			} else if (entry.type === 'scalar' && entry.figureId) {
				scalarDeps.push({ name: varName, figureId: entry.figureId });
			} else {
				// Geometric element (point, droite, …) — not numeric.
				return null;
			}
		}

		let fn;
		try {
			fn = compile(node);
		} catch {
			return null;
		}

		// Static path: no scalar deps → return a number directly.
		if (scalarDeps.length === 0) {
			let value: number;
			try {
				value = fn(staticBindings);
			} catch {
				return null;
			}
			return { type: 'nombre', value };
		}

		// Reactive path: at least one scalar dep → build a GeoScalar with a
		// closure that re-evaluates the compiled function on each recompute.
		// Convention (matches the legacy `evaluateScalarBinary`): non-finite
		// results in a derived scalar are surfaced as NaN, not Infinity, so
		// downstream renderers treat them as undefined.
		const compute = (sv: ReadonlyMap<string, number>): number => {
			const bindings: Record<string, number> = { ...staticBindings };
			for (const { name, figureId } of scalarDeps) {
				bindings[name] = sv.get(figureId) ?? 0;
			}
			const result = fn(bindings);
			return Number.isFinite(result) ? result : NaN;
		};
		const depIds = scalarDeps.map((d) => d.figureId);
		const newScalarId = this.figure.createScalarExpression(compute, depIds);
		return { type: 'element', figureId: newScalarId, elementType: 'scalar' };
	}

	private evaluateExpr(expr: DslExpr, line: number): ResolvedValue {
		// Phase 3: route math-pure expressions through mathAST's parseCustom().
		// Skip trivial primitives (number/string/bool) — no benefit from routing.
		if (expr.kind !== 'number' && expr.kind !== 'string' && expr.kind !== 'bool') {
			const routed = this.tryEvaluateAsMathExpr(expr);
			if (routed !== null) return routed;
		}

		switch (expr.kind) {
			case 'number':
				return { type: 'nombre', value: expr.value };

			case 'string':
				return { type: 'string', value: expr.value };

			case 'bool':
				return { type: 'nombre', value: expr.value ? 1 : 0 };

			case 'identifier': {
				const entry = this.symbols.get(expr.name);
				if (!entry) {
					throw new DslRuntimeError(`Variable inconnue : "${expr.name}"`, expr.line);
				}
				return this.fromSymbolEntry(entry);
			}

			case 'indexedAccess': {
				const index = Math.round(this.evaluateToNumber(expr.index, expr.line));
				const entry = this.symbols.getIndexed(expr.name, index);
				if (!entry) {
					throw new DslRuntimeError(`${expr.name}[${index}] n'est pas defini`, expr.line);
				}
				return this.fromSymbolEntry(entry);
			}

			case 'propertyAccess': {
				const entry = this.symbols.get(expr.object);
				if (!entry || !entry.figureId) {
					throw new DslRuntimeError(`"${expr.object}" n'est pas un element geometrique`, expr.line);
				}
				if (expr.property !== 'x' && expr.property !== 'y') {
					throw new DslRuntimeError(
						`Propriete inconnue : "${expr.property}" (attendu x ou y)`,
						expr.line
					);
				}
				const scalarId = this.figure.createScalarCoordinate(entry.figureId, expr.property);
				return { type: 'element', figureId: scalarId, elementType: 'scalar' };
			}

			case 'binary': {
				const leftVal = this.evaluateExpr(expr.left, expr.line);
				const rightVal = this.evaluateExpr(expr.right, expr.line);

				// Vector arithmetic: if either operand is a vector, dispatch to vector ops
				const leftIsVec = isVectorValue(leftVal);
				const rightIsVec = isVectorValue(rightVal);
				if (leftIsVec || rightIsVec) {
					return this.evaluateVectorBinary(
						expr.op,
						leftVal,
						rightVal,
						leftIsVec,
						rightIsVec,
						expr.line
					);
				}

				// Scalar arithmetic: if either operand is a scalar, create composed scalar
				if (isScalarValue(leftVal) || isScalarValue(rightVal)) {
					return this.evaluateScalarBinary(expr.op, leftVal, rightVal, expr.line);
				}

				// Number arithmetic (existing behavior)
				const left = coerceToNumber(leftVal, expr.line);
				const right = coerceToNumber(rightVal, expr.line);
				switch (expr.op) {
					case '+':
						return { type: 'nombre', value: left + right };
					case '-':
						return { type: 'nombre', value: left - right };
					case '*':
						return { type: 'nombre', value: left * right };
					case '/':
						if (right === 0) throw new DslRuntimeError('Division par zero', expr.line);
						return { type: 'nombre', value: left / right };
					case '%':
						return { type: 'nombre', value: ((left % right) + right) % right };
					case '^':
						return { type: 'nombre', value: Math.pow(left, right) };
					case '==':
						return { type: 'nombre', value: left === right ? 1 : 0 };
					case '!=':
						return { type: 'nombre', value: left !== right ? 1 : 0 };
					case '<':
						return { type: 'nombre', value: left < right ? 1 : 0 };
					case '>':
						return { type: 'nombre', value: left > right ? 1 : 0 };
					case '<=':
						return { type: 'nombre', value: left <= right ? 1 : 0 };
					case '>=':
						return { type: 'nombre', value: left >= right ? 1 : 0 };
					case 'et':
						return { type: 'nombre', value: left && right ? 1 : 0 };
					case 'ou':
						return { type: 'nombre', value: left || right ? 1 : 0 };
					default:
						throw new DslRuntimeError(`Operateur inconnu : ${expr.op}`, expr.line);
				}
			}

			case 'unary': {
				const operandVal = this.evaluateExpr(expr.operand, expr.line);
				// Vector negation: -u
				if (expr.op === '-' && isVectorValue(operandVal)) {
					const vecId = operandVal.figureId;
					const id = this.figure.createVectorNegate(vecId);
					return { type: 'element', figureId: id, elementType: 'vecteur' };
				}
				// Scalar negation: -d
				if (expr.op === '-' && isScalarValue(operandVal)) {
					const depId = operandVal.figureId;
					const id = this.figure.createScalarExpression((sv) => -(sv.get(depId) ?? 0), [depId]);
					return { type: 'element', figureId: id, elementType: 'scalar' };
				}
				const operand = coerceToNumber(operandVal, expr.line);
				if (expr.op === '-') return { type: 'nombre', value: -operand };
				if (expr.op === 'non') return { type: 'nombre', value: operand ? 0 : 1 };
				throw new DslRuntimeError(`Operateur unaire inconnu : ${expr.op}`, expr.line);
			}

			case 'call':
				return this.evaluateCall(expr);

			case 'tuple':
				return {
					type: 'tuple',
					elements: expr.elements.map((e) => this.evaluateExpr(e, expr.line))
				};

			case 'list':
				return {
					type: 'tuple',
					elements: expr.elements.map((e) => this.evaluateExpr(e, expr.line))
				};

			default:
				throw new DslRuntimeError(`Expression non supportee : ${(expr as DslExpr).kind}`, line);
		}
	}

	private evaluateCall(expr: DslFunctionCallExpr): ResolvedValue {
		const { name, line } = expr;

		// Special: angle-mode directive — mutates interpreter state.
		if (name === 'unite_angle') {
			return this.evaluateUniteAngle(expr);
		}

		// Math functions
		if (MATH_FUNCTIONS.has(name)) {
			return this.evaluateMathFunction(name, expr);
		}

		// Resolve arguments
		const resolvedArgs = this.resolveArgs(expr);

		// User-defined macros take priority over builtins (allows overriding)
		if (this.macros.has(name)) {
			return this.executeMacroCall(name, resolvedArgs, line);
		}

		// Builtin geometry functions
		if (BUILTIN_NAMES.has(name)) {
			const result = executeBuiltin(
				name,
				resolvedArgs,
				this.figure,
				(v, l) => this.toGeoValue(v, l),
				(x, y, l) => this.toGeoPoint(x, y, l),
				line,
				this._assignmentLabel,
				this.symbols,
				this.angleMode
			);
			if (result) {
				// Scalar result: builtins like norme(), produit_scalaire(), angle_vecteurs()
				if ('scalarValue' in result) {
					return { type: 'nombre', value: (result as BuiltinScalarResult).scalarValue };
				}
				// Multi-result: builtins like zeros(), extrema(), inflections()
				if ('elements' in result) {
					const multi = result as BuiltinMultiResult;
					return {
						type: 'tuple',
						elements: multi.elements.map((el) => ({
							type: 'element' as const,
							figureId: el.figureId,
							elementType: el.symbolType
						}))
					};
				}
				return { type: 'element', figureId: result.figureId, elementType: result.symbolType };
			}
			return { type: 'nombre', value: 0 }; // style() returns nothing
		}

		throw new DslRuntimeError(`Fonction inconnue : "${name}"`, line);
	}

	/**
	 * Handle `unite_angle("degres" | "radians")` — switches the interpreter's
	 * angle mode for all subsequent statements (math-pure routing + builtins).
	 * Returns a synthetic "nombre 0" so callers ignore the result.
	 */
	private evaluateUniteAngle(expr: DslFunctionCallExpr): ResolvedValue {
		if (expr.namedArgs.size > 0 || expr.args.length !== 1) {
			throw new DslRuntimeError(
				'unite_angle() attend 1 argument string ("degres" ou "radians")',
				expr.line
			);
		}
		const arg = expr.args[0];
		if (arg.kind !== 'string') {
			throw new DslRuntimeError('unite_angle() attend une chaine "degres" ou "radians"', expr.line);
		}
		if (arg.value === 'degres' || arg.value === 'degrees') {
			this.angleMode = 'deg';
		} else if (arg.value === 'radians') {
			this.angleMode = 'rad';
		} else {
			throw new DslRuntimeError(
				`unite_angle: "${arg.value}" invalide (attendu "degres" ou "radians")`,
				expr.line
			);
		}
		return { type: 'nombre', value: 0 };
	}

	private evaluateMathFunction(name: string, expr: DslFunctionCallExpr): ResolvedValue {
		// Evaluate the first argument to check if it's a scalar
		const argVal = this.evaluateExpr(expr.args[0], expr.line);
		const op = scalarMathOpFor(name, this.angleMode);
		if (!op) throw new DslRuntimeError(`Fonction math inconnue : "${name}"`, expr.line);

		// If argument is a scalar, create a composed scalar with the math operation
		if (isScalarValue(argVal)) {
			const depId = argVal.figureId;
			const id = this.figure.createScalarExpression((sv) => op(sv.get(depId) ?? 0), [depId]);
			return { type: 'element', figureId: id, elementType: 'scalar' };
		}

		// Regular numeric path
		const arg0 = coerceToNumber(argVal, expr.line);
		return { type: 'nombre', value: op(arg0) };
	}

	private executeMacroCall(name: string, args: ResolvedArgs, line: number): ResolvedValue {
		const macro = this.macros.get(name)!;
		this.macros.enterCall(name, line);

		try {
			// Create new scope for the macro
			this.symbols.pushScope();

			// Bind parameters
			const params = macro.params;
			for (let i = 0; i < params.length; i++) {
				const param = params[i];
				let value: ResolvedValue | undefined;

				if (i < args.positional.length) {
					value = args.positional[i];
				} else if (args.named.has(param.name)) {
					value = args.named.get(param.name)!;
				} else if (param.defaultValue) {
					value = this.evaluateExpr(param.defaultValue, line);
				} else {
					throw new DslRuntimeError(
						`Parametre "${param.name}" manquant pour la macro "${name}"`,
						line
					);
				}

				this.symbols.set(param.name, this.toSymbolEntry(value));
			}

			// Execute body
			const result = this.executeBlock(macro.body);

			// Pop scope
			this.symbols.popScope();

			// Restore visibility of returned elements (hidden during macro execution)
			if (result) this.showReturnedElements(result);

			// Return result or empty tuple
			return result ?? { type: 'nombre', value: 0 };
		} finally {
			this.macros.exitCall();
		}
	}

	/** Hide elements assigned to internal macro variables (intermediates). */
	private hideResolvedElements(value: ResolvedValue): void {
		if (value.type === 'element' && value.figureId) {
			this.figure.hideElement(value.figureId);
		} else if (value.type === 'tuple') {
			for (const el of value.elements) this.hideResolvedElements(el);
		}
	}

	/** Apply label to an element if it doesn't already have one (e.g. returned from macro). */
	private labelElement(value: ResolvedValue, name: string): void {
		if (value.type === 'element' && value.figureId) {
			const el = this.figure.getElementById(value.figureId);
			if (el && !el.label) {
				this.figure.updateLabel(value.figureId, name);
			}
		}
	}

	/** Make returned elements visible again after macro execution hid them. */
	private showReturnedElements(value: ResolvedValue): void {
		if (value.type === 'element' && value.figureId) {
			this.figure.showElement(value.figureId);
		} else if (value.type === 'tuple') {
			for (const el of value.elements) this.showReturnedElements(el);
		}
	}

	private resolveArgs(expr: DslFunctionCallExpr): ResolvedArgs {
		return this.resolveCallArgs(expr.args, expr.namedArgs, expr.line);
	}

	private resolveCallArgs(
		args: readonly DslExpr[],
		namedArgs: ReadonlyMap<string, DslExpr>,
		line: number
	): ResolvedArgs {
		const positional = args.map((a) => this.evaluateExpr(a, line));
		const named = new Map<string, ResolvedValue>();
		for (const [key, value] of namedArgs) {
			named.set(key, this.evaluateExpr(value, line));
		}
		return { positional, named };
	}

	private evaluateToNumber(expr: DslExpr, line: number): number {
		const val = this.evaluateExpr(expr, line);
		if (val.type === 'nombre') return val.value;
		if (val.type === 'geoValue') return geoToNumber(val.value);
		throw new DslRuntimeError('Nombre attendu', line);
	}

	/**
	 * Evaluate a binary expression where at least one operand is a vector.
	 *
	 * Supported operations:
	 * - vector + vector → createVectorSum
	 * - vector - vector → createVectorSum(negate=true)
	 * - scalar * vector or vector * scalar → createVectorScaled
	 * - vector / scalar → createVectorScaled(1/factor)
	 */
	private evaluateVectorBinary(
		op: string,
		leftVal: ResolvedValue,
		rightVal: ResolvedValue,
		leftIsVec: boolean,
		rightIsVec: boolean,
		line: number
	): ResolvedValue {
		if (op === '+' && leftIsVec && rightIsVec) {
			const id = this.figure.createVectorSum(leftVal.figureId, rightVal.figureId);
			return { type: 'element', figureId: id, elementType: 'vecteur' };
		}
		if (op === '-' && leftIsVec && rightIsVec) {
			const id = this.figure.createVectorSum(leftVal.figureId, rightVal.figureId, true);
			return { type: 'element', figureId: id, elementType: 'vecteur' };
		}
		if (op === '*') {
			if (leftIsVec && !rightIsVec) {
				// vector * scalar
				const factor = numeric(coerceToNumber(rightVal, line));
				const id = this.figure.createVectorScaled(leftVal.figureId, factor);
				return { type: 'element', figureId: id, elementType: 'vecteur' };
			}
			if (!leftIsVec && rightIsVec) {
				// scalar * vector
				const factor = numeric(coerceToNumber(leftVal, line));
				const id = this.figure.createVectorScaled(rightVal.figureId, factor);
				return { type: 'element', figureId: id, elementType: 'vecteur' };
			}
		}
		if (op === '/' && leftIsVec && !rightIsVec) {
			// vector / scalar
			const divisor = coerceToNumber(rightVal, line);
			if (divisor === 0) throw new DslRuntimeError('Division par zero', line);
			const factor = numeric(1 / divisor);
			const id = this.figure.createVectorScaled(leftVal.figureId, factor);
			return { type: 'element', figureId: id, elementType: 'vecteur' };
		}
		throw new DslRuntimeError(
			`Operation "${op}" non supportee entre ${leftIsVec ? 'vecteur' : 'nombre'} et ${rightIsVec ? 'vecteur' : 'nombre'}`,
			line
		);
	}

	/**
	 * Create a composed GeoScalar from a binary operation involving at least one scalar.
	 * The non-scalar operand is resolved to its current numeric value (captured in the closure).
	 */
	private evaluateScalarBinary(
		op: string,
		leftVal: ResolvedValue,
		rightVal: ResolvedValue,
		line: number
	): ResolvedValue {
		const leftIsScalar = isScalarValue(leftVal);
		const rightIsScalar = isScalarValue(rightVal);

		const scalarDeps: string[] = [];
		if (leftIsScalar) scalarDeps.push(leftVal.figureId);
		if (rightIsScalar) scalarDeps.push(rightVal.figureId);

		const leftId = leftIsScalar ? leftVal.figureId : null;
		const leftNum = leftIsScalar ? 0 : coerceToNumber(leftVal, line);
		const rightId = rightIsScalar ? rightVal.figureId : null;
		const rightNum = rightIsScalar ? 0 : coerceToNumber(rightVal, line);

		const applyOp = (l: number, r: number): number => {
			switch (op) {
				case '+':
					return l + r;
				case '-':
					return l - r;
				case '*':
					return l * r;
				case '/':
					return r === 0 ? NaN : l / r;
				case '^':
					return Math.pow(l, r);
				case '%':
					return r === 0 ? NaN : ((l % r) + r) % r;
				default:
					throw new DslRuntimeError(`Operateur "${op}" non supporte avec scalar`, line);
			}
		};

		const compute = (sv: ReadonlyMap<string, number>): number => {
			const l = leftId ? (sv.get(leftId) ?? 0) : leftNum;
			const r = rightId ? (sv.get(rightId) ?? 0) : rightNum;
			return applyOp(l, r);
		};

		const id = this.figure.createScalarExpression(compute, scalarDeps);
		return { type: 'element', figureId: id, elementType: 'scalar' };
	}

	private toGeoValue(val: ResolvedValue, line: number): GeoValue {
		if (val.type === 'nombre') return numeric(val.value);
		if (val.type === 'geoValue') return val.value;
		throw new DslRuntimeError('Valeur numerique attendue', line);
	}

	private toGeoPoint(x: ResolvedValue, y: ResolvedValue, line: number): GeoPoint {
		return { x: this.toGeoValue(x, line), y: this.toGeoValue(y, line) };
	}

	private toSymbolEntry(val: ResolvedValue): SymbolEntry {
		if (val.type === 'nombre') return { type: 'nombre', value: val.value };
		if (val.type === 'string') return { type: 'nombre', value: 0 }; // strings don't map to symbols
		if (val.type === 'element') return { type: val.elementType, figureId: val.figureId };
		if (val.type === 'tuple')
			return { type: 'liste', list: val.elements.map((e) => this.toSymbolEntry(e)) };
		if (val.type === 'geoValue') return { type: 'nombre', value: geoToNumber(val.value) };
		return { type: 'nombre', value: 0 };
	}

	private fromSymbolEntry(entry: SymbolEntry): ResolvedValue {
		if (entry.type === 'nombre') return { type: 'nombre', value: entry.value ?? 0 };
		if (entry.type === 'liste') {
			return {
				type: 'tuple',
				elements: (entry.list ?? []).map((e) => this.fromSymbolEntry(e))
			};
		}
		return { type: 'element', figureId: entry.figureId!, elementType: entry.type };
	}
}

// ─── Stepper API ─────────────────────────────────────────────

export interface DslStepper {
	/** Execute the next statement. Returns false when program is complete. */
	step(): boolean;
	/** Index of the last executed step (-1 before first step). */
	readonly currentIndex: number;
	/** The next statement to be executed, or undefined if done. */
	readonly nextStatement: DslStatement | undefined;
	/** The figure being built. */
	readonly figure: Figure;
	/** The symbol table. */
	readonly symbols: SymbolTable;
	/** Total number of executable steps. */
	readonly totalSteps: number;
	/** All steps (read-only). Control flow (for/if) appears as single atomic entries. */
	readonly steps: readonly DslStatement[];
	/** Reset to beginning with a fresh figure. */
	reset(): void;
}

/**
 * Create a step-by-step executor for a DSL program.
 *
 * The stepper lazily flattens control flow: macro definitions are
 * registered upfront, but for/if blocks are expanded only when
 * the stepper reaches them (so variables are already defined).
 */
export function createStepper(
	program: DslProgram,
	figure?: Figure,
	onDirective?: DirectiveHandler
): DslStepper {
	let fig = figure ?? new Figure();
	let symbols = new SymbolTable();
	let macros = new MacroRegistry();
	loadStdlib(macros);
	let interpreter = new Interpreter(fig, symbols, macros, onDirective);

	// Register macros upfront, collect non-macro top-level statements
	const topLevel = registerMacrosAndCollect(program.statements, macros);
	let steps: DslStatement[] = [...topLevel];
	let cursor = -1;

	return {
		step(): boolean {
			const nextIndex = cursor + 1;
			if (nextIndex >= steps.length) return false;

			cursor = nextIndex;
			interpreter.executeStatement(steps[cursor]);
			return true;
		},

		get currentIndex(): number {
			return cursor;
		},

		get nextStatement(): DslStatement | undefined {
			const nextIndex = cursor + 1;
			if (nextIndex >= steps.length) return undefined;
			return steps[nextIndex];
		},

		get figure(): Figure {
			return fig;
		},

		get symbols(): SymbolTable {
			return symbols;
		},

		get totalSteps(): number {
			return steps.length;
		},

		get steps(): readonly DslStatement[] {
			return steps;
		},

		reset(): void {
			fig = new Figure();
			symbols = new SymbolTable();
			macros = new MacroRegistry();
			loadStdlib(macros);
			interpreter = new Interpreter(fig, symbols, macros, onDirective);
			const freshTopLevel = registerMacrosAndCollect(program.statements, macros);
			steps = [...freshTopLevel];
			cursor = -1;
		}
	};
}

/** Register macro definitions and return non-macro statements. */
function registerMacrosAndCollect(
	statements: DslStatement[],
	macros: MacroRegistry
): DslStatement[] {
	const result: DslStatement[] = [];
	for (const stmt of statements) {
		if (stmt.kind === 'macroDef') {
			macros.define(stmt);
		} else {
			result.push(stmt);
		}
	}
	return result;
}
