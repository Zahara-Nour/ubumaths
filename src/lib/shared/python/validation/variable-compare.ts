/**
 * Pure JS engine for the `variable_check` validation strategy.
 *
 * Compares an `expected` value (declared by the teacher as JSON) against an
 * `actual` value (extracted from the student's Python namespace via
 * `pyodide.toJs`).
 *
 * Supported types:
 *   - null (None)
 *   - boolean
 *   - number (int + float, distinguished only in error messages)
 *   - string
 *   - Array (list)        — tuples are converted to Arrays by `toJs`, so this
 *                            path is also reached for tuples
 *   - plain object (dict) — Pyodide `toJs({ dict_converter: Object.fromEntries })`
 *
 * Anything else (Set, Map, custom class instances, undefined) surfaces a
 * dedicated "Type non supporté / Type différent" message.
 *
 * Numeric comparison uses `eps_abs` + `eps_rel` (combined via `max`). When
 * `tolerance` is omitted, defaults apply (1e-9 abs, 1e-6 rel) — chosen so
 * that `5` vs `5.0` and `0.1 + 0.2` vs `0.3` both pass while genuinely
 * different numbers still fail.
 *
 * No Pyodide dependency: callable from worker, main thread, and tests.
 */

export interface CompareResult {
	passed: boolean;
	diff?: string;
}

export interface VariableCompareOptions {
	eps_abs?: number;
	eps_rel?: number;
}

const DEFAULT_EPS_ABS = 1e-9;
const DEFAULT_EPS_REL = 1e-6;

type Kind = 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object' | 'unsupported';

export function compareValue(
	expected: unknown,
	actual: unknown,
	opts: VariableCompareOptions = {}
): CompareResult {
	const eKind = kindOf(expected);
	const aKind = kindOf(actual);

	if (eKind !== aKind || eKind === 'unsupported' || aKind === 'unsupported') {
		return {
			passed: false,
			diff: `Type différent : attendu ${describeType(expected)}, obtenu ${describeType(actual)}.`
		};
	}

	switch (eKind) {
		case 'null':
			return { passed: true };
		case 'boolean':
			return expected === actual
				? { passed: true }
				: {
						passed: false,
						diff: `Attendu ${expected}, obtenu ${actual}.`
					};
		case 'number':
			return compareNumber(expected as number, actual as number, opts);
		case 'string':
			return expected === actual
				? { passed: true }
				: {
						passed: false,
						diff: `Attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}.`
					};
		case 'array':
			return compareArray(expected as unknown[], actual as unknown[], opts);
		case 'object':
			return compareObject(
				expected as Record<string, unknown>,
				actual as Record<string, unknown>,
				opts
			);
	}
}

function compareNumber(e: number, a: number, opts: VariableCompareOptions): CompareResult {
	if (Number.isNaN(e) && Number.isNaN(a)) return { passed: true };
	if (Number.isNaN(e) || Number.isNaN(a)) {
		return {
			passed: false,
			diff: `attendu ${formatNumber(e)}, obtenu ${formatNumber(a)}.`
		};
	}
	if (!Number.isFinite(e) || !Number.isFinite(a)) {
		return e === a
			? { passed: true }
			: {
					passed: false,
					diff: `attendu ${formatNumber(e)}, obtenu ${formatNumber(a)}.`
				};
	}
	const eps_abs = opts.eps_abs ?? DEFAULT_EPS_ABS;
	const eps_rel = opts.eps_rel ?? DEFAULT_EPS_REL;
	const gap = Math.abs(e - a);
	const tolerance = Math.max(eps_abs, eps_rel * Math.abs(e));
	if (gap <= tolerance) return { passed: true };
	return {
		passed: false,
		diff: `attendu ${formatNumber(e)}, obtenu ${formatNumber(a)} (écart ${formatNumber(gap)} > tolérance ${formatNumber(tolerance)}).`
	};
}

function compareArray(e: unknown[], a: unknown[], opts: VariableCompareOptions): CompareResult {
	if (e.length !== a.length) {
		return {
			passed: false,
			diff: `Longueur de liste différente : attendu ${e.length}, obtenu ${a.length}.`
		};
	}
	for (let i = 0; i < e.length; i++) {
		const inner = compareValue(e[i], a[i], opts);
		if (!inner.passed) {
			return {
				passed: false,
				diff: `Élément à l'index ${i} : ${inner.diff ?? ''}`
			};
		}
	}
	return { passed: true };
}

function compareObject(
	e: Record<string, unknown>,
	a: Record<string, unknown>,
	opts: VariableCompareOptions
): CompareResult {
	const eKeys = Object.keys(e);
	const aKeys = Object.keys(a);
	const aSet = new Set(aKeys);
	const eSet = new Set(eKeys);

	const missing = eKeys.filter((k) => !aSet.has(k));
	if (missing.length > 0) {
		return {
			passed: false,
			diff: `Clés manquantes : ${missing.map((k) => `'${k}'`).join(', ')}.`
		};
	}

	const extra = aKeys.filter((k) => !eSet.has(k));
	if (extra.length > 0) {
		return {
			passed: false,
			diff: `Clés en trop : ${extra.map((k) => `'${k}'`).join(', ')}.`
		};
	}

	for (const k of eKeys) {
		const inner = compareValue(e[k], a[k], opts);
		if (!inner.passed) {
			return {
				passed: false,
				diff: `Valeur différente pour la clé '${k}' : ${inner.diff ?? ''}`
			};
		}
	}

	return { passed: true };
}

function kindOf(v: unknown): Kind {
	if (v === null) return 'null';
	if (typeof v === 'boolean') return 'boolean';
	if (typeof v === 'number') return 'number';
	if (typeof v === 'string') return 'string';
	if (Array.isArray(v)) return 'array';
	if (typeof v === 'object') {
		const proto = Object.getPrototypeOf(v);
		if (proto === Object.prototype || proto === null) return 'object';
		return 'unsupported';
	}
	return 'unsupported';
}

/**
 * Produces a Python-flavoured type name suitable for student-facing
 * error messages. Numbers are distinguished as `int` vs `float` based on
 * `Number.isInteger`, matching what the student sees when they inspect
 * their own variable in the REPL.
 */
function describeType(v: unknown): string {
	if (v === null) return 'None';
	if (v === undefined) return 'undefined';
	if (typeof v === 'boolean') return 'bool';
	if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
	if (typeof v === 'string') return 'str';
	if (Array.isArray(v)) return 'list';
	if (v instanceof Set) return 'set';
	if (v instanceof Map) return 'map';
	if (typeof v === 'object') {
		const proto = Object.getPrototypeOf(v);
		if (proto === Object.prototype || proto === null) return 'dict';
		const name = (v as { constructor?: { name?: string } }).constructor?.name;
		return name ? name.toLowerCase() : 'object';
	}
	return typeof v;
}

function formatNumber(n: number): string {
	if (Number.isNaN(n)) return 'NaN';
	if (n === Number.POSITIVE_INFINITY) return 'Infinity';
	if (n === Number.NEGATIVE_INFINITY) return '-Infinity';
	return n.toString();
}
