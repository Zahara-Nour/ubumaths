/**
 * Shared orchestration for the `integrale()`, `aire()` (branche courbe) and
 * `aire_entre()` DSL builtins.
 *
 * The three cases share ~80% of their plumbing: bound resolution, continuity
 * pre-analysis, factory call wrapped with DslRuntimeError, and per-function
 * singularity warning. This helper centralises that plumbing so the cases
 * themselves only carry their dialect (validation messages, polygon overload
 * for `aire`, signed/g switches).
 *
 * Spec: docs/wip/geometry/refactor-area-builtins-study.md.
 */

import type { Figure } from '../graph/figure';
import type { ScalarParam } from '../types/geo-value';
import { numeric } from '../types/geo-value';
import type { MathNode } from '$lib/mathAST';
import { subtract } from '$lib/mathAST';
import type { Discontinuity } from '$lib/mathAST/analysis';
import { DslRuntimeError } from './errors';
import { warnIfSingularitySuspected, getAllDiscontinuities } from './singularity-warn';
import type { ResolvedValue } from './builtins';
import { PROBE_T_MAX } from '$lib/mathAST/integration/improper';

export type AreaBuiltinName = 'integrale' | 'aire' | 'aire_entre';

/** Minimal view of a function element required by the helper.
 * Callers extract this from a validated `GeoFunction` element. */
export interface AreaBuiltinFunctionRef {
	readonly id: string;
	readonly expression: MathNode;
}

export interface InterpretAreaBuiltinOpts {
	readonly name: AreaBuiltinName;
	readonly f: AreaBuiltinFunctionRef;
	/** Set for `aire_entre` (V3) only. Forces `signed: false` and routes to
	 *  `secondFunctionId` on the factory. The integrand for the discontinuity
	 *  cache becomes `f − g`. */
	readonly g?: AreaBuiltinFunctionRef;
	readonly lowerArg: ResolvedValue;
	readonly upperArg: ResolvedValue;
	/** Must be `false` whenever `g` is set (asserted internally). The helper
	 *  passes this explicitly to the factory; the V1 `case 'integrale'` relied
	 *  on the factory default `true`, behaviorally equivalent today but
	 *  structurally explicit here. */
	readonly signed: boolean;
	/** Hex color forwarded to the factory. `undefined` ⇒ factory default (blue).
	 *  **Caller responsibility**: `aire` and `aire_entre` callers MUST pass
	 *  `'#22c55e'` (vert) and `'#fb923c'` (orange) respectively to preserve the
	 *  triade bleu/vert/orange documented in the area-study. The helper does
	 *  NOT default per-name on purpose (Q4 of the refactor study). */
	readonly defaultColor?: string;
	readonly line: number;
	readonly label?: string;
	readonly figure: Figure;
}

export interface InterpretAreaBuiltinResult {
	readonly figureId: string;
	readonly symbolType: 'scalar';
	readonly styleTargetId: string;
}

function resolveBoundParam(
	figure: Figure,
	arg: ResolvedValue,
	boundName: 'inferieure' | 'superieure',
	builtinName: AreaBuiltinName,
	line: number
): { param: ScalarParam; numericValue: number } {
	if (arg.type === 'nombre') {
		// V5 — `±Infinity` flows as a dedicated `InfinityParam` since `GeoNumeric`
		// rejects non-finite values (coordinate invariant). The improper-area
		// path in `figure.createImproperIntegralArea` recognises it.
		if (arg.value === Infinity) {
			return { param: { infinity: '+' }, numericValue: Infinity };
		}
		if (arg.value === -Infinity) {
			return { param: { infinity: '-' }, numericValue: -Infinity };
		}
		if (!Number.isFinite(arg.value)) {
			throw new DslRuntimeError(
				`${builtinName}(): la borne ${boundName} (${arg.value}) n'est pas un nombre valide`,
				line
			);
		}
		return { param: numeric(arg.value), numericValue: arg.value };
	}
	if (arg.type === 'element') {
		const el = figure.getElementById(arg.figureId);
		if (!el || (el.type !== 'scalar' && el.type !== 'slider')) {
			throw new DslRuntimeError(
				`${builtinName}(): la borne ${boundName} doit etre un nombre ou un curseur/scalaire`,
				line
			);
		}
		const v = figure.getScalarValue(arg.figureId);
		return {
			param: { scalarRef: arg.figureId },
			numericValue: v ?? NaN
		};
	}
	throw new DslRuntimeError(
		`${builtinName}(): la borne ${boundName} doit etre un nombre ou un curseur/scalaire`,
		line
	);
}

export function interpretAreaBuiltin(opts: InterpretAreaBuiltinOpts): InterpretAreaBuiltinResult {
	const { name, f, g, lowerArg, upperArg, signed, defaultColor, line, label, figure } = opts;

	if (g && signed) {
		throw new Error('interpretAreaBuiltin: g + signed=true non supporté');
	}

	const lower = resolveBoundParam(figure, lowerArg, 'inferieure', name, line);
	const upper = resolveBoundParam(figure, upperArg, 'superieure', name, line);

	const integrand: MathNode = g ? subtract(f.expression, g.expression) : f.expression;
	const discontinuities: readonly Discontinuity[] | undefined =
		getAllDiscontinuities(integrand, 'x') ?? undefined;

	// V5 — improper integrals: route to createImproperIntegralArea when at
	// least one bound is ±Infinity. Spec: docs/wip/geometry/improper-integrals-study.md.
	const isImproper = !Number.isFinite(lower.numericValue) || !Number.isFinite(upper.numericValue);

	let result: { areaId: string; scalarId: string };
	try {
		if (isImproper) {
			result = figure.createImproperIntegralArea(f.id, lower.param, upper.param, {
				label,
				signed,
				...(g ? { secondFunctionId: g.id } : {}),
				...(defaultColor ? { color: defaultColor } : {}),
				discontinuities
			});
		} else {
			result = figure.createIntegralArea(f.id, lower.param, upper.param, {
				label,
				signed,
				...(g ? { secondFunctionId: g.id } : {}),
				...(defaultColor ? { color: defaultColor } : {}),
				discontinuities
			});
		}
	} catch (e) {
		throw new DslRuntimeError(`${name}(): ${e instanceof Error ? e.message : String(e)}`, line);
	}

	// Singularity warning for finite portions — bounds normalized to the probe
	// window for improper integrals so analyzeRangeContinuity has finite inputs.
	const warnLower = Number.isFinite(lower.numericValue) ? lower.numericValue : -PROBE_T_MAX;
	const warnUpper = Number.isFinite(upper.numericValue) ? upper.numericValue : PROBE_T_MAX;
	warnIfSingularitySuspected(f.expression, 'x', warnLower, warnUpper, line, name);
	if (g) {
		warnIfSingularitySuspected(g.expression, 'x', warnLower, warnUpper, line, name);
	}

	return {
		figureId: result.scalarId,
		symbolType: 'scalar',
		styleTargetId: result.areaId
	};
}
