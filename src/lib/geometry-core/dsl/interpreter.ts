/**
 * DSL Interpreter — walks the AST and produces a Figure.
 *
 * Maps DSL function calls to Figure factory methods via builtins.
 *
 * ─── Evaluation matrix (path × mode) ──────────────────────────────────────
 *
 * Every DSL expression is evaluated through one of 2 paths in one of 2 modes:
 *
 *                │  Static (snapshot, returns number)  │  Reactive (live GeoScalar)
 * ───────────────┼─────────────────────────────────────┼────────────────────────────
 * mathAST routing│  tryEvaluateAsMathExpr —            │  same fn — `scalarDeps`
 *                │  `if (scalarDeps.length === 0)`     │  branch → `createScalarExpression`
 * ───────────────┼─────────────────────────────────────┼────────────────────────────
 * DSL evaluator  │  `case 'binary'` w/ two `nombre`    │  `evaluateScalarBinary` (≥1
 *                │  operands → JS arithmetic           │  operand is scalar)
 *
 * Path: `mathAST routing` opens when `isMathPureExpr(expr)` is true (and not
 * inside a macro body, etc.). It delegates parse + compile to mathAST. The
 * `DSL evaluator` covers everything else (tuples, property access, vectors,
 * builtin/macro calls, builtin+scalar mixed).
 *
 * Mode: `Static` when the expression has no slider/scalar deps → result is
 * a `number`. `Reactive` when ≥1 operand is a scalar → result is a
 * `GeoScalar` that recomputes on every `figure.recompute()`.
 *
 * Reactive paths apply `Number.isFinite(result) ? result : NaN` so a derived
 * coordinate "disappears" on non-finite rather than being catapulted off-
 * screen. Static paths (both routing and DSL evaluator since V2 #2) follow
 * IEEE 754 / JS native arithmetic (`1/0 → Infinity`, `0/0 → NaN`).
 *
 * Full design notes: `docs/wip/geometry/dsl-mathast-routing-progress.md`.
 */

import { Figure } from '../graph/figure';
import type { GeoValue } from '../types/geo-value';
import { numeric, exact } from '../types/geo-value';
import type { GeoPoint } from '../types/primitives';
import { geoToNumber } from '../compute/to-number';
import { simplifyExact } from '../compute/geo-arithmetic';
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
import { parseCustom, getVariables, substitute } from '$lib/mathAST';
import { numericNode } from '$lib/mathAST/common/numeric';
import type { MathNode } from '$lib/mathAST';
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
 * interpreter's active angle mode so the DSL evaluator path (used for cases
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
	/** Active angle mode at the end of execution. Used by `serializeDsl`. */
	angleMode: AngleMode;
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
	return { figure: fig, symbols, angleMode: interpreter.getAngleMode() };
}

/**
 * Reserved DSL names that cannot be assigned to. `\pi` is the math constant π;
 * `e` is Euler's number (Q7 = α: strict reservation). Both can still be used
 * in any RHS/expression context — they're routed to mathAST and resolve to
 * Math.PI / Math.E respectively.
 */
const RESERVED_NAMES = new Set(['\\pi', 'e']);

/**
 * Module-level cache for `parseCustom(rawSource) → MathNode`. The mapping is
 * deterministic (same source string always parses to the same AST), so the
 * cache never needs invalidation. Bounded by the number of distinct expression
 * substrings the DSL has ever encountered in the running session.
 *
 * This is the dominant optimization: without it, a `pour i de 1 a 100`
 * loop body that contains `r = sqrt(i)` re-parses the same string 100 times.
 */
const PARSE_CACHE = new Map<string, MathNode>();
/** Strings known to fail `parseCustom` — avoid retrying them. */
const PARSE_FAILURE_CACHE = new Set<string>();
/**
 * Cap on the number of distinct expressions kept in each cache. A crafted script
 * with unique sub-expressions per iteration could otherwise grow these maps
 * without bound across long-lived sessions (live-preview).
 */
const PARSE_CACHE_MAX = 5_000;

function assertNameNotReserved(name: string, line: number): void {
	if (RESERVED_NAMES.has(name)) {
		throw new DslRuntimeError(`"${name}" est une constante réservée`, line);
	}
}

/**
 * Suggest a fix when a user references a name that looks like a misspelling
 * of a math constant. Returns an empty string when no hint applies.
 */
function unknownVariableHint(name: string): string {
	const lower = name.toLowerCase();
	if (lower === 'pi') {
		return ' (la constante π s\'écrit "\\pi" avec backslash)';
	}
	if (name === 'E' || lower === 'euler') {
		return ' (la constante e (Euler) s\'écrit en minuscule "e")';
	}
	return '';
}

/**
 * Hint for `Fonction inconnue` errors: point at the categories of available
 * function names so the user knows where to look.
 */
const UNKNOWN_FUNCTION_HINT =
	' (fonctions math disponibles : sqrt, abs, sin, cos, tan, asin, acos, atan, exp, ln, log, ceil, floor… ; ' +
	'builtins DSL : point, droite, segment, cercle, courbe, slider, distance, intersection…)';

/**
 * Collect every identifier name used in a DslExpr (recursive). Includes the
 * name of any function call so callers can detect when a user-defined symbol
 * shadows a function position (e.g. `exp = 5; r = exp(3)` — the user likely
 * means the math function, but the guard surfaces the collision).
 */
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
			out.add(expr.name);
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

	/** Public getter for the active angle mode (used by serialize round-trip). */
	getAngleMode(): AngleMode {
		return this.angleMode;
	}

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
					// Detect old-style tuple destructuring after the stdlib migration
					// (mediatrice, cercle_circonscrit, rectangle, etc. now return single
					// objects). Give a helpful hint pointing to the new pattern.
					const rhs =
						stmt.value.kind === 'call' && 'name' in stmt.value
							? (stmt.value as { name: string }).name
							: null;
					const MIGRATED_MACROS_HINTS: Record<string, string> = {
						mediatrice:
							'Forme actuelle : `d = mediatrice(A, B)` ; le milieu via `M = milieu(A, B)`.',
						mediane: 'Forme actuelle : `s = mediane(A, B, C)` ; le milieu via `M = milieu(B, C)`.',
						hauteur:
							'Forme actuelle : `d = hauteur(A, B, C)` ; le pied via `F = intersection(d, droite(B, C))`.',
						cercle_circonscrit:
							'Forme actuelle : `c = cercle_circonscrit(A, B, C)` ; le centre via `O = centre(c)`.',
						cercle_inscrit:
							'Forme actuelle : `c = cercle_inscrit(A, B, C)` ; le centre via `I = centre(c)`.',
						cercle_euler:
							'Forme actuelle : `c = cercle_euler(A, B, C)` ; le centre via `O = centre(c)`.',
						corde:
							'Forme actuelle : `s = corde(c, d)` ; les extrémités via `extremite(s, 1)` et `extremite(s, 2)`.',
						rectangle:
							'Forme actuelle : `p = rectangle(A, B, largeur=...)` ; les sommets via `sommets(p)` ou `sommet(p, i)`.',
						carre:
							'Forme actuelle : `p = carre(A, B)` ; les sommets via `sommets(p)` ou `sommet(p, i)`.',
						losange:
							'Forme actuelle : `p = losange(A, B, angle=...)` ; les sommets via `sommets(p)` ou `sommet(p, i)`.',
						parallelogramme:
							'Forme actuelle : `p = parallelogramme(A, B, C)` ; les sommets via `sommets(p)` ou `sommet(p, i)`.',
						triangle_equilateral:
							'Forme actuelle : `t = triangle_equilateral(A, B)` ; le 3ᵉ sommet via `sommet(t, 3)`.',
						triangle_isocele:
							'Forme actuelle : `t = triangle_isocele(A, B[, angle=...])` ; les sommets via `sommets(t)` ou `sommet(t, i)`.',
						triangle_rectangle:
							'Forme actuelle : `t = triangle_rectangle(A, B[, angle=...])` ; les sommets via `sommets(t)` ou `sommet(t, i)`.'
					};
					const migrationHint =
						rhs && rhs in MIGRATED_MACROS_HINTS ? MIGRATED_MACROS_HINTS[rhs] : null;
					throw new DslRuntimeError(
						{
							summary: migrationHint
								? `\`${rhs}()\` ne retourne plus un tuple — la destructuration n'est plus la bonne forme.`
								: 'La destructuration nécessite une valeur de type tuple.',
							hint:
								migrationHint ??
								'Vérifiez que le builtin appelé à droite retourne bien un tuple. Depuis 2026-05-18, les macros stdlib (`mediatrice`, `cercle_circonscrit`, `rectangle`…) retournent un objet unique — utilisez les accesseurs (`centre`, `milieu`, `sommet`, `extremite`) pour récupérer les sous-parties.'
						},
						stmt.line
					);
				}
				if (value.elements.length !== stmt.names.length) {
					throw new DslRuntimeError(
						{
							summary: `Destructuration : ${stmt.names.length} variable(s) à gauche, ${value.elements.length} valeur(s) à droite.`,
							hint: 'Les noms à gauche du `=` doivent correspondre exactement au nombre d’éléments retournés.'
						},
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
				assertNameNotReserved(stmt.variable, stmt.line);
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
				assertNameNotReserved(stmt.variable, stmt.line);
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
	 * in which case the caller falls back to the DSL evaluator (the general
	 * geometric path that handles tuples, builtins, macros, vectors, etc.).
	 */
	private tryEvaluateAsMathExpr(expr: DslExpr): ResolvedValue | null {
		// Inside macro bodies the source positions point into the macro definition
		// (e.g. STDLIB_MACROS), not into the interpreter's `this.source`. Routing
		// would extract a stray slice and may produce wrong values. The DSL
		// evaluator handles macro evaluation correctly.
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

		// Single guard for both missing positions and out-of-bounds slices —
		// avoids non-null assertions a few lines down.
		if (
			expr.start === undefined ||
			expr.end === undefined ||
			expr.start < 0 ||
			expr.end > this.source.length
		) {
			return null;
		}
		const rawSource = this.source.slice(expr.start, expr.end);

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

		// Module-level parse cache: same source always parses to the same AST,
		// so we never need invalidation. Skip strings already known to fail.
		if (PARSE_FAILURE_CACHE.has(rawSource)) return null;
		let node = PARSE_CACHE.get(rawSource);
		if (node === undefined) {
			try {
				node = parseCustom(rawSource);
			} catch {
				if (PARSE_FAILURE_CACHE.size >= PARSE_CACHE_MAX) PARSE_FAILURE_CACHE.clear();
				PARSE_FAILURE_CACHE.add(rawSource);
				return null;
			}
			if (PARSE_CACHE.size >= PARSE_CACHE_MAX) PARSE_CACHE.clear();
			PARSE_CACHE.set(rawSource, node);
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

		// Static path: no scalar deps. Two cases :
		//   (a) Node is symbolic (contains π, e, sqrt, cos, …) → return an exact
		//       GeoValue so builtins like `point(2*sqrt(3), 0)` keep the
		//       symbolic form through `createFreePoint` → `compute-position.ts` →
		//       `geometry/transformations.ts` (geoCos/geoSin know remarkable
		//       angles exactly). This is what makes
		//       `milieu(point(0,0), point(2*sqrt(3),0))` evaluate to an exact
		//       `sqrt(3)` rather than `1.7320508…`.
		//   (b) Node is pure number arithmetic (`3 + 2`, `1/2`, …) → return a
		//       plain `nombre`. Faster, and preserves the original semantics
		//       expected by the rest of the DSL (`requireNumber`, `for …`, etc.).
		// Static path: no scalar deps. Always return an exact GeoValue built
		// from the simplified AST. The module's architectural contract is :
		// every DSL literal stays exact — `point(0, 0)`, `point(2.5, 3)`,
		// `point(2*sqrt(3), 0)` all produce exact coordinates. The `numeric`
		// kind exists only for drag positions (pointer events feeding
		// `figure.movePoint`).
		//
		// We fall back to `{type: 'nombre', value}` only when the AST cannot
		// be carried (Infinity/NaN static binding, simplification failure) —
		// downstream `toGeoValue` will then re-wrap via `numericNode` (still
		// exact when finite), or numeric for non-finite drag positions.
		if (scalarDeps.length === 0) {
			let value: number;
			try {
				value = fn(staticBindings);
			} catch {
				return null;
			}
			// Non-finite results (1/0 → Infinity, 0/0 → NaN) follow IEEE 754
			// via the numeric path : an exact node `division(1, 0)` would
			// evaluate to NaN on `geoToNumber`, breaking divergent integrals
			// and other DSL idioms that rely on Infinity propagation.
			if (!Number.isFinite(value)) {
				return { type: 'nombre', value };
			}
			let exactNode: MathNode | null = node;
			if (Object.keys(staticBindings).length > 0) {
				try {
					exactNode = substitute(node, staticBindings);
				} catch {
					exactNode = null;
				}
			}
			if (exactNode !== null) {
				try {
					exactNode = simplifyExact(exactNode);
					return { type: 'geoValue', value: exact(exactNode) };
				} catch {
					// Fall through to numeric on simplification failure.
				}
			}
			return { type: 'nombre', value };
		}

		// Reactive path: at least one scalar dep → build a GeoScalar with a
		// closure that re-evaluates the compiled function on each recompute.
		// Convention (matches `evaluateScalarBinary` in the DSL evaluator):
		// non-finite results in a derived scalar are surfaced as NaN, not
		// Infinity, so downstream renderers treat them as undefined.
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
					throw new DslRuntimeError(
						`Variable inconnue : "${expr.name}"${unknownVariableHint(expr.name)}`,
						expr.line
					);
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
						// IEEE 754 / JS native: 1/0 → Infinity, 0/0 → NaN, -1/0 → -Infinity.
						// Aligns the DSL evaluator with the mathAST static path so the
						// same expression produces the same value regardless of routing.
						// The reactive scalar path keeps its NaN-coerce post-process for
						// rendering (a coordinate becomes invisible rather than off-screen).
						return { type: 'nombre', value: left / right };
					case '%':
						// JS: 5 % 0 = NaN (no throw). Formula tolerates NaN.
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

		throw new DslRuntimeError(`Fonction inconnue : "${name}"${UNKNOWN_FUNCTION_HINT}`, line);
	}

	/**
	 * Handle `unite_angle("degres" | "radians")` — switches the interpreter's
	 * angle mode for all subsequent statements (math-pure routing + builtins).
	 * Returns a synthetic "nombre 0" so callers ignore the result.
	 *
	 * The active mode is exposed via `getAngleMode()` and round-tripped by
	 * `serializeDsl(figure, symbols, { angleMode })`.
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
		if (!op)
			throw new DslRuntimeError(
				`Fonction math inconnue : "${name}"${UNKNOWN_FUNCTION_HINT}`,
				expr.line
			);

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
			// V2 #2 (F simple): unified IEEE 754 division for numbers, but vectors
			// still throw because `numeric()` enforces a finite-only invariant on
			// coordinates. Allowing a vector with infinite components would cascade
			// into many downstream renderers. To unify in V3 alongside relaxing the
			// `GeoNumeric` invariant.
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
		// Architectural contract: GeoValue is exact by default. The `numeric`
		// kind only exists for drag positions (pointer events, where the float
		// comes from screen pixels and can have arbitrary IEEE-754 precision).
		// DSL literals like `point(0, 0)`, `point(2.5, 3)`, `point(2*sqrt(3), 0)`
		// must all produce exact GeoValue so derived computations stay exact.
		//
		// For trivial number primitives (`2`, `2.5`, `1/2`) the parser feeds
		// a clean float here ; `numericNode(n)` produces `number(n.toString())`
		// which parses back exactly via `extractRational` (5/2 for 2.5).
		if (val.type === 'nombre') return exact(numericNode(val.value));
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
	/** Active angle mode after the most recent step. */
	readonly angleMode: AngleMode;
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
	let interpreter = new Interpreter(fig, symbols, macros, onDirective, program.source ?? '');

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

		get angleMode(): AngleMode {
			return interpreter.getAngleMode();
		},

		reset(): void {
			fig = new Figure();
			symbols = new SymbolTable();
			macros = new MacroRegistry();
			loadStdlib(macros);
			interpreter = new Interpreter(fig, symbols, macros, onDirective, program.source ?? '');
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
