/**
 * Builtin function definitions for the DSL interpreter.
 *
 * Maps French DSL function names to Figure factory method calls.
 */

import type { Figure } from '../graph/figure';
import type { GeoValue, ScalarParam } from '../types/geo-value';
import { exact, isScalarRef } from '../types/geo-value';
import type { GeoPoint } from '../types/primitives';
import type { SymbolType, SymbolTable } from './symbol-table';
import { DslRuntimeError } from './errors';
import { splitDomainSuffix, parseDomainSuffix, type ParseDomainResult } from './domain-parser';
import { parsePiecewise, isPiecewiseRhs } from './piecewise-parser';
import {
	parseCustom,
	isRelation,
	isVariable,
	isGreek,
	subtract,
	divide,
	opposite,
	add,
	multiply,
	cos,
	sin,
	greek,
	number as mathNumber,
	compile,
	toCustom,
	getVariables,
	substitute
} from '$lib/mathAST';
import type { MathNode, CompiledFn } from '$lib/mathAST';
import {
	extractAffineCombination,
	extractQuadraticCombination,
	findCriticalZeros,
	findCriticalExtrema,
	findCriticalInflections
} from '$lib/mathAST/analysis';
import { classifyConic } from '../geometry/conic-classify';
import {
	asymptoteLines,
	axisLines as computeAxisLines,
	directrixLine as computeDirectrixLine,
	fociPoints as computeFociPoints,
	eccentricity as computeEccentricity
} from '../geometry/conic-properties';
import { isZeroExpression } from '$lib/mathAST/normal';
import { differentiate } from '$lib/mathAST/differentiation';
import { numeric } from '../types/geo-value';
import { applyTransformationToElement } from './transform-apply';
import type { GeoElement } from '../types/elements';
import { isPointElement } from '../types/elements';
import { applyAngleMode } from './apply-angle-mode';
import { interpretAreaBuiltin } from './area-builtin-helper';

/** Resolve a line-like element's two defining point IDs. */
function resolveLinePoints(el: GeoElement): { p1: string; p2: string } | null {
	switch (el.type) {
		case 'line':
			return { p1: el.point1Id, p2: el.point2Id };
		case 'segment':
			return { p1: el.startId, p2: el.endId };
		case 'ray':
			return { p1: el.originId, p2: el.throughId };
		default:
			return null;
	}
}

/** Resolve axe= argument: either a line-like element or a tuple of 2 points. */
function resolveAxeArg(
	axeArg: ResolvedValue,
	figure: Figure,
	line: number
): { p1: string; p2: string } {
	if (
		axeArg.type === 'element' &&
		(axeArg.elementType === 'droite' ||
			axeArg.elementType === 'segment' ||
			axeArg.elementType === 'demidroite')
	) {
		const lineEl = figure.getElementById(axeArg.figureId!);
		if (!lineEl) throw new DslRuntimeError(`axe: element introuvable`, line);
		const pts = resolveLinePoints(lineEl);
		if (!pts)
			throw new DslRuntimeError('axe: impossible de resoudre les points de la droite', line);
		return pts;
	}
	const tuple = requireTuple(axeArg, 'axe', line);
	if (tuple.length !== 2) throw new DslRuntimeError('axe attend un tuple de 2 points', line);
	return {
		p1: requireElement(tuple[0], 'axe.1', line),
		p2: requireElement(tuple[1], 'axe.2', line)
	};
}
import { geoToNumber } from '../compute/to-number';

export type ResolvedArgs = {
	positional: ResolvedValue[];
	named: Map<string, ResolvedValue>;
};

export type ResolvedValue =
	| { type: 'nombre'; value: number }
	| { type: 'string'; value: string }
	| { type: 'element'; figureId: string; elementType: SymbolType }
	| { type: 'tuple'; elements: ResolvedValue[] }
	| { type: 'geoValue'; value: GeoValue };

/** French color names to hex. */
const COLOR_MAP: Record<string, string> = {
	bleu: '#1e40af',
	rouge: '#dc2626',
	vert: '#16a34a',
	violet: '#9333ea',
	orange: '#ea580c',
	cyan: '#0891b2',
	gris: '#4b5563',
	noir: '#000000',
	jaune: '#f59e0b'
};

export function resolveColorName(name: string): string {
	return COLOR_MAP[name] ?? name;
}

/** Map of builtin function names to their execution logic. */
export interface BuiltinResult {
	figureId: string;
	symbolType: SymbolType;
	/**
	 * Optional element id where inline style args (couleur, opacite_fond, ...)
	 * should be applied instead of `figureId`. Used by builtins like
	 * `integrale()` that return a scalar (invisible) but have a visible
	 * companion element (the integral area) that should be styled.
	 */
	styleTargetId?: string;
}

/** Result for builtins that return multiple elements (zeros, extrema, inflections). */
export interface BuiltinMultiResult {
	elements: BuiltinResult[];
}

/** Result for builtins that return a scalar number (norme, produit_scalaire, angle_vecteurs). */
export interface BuiltinScalarResult {
	scalarValue: number;
}

function requireElement(val: ResolvedValue, name: string, line: number): string {
	if (val.type !== 'element') {
		throw new DslRuntimeError(`"${name}" n'est pas un element geometrique`, line);
	}
	return val.figureId;
}

function requireNumber(val: ResolvedValue, name: string, line: number): number {
	if (val.type === 'nombre') return val.value;
	if (val.type === 'geoValue') {
		// This should already be a number
		throw new DslRuntimeError(`"${name}" est une valeur exacte, nombre attendu`, line);
	}
	throw new DslRuntimeError(`"${name}" n'est pas un nombre`, line);
}

function requireTuple(val: ResolvedValue, name: string, line: number): ResolvedValue[] {
	if (val.type !== 'tuple') {
		throw new DslRuntimeError(`"${name}" n'est pas un tuple`, line);
	}
	return val.elements;
}

/** Style named args (couleur, forme, tirets, pointilles, epaisseur) common to all geometry builtins. */
/** Default search window for function analysis (zeros, extrema, inflections, intersections). */
const FUNCTION_SEARCH_XMIN = -10;
const FUNCTION_SEARCH_XMAX = 10;

const STYLE_ARGS = new Set([
	'couleur',
	'forme',
	'trait',
	'epaisseur',
	'rendu',
	'rugosite',
	'courbure',
	'motif',
	'sommets_nets',
	'remplissage',
	'opacite_fond'
]);

function applyInlineStyle(
	figure: Figure,
	elId: string,
	named: Map<string, ResolvedValue>,
	line: number
): void {
	const style: Record<string, unknown> = {};
	if (named.has('couleur')) {
		const cv = named.get('couleur')!;
		const colorStr = cv.type === 'string' ? cv.value : cv.type === 'nombre' ? String(cv.value) : '';
		style.color = resolveColorName(colorStr);
	}
	if (named.has('forme')) {
		const fv = named.get('forme')!;
		const formeName = fv.type === 'string' ? fv.value : 'point';
		const FORME_MAP: Record<string, string> = {
			point: 'dot',
			cercle: 'circle',
			croix: 'cross',
			carre: 'square'
		};
		style.pointShape = FORME_MAP[formeName] ?? formeName;
	}
	if (named.has('trait')) {
		const tv = named.get('trait')!;
		const traitName = tv.type === 'string' ? tv.value : 'continu';
		const TRAIT_MAP: Record<string, string | undefined> = {
			continu: undefined,
			tirets: 'dashed',
			pointilles: 'dotted'
		};
		const dash = TRAIT_MAP[traitName];
		if (dash) style.dash = dash;
	}
	if (named.has('epaisseur')) {
		style.strokeWidth = requireNumber(named.get('epaisseur')!, 'epaisseur', line);
	}
	if (named.has('rendu')) {
		const rv = named.get('rendu')!;
		const renduName = rv.type === 'string' ? rv.value : 'normal';
		const RENDU_MAP: Record<string, string> = {
			croquis: 'rough',
			normal: 'normal'
		};
		style.render = RENDU_MAP[renduName] ?? renduName;
	}
	if (named.has('rugosite')) {
		style.roughness = requireNumber(named.get('rugosite')!, 'rugosite', line);
	}
	if (named.has('courbure')) {
		style.roughBowing = requireNumber(named.get('courbure')!, 'courbure', line);
	}
	if (named.has('motif')) {
		const mv = named.get('motif')!;
		const motifName = mv.type === 'string' ? mv.value : 'hachure';
		const MOTIF_MAP: Record<string, string> = {
			hachure: 'hachure',
			plein: 'solid',
			zigzag: 'zigzag',
			croise: 'cross-hatch',
			points: 'dots',
			tirets: 'dashed'
		};
		style.roughFillStyle = MOTIF_MAP[motifName] ?? motifName;
	}
	if (named.has('sommets_nets')) {
		const sv = named.get('sommets_nets')!;
		style.roughPreserveVertices = sv.type === 'nombre' ? sv.value !== 0 : true;
	}
	if (named.has('remplissage')) {
		const fv = named.get('remplissage')!;
		const fillStr = fv.type === 'string' ? fv.value : fv.type === 'nombre' ? String(fv.value) : '';
		style.fillColor = resolveColorName(fillStr);
	}
	if (named.has('opacite_fond')) {
		style.fillOpacity = requireNumber(named.get('opacite_fond')!, 'opacite_fond', line);
	}
	if (Object.keys(style).length > 0) {
		figure.updateStyle(elId, style);
	}
}

export type { AngleMode } from './apply-angle-mode';
import type { AngleMode } from './apply-angle-mode';

/** Convert an angle value (number) from the active mode to radians. */
export function toRadians(value: number, mode: AngleMode): number {
	return mode === 'deg' ? (value * Math.PI) / 180 : value;
}

export function executeBuiltin(
	name: string,
	args: ResolvedArgs,
	figure: Figure,
	toGeoValue: (v: ResolvedValue, line: number) => GeoValue,
	toGeoPoint: (x: ResolvedValue, y: ResolvedValue, line: number) => GeoPoint,
	line: number,
	label?: string,
	symbols?: SymbolTable,
	angleMode: AngleMode = 'deg'
): BuiltinResult | BuiltinMultiResult | BuiltinScalarResult | null {
	const pos = args.positional;
	const named = args.named;
	const hasStyleArgs = [...named.keys()].some((k) => STYLE_ARGS.has(k));

	const result = _executeBuiltinInner(
		name,
		pos,
		named,
		figure,
		toGeoValue,
		toGeoPoint,
		line,
		label,
		symbols,
		angleMode
	);

	// Apply inline style args (couleur, forme, etc.) to created element(s).
	// `styleTargetId` (when set) redirects to a different element than
	// `figureId` — used by integrale() to style the area instead of the scalar.
	if (result && hasStyleArgs) {
		if ('figureId' in result) {
			const target = result.styleTargetId ?? result.figureId;
			applyInlineStyle(figure, target, named, line);
		} else if ('elements' in result) {
			for (const el of (result as BuiltinMultiResult).elements) {
				const target = el.styleTargetId ?? el.figureId;
				applyInlineStyle(figure, target, named, line);
			}
		}
	}

	return result;
}

/** Convert a ResolvedValue to a ScalarParam (for dynamic-capable parameters). */
function toScalarParam(
	val: ResolvedValue,
	toGeoValue: (v: ResolvedValue, line: number) => GeoValue,
	line: number
): ScalarParam {
	// Scalar element → scalarRef
	if (val.type === 'element' && val.elementType === 'scalar') {
		return { scalarRef: val.figureId };
	}
	// Otherwise fall through to GeoValue
	return toGeoValue(val, line);
}

/**
 * Context passed to every extracted builtin handler.
 *
 * Mirrors the arguments of `_executeBuiltinInner`. Handlers read from the
 * context instead of capturing free variables, so each one is a top-level
 * function that can be unit-tested in isolation.
 *
 * `name` is included for the shared `zeros`/`extrema`/`inflections` handler;
 * most handlers ignore it.
 */
export interface BuiltinCtx {
	readonly name: string;
	readonly pos: ResolvedValue[];
	readonly named: Map<string, ResolvedValue>;
	readonly figure: Figure;
	readonly toGeoValue: (v: ResolvedValue, line: number) => GeoValue;
	readonly toGeoPoint: (x: ResolvedValue, y: ResolvedValue, line: number) => GeoPoint;
	readonly line: number;
	readonly label?: string;
	readonly symbols?: SymbolTable;
	readonly angleMode: AngleMode;
}

export type BuiltinHandler = (
	ctx: BuiltinCtx
) => BuiltinResult | BuiltinMultiResult | BuiltinScalarResult | null;

/**
 * Dispatch table for builtins. Populated incrementally as cases are extracted
 * out of the legacy switch in `_executeBuiltinInner`. When a builtin name is
 * registered here, the switch fallthrough is skipped.
 *
 * Migration started 2026-05-18 — track progress in code-quality.md section 4.
 */
const HANDLERS = new Map<string, BuiltinHandler>();

function handlePoint(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, toGeoValue, line, label } = ctx;
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`point()\` attend 2 arguments (abscisse, ordonnée), ${pos.length} reçu(s).`,
				forms: [
					{ syntax: 'point(x, y)', description: 'point libre aux coordonnées `(x, y)`' },
					{
						syntax: 'point(s.value, 0)',
						description: 'point dont l’abscisse suit la valeur du slider `s`'
					}
				]
			},
			line
		);
	const xParam = toScalarParam(pos[0], toGeoValue, line);
	const yParam = toScalarParam(pos[1], toGeoValue, line);
	if (isScalarRef(xParam) || isScalarRef(yParam)) {
		const id = figure.createComputedPoint(xParam, yParam, { label });
		return { figureId: id, symbolType: 'point' };
	}
	const id = figure.createFreePoint({ x: xParam, y: yParam }, { label });
	return { figureId: id, symbolType: 'point' };
}
HANDLERS.set('point', handlePoint);

const INTERSECTION_FORMS = [
	{
		syntax: 'intersection(d1, d2)',
		description: 'intersection de deux droites, segments ou demi-droites'
	},
	{
		syntax: 'intersection(d, c, k)',
		description: 'intersection droite × cercle, `k = 1` ou `2`'
	},
	{
		syntax: 'intersection(c1, c2, k)',
		description: 'intersection cercle × cercle, `k = 1` ou `2`'
	},
	{
		syntax: 'intersection(d, q, k)',
		description: 'intersection droite × conique (`k = 1` ou `2`)'
	},
	{
		syntax: 'intersection(q1, q2, k)',
		description: 'intersection conique × conique (`k = 1..4`)'
	},
	{
		syntax: 'intersection(d, f, k)',
		description: 'intersection droite × fonction `y = f(x)`'
	},
	{
		syntax: 'intersection(f1, f2, k)',
		description: 'intersection de deux fonctions `y = f(x)` et `y = g(x)`'
	},
	{
		syntax: 'intersection(c1, c2, k)',
		description: 'courbes paramétriques (k = numéro de solution)'
	}
];

function handleIntersection(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length < 2 || pos.length > 3)
		throw new DslRuntimeError(
			{
				summary: `\`intersection()\` attend 2 ou 3 arguments, ${pos.length} reçu(s).`,
				hint: 'Le 3ᵉ argument `k` choisit la solution quand plusieurs sont possibles (cercle × cercle, conique, fonction).',
				forms: INTERSECTION_FORMS
			},
			line
		);

	const arg1 = pos[0];
	const arg2 = pos[1];
	const id1 = requireElement(arg1, 'arg1', line);
	const id2 = requireElement(arg2, 'arg2', line);
	const type1 = arg1.type === 'element' ? arg1.elementType : undefined;
	const type2 = arg2.type === 'element' ? arg2.elementType : undefined;

	const isLineType = (t: string | undefined) =>
		t === 'droite' || t === 'segment' || t === 'demidroite';
	const isCircleType = (t: string | undefined) => t === 'cercle';
	const isCourbeType = (t: string | undefined) => t === 'courbe';

	const isQuadraticCourbe = (figureId: string): boolean => {
		const el = figure.getElementById(figureId);
		return !!el && el.type === 'quadraticCurve';
	};

	const isQuad1 = isCourbeType(type1) && isQuadraticCourbe(id1);
	const isQuad2 = isCourbeType(type2) && isQuadraticCourbe(id2);

	const isFunctionCourbe = (figureId: string): boolean => {
		const el = figure.getElementById(figureId);
		return !!el && el.type === 'function';
	};
	const isFunc1 = isCourbeType(type1) && isFunctionCourbe(id1);
	const isFunc2 = isCourbeType(type2) && isFunctionCourbe(id2);

	const isParametricCourbe = (figureId: string): boolean => {
		const el = figure.getElementById(figureId);
		return !!el && el.type === 'parametricCurve';
	};
	const isParam1 = isCourbeType(type1) && isParametricCourbe(id1);
	const isParam2 = isCourbeType(type2) && isParametricCourbe(id2);

	// Parametric × parametric branch (V1 scope: includes polar curves).
	if (isParam1 && isParam2) {
		if (id1 === id2) {
			throw new DslRuntimeError(
				{
					summary: '`intersection()` : les deux courbes doivent être distinctes.',
					hint: 'Pour les points fixes d’une courbe paramétrique, utilisez `point_sur(c, t)` plutôt qu’une intersection avec elle-même.'
				},
				line
			);
		}
		let kVal = 1;
		if (pos.length === 3) {
			const kRaw = requireNumber(pos[2], 'k', line);
			if (!Number.isInteger(kRaw) || kRaw < 1) {
				throw new DslRuntimeError(
					{
						summary: '`intersection()` : `k` doit être un entier ≥ 1.',
						hint: '`k` désigne la k-ième solution. Exemple : `intersection(c1, c2, 2)` pour la 2ᵉ intersection.'
					},
					line
				);
			}
			kVal = kRaw;
		}
		const ptId = figure.createIntersectionParametric(id1, id2, kVal, { label });
		return { figureId: ptId, symbolType: 'point' };
	}

	// V2 (B3) + V3: parametric × {droite, cercle, fonction, segment, demidroite}.
	const isDroiteOnly = (t: string | undefined) => t === 'droite';
	const isSegmentOnly = (t: string | undefined) => t === 'segment';
	const isRayOnly = (t: string | undefined) => t === 'demidroite';
	if (isParam1 || isParam2) {
		const paramId = isParam1 ? id1 : id2;
		const otherType = isParam1 ? type2 : type1;
		const otherId = isParam1 ? id2 : id1;
		const otherIsFunc = isParam1 ? isFunc2 : isFunc1;

		const otherIsDroite = isDroiteOnly(otherType);
		const otherIsCircle = isCircleType(otherType);
		const otherIsSegment = isSegmentOnly(otherType);
		const otherIsRay = isRayOnly(otherType);

		if (otherIsDroite || otherIsCircle || otherIsFunc || otherIsSegment || otherIsRay) {
			let kVal = 1;
			if (pos.length === 3) {
				const kRaw = requireNumber(pos[2], 'k', line);
				if (!Number.isInteger(kRaw) || kRaw < 1) {
					throw new DslRuntimeError(
						{
							summary: '`intersection()` : `k` doit être un entier ≥ 1.',
							hint: '`k` désigne la k-ième solution.'
						},
						line
					);
				}
				kVal = kRaw;
			}
			if (otherIsDroite) {
				const ptId = figure.createIntersectionParametricLine(paramId, otherId, kVal, { label });
				return { figureId: ptId, symbolType: 'point' };
			}
			if (otherIsCircle) {
				const ptId = figure.createIntersectionParametricCircle(paramId, otherId, kVal, { label });
				return { figureId: ptId, symbolType: 'point' };
			}
			if (otherIsSegment) {
				const ptId = figure.createIntersectionParametricSegment(paramId, otherId, kVal, {
					label
				});
				return { figureId: ptId, symbolType: 'point' };
			}
			if (otherIsRay) {
				const ptId = figure.createIntersectionParametricRay(paramId, otherId, kVal, { label });
				return { figureId: ptId, symbolType: 'point' };
			}
			// otherIsFunc
			const ptId = figure.createIntersectionParametricFunction(paramId, otherId, kVal, { label });
			return { figureId: ptId, symbolType: 'point' };
		}
	}

	// Reject implicit curves (not functions, not conics, not parametric)
	if (isCourbeType(type1) && !isQuad1 && !isFunc1 && !isParam1) {
		throw new DslRuntimeError(
			{
				summary: '`intersection()` : les courbes implicites ne sont pas supportées.',
				hint: 'Convertissez la courbe en forme paramétrique ou en fonction `y = f(x)` si possible.'
			},
			line
		);
	}
	if (isCourbeType(type2) && !isQuad2 && !isFunc2 && !isParam2) {
		throw new DslRuntimeError(
			{
				summary: '`intersection()` : les courbes implicites ne sont pas supportées.',
				hint: 'Convertissez la courbe en forme paramétrique ou en fonction `y = f(x)` si possible.'
			},
			line
		);
	}

	// Reject mixed parametric × non-parametric combos
	if (isParam1 || isParam2) {
		throw new DslRuntimeError(
			{
				summary:
					'`intersection()` : combinaison non supportée entre courbe paramétrique et cet autre type.',
				hint: 'Les courbes paramétriques peuvent être croisées avec : autres paramétriques, droites, segments, demi-droites, cercles, fonctions `y = f(x)`.'
			},
			line
		);
	}

	// Reject unsupported combos: function + circle/conic
	if ((isFunc1 && isCircleType(type2)) || (isCircleType(type1) && isFunc2)) {
		throw new DslRuntimeError(
			{
				summary: '`intersection()` : combinaison fonction × cercle non supportée.',
				hint: 'Convertissez le cercle en courbe paramétrique : `c = courbe("(r*cos(t); r*sin(t))", t_min=0, t_max=2*pi)`.'
			},
			line
		);
	}
	if ((isFunc1 && isQuad2) || (isQuad1 && isFunc2)) {
		throw new DslRuntimeError(
			{
				summary: '`intersection()` : combinaison fonction × conique non supportée.',
				hint: 'Convertissez la conique en courbe paramétrique pour utiliser cette intersection.'
			},
			line
		);
	}

	const isQQ =
		(isQuad1 && isQuad2) || (isQuad1 && isCircleType(type2)) || (isCircleType(type1) && isQuad2);
	const isLF = (isLineType(type1) && isFunc2) || (isFunc1 && isLineType(type2));
	const isFF = isFunc1 && isFunc2;

	let maxIndex: number | null;
	if (isLF || isFF) {
		maxIndex = null;
	} else if (isQQ) {
		maxIndex = 4;
	} else {
		maxIndex = 2;
	}

	let dslIndex = 1;
	if (pos.length === 3) {
		dslIndex = requireNumber(pos[2], 'index', line);
		if (!Number.isInteger(dslIndex) || dslIndex < 1)
			throw new DslRuntimeError(
				{
					summary: '`intersection()` : l’index doit être un entier ≥ 1.',
					hint: 'L’index choisit laquelle des solutions retourner (1, 2, …).'
				},
				line
			);
		if (maxIndex !== null && dslIndex > maxIndex)
			throw new DslRuntimeError(
				{
					summary: `\`intersection()\` : l’index doit être entre 1 et ${maxIndex}.`,
					hint: `Cette combinaison admet au plus ${maxIndex} point(s) d’intersection.`
				},
				line
			);
	}

	if (isLineType(type1) && isLineType(type2)) {
		const id = figure.createIntersectionLL(id1, id2, { label });
		return { figureId: id, symbolType: 'point' };
	}
	if (isLineType(type1) && isCircleType(type2)) {
		const id = figure.createIntersectionLC(id1, id2, (dslIndex - 1) as 0 | 1, { label });
		return { figureId: id, symbolType: 'point' };
	}
	if (isCircleType(type1) && isLineType(type2)) {
		const id = figure.createIntersectionLC(id2, id1, (dslIndex - 1) as 0 | 1, { label });
		return { figureId: id, symbolType: 'point' };
	}
	if (isCircleType(type1) && isCircleType(type2)) {
		const id = figure.createIntersectionCC(id1, id2, (dslIndex - 1) as 0 | 1, { label });
		return { figureId: id, symbolType: 'point' };
	}
	if (isLineType(type1) && isQuad2) {
		const id = figure.createIntersectionLQ(id1, id2, (dslIndex - 1) as 0 | 1, { label });
		return { figureId: id, symbolType: 'point' };
	}
	if (isQuad1 && isLineType(type2)) {
		const id = figure.createIntersectionLQ(id2, id1, (dslIndex - 1) as 0 | 1, { label });
		return { figureId: id, symbolType: 'point' };
	}
	if (isQQ) {
		const id = figure.createIntersectionQQ(id1, id2, (dslIndex - 1) as 0 | 1 | 2 | 3, { label });
		return { figureId: id, symbolType: 'point' };
	}
	if (isLineType(type1) && isFunc2) {
		const id = figure.createIntersectionLF(
			id1,
			id2,
			dslIndex - 1,
			FUNCTION_SEARCH_XMIN,
			FUNCTION_SEARCH_XMAX,
			{ label }
		);
		return { figureId: id, symbolType: 'point' };
	}
	if (isFunc1 && isLineType(type2)) {
		const id = figure.createIntersectionLF(
			id2,
			id1,
			dslIndex - 1,
			FUNCTION_SEARCH_XMIN,
			FUNCTION_SEARCH_XMAX,
			{ label }
		);
		return { figureId: id, symbolType: 'point' };
	}
	if (isFF) {
		const id = figure.createIntersectionFF(
			id1,
			id2,
			dslIndex - 1,
			FUNCTION_SEARCH_XMIN,
			FUNCTION_SEARCH_XMAX,
			{ label }
		);
		return { figureId: id, symbolType: 'point' };
	}
	throw new DslRuntimeError(
		{
			summary: '`intersection()` : combinaison de types non supportée.',
			forms: INTERSECTION_FORMS
		},
		line
	);
}
HANDLERS.set('intersection', handleIntersection);

const IMAGE_FORMS = [
	{
		syntax: 'image("url", x, y, largeur=w)',
		description: 'image positionnée au point `(x, y)`, largeur `w`'
	},
	{
		syntax: 'image("url", A, largeur=w)',
		description: 'image ancrée au point existant `A`'
	},
	{
		syntax: 'image("url", A, B, largeur=w)',
		description: 'image entre deux points `A` et `B`'
	}
];

function handleImage(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label } = ctx;
	if (pos.length < 2)
		throw new DslRuntimeError(
			{
				summary: `\`image()\` attend au moins 2 arguments, ${pos.length} reçu(s).`,
				forms: IMAGE_FORMS
			},
			line
		);
	if (pos[0].type !== 'string')
		throw new DslRuntimeError(
			{
				summary: '`image()` : le 1er argument doit être une URL (chaîne entre guillemets).',
				hint: 'Exemple : `image("https://exemple.fr/photo.png", 0, 0, largeur=4)`.'
			},
			line
		);
	const imgUrl = (pos[0] as { type: 'string'; value: string }).value;
	if (!/^https?:\/\/|^\//.test(imgUrl))
		throw new DslRuntimeError(
			{
				summary: '`image()` : l’URL doit commencer par `http://`, `https://` ou `/`.',
				hint: 'Les chemins relatifs ne sont pas acceptés.'
			},
			line
		);

	let imgLayer: 'fond' | 'avant' | undefined;
	if (named.has('couche')) {
		const cv = named.get('couche')!;
		const layerStr = cv.type === 'string' ? cv.value : '';
		if (layerStr !== 'fond' && layerStr !== 'avant')
			throw new DslRuntimeError(
				{
					summary: '`image()` : `couche` doit valoir `"fond"` ou `"avant"`.',
					hint: '`"fond"` place l’image derrière la figure, `"avant"` la place devant.'
				},
				line
			);
		imgLayer = layerStr;
	}

	let imgPositioning: {
		anchorId?: string;
		anchorOffset?: { dx: number; dy: number };
		position?: { x: number; y: number };
		point1Id?: string;
		point2Id?: string;
	};
	let imgWidth: number;
	let imgHeight: number | undefined;

	if (pos.length >= 3 && pos[1].type === 'nombre' && pos[2].type === 'nombre') {
		if (!named.has('largeur'))
			throw new DslRuntimeError(
				{
					summary: '`image()` : l’argument nommé `largeur=...` est obligatoire.',
					hint: 'Exemple : `image("url", 0, 0, largeur=4)`.'
				},
				line
			);
		imgWidth = requireNumber(named.get('largeur')!, 'largeur', line);
		imgHeight = named.has('hauteur')
			? requireNumber(named.get('hauteur')!, 'hauteur', line)
			: undefined;
		const x = (pos[1] as { type: 'nombre'; value: number }).value;
		const y = (pos[2] as { type: 'nombre'; value: number }).value;
		imgPositioning = { position: { x, y } };
	} else if (pos.length >= 3 && pos[1].type === 'element' && pos[2].type === 'element') {
		const point1Id = requireElement(pos[1], 'point1', line);
		const point2Id = requireElement(pos[2], 'point2', line);
		imgWidth = 0;
		imgHeight = undefined;
		imgPositioning = { point1Id, point2Id };
	} else if (pos[1].type === 'element') {
		if (!named.has('largeur'))
			throw new DslRuntimeError(
				{
					summary: '`image()` : l’argument nommé `largeur=...` est obligatoire.',
					hint: 'Exemple : `image("url", 0, 0, largeur=4)`.'
				},
				line
			);
		imgWidth = requireNumber(named.get('largeur')!, 'largeur', line);
		imgHeight = named.has('hauteur')
			? requireNumber(named.get('hauteur')!, 'hauteur', line)
			: undefined;
		const anchorId = requireElement(pos[1], 'anchor', line);
		const dx = named.has('dx')
			? (named.get('dx')! as { type: 'nombre'; value: number }).value
			: undefined;
		const dy = named.has('dy')
			? (named.get('dy')! as { type: 'nombre'; value: number }).value
			: undefined;
		imgPositioning = {
			anchorId,
			anchorOffset: dx !== undefined || dy !== undefined ? { dx: dx ?? 0, dy: dy ?? 0 } : undefined
		};
	} else {
		throw new DslRuntimeError(
			{
				summary: '`image()` : combinaison d’arguments non reconnue.',
				forms: IMAGE_FORMS
			},
			line
		);
	}

	const imgRotation = named.has('rotation')
		? requireNumber(named.get('rotation')!, 'rotation', line)
		: undefined;
	const imgFlipped = named.has('miroir')
		? (() => {
				const v = named.get('miroir')!;
				if (v.type === 'nombre') return v.value !== 0;
				if (v.type === 'string') return v.value === 'vrai';
				return false;
			})()
		: undefined;

	const imgId = figure.createImage(imgUrl, imgWidth, imgHeight, imgPositioning, {
		label,
		layer: imgLayer,
		rotation: imgRotation,
		flipped: imgFlipped || undefined
	});
	return { figureId: imgId, symbolType: 'image' };
}
HANDLERS.set('image', handleImage);

function handleCourbe(
	ctx: BuiltinCtx
): BuiltinResult | BuiltinMultiResult | BuiltinScalarResult | null {
	const { pos, named, figure, toGeoValue, line, label, symbols, angleMode } = ctx;
	const looksPolar = (s: string): boolean => /^\s*r\s*=/.test(s);
	const hasThetaBound = named.has('theta_min') || named.has('theta_max');

	// D5: two positional strings where one looks polar → reject.
	if (
		pos.length === 2 &&
		pos[0].type === 'string' &&
		pos[1].type === 'string' &&
		(looksPolar(pos[0].value) || looksPolar(pos[1].value))
	) {
		throw new DslRuntimeError(
			'courbe(): "r = ..." attendu seul (pas avec une équation x= ou y=)',
			line
		);
	}

	if (pos.length === 1 && pos[0].type === 'string') {
		const polarLike = looksPolar(pos[0].value);
		if (polarLike || hasThetaBound) {
			return createPolarCurveFromEquation(
				pos[0].value,
				named,
				figure,
				line,
				label,
				toGeoValue,
				symbols
			);
		}
		if (named.has('t_min') || named.has('t_max')) {
			throw new DslRuntimeError(
				"courbe(): t_min/t_max ne s'applique qu'à une courbe paramétrique (2 équations)",
				line
			);
		}
		let equationStr = pos[0].value;
		if (named.has('x_min') || named.has('x_max')) {
			const equationAlreadyHasDomain = /\b(sur|avec)\b/.test(equationStr);
			if (equationAlreadyHasDomain) {
				throw new DslRuntimeError(
					'courbe(): combiner x_min/x_max avec un suffixe "sur"/"avec" n\'est pas supporté',
					line
				);
			}
			const xMinStr = named.has('x_min')
				? String(requireNumber(named.get('x_min')!, 'x_min', line))
				: '-infini';
			const xMaxStr = named.has('x_max')
				? String(requireNumber(named.get('x_max')!, 'x_max', line))
				: '+infini';
			equationStr = `${equationStr} sur [${xMinStr} ; ${xMaxStr}]`;
		}
		return createCurveFromEquation(equationStr, figure, line, label, angleMode, symbols);
	}
	if (pos.length === 2 && pos[0].type === 'string' && pos[1].type === 'string') {
		return createParametricCurveFromEquations(
			pos[0].value,
			pos[1].value,
			named,
			figure,
			line,
			label,
			toGeoValue,
			symbols,
			angleMode
		);
	}
	throw new DslRuntimeError(
		{
			summary: '`courbe()` attend 1 ou 2 arguments de type chaîne.',
			forms: [
				{
					syntax: 'courbe("x^2 - 1")',
					description: 'courbe cartésienne `y = f(x)`'
				},
				{
					syntax: 'courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=2*pi)',
					description: 'courbe paramétrique (2 équations)'
				},
				{
					syntax: 'courbe("r = 1 + cos(theta)", theta_min=0, theta_max=2*pi)',
					description: 'courbe polaire `r = f(θ)`'
				},
				{
					syntax: 'courbe("x^2 + y^2 = 1")',
					description: 'courbe implicite (ou conique)'
				}
			]
		},
		line
	);
}
HANDLERS.set('courbe', handleCourbe);

function handleTangente(ctx: BuiltinCtx): BuiltinResult | BuiltinMultiResult {
	const { pos, figure, toGeoValue, line, label, angleMode } = ctx;
	if (pos.length !== 2) {
		throw new DslRuntimeError(
			{
				summary: `\`tangente()\` attend 2 arguments, ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'tangente(f, x0)',
						description: 'tangente à `y = f(x)` au point d’abscisse `x0`'
					},
					{
						syntax: 'tangente(f, P)',
						description: 'tangente à `y = f(x)` au point `P` (situé sur la courbe)'
					},
					{
						syntax: 'tangente(c, t0)',
						description: 'tangente à une courbe paramétrique `c` au paramètre `t0`'
					}
				]
			},
			line
		);
	}
	const tFnId = requireElement(pos[0], 'fonction', line);
	const tFnEl = figure.getElementById(tFnId);

	if (tFnEl && tFnEl.type === 'parametricCurve') {
		const tParam = toScalarParam(pos[1], toGeoValue, line);
		let result;
		try {
			result = figure.createTangentToParametric(tFnId, tParam, { label });
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			throw new DslRuntimeError(`tangente(): ${msg}`, line);
		}
		return {
			elements: [
				{ figureId: result.tangentId, symbolType: 'tangente' },
				{ figureId: result.vectorId, symbolType: 'vecteur' }
			]
		} as BuiltinMultiResult;
	}

	if (tFnEl && tFnEl.type === 'quadraticCurve') {
		if (pos[1].type === 'element') {
			const ptId = pos[1].figureId;
			const ptEl = figure.getElementById(ptId);
			if (!ptEl || ptEl.type !== 'pointOnQuadraticCurve') {
				throw new DslRuntimeError(
					{
						summary:
							'`tangente()` : le 2ᵉ argument doit être un nombre (abscisse) ou un point placé via `point_sur()`.',
						hint: 'Pour un point quelconque sur la courbe, créez-le d’abord avec `point_sur(f, x0)`.'
					},
					line
				);
			}
			const tgId = figure.createTangentToQuadratic(tFnId, { pointOnCurveId: ptId }, { label });
			return { figureId: tgId, symbolType: 'tangente' };
		} else {
			const tRaw = requireNumber(pos[1], 'param', line);
			const conicType = tFnEl.conic.type;
			const t =
				conicType === 'circle' || conicType === 'ellipse' ? toRadians(tRaw, angleMode) : tRaw;
			const tgId = figure.createTangentToQuadratic(tFnId, { t }, { label });
			return { figureId: tgId, symbolType: 'tangente' };
		}
	}

	if (!tFnEl || tFnEl.type !== 'function') {
		throw new DslRuntimeError(
			{
				summary: '`tangente()` : le 1er argument doit être une courbe.',
				hint: 'Acceptées : fonction `y = f(x)`, conique, ou courbe paramétrique.'
			},
			line
		);
	}

	if (pos[1].type === 'element') {
		const ptId = pos[1].figureId;
		const ptEl = figure.getElementById(ptId);
		if (!ptEl || ptEl.type !== 'pointOnCurve') {
			throw new DslRuntimeError(
				'tangente(): le deuxieme argument doit etre un point_sur ou un nombre',
				line
			);
		}
		const tgId = figure.createTangentLine(tFnId, { pointOnCurveId: ptId }, { label });
		return { figureId: tgId, symbolType: 'tangente' };
	} else {
		const x0Val = toGeoValue(pos[1], line);
		const tgId = figure.createTangentLine(tFnId, { x0: x0Val }, { label });
		return { figureId: tgId, symbolType: 'tangente' };
	}
}
HANDLERS.set('tangente', handleTangente);

const POINT_SUR_FORMS = [
	{ syntax: 'point_sur(segment)', description: 'milieu du segment (t=0.5)' },
	{ syntax: 'point_sur(segment, t)', description: 't ∈ [0;1] : 0 = A, 1 = B' },
	{ syntax: 'point_sur(droite, t)', description: 'point paramétré sur la droite (t = abscisse)' },
	{ syntax: 'point_sur(cercle, θ)', description: 'point d’angle θ sur le cercle' },
	{ syntax: 'point_sur(courbe, x0)', description: 'point d’abscisse x0 sur `y = f(x)`' },
	{ syntax: 'point_sur(c, t0)', description: 'point au paramètre t0 sur courbe paramétrique' }
];

function handlePointSur(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, toGeoValue, line, label, angleMode } = ctx;
	if (pos.length < 1 || pos.length > 2) {
		throw new DslRuntimeError(
			{
				summary: `\`point_sur()\` attend 1 ou 2 arguments, ${pos.length} reçu(s).`,
				forms: POINT_SUR_FORMS
			},
			line
		);
	}
	const psId = requireElement(pos[0], 'objet', line);
	const psEl = figure.getElementById(psId);
	if (!psEl) {
		throw new DslRuntimeError(
			{
				summary: '`point_sur()` : objet introuvable.',
				hint: 'Vérifiez que la variable passée en 1er argument a bien été définie au-dessus.'
			},
			line
		);
	}

	if (psEl.type === 'segment') {
		const t = pos.length >= 2 ? requireNumber(pos[1], 't', line) : 0.5;
		const ptId = figure.createPointOnSegment(psId, t, { label });
		return { figureId: ptId, symbolType: 'point' };
	}

	if (psEl.type === 'line' || psEl.type === 'ray') {
		const t = pos.length >= 2 ? requireNumber(pos[1], 't', line) : 0;
		const ptId = figure.createPointOnLine(psId, t, { label });
		return { figureId: ptId, symbolType: 'point' };
	}

	if (
		psEl.type === 'circleByRadius' ||
		psEl.type === 'circleByPoint' ||
		psEl.type === 'circleBy3Points'
	) {
		const angleVal = pos.length >= 2 ? requireNumber(pos[1], 'angle', line) : 0;
		const theta = toRadians(angleVal, angleMode);
		const ptId = figure.createPointOnCircle(psId, theta, { label });
		return { figureId: ptId, symbolType: 'point' };
	}

	if (psEl.type === 'arcByAngles' || psEl.type === 'arcByPoints') {
		const t = pos.length >= 2 ? requireNumber(pos[1], 't', line) : 0.5;
		const ptId = figure.createPointOnArc(psId, t, { label });
		return { figureId: ptId, symbolType: 'point' };
	}

	if (psEl.type === 'quadraticCurve') {
		const tRaw = pos.length >= 2 ? requireNumber(pos[1], 'param', line) : 0;
		const conicType = psEl.conic.type;
		const t = conicType === 'circle' || conicType === 'ellipse' ? toRadians(tRaw, angleMode) : tRaw;
		const ptId = figure.createPointOnQuadraticCurve(psId, t, { label });
		return { figureId: ptId, symbolType: 'point' };
	}

	if (psEl.type === 'function') {
		const x0Val =
			pos.length >= 2 ? toGeoValue(pos[1], line) : toGeoValue({ type: 'nombre', value: 0 }, line);
		const ptId = figure.createPointOnCurve(psId, x0Val, { label });
		return { figureId: ptId, symbolType: 'point' };
	}

	if (psEl.type === 'parametricCurve') {
		if (pos.length < 2) {
			throw new DslRuntimeError(
				'point_sur(): paramètre t requis pour une courbe paramétrique',
				line
			);
		}
		const tParam = toScalarParam(pos[1], toGeoValue, line);
		const ptId = figure.createPointOnParametricCurve(psId, tParam, { label });
		return { figureId: ptId, symbolType: 'point' };
	}

	throw new DslRuntimeError(
		{
			summary: '`point_sur()` : type d’objet non supporté pour le 1er argument.',
			hint: 'Acceptés : segment, droite, demi-droite, cercle, arc ou courbe (cartésienne / paramétrique).',
			forms: POINT_SUR_FORMS
		},
		line
	);
}
HANDLERS.set('point_sur', handlePointSur);

function handleCriticalPoints(ctx: BuiltinCtx): BuiltinMultiResult | BuiltinResult {
	const { name, pos, named, figure, line, label } = ctx;
	if (pos.length !== 1) {
		throw new DslRuntimeError(
			{
				summary: `\`${name}()\` attend 1 argument (une fonction), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: `${name}(f)`,
						description:
							name === 'zeros'
								? 'zéros de `f` sur l’intervalle de recherche'
								: name === 'extrema'
									? 'extrema (min/max) de `f`'
									: 'points d’inflexion de `f`'
					}
				]
			},
			line
		);
	}
	const cpFnId = requireElement(pos[0], 'fonction', line);
	const cpFnEl = figure.getElementById(cpFnId);

	if (cpFnEl && cpFnEl.type === 'quadraticCurve' && name === 'zeros') {
		return createQuadraticZeros(cpFnEl, cpFnId, figure, line, label, named);
	}

	if (!cpFnEl || cpFnEl.type !== 'function') {
		throw new DslRuntimeError(
			{
				summary: `\`${name}()\` : le 1er argument doit être une courbe \`y = f(x)\`.`,
				hint: 'Créez la courbe avec `f = courbe("x^2 - 3")` puis passez-la ici.'
			},
			line
		);
	}

	const xMin = FUNCTION_SEARCH_XMIN;
	const xMax = FUNCTION_SEARCH_XMAX;

	let points: import('$lib/mathAST/analysis').CriticalPoint[];

	if (name === 'zeros') {
		points = findCriticalZeros(cpFnEl.expression, cpFnEl.compiledFn, 'x', xMin, xMax);
	} else if (name === 'extrema') {
		points = findCriticalExtrema(
			cpFnEl.expression,
			cpFnEl.derivative,
			cpFnEl.compiledFn,
			cpFnEl.compiledDerivative,
			'x',
			xMin,
			xMax
		);
	} else {
		let d2, cd2;
		try {
			d2 = differentiate(cpFnEl.derivative, { variable: 'x', simplify: true });
			cd2 = compile(d2);
		} catch {
			throw new DslRuntimeError(
				{
					summary: '`inflections()` : impossible de calculer la dérivée seconde.',
					hint: 'La fonction n’est probablement pas dérivable deux fois sur l’intervalle.'
				},
				line
			);
		}
		points = findCriticalInflections(
			cpFnEl.expression,
			cpFnEl.derivative,
			cpFnEl.compiledFn,
			cpFnEl.compiledDerivative,
			cd2,
			'x',
			xMin,
			xMax
		);
	}

	const elements: BuiltinResult[] = points.map((pt, i) => {
		const ptLabel = label ? (points.length > 1 ? `${label}${i + 1}` : label) : undefined;
		const ptId = figure.createPointOnCurve(cpFnId, numeric(pt.xNumeric), {
			draggable: false,
			label: ptLabel
		});
		return { figureId: ptId, symbolType: 'point' as SymbolType };
	});

	return { elements } as BuiltinMultiResult;
}
HANDLERS.set('zeros', handleCriticalPoints);
HANDLERS.set('extrema', handleCriticalPoints);
HANDLERS.set('inflections', handleCriticalPoints);

const TRANSLATION_FORMS = [
	{
		syntax: 'translation(vecteur=u)',
		description: 'transformation par le vecteur `u`'
	},
	{
		syntax: 'translation(vecteur=(A, B))',
		description: 'transformation par le vecteur `AB` (tuple de 2 points)'
	},
	{
		syntax: 'translation(M, vecteur=u)',
		description: 'image du point ou de l’objet `M` par la translation'
	}
];

function handleTranslation(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label } = ctx;
	const vecteurArg = named.get('vecteur');
	if (!vecteurArg)
		throw new DslRuntimeError(
			{
				summary: '`translation()` : l’argument nommé `vecteur=...` est obligatoire.',
				forms: TRANSLATION_FORMS
			},
			line
		);

	if (pos.length === 0) {
		if (vecteurArg.type === 'element' && vecteurArg.elementType === 'vecteur') {
			const id = figure.createTranslationByVector(vecteurArg.figureId!, { label });
			return { figureId: id, symbolType: 'transformation' };
		}
		const tuple = requireTuple(vecteurArg, 'vecteur', line);
		if (tuple.length !== 2)
			throw new DslRuntimeError(
				{
					summary: '`vecteur` doit être un tuple de 2 points `(A, B)`.',
					hint: 'Exemple : `vecteur=(A, B)` pour le vecteur `AB`.'
				},
				line
			);
		const id = figure.createTranslation(
			requireElement(tuple[0], 'vecteur.1', line),
			requireElement(tuple[1], 'vecteur.2', line),
			{ label }
		);
		return { figureId: id, symbolType: 'transformation' };
	}

	const sourceId = requireElement(pos[0], 'source', line);
	const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
	if (sourceEl.elementType === 'point') {
		if (vecteurArg.type === 'element' && vecteurArg.elementType === 'vecteur') {
			const id = figure.createTranslatedPointByVector(sourceId, vecteurArg.figureId!, { label });
			return { figureId: id, symbolType: 'point' };
		}
		const tuple = requireTuple(vecteurArg, 'vecteur', line);
		if (tuple.length !== 2)
			throw new DslRuntimeError(
				{
					summary: '`vecteur` doit être un tuple de 2 points `(A, B)`.',
					hint: 'Exemple : `vecteur=(A, B)` pour le vecteur `AB`.'
				},
				line
			);
		const id = figure.createTranslatedPoint(
			sourceId,
			requireElement(tuple[0], 'vecteur.1', line),
			requireElement(tuple[1], 'vecteur.2', line),
			{ label }
		);
		return { figureId: id, symbolType: 'point' };
	}
	let tId: string;
	if (vecteurArg.type === 'element' && vecteurArg.elementType === 'vecteur') {
		tId = figure.createTranslationByVector(vecteurArg.figureId!);
	} else {
		const tuple = requireTuple(vecteurArg, 'vecteur', line);
		if (tuple.length !== 2)
			throw new DslRuntimeError(
				{
					summary: '`vecteur` doit être un tuple de 2 points `(A, B)`.',
					hint: 'Exemple : `vecteur=(A, B)` pour le vecteur `AB`.'
				},
				line
			);
		tId = figure.createTranslation(
			requireElement(tuple[0], 'vecteur.1', line),
			requireElement(tuple[1], 'vecteur.2', line)
		);
	}
	return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
}
HANDLERS.set('translation', handleTranslation);

function handleTexte(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label, symbols } = ctx;
	if (pos.length < 2)
		throw new DslRuntimeError(
			{
				summary: `\`texte()\` attend au moins 2 arguments, ${pos.length} reçu(s).`,
				forms: [
					{ syntax: 'texte(x, y, "Hello")', description: 'texte positionné en `(x, y)`' },
					{
						syntax: 'texte(P, "label", dx=0.2, dy=-0.1)',
						description: 'texte ancré au point `P` avec décalage'
					}
				]
			},
			line
		);

	let template: string;
	let positioning: {
		anchorId?: string;
		anchorOffset?: { dx: number; dy: number };
		position?: { x: number; y: number };
	};

	if (pos.length >= 3 && pos[0].type === 'nombre' && pos[1].type === 'nombre') {
		const x = (pos[0] as { type: 'nombre'; value: number }).value;
		const y = (pos[1] as { type: 'nombre'; value: number }).value;
		if (pos[2].type !== 'string')
			throw new DslRuntimeError(
				{
					summary: '`texte()` : le 3ᵉ argument doit être une chaîne (le texte à afficher).',
					hint: 'Exemple : `texte(0, 0, "Bonjour")` — n’oubliez pas les guillemets.'
				},
				line
			);
		template = (pos[2] as { type: 'string'; value: string }).value;
		positioning = { position: { x, y } };
	} else if (pos[0].type === 'element') {
		const anchorId = requireElement(pos[0], 'anchor', line);
		if (pos[1].type !== 'string')
			throw new DslRuntimeError(
				{
					summary: '`texte()` : le 2ᵉ argument doit être une chaîne (le texte à afficher).',
					hint: 'Exemple : `texte(P, "label")` — n’oubliez pas les guillemets.'
				},
				line
			);
		template = (pos[1] as { type: 'string'; value: string }).value;
		const dx = named.has('dx')
			? (named.get('dx')! as { type: 'nombre'; value: number }).value
			: undefined;
		const dy = named.has('dy')
			? (named.get('dy')! as { type: 'nombre'; value: number }).value
			: undefined;
		positioning = {
			anchorId,
			anchorOffset: dx !== undefined || dy !== undefined ? { dx: dx ?? 0, dy: dy ?? 0 } : undefined
		};
	} else {
		throw new DslRuntimeError(
			'texte() attend: texte(x, y, "text") ou texte(point, "text", dx=..., dy=...)',
			line
		);
	}

	const scalarRefs: string[] = [];
	template = template.replace(/\{(\w+)/g, (_match, refName: string) => {
		const refSym = symbols?.get(refName);
		if (refSym?.figureId && refSym.type === 'scalar') {
			scalarRefs.push(refSym.figureId);
			return `{${refSym.figureId}`;
		}
		return `{${refName}`;
	});

	const textId = figure.createText(template, scalarRefs, positioning, { label });
	return { figureId: textId, symbolType: 'text' };
}
HANDLERS.set('texte', handleTexte);

function handleRtexte(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label, symbols } = ctx;
	if (pos.length < 2)
		throw new DslRuntimeError(
			{
				summary: `\`rtexte()\` attend au moins 2 arguments, ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'rtexte(x, y, "**gras** _italique_")',
						description: 'texte ubumark positionné en `(x, y)`'
					},
					{
						syntax: 'rtexte(P, "texte", dx=..., dy=...)',
						description: 'texte ubumark ancré au point `P` avec décalage'
					}
				]
			},
			line
		);
	let rtTemplate: string;
	let rtPositioning: {
		anchorId?: string;
		anchorOffset?: { dx: number; dy: number };
		position?: { x: number; y: number };
	};
	if (pos.length >= 3 && pos[0].type === 'nombre' && pos[1].type === 'nombre') {
		const x = (pos[0] as { type: 'nombre'; value: number }).value;
		const y = (pos[1] as { type: 'nombre'; value: number }).value;
		if (pos[2].type !== 'string')
			throw new DslRuntimeError(
				{
					summary: '`rtexte()` : le 3ᵉ argument doit être une chaîne (ubumark).',
					hint: 'Exemple : `rtexte(0, 0, "**gras** _italique_")`.'
				},
				line
			);
		rtTemplate = (pos[2] as { type: 'string'; value: string }).value;
		rtPositioning = { position: { x, y } };
	} else if (pos[0].type === 'element') {
		const anchorId = requireElement(pos[0], 'anchor', line);
		if (pos[1].type !== 'string')
			throw new DslRuntimeError(
				{
					summary: '`rtexte()` : le 2ᵉ argument doit être une chaîne (ubumark).',
					hint: 'Exemple : `rtexte(P, "**important**")`.'
				},
				line
			);
		rtTemplate = (pos[1] as { type: 'string'; value: string }).value;
		const dx = named.has('dx')
			? (named.get('dx')! as { type: 'nombre'; value: number }).value
			: undefined;
		const dy = named.has('dy')
			? (named.get('dy')! as { type: 'nombre'; value: number }).value
			: undefined;
		rtPositioning = {
			anchorId,
			anchorOffset: dx !== undefined || dy !== undefined ? { dx: dx ?? 0, dy: dy ?? 0 } : undefined
		};
	} else {
		throw new DslRuntimeError(
			'rtexte() attend: rtexte(x, y, "ubumark") ou rtexte(point, "ubumark", dx=..., dy=...)',
			line
		);
	}
	const rtScalarRefs: string[] = [];
	rtTemplate = rtTemplate.replace(/\{(\w+)/g, (_match, refName: string) => {
		const refSym = symbols?.get(refName);
		if (refSym?.figureId && refSym.type === 'scalar') {
			rtScalarRefs.push(refSym.figureId);
			return `{${refSym.figureId}`;
		}
		return `{${refName}`;
	});
	const rtId = figure.createRichText(rtTemplate, rtScalarRefs, rtPositioning, { label });
	return { figureId: rtId, symbolType: 'richText' };
}
HANDLERS.set('rtexte', handleRtexte);

function handleLieu(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2) {
		throw new DslRuntimeError(
			{
				summary: `\`lieu()\` attend 2 arguments (traceur, conducteur), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'lieu(M, P)',
						description:
							'trace de `M` lorsque `P` parcourt sa courbe support (P doit être un `point_sur`)'
					}
				]
			},
			line
		);
	}
	const tracerId = requireElement(pos[0], 'traceur', line);
	const driverId = requireElement(pos[1], 'conducteur', line);

	const driverEl = figure.getElementById(driverId);
	if (!driverEl) {
		throw new DslRuntimeError(
			{
				summary: `\`lieu()\` : conducteur \`${driverId}\` introuvable.`,
				hint: 'Vérifiez que la variable passée en 2ᵉ argument a bien été définie.'
			},
			line
		);
	}
	const driverOnPath =
		driverEl.type === 'pointOnCurve' ||
		driverEl.type === 'pointOnQuadraticCurve' ||
		driverEl.type === 'pointOnSegment' ||
		driverEl.type === 'pointOnLine' ||
		driverEl.type === 'pointOnCircle' ||
		driverEl.type === 'pointOnArc' ||
		driverEl.type === 'pointOnParametricCurve';
	if (!driverOnPath) {
		throw new DslRuntimeError(
			{
				summary: '`lieu()` : le conducteur doit être un point placé sur une courbe.',
				hint: 'Créez-le avec `P = point_sur(courbe, t)` puis utilisez `P` comme conducteur.'
			},
			line
		);
	}

	const tracerEl = figure.getElementById(tracerId);
	if (!tracerEl) {
		throw new DslRuntimeError(
			{
				summary: `\`lieu()\` : traceur \`${tracerId}\` introuvable.`,
				hint: 'Vérifiez que la variable passée en 1er argument a bien été définie.'
			},
			line
		);
	}

	const visited = new Set<string>();
	const queue = [tracerId];
	let dependsOnDriver = false;
	while (queue.length > 0) {
		const id = queue.shift()!;
		if (id === driverId) {
			dependsOnDriver = true;
			break;
		}
		if (visited.has(id)) continue;
		visited.add(id);
		const el = figure.getElementById(id);
		if (el) {
			for (const pid of el.dependsOn) {
				queue.push(pid);
			}
		}
	}
	if (!dependsOnDriver) {
		throw new DslRuntimeError(`lieu(): le traceur ne depend pas du conducteur`, line);
	}

	const locId = figure.createLocus(driverId, tracerId, { label });
	return { figureId: locId, symbolType: 'lieu' as SymbolType };
}
HANDLERS.set('lieu', handleLieu);

function twoPointsArityError(
	name: string,
	noun: string,
	received: number,
	form: { syntax: string; description: string },
	line: number
): DslRuntimeError {
	return new DslRuntimeError(
		{
			summary: `\`${name}()\` attend 2 points (${noun}), ${received} argument(s) reçu(s).`,
			forms: [form]
		},
		line
	);
}

function handleMilieu(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2)
		throw twoPointsArityError(
			'milieu',
			'A, B',
			pos.length,
			{ syntax: 'milieu(A, B)', description: 'milieu du segment `[AB]`' },
			line
		);
	const id = figure.createMidpoint(
		requireElement(pos[0], 'arg1', line),
		requireElement(pos[1], 'arg2', line),
		{ label }
	);
	return { figureId: id, symbolType: 'point' };
}
HANDLERS.set('milieu', handleMilieu);

function handleSegment(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2)
		throw twoPointsArityError(
			'segment',
			'extrémités A, B',
			pos.length,
			{ syntax: 'segment(A, B)', description: 'segment `[AB]` reliant les deux points' },
			line
		);
	const id = figure.createSegment(
		requireElement(pos[0], 'arg1', line),
		requireElement(pos[1], 'arg2', line),
		{ label }
	);
	return { figureId: id, symbolType: 'segment' };
}
HANDLERS.set('segment', handleSegment);

function handleDroite(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2)
		throw twoPointsArityError(
			'droite',
			'A, B',
			pos.length,
			{ syntax: 'droite(A, B)', description: 'droite `(AB)` passant par les deux points' },
			line
		);
	const id = figure.createLine(
		requireElement(pos[0], 'arg1', line),
		requireElement(pos[1], 'arg2', line),
		{ label }
	);
	return { figureId: id, symbolType: 'droite' };
}
HANDLERS.set('droite', handleDroite);

function handleDemidroite(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2)
		throw twoPointsArityError(
			'demidroite',
			'origine, direction',
			pos.length,
			{
				syntax: 'demidroite(O, A)',
				description: "demi-droite d'origine `O` dans la direction de `A`"
			},
			line
		);
	const id = figure.createRay(
		requireElement(pos[0], 'arg1', line),
		requireElement(pos[1], 'arg2', line),
		{ label }
	);
	return { figureId: id, symbolType: 'demidroite' };
}
HANDLERS.set('demidroite', handleDemidroite);

const VECTEUR_FORMS = [
	{
		syntax: 'vecteur(A, B)',
		description: 'vecteur lié de l’origine `A` vers `B`'
	},
	{
		syntax: 'vecteur(dx, dy)',
		description: 'vecteur libre de composantes `(dx, dy)`'
	},
	{
		syntax: 'vecteur(dx, dy, ancre=(x, y))',
		description: 'vecteur libre ancré au point `(x, y)`'
	}
];

function handleVecteur(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, toGeoValue, line, label } = ctx;
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`vecteur()\` attend 2 arguments positionnels, ${pos.length} reçu(s).`,
				forms: VECTEUR_FORMS
			},
			line
		);
	const arg0 = pos[0];
	const arg1 = pos[1];
	const isNumericLike = (a: ResolvedValue) => a.type === 'nombre' || a.type === 'geoValue';
	if (isNumericLike(arg0) && isNumericLike(arg1)) {
		const dx = toGeoValue(arg0, line);
		const dy = toGeoValue(arg1, line);
		let anchor: { x: GeoValue; y: GeoValue } | undefined;
		if (named.has('ancre')) {
			const tuple = requireTuple(named.get('ancre')!, 'ancre', line);
			if (tuple.length !== 2)
				throw new DslRuntimeError(
					{
						summary: '`ancre` doit être un tuple de 2 nombres `(x, y)`.',
						hint: 'Exemple : `vecteur(2, 3, ancre=(0, 0))`.'
					},
					line
				);
			anchor = { x: toGeoValue(tuple[0], line), y: toGeoValue(tuple[1], line) };
		}
		const id = figure.createFreeVector(dx, dy, anchor, { label });
		return { figureId: id, symbolType: 'vecteur' };
	} else {
		const id = figure.createVectorByPoints(
			requireElement(arg0, 'arg1', line),
			requireElement(arg1, 'arg2', line),
			{ label }
		);
		return { figureId: id, symbolType: 'vecteur' };
	}
}
HANDLERS.set('vecteur', handleVecteur);

function handleNorme(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 1)
		throw new DslRuntimeError(
			{
				summary: `\`norme()\` attend 1 argument (un vecteur), ${pos.length} reçu(s).`,
				forms: [{ syntax: 'norme(u)', description: 'norme `‖u‖` du vecteur `u`' }]
			},
			line
		);
	const nVecId = requireElement(pos[0], 'vecteur', line);
	const id = figure.createScalarNorme(nVecId, { label });
	return { figureId: id, symbolType: 'scalar' };
}
HANDLERS.set('norme', handleNorme);

function handleProduitScalaire(ctx: BuiltinCtx): BuiltinScalarResult {
	const { pos, figure, line } = ctx;
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`produit_scalaire()\` attend 2 arguments (deux vecteurs), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'produit_scalaire(u, v)',
						description: 'produit scalaire `u · v` des deux vecteurs'
					}
				]
			},
			line
		);
	const psV1 = requireElement(pos[0], 'u', line);
	const psV2 = requireElement(pos[1], 'v', line);
	const psC1 = figure.getVectorComponents(psV1);
	const psC2 = figure.getVectorComponents(psV2);
	if (!psC1 || !psC2)
		throw new DslRuntimeError(
			{
				summary: '`produit_scalaire()` : impossible de résoudre les composantes des vecteurs.',
				hint: 'Vérifiez que les deux arguments sont bien des vecteurs définis.'
			},
			line
		);
	const dot =
		geoToNumber(psC1.dx) * geoToNumber(psC2.dx) + geoToNumber(psC1.dy) * geoToNumber(psC2.dy);
	return { scalarValue: dot };
}
HANDLERS.set('produit_scalaire', handleProduitScalaire);

function handleAngleVecteurs(ctx: BuiltinCtx): BuiltinScalarResult {
	const { pos, figure, line, angleMode } = ctx;
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`angle_vecteurs()\` attend 2 arguments (deux vecteurs), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'angle_vecteurs(u, v)',
						description: 'angle orienté `(u, v)` entre les deux vecteurs'
					}
				]
			},
			line
		);
	const avV1 = requireElement(pos[0], 'u', line);
	const avV2 = requireElement(pos[1], 'v', line);
	const avC1 = figure.getVectorComponents(avV1);
	const avC2 = figure.getVectorComponents(avV2);
	if (!avC1 || !avC2)
		throw new DslRuntimeError(
			{
				summary: '`angle_vecteurs()` : impossible de résoudre les composantes des vecteurs.',
				hint: 'Vérifiez que les deux arguments sont bien des vecteurs définis.'
			},
			line
		);
	const ax1 = geoToNumber(avC1.dx),
		ay1 = geoToNumber(avC1.dy);
	const ax2 = geoToNumber(avC2.dx),
		ay2 = geoToNumber(avC2.dy);
	const dotProd = ax1 * ax2 + ay1 * ay2;
	const len1 = Math.sqrt(ax1 * ax1 + ay1 * ay1);
	const len2 = Math.sqrt(ax2 * ax2 + ay2 * ay2);
	if (len1 < 1e-15 || len2 < 1e-15)
		throw new DslRuntimeError(
			{
				summary: '`angle_vecteurs()` : l’un des vecteurs est nul, l’angle n’est pas défini.',
				hint: 'Vérifiez que les deux vecteurs ont des composantes non nulles.'
			},
			line
		);
	const cosA = Math.max(-1, Math.min(1, dotProd / (len1 * len2)));
	const angleRad = Math.acos(cosA);
	return {
		scalarValue: angleMode === 'deg' ? (angleRad * 180) / Math.PI : angleRad
	};
}
HANDLERS.set('angle_vecteurs', handleAngleVecteurs);

const CERCLE_FORMS = [
	{ syntax: 'cercle(centre, rayon=r)', description: 'cercle de centre `centre` et de rayon `r`' },
	{
		syntax: 'cercle(centre, passant=P)',
		description: 'cercle de centre `centre` passant par le point `P`'
	},
	{ syntax: 'cercle(A, B, C)', description: 'cercle circonscrit aux 3 points A, B, C' }
];

function handleCercle(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, toGeoValue, line, label } = ctx;
	if (pos.length === 3) {
		const p1Id = requireElement(pos[0], 'point1', line);
		const p2Id = requireElement(pos[1], 'point2', line);
		const p3Id = requireElement(pos[2], 'point3', line);
		const pp1 = figure.getPosition(p1Id);
		const pp2 = figure.getPosition(p2Id);
		const pp3 = figure.getPosition(p3Id);
		if (pp1 && pp2 && pp3) {
			const ax = geoToNumber(pp1.x),
				ay = geoToNumber(pp1.y);
			const bx = geoToNumber(pp2.x),
				by = geoToNumber(pp2.y);
			const cx = geoToNumber(pp3.x),
				cy = geoToNumber(pp3.y);
			const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
			if (Math.abs(D) < 1e-12)
				throw new DslRuntimeError(
					{
						summary: 'Les 3 points sont alignés, le cercle circonscrit n’existe pas.',
						hint: 'Vérifiez que les trois points ne sont pas tous sur la même droite.'
					},
					line
				);
		}
		const id = figure.createCircleBy3Points(p1Id, p2Id, p3Id, { label });
		return { figureId: id, symbolType: 'cercle' };
	}
	if (pos.length === 2) {
		throw new DslRuntimeError(
			{
				summary: '`cercle()` ne peut pas être appelé avec 2 arguments positionnels.',
				hint: 'Pour un cercle de centre `A` passant par `B`, utilisez la syntaxe nommée : `cercle(A, passant=B)`.',
				forms: CERCLE_FORMS
			},
			line
		);
	}
	if (pos.length === 0) {
		throw new DslRuntimeError(
			{
				summary: '`cercle()` a été appelé sans argument.',
				forms: CERCLE_FORMS
			},
			line
		);
	}
	if (pos.length !== 1) {
		throw new DslRuntimeError(
			{
				summary: `\`cercle()\` a reçu ${pos.length} arguments positionnels, attendu 1 (centre) ou 3 (A, B, C).`,
				forms: CERCLE_FORMS
			},
			line
		);
	}
	const centerId = requireElement(pos[0], 'centre', line);
	if (named.has('rayon')) {
		const radius = toScalarParam(named.get('rayon')!, toGeoValue, line);
		const id = figure.createCircleByRadius(centerId, radius, { label });
		return { figureId: id, symbolType: 'cercle' };
	}
	if (named.has('passant')) {
		const edgeId = requireElement(named.get('passant')!, 'passant', line);
		const id = figure.createCircleByPoint(centerId, edgeId, { label });
		return { figureId: id, symbolType: 'cercle' };
	}
	const namedKeys = [...named.keys()];
	const hint =
		namedKeys.length > 0
			? `Argument nommé reçu : ${namedKeys.map((k) => `\`${k}\``).join(', ')}. Seuls \`rayon\` et \`passant\` sont reconnus.`
			: 'Un centre seul ne suffit pas à définir un cercle : précisez le rayon ou un point sur le cercle.';
	throw new DslRuntimeError(
		{
			summary: '`cercle()` : il manque un rayon ou un point.',
			hint,
			forms: CERCLE_FORMS
		},
		line
	);
}
HANDLERS.set('cercle', handleCercle);

function handlePolygone(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length < 3)
		throw new DslRuntimeError(
			{
				summary: `\`polygone()\` attend au moins 3 sommets, ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'polygone(A, B, C, ...)',
						description: 'polygone défini par la liste ordonnée de ses sommets'
					}
				]
			},
			line
		);
	const vertexIds = pos.map((p, i) => requireElement(p, `sommet ${i + 1}`, line));
	const id = figure.createPolygon(vertexIds as [string, string, string, ...string[]], { label });
	return { figureId: id, symbolType: 'polygone' };
}
HANDLERS.set('polygone', handlePolygone);

function handleSymetrie(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label } = ctx;
	if (pos.length === 0) {
		if (named.has('centre')) {
			const centerId = requireElement(named.get('centre')!, 'centre', line);
			const id = figure.createReflection(centerId, { label });
			return { figureId: id, symbolType: 'transformation' };
		}
		if (named.has('axe')) {
			const { p1, p2 } = resolveAxeArg(named.get('axe')!, figure, line);
			const id = figure.createReflectionOverLine(p1, p2, { label });
			return { figureId: id, symbolType: 'transformation' };
		}
		throw new DslRuntimeError(
			{
				summary: '`symetrie()` : il faut préciser un `centre` ou un `axe`.',
				forms: [
					{
						syntax: 'symetrie(centre=O)',
						description: 'transformation : symétrie centrale de centre `O`'
					},
					{
						syntax: 'symetrie(axe=d)',
						description: 'transformation : symétrie axiale par rapport à la droite `d`'
					},
					{
						syntax: 'symetrie(M, centre=O)',
						description: 'image directe de `M` par la symétrie centrale'
					},
					{
						syntax: 'symetrie(M, axe=d)',
						description: 'image directe de `M` par la symétrie axiale'
					}
				]
			},
			line
		);
	}
	const sourceId = requireElement(pos[0], 'source', line);
	const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
	if (named.has('centre')) {
		const centerId = requireElement(named.get('centre')!, 'centre', line);
		if (sourceEl.elementType === 'point') {
			const id = figure.createReflectedPoint(sourceId, centerId, { label });
			return { figureId: id, symbolType: 'point' };
		}
		const tId = figure.createReflection(centerId);
		return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
	}
	if (named.has('axe')) {
		const { p1, p2 } = resolveAxeArg(named.get('axe')!, figure, line);
		if (sourceEl.elementType === 'point') {
			const id = figure.createReflectedOverLine(sourceId, p1, p2, { label });
			return { figureId: id, symbolType: 'point' };
		}
		const tId = figure.createReflectionOverLine(p1, p2);
		return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
	}
	throw new DslRuntimeError(
		{
			summary: '`symetrie()` : il faut préciser `centre=...` ou `axe=...`.',
			hint: 'Exemples : `symetrie(M, centre=O)` ou `symetrie(M, axe=d)`.'
		},
		line
	);
}
HANDLERS.set('symetrie', handleSymetrie);

function handleRotation(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label, angleMode } = ctx;
	const centerId = requireElement(
		named.get('centre') ?? { type: 'nombre', value: 0 },
		'centre',
		line
	);
	const angleArg = named.get('angle') ?? { type: 'nombre' as const, value: 0 };
	let angleRad: ScalarParam;
	if (angleArg.type === 'element' && angleArg.elementType === 'scalar') {
		const depId = angleArg.figureId;
		if (angleMode === 'deg') {
			angleRad = {
				scalarRef: figure.createScalarExpression(
					(sv) => ((sv.get(depId) ?? 0) * Math.PI) / 180,
					[depId]
				)
			};
		} else {
			angleRad = { scalarRef: depId };
		}
	} else {
		const angleVal = requireNumber(angleArg, 'angle', line);
		angleRad = { kind: 'numeric', value: toRadians(angleVal, angleMode) };
	}
	if (pos.length === 0) {
		const id = figure.createRotation(centerId, angleRad, { label });
		return { figureId: id, symbolType: 'transformation' };
	}
	const sourceId = requireElement(pos[0], 'source', line);
	const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
	if (sourceEl.elementType === 'point') {
		const id = figure.createRotatedPoint(sourceId, centerId, angleRad, { label });
		return { figureId: id, symbolType: 'point' };
	}
	const tId = figure.createRotation(centerId, angleRad);
	return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
}
HANDLERS.set('rotation', handleRotation);

function handleHomothetie(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, toGeoValue, line, label } = ctx;
	const centerId = requireElement(
		named.get('centre') ?? { type: 'nombre', value: 0 },
		'centre',
		line
	);
	const factor = toScalarParam(
		named.get('rapport') ?? { type: 'nombre', value: 1 },
		toGeoValue,
		line
	);
	if (pos.length === 0) {
		const id = figure.createHomothety(centerId, factor, { label });
		return { figureId: id, symbolType: 'transformation' };
	}
	const sourceId = requireElement(pos[0], 'source', line);
	const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
	if (sourceEl.elementType === 'point') {
		const id = figure.createDilatedPoint(sourceId, centerId, factor, { label });
		return { figureId: id, symbolType: 'point' };
	}
	const tId = figure.createHomothety(centerId, factor);
	return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
}
HANDLERS.set('homothetie', handleHomothetie);

function handleProjection(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label } = ctx;
	const droiteArg = named.get('axe');
	if (!droiteArg)
		throw new DslRuntimeError(
			{
				summary: '`projection()` : l’argument nommé `axe=...` est obligatoire.',
				forms: [
					{
						syntax: 'projection(axe=d)',
						description: 'projection orthogonale sur la droite `d`'
					},
					{
						syntax: 'projection(M, axe=d)',
						description: 'image directe de `M` par la projection sur `d`'
					}
				]
			},
			line
		);
	const { p1, p2 } = resolveAxeArg(droiteArg, figure, line);
	if (pos.length === 0) {
		const id = figure.createProjection(p1, p2, { label });
		return { figureId: id, symbolType: 'transformation' };
	}
	const sourceId = requireElement(pos[0], 'source', line);
	const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
	if (sourceEl.elementType === 'point') {
		const id = figure.createProjectedPoint(sourceId, p1, p2, { label });
		return { figureId: id, symbolType: 'point' };
	}
	const tId = figure.createProjection(p1, p2);
	return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
}
HANDLERS.set('projection', handleProjection);

function handleInversion(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, toGeoValue, line, label } = ctx;
	const centerId = requireElement(
		named.get('centre') ?? { type: 'nombre', value: 0 },
		'centre',
		line
	);
	const radius = toGeoValue(named.get('rayon') ?? { type: 'nombre', value: 1 }, line);
	if (pos.length === 0) {
		const id = figure.createInversion(centerId, radius, { label });
		return { figureId: id, symbolType: 'transformation' };
	}
	const sourceId = requireElement(pos[0], 'source', line);
	const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
	if (sourceEl.elementType === 'point') {
		const id = figure.createInvertedPoint(sourceId, centerId, radius, { label });
		return { figureId: id, symbolType: 'point' };
	}
	const tId = figure.createInversion(centerId, radius);
	return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
}
HANDLERS.set('inversion', handleInversion);

function handleAffinite(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, toGeoValue, line, label } = ctx;
	const axeArg = named.get('axe');
	if (!axeArg)
		throw new DslRuntimeError(
			{
				summary: '`affinite()` : l’argument nommé `axe=...` est obligatoire.',
				forms: [
					{
						syntax: 'affinite(axe=d, rapport=k)',
						description: 'transformation : affinité orthogonale d’axe `d` et de rapport `k`'
					},
					{
						syntax: 'affinite(M, axe=d, rapport=k)',
						description: 'image directe de `M` par l’affinité'
					}
				]
			},
			line
		);
	const { p1, p2 } = resolveAxeArg(axeArg, figure, line);
	const factor = toGeoValue(named.get('rapport') ?? { type: 'nombre', value: 1 }, line);
	if (pos.length === 0) {
		const id = figure.createAffinity(p1, p2, factor, { label });
		return { figureId: id, symbolType: 'transformation' };
	}
	const sourceId = requireElement(pos[0], 'source', line);
	const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
	if (sourceEl.elementType === 'point') {
		const id = figure.createAffinityPoint(sourceId, p1, p2, factor, { label });
		return { figureId: id, symbolType: 'point' };
	}
	const tId = figure.createAffinity(p1, p2, factor);
	return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
}
HANDLERS.set('affinite', handleAffinite);

function handleSimilitude(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, toGeoValue, line, label, angleMode } = ctx;
	const centerId = requireElement(
		named.get('centre') ?? { type: 'nombre', value: 0 },
		'centre',
		line
	);
	const angleArg = named.get('angle') ?? { type: 'nombre' as const, value: 0 };
	let simAngleRad: ScalarParam;
	if (angleArg.type === 'element' && angleArg.elementType === 'scalar') {
		const depId = angleArg.figureId;
		if (angleMode === 'deg') {
			simAngleRad = {
				scalarRef: figure.createScalarExpression(
					(sv) => ((sv.get(depId) ?? 0) * Math.PI) / 180,
					[depId]
				)
			};
		} else {
			simAngleRad = { scalarRef: depId };
		}
	} else {
		const angleVal = requireNumber(angleArg, 'angle', line);
		simAngleRad = { kind: 'numeric', value: toRadians(angleVal, angleMode) };
	}
	const simFactor = toScalarParam(
		named.get('rapport') ?? { type: 'nombre', value: 1 },
		toGeoValue,
		line
	);
	if (pos.length === 0) {
		const id = figure.createSimilitude(centerId, simAngleRad, simFactor, { label });
		return { figureId: id, symbolType: 'transformation' };
	}
	const sourceId = requireElement(pos[0], 'source', line);
	const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
	const tId = figure.createSimilitude(centerId, simAngleRad, simFactor);
	return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
}
HANDLERS.set('similitude', handleSimilitude);

function handleTransforme(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`transforme()\` attend 2 arguments (transformation, objet), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'transforme(t, M)',
						description: 'image directe de `M` par la transformation `t`'
					}
				],
				hint: 'Créez la transformation en amont (`t = rotation(centre=O, angle=60)`) puis appliquez-la.'
			},
			line
		);
	const transformArg = pos[0];
	if (transformArg.type !== 'element' || transformArg.elementType !== 'transformation')
		throw new DslRuntimeError(
			{
				summary: '`transforme()` : le 1er argument doit être une transformation.',
				hint: 'Utilisez `rotation()`, `translation()`, `symetrie()`, `homothetie()`, `affinite()`, `inversion()`, `similitude()` ou `compose()`.'
			},
			line
		);
	const sourceArg = pos[1];
	if (sourceArg.type !== 'element')
		throw new DslRuntimeError(
			{
				summary: '`transforme()` : le 2ᵉ argument doit être un élément géométrique.',
				hint: 'Acceptés : point, segment, droite, cercle, polygone, courbe…'
			},
			line
		);
	const result = applyTransformationToElement(
		figure,
		transformArg.figureId!,
		sourceArg.figureId!,
		sourceArg.elementType!,
		{ label }
	);
	figure.recordTransformeOrigin(result.figureId, transformArg.figureId!, sourceArg.figureId!);
	return result;
}
HANDLERS.set('transforme', handleTransforme);

function handleCompose(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length < 2)
		throw new DslRuntimeError(
			{
				summary: `\`compose()\` attend au moins 2 transformations, ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'compose(t1, t2, ...)',
						description: 'composition appliquée de gauche à droite : `t1` puis `t2` puis ...'
					}
				]
			},
			line
		);
	const transformIds: string[] = [];
	for (let i = 0; i < pos.length; i++) {
		const arg = pos[i];
		if (arg.type !== 'element' || arg.elementType !== 'transformation')
			throw new DslRuntimeError(
				{
					summary: `\`compose()\` : l’argument ${i + 1} doit être une transformation.`,
					hint: 'Tous les arguments doivent être des transformations (rotation, symétrie, translation…).'
				},
				line
			);
		transformIds.push(arg.figureId!);
	}
	const id = figure.createComposition(transformIds, { label });
	return { figureId: id, symbolType: 'transformation' };
}
HANDLERS.set('compose', handleCompose);

function handleMarqueAngle(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label } = ctx;
	if (pos.length < 3)
		throw new DslRuntimeError(
			{
				summary: `\`marque_angle()\` attend 3 points (P1, V, P2), ${pos.length} reçu(s).`,
				hint: 'Le 2ᵉ argument est le sommet de l’angle.',
				forms: [
					{
						syntax: 'marque_angle(P1, V, P2)',
						description: 'marque visuelle de l’angle ∠P1·V·P2 au sommet `V`'
					},
					{
						syntax: 'marque_angle(P1, V, P2, arcs=2)',
						description: 'marque à double arc (égalité d’angles), `arcs ∈ {1, 2, 3}`'
					}
				]
			},
			line
		);
	const arcCount = named.has('arcs')
		? (requireNumber(named.get('arcs')!, 'arcs', line) as 1 | 2 | 3)
		: 1;
	const id = figure.createAngleMark(
		requireElement(pos[0], 'P1', line),
		requireElement(pos[1], 'V', line),
		requireElement(pos[2], 'P2', line),
		{ arcCount, label }
	);
	return { figureId: id, symbolType: 'angleMark' };
}
HANDLERS.set('marque_angle', handleMarqueAngle);

function handleAngleDroit(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length < 3)
		throw new DslRuntimeError(
			{
				summary: `\`angle_droit()\` attend 3 points (P1, V, P2), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'angle_droit(P1, V, P2)',
						description: 'marque d’angle droit (équerre) au sommet `V`'
					}
				]
			},
			line
		);
	const id = figure.createAngleMark(
		requireElement(pos[0], 'P1', line),
		requireElement(pos[1], 'V', line),
		requireElement(pos[2], 'P2', line),
		{ rightAngle: true, label }
	);
	return { figureId: id, symbolType: 'angleMark' };
}
HANDLERS.set('angle_droit', handleAngleDroit);

function handleMarqueSegment(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label } = ctx;
	if (pos.length < 2)
		throw new DslRuntimeError(
			{
				summary: `\`marque_segment()\` attend 2 points (A, B), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'marque_segment(A, B)',
						description: 'marque (un trait) sur le segment `[AB]`'
					},
					{
						syntax: 'marque_segment(A, B, marques=2)',
						description: 'marques multiples (égalité de segments), `marques ∈ {1, 2, 3}`'
					}
				]
			},
			line
		);
	const markCount = named.has('traits')
		? (requireNumber(named.get('traits')!, 'traits', line) as 1 | 2 | 3)
		: 1;
	const id = figure.createSegmentMark(
		requireElement(pos[0], 'A', line),
		requireElement(pos[1], 'B', line),
		{ markCount, label }
	);
	return { figureId: id, symbolType: 'segmentMark' };
}
HANDLERS.set('marque_segment', handleMarqueSegment);

function handleMesure(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length < 2)
		throw new DslRuntimeError(
			{
				summary: `\`mesure()\` attend au moins 2 arguments (position, expression), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'mesure(x, y, "distance(A, B)")',
						description: 'affichage d’une mesure formatée à la position `(x, y)`'
					},
					{
						syntax: 'mesure(P, "AB = {distance(A,B)}")',
						description: 'mesure ancrée au point `P` avec template `{...}`'
					}
				]
			},
			line
		);
	const targetIds = pos.map((p, i) => requireElement(p, `arg${i + 1}`, line));

	let scalarId: string;
	let autoPosition: 'midpoint' | 'bisector' | 'centroid';
	if (pos.length === 2) {
		scalarId = figure.createScalarDistance(targetIds[0], targetIds[1]);
		autoPosition = 'midpoint';
	} else if (pos.length === 3) {
		scalarId = figure.createScalarAngle(targetIds[0], targetIds[1], targetIds[2]);
		autoPosition = 'bisector';
	} else {
		scalarId = figure.createScalarArea(targetIds);
		autoPosition = 'centroid';
	}

	const format = autoPosition === 'bisector' ? ':deg' : ':.2f';
	const textId = figure.createText(
		`{${scalarId}${format}}`,
		[scalarId],
		{ autoPosition, autoTargetIds: targetIds },
		{ label }
	);
	return { figureId: textId, symbolType: 'text' };
}
HANDLERS.set('mesure', handleMesure);

function handleAire(
	ctx: BuiltinCtx
): BuiltinResult | BuiltinMultiResult | BuiltinScalarResult | null {
	const { pos, figure, line, label } = ctx;
	if (pos.length === 3 && pos[0].type === 'element') {
		const candidateEl = figure.getElementById(pos[0].figureId);
		if (candidateEl && candidateEl.type === 'function') {
			return interpretAreaBuiltin({
				name: 'aire',
				f: { id: pos[0].figureId, expression: candidateEl.expression },
				lowerArg: pos[1],
				upperArg: pos[2],
				signed: false,
				defaultColor: '#22c55e',
				line,
				label,
				figure
			});
		}
	}

	if (pos.length < 3)
		throw new DslRuntimeError(
			{
				summary: `\`aire()\` attend au moins 3 points, ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'aire(A, B, C, ...)',
						description: 'aire signée du polygone formé par les points donnés'
					},
					{
						syntax: 'aire(f, x_min, x_max)',
						description: 'aire entre la courbe `y = f(x)` et l’axe `Ox` sur `[x_min ; x_max]`'
					}
				]
			},
			line
		);
	const pointIds = pos.map((p, i) => requireElement(p, `point${i + 1}`, line));
	const id = figure.createScalarArea(pointIds, { label });
	return { figureId: id, symbolType: 'scalar' };
}
HANDLERS.set('aire', handleAire);

function handleMtexte(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label, symbols } = ctx;
	if (pos.length < 2)
		throw new DslRuntimeError(
			{
				summary: `\`mtexte()\` attend au moins 2 arguments (position, code LaTeX), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'mtexte(x, y, "\\\\frac{a}{b}")',
						description: 'texte LaTeX positionné en `(x, y)`'
					},
					{
						syntax: 'mtexte(P, "\\\\vec{AB}")',
						description: 'texte LaTeX ancré au point `P`'
					}
				]
			},
			line
		);
	let mtTemplate: string;
	let mtPositioning: {
		anchorId?: string;
		anchorOffset?: { dx: number; dy: number };
		position?: { x: number; y: number };
	};
	if (pos.length >= 3 && pos[0].type === 'nombre' && pos[1].type === 'nombre') {
		const x = (pos[0] as { type: 'nombre'; value: number }).value;
		const y = (pos[1] as { type: 'nombre'; value: number }).value;
		if (pos[2].type !== 'string')
			throw new DslRuntimeError(
				{
					summary: '`mtexte()` : le 3ᵉ argument doit être une chaîne (code LaTeX).',
					hint: 'Exemple : `mtexte(0, 0, "\\\\frac{a}{b}")`.'
				},
				line
			);
		mtTemplate = (pos[2] as { type: 'string'; value: string }).value;
		mtPositioning = { position: { x, y } };
	} else if (pos[0].type === 'element') {
		const anchorId = requireElement(pos[0], 'anchor', line);
		if (pos[1].type !== 'string')
			throw new DslRuntimeError(
				{
					summary: '`mtexte()` : le 2ᵉ argument doit être une chaîne (code LaTeX).',
					hint: 'Exemple : `mtexte(P, "\\\\vec{AB}")`.'
				},
				line
			);
		mtTemplate = (pos[1] as { type: 'string'; value: string }).value;
		const dx = named.has('dx')
			? (named.get('dx')! as { type: 'nombre'; value: number }).value
			: undefined;
		const dy = named.has('dy')
			? (named.get('dy')! as { type: 'nombre'; value: number }).value
			: undefined;
		mtPositioning = {
			anchorId,
			anchorOffset: dx !== undefined || dy !== undefined ? { dx: dx ?? 0, dy: dy ?? 0 } : undefined
		};
	} else {
		throw new DslRuntimeError(
			'mtexte() attend: mtexte(x, y, "latex") ou mtexte(point, "latex", dx=..., dy=...)',
			line
		);
	}
	const mtScalarRefs: string[] = [];
	mtTemplate = mtTemplate.replace(/\{(\w+)/g, (_match, refName: string) => {
		const refSym = symbols?.get(refName);
		if (refSym?.figureId && refSym.type === 'scalar') {
			mtScalarRefs.push(refSym.figureId);
			return `{${refSym.figureId}`;
		}
		return `{${refName}`;
	});
	const mtId = figure.createMathText(mtTemplate, mtScalarRefs, mtPositioning, { label });
	return { figureId: mtId, symbolType: 'mathText' };
}
HANDLERS.set('mtexte', handleMtexte);

function handleDistance(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2)
		throw new DslRuntimeError(
			'distance() attend 2 arguments (point, point) ou (point, droite)',
			line
		);
	const arg2 = pos[1];
	const isLineArg =
		arg2.type === 'element' &&
		(arg2.elementType === 'droite' ||
			arg2.elementType === 'segment' ||
			arg2.elementType === 'demidroite');
	if (isLineArg) {
		const ptId = requireElement(pos[0], 'point', line);
		const lineId = requireElement(pos[1], 'ligne', line);
		const id = figure.createScalarDistancePointLine(ptId, lineId, { label });
		return { figureId: id, symbolType: 'scalar' };
	}
	const pt1Id = requireElement(pos[0], 'point1', line);
	const pt2Id = requireElement(pos[1], 'point2', line);
	const id = figure.createScalarDistance(pt1Id, pt2Id, { label });
	return { figureId: id, symbolType: 'scalar' };
}
HANDLERS.set('distance', handleDistance);

function handleAngle(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length === 2) {
		const centerId = requireElement(pos[0], 'centre', line);
		const pointId = requireElement(pos[1], 'point', line);
		const id = figure.createScalarPolarAngle(centerId, pointId, { label });
		return { figureId: id, symbolType: 'scalar' };
	}
	if (pos.length !== 3)
		throw new DslRuntimeError(
			'angle() attend 2 arguments (O, A) pour angle polaire ou 3 arguments (P, O, Q) pour angle au sommet',
			line
		);
	const aP1Id = requireElement(pos[0], 'P1', line);
	const aVId = requireElement(pos[1], 'vertex', line);
	const aP2Id = requireElement(pos[2], 'P2', line);
	const id = figure.createScalarAngle(aP1Id, aVId, aP2Id, { label });
	return { figureId: id, symbolType: 'scalar' };
}
HANDLERS.set('angle', handleAngle);

function handlePerimetre(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length < 3)
		throw new DslRuntimeError(
			{
				summary: `\`perimetre()\` attend au moins 3 points, ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'perimetre(A, B, C, ...)',
						description: 'périmètre du polygone formé par les points'
					}
				]
			},
			line
		);
	const perimPointIds = pos.map((p, i) => requireElement(p, `point${i + 1}`, line));
	const id = figure.createScalarPerimeter(perimPointIds, { label });
	return { figureId: id, symbolType: 'scalar' };
}
HANDLERS.set('perimetre', handlePerimetre);

function handlePente(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 1)
		throw new DslRuntimeError(
			{
				summary: `\`pente()\` attend 1 argument, ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'pente(d)',
						description: 'coefficient directeur de la droite, du segment ou de la demi-droite `d`'
					}
				]
			},
			line
		);
	const penteArg = pos[0];
	if (
		penteArg.type !== 'element' ||
		(penteArg.elementType !== 'droite' &&
			penteArg.elementType !== 'segment' &&
			penteArg.elementType !== 'demidroite')
	)
		throw new DslRuntimeError(
			{
				summary: '`pente()` : l’argument doit être une droite, un segment ou une demi-droite.',
				hint: 'Pour mesurer la pente entre deux points, créez d’abord la droite : `d = droite(A, B)`.'
			},
			line
		);
	const penteLineId = penteArg.figureId;
	const id = figure.createScalarSlope(penteLineId, { label });
	return { figureId: id, symbolType: 'scalar' };
}
HANDLERS.set('pente', handlePente);

function handleRayon(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 1)
		throw new DslRuntimeError(
			{
				summary: `\`rayon()\` attend 1 argument (un cercle), ${pos.length} reçu(s).`,
				forms: [{ syntax: 'rayon(c)', description: 'rayon scalaire du cercle `c`' }]
			},
			line
		);
	const rayonArg = pos[0];
	if (rayonArg.type !== 'element' || rayonArg.elementType !== 'cercle')
		throw new DslRuntimeError(
			{
				summary: '`rayon()` : l’argument doit être un cercle.',
				hint: 'Acceptés : `cercle(O, rayon=r)`, `cercle(O, passant=A)` ou `cercle(A, B, C)`.'
			},
			line
		);
	const rayonCircleId = rayonArg.figureId;
	const id = figure.createScalarRadius(rayonCircleId, { label });
	return { figureId: id, symbolType: 'scalar' };
}
HANDLERS.set('rayon', handleRayon);

function handleSlider(ctx: BuiltinCtx): BuiltinResult {
	const { named, figure, line, label } = ctx;
	const minVal = requireNumber(named.get('min') ?? { type: 'nombre', value: 0 }, 'min', line);
	const maxVal = requireNumber(named.get('max') ?? { type: 'nombre', value: 10 }, 'max', line);
	const valeur = requireNumber(
		named.get('valeur') ?? { type: 'nombre', value: (minVal + maxVal) / 2 },
		'valeur',
		line
	);
	const step = named.has('pas') ? requireNumber(named.get('pas')!, 'pas', line) : undefined;
	const id = figure.createSlider(minVal, maxVal, valeur, { label, step });
	return { figureId: id, symbolType: 'scalar' };
}
HANDLERS.set('slider', handleSlider);

const ARC_FORMS = [
	{
		syntax: 'arc(A, O, B)',
		description: 'arc de cercle de centre `O`, de `A` à `B` (sens trigonométrique)'
	},
	{
		syntax: 'arc(O, rayon=r, debut=0, fin=90)',
		description: 'arc de centre `O`, rayon `r`, angles `début`/`fin`'
	}
];

function handleArc(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, toGeoValue, line, label, angleMode } = ctx;
	if (pos.length === 3) {
		const startId = requireElement(pos[0], 'start', line);
		const centerId = requireElement(pos[1], 'centre', line);
		const endId = requireElement(pos[2], 'end', line);
		const id = figure.createArcByPoints(startId, centerId, endId, { label });
		return { figureId: id, symbolType: 'arc' };
	}
	if (pos.length === 1) {
		const centerId = requireElement(pos[0], 'centre', line);
		if (!named.has('rayon'))
			throw new DslRuntimeError(
				{
					summary: '`arc()` avec 1 argument : l’argument nommé `rayon=...` est obligatoire.',
					forms: ARC_FORMS
				},
				line
			);
		const radius = toGeoValue(named.get('rayon')!, line);
		const startVal = named.has('debut') ? requireNumber(named.get('debut')!, 'debut', line) : 0;
		const endVal = named.has('fin')
			? requireNumber(named.get('fin')!, 'fin', line)
			: angleMode === 'deg'
				? 360
				: 2 * Math.PI;
		const startRad: GeoValue = { kind: 'numeric', value: toRadians(startVal, angleMode) };
		const endRad: GeoValue = { kind: 'numeric', value: toRadians(endVal, angleMode) };
		const id = figure.createArcByAngles(centerId, radius, startRad, endRad, { label });
		return { figureId: id, symbolType: 'arc' };
	}
	throw new DslRuntimeError(
		{
			summary: `\`arc()\` : ${pos.length} arguments positionnels reçus, attendu 1 (centre) ou 3 (A, O, B).`,
			forms: ARC_FORMS
		},
		line
	);
}
HANDLERS.set('arc', handleArc);

const SECTEUR_FORMS = [
	{
		syntax: 'secteur(O, A, B)',
		description: 'secteur circulaire de centre `O`, bords `OA` et `OB`'
	},
	{
		syntax: 'secteur(O, rayon=r, debut=0, fin=90)',
		description: 'secteur de centre `O`, rayon `r`, angles `début`/`fin`'
	}
];

function handleSecteur(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, toGeoValue, line, label, angleMode } = ctx;
	if (pos.length === 3) {
		const centerId = requireElement(pos[0], 'centre', line);
		const startId = requireElement(pos[1], 'start', line);
		const endId = requireElement(pos[2], 'end', line);
		const id = figure.createSectorByPoints(centerId, startId, endId, { label });
		return { figureId: id, symbolType: 'secteur' as SymbolType };
	}
	if (pos.length === 1) {
		const centerId = requireElement(pos[0], 'centre', line);
		if (!named.has('rayon'))
			throw new DslRuntimeError(
				{
					summary: '`secteur()` avec 1 argument : l’argument nommé `rayon=...` est obligatoire.',
					forms: SECTEUR_FORMS
				},
				line
			);
		const radius = toScalarParam(named.get('rayon')!, toGeoValue, line);
		const startVal = named.has('debut') ? requireNumber(named.get('debut')!, 'debut', line) : 0;
		const endVal = named.has('fin')
			? requireNumber(named.get('fin')!, 'fin', line)
			: angleMode === 'deg'
				? 360
				: 2 * Math.PI;
		const startRad: GeoValue = { kind: 'numeric', value: toRadians(startVal, angleMode) };
		const endRad: GeoValue = { kind: 'numeric', value: toRadians(endVal, angleMode) };
		const id = figure.createSectorByAngles(centerId, radius, startRad, endRad, { label });
		return { figureId: id, symbolType: 'secteur' as SymbolType };
	}
	throw new DslRuntimeError(
		{
			summary: `\`secteur()\` : ${pos.length} arguments positionnels reçus, attendu 1 (centre) ou 3 (O, A, B).`,
			forms: SECTEUR_FORMS
		},
		line
	);
}
HANDLERS.set('secteur', handleSecteur);

const COURONNE_FORMS = [
	{
		syntax: 'couronne(O, r1=2, r2=3)',
		description: 'anneau de centre `O`, rayon intérieur `r1`, extérieur `r2`'
	}
];

function handleCouronne(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, toGeoValue, line, label } = ctx;
	if (pos.length !== 1)
		throw new DslRuntimeError(
			{
				summary: `\`couronne()\` attend 1 argument positionnel (centre), ${pos.length} reçu(s).`,
				forms: COURONNE_FORMS
			},
			line
		);
	const centerId = requireElement(pos[0], 'centre', line);
	if (!named.has('r1') || !named.has('r2'))
		throw new DslRuntimeError(
			{
				summary: '`couronne()` : les arguments nommés `r1=...` et `r2=...` sont obligatoires.',
				forms: COURONNE_FORMS
			},
			line
		);
	const r1 = toScalarParam(named.get('r1')!, toGeoValue, line);
	const r2 = toScalarParam(named.get('r2')!, toGeoValue, line);
	const r1Num = typeof r1 === 'object' && 'scalarRef' in r1 ? null : geoToNumber(r1);
	const r2Num = typeof r2 === 'object' && 'scalarRef' in r2 ? null : geoToNumber(r2);
	if (r1Num !== null && r2Num !== null && r1Num >= r2Num)
		throw new DslRuntimeError(
			{
				summary: '`couronne()` : `r1` doit être strictement inférieur à `r2`.',
				hint: '`r1` est le rayon intérieur, `r2` le rayon extérieur.'
			},
			line
		);
	const id = figure.createAnnulus(centerId, r1, r2, { label });
	return { figureId: id, symbolType: 'couronne' as SymbolType };
}
HANDLERS.set('couronne', handleCouronne);

function handlePuissance(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`puissance()\` attend 2 arguments (point, cercle), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'puissance(M, c)',
						description: 'puissance du point `M` par rapport au cercle `c`'
					}
				]
			},
			line
		);
	const pointId = requireElement(pos[0], 'point', line);
	const circleArg = pos[1];
	if (circleArg.type !== 'element' || circleArg.elementType !== 'cercle')
		throw new DslRuntimeError(
			{
				summary: '`puissance()` : le 2ᵉ argument doit être un cercle.',
				hint: 'Exemple : `puissance(M, c)` où `c = cercle(O, rayon=r)`.'
			},
			line
		);
	const circleId = circleArg.figureId;
	const id = figure.createScalarPower(pointId, circleId, { label });
	return { figureId: id, symbolType: 'scalar' };
}
HANDLERS.set('puissance', handlePuissance);

function handleStyle(ctx: BuiltinCtx): null {
	const { pos, named, figure, line } = ctx;
	if (pos.length < 1)
		throw new DslRuntimeError(
			{
				summary: '`style()` attend au moins 1 argument (l’élément à styler).',
				forms: [
					{
						syntax: 'style(P, couleur="red", taille=4)',
						description: 'modifie le style visuel d’un élément existant'
					}
				]
			},
			line
		);
	const elId = requireElement(pos[0], 'element', line);
	applyInlineStyle(figure, elId, named, line);
	return null;
}
HANDLERS.set('style', handleStyle);

const LONGUEUR_FORMS = [
	{
		syntax: 'longueur(c)',
		description: 'longueur d’arc totale de la courbe paramétrique `c`'
	},
	{
		syntax: 'longueur(c, t1, t2)',
		description: 'longueur d’arc de `c` sur l’intervalle `[t1 ; t2]`'
	}
];

function handleLongueur(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, toGeoValue, line, label } = ctx;
	if (pos.length === 0) {
		throw new DslRuntimeError(
			{
				summary: '`longueur()` : aucun argument fourni.',
				forms: LONGUEUR_FORMS
			},
			line
		);
	}
	if (pos.length === 2) {
		throw new DslRuntimeError(
			{
				summary: '`longueur()` : `t1` et `t2` doivent être fournis ensemble.',
				hint: 'Utilisez `longueur(c)` pour la longueur totale, ou `longueur(c, t1, t2)` pour un sous-intervalle.',
				forms: LONGUEUR_FORMS
			},
			line
		);
	}
	if (pos.length > 3) {
		throw new DslRuntimeError(
			{
				summary: `\`longueur()\` : ${pos.length} arguments reçus, attendu 1 ou 3.`,
				forms: LONGUEUR_FORMS
			},
			line
		);
	}

	const lcId = requireElement(pos[0], 'courbe', line);
	const lcEl = figure.getElementById(lcId);
	if (!lcEl || lcEl.type !== 'parametricCurve') {
		throw new DslRuntimeError(
			{
				summary: '`longueur()` : le 1er argument doit être une courbe paramétrique.',
				hint: 'Pour mesurer un segment, utilisez `distance(A, B)`. Convertissez vos courbes au format paramétrique si besoin.'
			},
			line
		);
	}

	let tMinParam: ScalarParam | undefined;
	let tMaxParam: ScalarParam | undefined;
	if (pos.length === 3) {
		tMinParam = toScalarParam(pos[1], toGeoValue, line);
		tMaxParam = toScalarParam(pos[2], toGeoValue, line);
		if (!isScalarRef(tMinParam) && !isScalarRef(tMaxParam)) {
			const t1Num = geoToNumber(tMinParam);
			const t2Num = geoToNumber(tMaxParam);
			if (Number.isFinite(t1Num) && Number.isFinite(t2Num) && t1Num >= t2Num) {
				throw new DslRuntimeError(
					{
						summary: '`longueur()` : `t2` doit être strictement supérieur à `t1`.',
						hint: '`t1` est la borne inférieure, `t2` la borne supérieure.'
					},
					line
				);
			}
		}
	}

	const lId = figure.createArcLength(lcId, tMinParam, tMaxParam, { label });
	return { figureId: lId, symbolType: 'scalar' };
}
HANDLERS.set('longueur', handleLongueur);

function handleCourbure(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, toGeoValue, line, label } = ctx;
	if (pos.length !== 2) {
		throw new DslRuntimeError(
			{
				summary: `\`courbure()\` attend 2 arguments (c, t0), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'courbure(c, t0)',
						description: 'courbure signée de la courbe paramétrique `c` au paramètre `t0`'
					}
				]
			},
			line
		);
	}
	const kcId = requireElement(pos[0], 'courbe', line);
	const kcEl = figure.getElementById(kcId);
	if (!kcEl || kcEl.type !== 'parametricCurve') {
		throw new DslRuntimeError(
			{
				summary: '`courbure()` : le 1er argument doit être une courbe paramétrique.',
				hint: 'Créez-la avec `c = courbe("x = ...", "y = ...", t_min=..., t_max=...)`.'
			},
			line
		);
	}
	const tParam = toScalarParam(pos[1], toGeoValue, line);
	const kId = figure.createCurvature(kcId, tParam, { label });
	return { figureId: kId, symbolType: 'scalar' };
}
HANDLERS.set('courbure', handleCourbure);

function handleCercleOsculateur(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, toGeoValue, line, label } = ctx;
	if (pos.length !== 2) {
		throw new DslRuntimeError(
			{
				summary: `\`cercle_osculateur()\` attend 2 arguments (c, t0), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'cercle_osculateur(c, t0)',
						description: 'cercle osculateur de la courbe paramétrique `c` au paramètre `t0`'
					}
				]
			},
			line
		);
	}
	const ocCurveId = requireElement(pos[0], 'courbe', line);
	const ocCurveEl = figure.getElementById(ocCurveId);
	if (!ocCurveEl || ocCurveEl.type !== 'parametricCurve') {
		throw new DslRuntimeError(
			{
				summary: '`cercle_osculateur()` : le 1er argument doit être une courbe paramétrique.',
				hint: 'Le cercle osculateur n’est défini que pour les courbes paramétriques.'
			},
			line
		);
	}
	const ocTParam = toScalarParam(pos[1], toGeoValue, line);
	const ocId = figure.createOsculatingCircle(ocCurveId, ocTParam, { label });
	return { figureId: ocId, symbolType: 'cercle' };
}
HANDLERS.set('cercle_osculateur', handleCercleOsculateur);

function handleDerivee(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 1) {
		throw new DslRuntimeError(
			{
				summary: `\`derivee()\` attend 1 argument (une fonction), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'derivee(f)',
						description: "fonction dérivée `f'` de la fonction `y = f(x)`"
					}
				]
			},
			line
		);
	}
	const dFnId = requireElement(pos[0], 'fonction', line);
	const dFnEl = figure.getElementById(dFnId);
	if (!dFnEl || dFnEl.type !== 'function') {
		throw new DslRuntimeError(
			{
				summary: '`derivee()` : l’argument doit être une courbe `y = f(x)`.',
				hint: 'Créez-la avec `f = courbe("x^2 - 1")` puis passez-la ici.'
			},
			line
		);
	}

	let fPrimePrime: MathNode;
	try {
		fPrimePrime = differentiate(dFnEl.derivative, { variable: 'x', simplify: true });
	} catch {
		throw new DslRuntimeError(
			{
				summary: '`derivee()` : impossible de calculer la dérivée seconde.',
				hint: 'La fonction n’est probablement pas dérivable deux fois sur l’intervalle.'
			},
			line
		);
	}

	let dCompiledDerivative: CompiledFn;
	try {
		dCompiledDerivative = compile(fPrimePrime);
	} catch (e) {
		throw new DslRuntimeError(
			{
				summary: '`derivee()` : impossible de compiler la dérivée.',
				hint: e instanceof Error ? e.message : 'Erreur interne lors de la compilation.'
			},
			line
		);
	}

	const dEquation = `y = ${toCustom(dFnEl.derivative)}`;

	const dFnNewId = figure.createFunction(
		dFnEl.derivative,
		fPrimePrime,
		dFnEl.compiledDerivative,
		dCompiledDerivative,
		dEquation,
		{ label }
	);

	return { figureId: dFnNewId, symbolType: 'courbe' };
}
HANDLERS.set('derivee', handleDerivee);

function handleIntegrale(
	ctx: BuiltinCtx
): BuiltinResult | BuiltinMultiResult | BuiltinScalarResult | null {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 3) {
		throw new DslRuntimeError(
			{
				summary: `\`integrale()\` attend 3 arguments (f, a, b), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'integrale(f, a, b)',
						description: 'aire signée entre `y = f(x)` et l’axe `Ox` sur `[a ; b]`'
					}
				]
			},
			line
		);
	}
	const intFnId = requireElement(pos[0], 'fonction', line);
	const intFnEl = figure.getElementById(intFnId);
	if (!intFnEl || intFnEl.type !== 'function') {
		throw new DslRuntimeError(
			{
				summary: '`integrale()` : le 1er argument doit être une courbe `y = f(x)`.',
				hint: 'Créez-la avec `f = courbe("x^2 - 1")` puis intégrez-la.'
			},
			line
		);
	}
	return interpretAreaBuiltin({
		name: 'integrale',
		f: { id: intFnId, expression: intFnEl.expression },
		lowerArg: pos[1],
		upperArg: pos[2],
		signed: true,
		line,
		label,
		figure
	});
}
HANDLERS.set('integrale', handleIntegrale);

function handleAireEntre(
	ctx: BuiltinCtx
): BuiltinResult | BuiltinMultiResult | BuiltinScalarResult | null {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 4) {
		throw new DslRuntimeError(
			{
				summary: `\`aire_entre()\` attend 4 arguments (f, g, a, b), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'aire_entre(f, g, a, b)',
						description: 'aire positive entre `y = f(x)` et `y = g(x)` sur `[a ; b]`'
					}
				]
			},
			line
		);
	}
	const fnId = requireElement(pos[0], 'fonction 1', line);
	const fnEl = figure.getElementById(fnId);
	if (!fnEl || fnEl.type !== 'function') {
		throw new DslRuntimeError(
			{
				summary: '`aire_entre()` : le 1er argument doit être une courbe `y = f(x)`.',
				hint: 'Les deux arguments doivent être des courbes cartésiennes définies au-dessus.'
			},
			line
		);
	}
	const gnId = requireElement(pos[1], 'fonction 2', line);
	const gnEl = figure.getElementById(gnId);
	if (!gnEl || gnEl.type !== 'function') {
		throw new DslRuntimeError(
			{
				summary: '`aire_entre()` : le 2ᵉ argument doit être une courbe `y = g(x)`.',
				hint: 'Les deux arguments doivent être des courbes cartésiennes définies au-dessus.'
			},
			line
		);
	}
	return interpretAreaBuiltin({
		name: 'aire_entre',
		f: { id: fnId, expression: fnEl.expression },
		g: { id: gnId, expression: gnEl.expression },
		lowerArg: pos[2],
		upperArg: pos[3],
		signed: false,
		defaultColor: '#fb923c',
		line,
		label,
		figure
	});
}
HANDLERS.set('aire_entre', handleAireEntre);

function handleAsymptotes(ctx: BuiltinCtx): BuiltinMultiResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 1) {
		throw new DslRuntimeError(
			{
				summary: `\`asymptotes()\` attend 1 argument (une conique), ${pos.length} reçu(s).`,
				forms: [{ syntax: 'asymptotes(h)', description: 'les deux asymptotes de l’hyperbole `h`' }]
			},
			line
		);
	}
	const asymCurveId = requireElement(pos[0], 'conique', line);
	const asymCurveEl = figure.getElementById(asymCurveId);
	if (!asymCurveEl || asymCurveEl.type !== 'quadraticCurve') {
		throw new DslRuntimeError(
			{
				summary: '`asymptotes()` : l’argument doit être une conique.',
				hint: 'Créez-la avec `c = courbe("x^2/4 - y^2/9 = 1")`.'
			},
			line
		);
	}
	if (asymCurveEl.conic.type !== 'hyperbola') {
		throw new DslRuntimeError(
			{
				summary: '`asymptotes()` : la conique doit être une hyperbole.',
				hint: 'Les ellipses, paraboles et cercles n’ont pas d’asymptotes.'
			},
			line
		);
	}
	const asymLines = asymptoteLines(asymCurveEl.conic);
	if (!asymLines) {
		throw new DslRuntimeError(
			{
				summary: '`asymptotes()` : impossible de calculer les asymptotes.',
				hint: 'Cas dégénéré : l’hyperbole est singulière (deux droites sécantes).'
			},
			line
		);
	}
	const asymResults: BuiltinResult[] = asymLines.map((al, i) => {
		const lbl = label ? (asymLines.length > 1 ? `${label}${i + 1}` : label) : undefined;
		const pt1Id = figure.createFreePoint(
			{ x: numeric(al.p1.x), y: numeric(al.p1.y) },
			{ visible: false, draggable: false }
		);
		const pt2Id = figure.createFreePoint(
			{ x: numeric(al.p2.x), y: numeric(al.p2.y) },
			{ visible: false, draggable: false }
		);
		const lineId = figure.createLine(pt1Id, pt2Id, { label: lbl });
		return { figureId: lineId, symbolType: 'droite' as SymbolType };
	});
	return { elements: asymResults } as BuiltinMultiResult;
}
HANDLERS.set('asymptotes', handleAsymptotes);

function handleAxes(ctx: BuiltinCtx): BuiltinMultiResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 1) {
		throw new DslRuntimeError(
			{
				summary: `\`axes()\` attend 1 argument (une conique), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'axes(c)',
						description: 'axes de symétrie de la conique `c` (ellipse, hyperbole, parabole)'
					}
				]
			},
			line
		);
	}
	const axesCurveId = requireElement(pos[0], 'conique', line);
	const axesCurveEl = figure.getElementById(axesCurveId);
	if (!axesCurveEl || axesCurveEl.type !== 'quadraticCurve') {
		throw new DslRuntimeError(
			{
				summary: '`axes()` : l’argument doit être une conique.',
				hint: 'Créez-la avec `c = courbe("x^2/4 + y^2/9 = 1")`.'
			},
			line
		);
	}
	if (axesCurveEl.conic.type === 'circle') {
		throw new DslRuntimeError(
			{
				summary: '`axes()` : un cercle a une infinité d’axes de symétrie.',
				hint: 'Cette fonction n’est définie que pour les coniques non circulaires.'
			},
			line
		);
	}
	const axLines = computeAxisLines(axesCurveEl.conic);
	if (!axLines || axLines.length === 0) {
		throw new DslRuntimeError(
			{
				summary: '`axes()` : impossible de calculer les axes de cette conique.',
				hint: 'Cas dégénéré : la conique est probablement singulière.'
			},
			line
		);
	}
	const axResults: BuiltinResult[] = axLines.map((al, i) => {
		const lbl = label ? (axLines.length > 1 ? `${label}${i + 1}` : label) : undefined;
		const pt1Id = figure.createFreePoint(
			{ x: numeric(al.p1.x), y: numeric(al.p1.y) },
			{ visible: false, draggable: false }
		);
		const pt2Id = figure.createFreePoint(
			{ x: numeric(al.p2.x), y: numeric(al.p2.y) },
			{ visible: false, draggable: false }
		);
		const lineId = figure.createLine(pt1Id, pt2Id, { label: lbl });
		return { figureId: lineId, symbolType: 'droite' as SymbolType };
	});
	return { elements: axResults } as BuiltinMultiResult;
}
HANDLERS.set('axes', handleAxes);

function handleDirectrice(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 1) {
		throw new DslRuntimeError(
			{
				summary: `\`directrice()\` attend 1 argument (une parabole), ${pos.length} reçu(s).`,
				forms: [{ syntax: 'directrice(p)', description: 'directrice de la parabole `p`' }]
			},
			line
		);
	}
	const dirCurveId = requireElement(pos[0], 'conique', line);
	const dirCurveEl = figure.getElementById(dirCurveId);
	if (!dirCurveEl || dirCurveEl.type !== 'quadraticCurve') {
		throw new DslRuntimeError(
			{ summary: '`directrice()` : l’argument doit être une conique.' },
			line
		);
	}
	if (dirCurveEl.conic.type !== 'parabola') {
		throw new DslRuntimeError(
			{
				summary: '`directrice()` : la conique doit être une parabole.',
				hint: 'Seules les paraboles ont une directrice unique.'
			},
			line
		);
	}
	const dirLine = computeDirectrixLine(dirCurveEl.conic);
	if (!dirLine) {
		throw new DslRuntimeError(
			{ summary: '`directrice()` : impossible de calculer la directrice (parabole dégénérée).' },
			line
		);
	}
	const dPt1Id = figure.createFreePoint(
		{ x: numeric(dirLine.p1.x), y: numeric(dirLine.p1.y) },
		{ visible: false, draggable: false }
	);
	const dPt2Id = figure.createFreePoint(
		{ x: numeric(dirLine.p2.x), y: numeric(dirLine.p2.y) },
		{ visible: false, draggable: false }
	);
	const dirLineId = figure.createLine(dPt1Id, dPt2Id, { label });
	return { figureId: dirLineId, symbolType: 'droite' };
}
HANDLERS.set('directrice', handleDirectrice);

function handleFoyers(ctx: BuiltinCtx): BuiltinMultiResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 1) {
		throw new DslRuntimeError(
			{
				summary: `\`foyers()\` attend 1 argument (une conique), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'foyers(c)',
						description: 'foyers de la conique `c` (ellipse, hyperbole, parabole)'
					}
				]
			},
			line
		);
	}
	const foyersCurveId = requireElement(pos[0], 'conique', line);
	const foyersCurveEl = figure.getElementById(foyersCurveId);
	if (!foyersCurveEl || foyersCurveEl.type !== 'quadraticCurve') {
		throw new DslRuntimeError({ summary: '`foyers()` : l’argument doit être une conique.' }, line);
	}
	const foci = computeFociPoints(foyersCurveEl.conic);
	if (!foci || foci.length === 0) {
		throw new DslRuntimeError(
			{ summary: '`foyers()` : impossible de calculer les foyers (conique dégénérée).' },
			line
		);
	}
	const fociResults: BuiltinResult[] = foci.map((f, i) => {
		const lbl = label ? (foci.length > 1 ? `${label}${i + 1}` : label) : undefined;
		const ptId = figure.createFreePoint(
			{ x: numeric(f.x), y: numeric(f.y) },
			{ draggable: false, label: lbl }
		);
		return { figureId: ptId, symbolType: 'point' as SymbolType };
	});
	return { elements: fociResults } as BuiltinMultiResult;
}
HANDLERS.set('foyers', handleFoyers);

function handleExcentricite(ctx: BuiltinCtx): BuiltinScalarResult {
	const { pos, figure, line } = ctx;
	if (pos.length !== 1) {
		throw new DslRuntimeError(
			{
				summary: `\`excentricite()\` attend 1 argument (une conique), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'excentricite(c)',
						description: 'excentricité scalaire de la conique `c`'
					}
				]
			},
			line
		);
	}
	const eccCurveId = requireElement(pos[0], 'conique', line);
	const eccCurveEl = figure.getElementById(eccCurveId);
	if (!eccCurveEl || eccCurveEl.type !== 'quadraticCurve') {
		throw new DslRuntimeError(
			{ summary: '`excentricite()` : l’argument doit être une conique.' },
			line
		);
	}
	const ecc = computeEccentricity(eccCurveEl.conic);
	if (isNaN(ecc)) {
		throw new DslRuntimeError({ summary: '`excentricite()` : conique dégénérée.' }, line);
	}
	return { scalarValue: ecc } as BuiltinScalarResult;
}
HANDLERS.set('excentricite', handleExcentricite);

function handlePolaire(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2) {
		throw new DslRuntimeError(
			{
				summary: `\`polaire()\` attend 2 arguments (point, conique), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'polaire(M, c)',
						description: 'polaire du point `M` par rapport à la conique `c`'
					}
				]
			},
			line
		);
	}
	const polPointId = requireElement(pos[0], 'point', line);
	const polCurveId = requireElement(pos[1], 'conique', line);
	const polPointEl = figure.getElementById(polPointId);
	if (!polPointEl || !isPointElement(polPointEl)) {
		throw new DslRuntimeError(
			{ summary: '`polaire()` : le 1er argument doit être un point.' },
			line
		);
	}
	const polCurveEl = figure.getElementById(polCurveId);
	if (!polCurveEl || polCurveEl.type !== 'quadraticCurve') {
		throw new DslRuntimeError(
			{ summary: '`polaire()` : le 2ᵉ argument doit être une conique.' },
			line
		);
	}
	const polId = figure.createConicPolar(polCurveId, polPointId, { label });
	return { figureId: polId, symbolType: 'polaire' };
}
HANDLERS.set('polaire', handlePolaire);

function handleTrace(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 1) {
		throw new DslRuntimeError(
			{
				summary: `\`trace()\` attend 1 argument (un point), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'trace(M)',
						description: 'trace dynamique du point `M` (s’allonge quand `M` bouge)'
					}
				]
			},
			line
		);
	}
	const trackedId = requireElement(pos[0], 'point', line);
	const trackedEl = figure.getElementById(trackedId);
	if (!trackedEl) {
		throw new DslRuntimeError(
			{
				summary: `\`trace()\` : point \`${trackedId}\` introuvable.`,
				hint: 'Vérifiez que la variable a bien été définie au-dessus.'
			},
			line
		);
	}
	if (!isPointElement(trackedEl)) {
		throw new DslRuntimeError(
			{
				summary: '`trace()` : l’argument doit être un point.',
				hint: 'Pour le lieu d’un point qui dépend d’un autre, voir aussi `lieu()`.'
			},
			line
		);
	}
	const trId = figure.createTrace(trackedId, { label });
	return { figureId: trId, symbolType: 'trace' as SymbolType };
}
HANDLERS.set('trace', handleTrace);

function _executeBuiltinInner(
	name: string,
	pos: ResolvedValue[],
	named: Map<string, ResolvedValue>,
	figure: Figure,
	toGeoValue: (v: ResolvedValue, line: number) => GeoValue,
	toGeoPoint: (x: ResolvedValue, y: ResolvedValue, line: number) => GeoPoint,
	line: number,
	label?: string,
	symbols?: SymbolTable,
	angleMode: AngleMode = 'deg'
): BuiltinResult | BuiltinMultiResult | BuiltinScalarResult | null {
	const handler = HANDLERS.get(name);
	if (!handler) return null; // Not a builtin — might be a macro
	return handler({
		name,
		pos,
		named,
		figure,
		toGeoValue,
		toGeoPoint,
		line,
		label,
		symbols,
		angleMode
	});
}

/** List of all builtin function names. */
export const BUILTIN_NAMES = new Set([
	'point',
	'milieu',
	'segment',
	'droite',
	'demidroite',
	'vecteur',
	'norme',
	'produit_scalaire',
	'angle_vecteurs',
	'cercle',
	'arc',
	'polygone',
	'symetrie',
	'rotation',
	'translation',
	'homothetie',
	'similitude',
	'projection',
	'affinite',
	'inversion',
	'transforme',
	'compose',
	'intersection',
	'marque_angle',
	'angle_droit',
	'marque_segment',
	'mesure',
	'texte',
	'mtexte',
	'rtexte',
	'image',
	'aire',
	'aire_entre',
	'style',
	'courbe',
	'point_sur',
	'tangente',
	'longueur',
	'courbure',
	'cercle_osculateur',
	'derivee',
	'integrale',
	'asymptotes',
	'axes',
	'directrice',
	'foyers',
	'excentricite',
	'polaire',
	'zeros',
	'extrema',
	'inflections',
	'lieu',
	'trace',
	'distance',
	'angle',
	'perimetre',
	'pente',
	'rayon',
	'slider',
	'secteur',
	'couronne',
	'puissance'
]);

/** Math functions that return numbers. */
export const MATH_FUNCTIONS = new Set(['sqrt', 'abs', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan']);

// =============================================================================
// courbe() — equation-based curve creation
// =============================================================================

const ZERO_NODE = mathNumber('0');
const ONE_NODE = mathNumber('1');

/**
 * Parse an equation string and create the appropriate geometric element.
 * Detection order:
 * 1. Affine in x AND y → Line (droite)
 * 2. Affine in y (degree 1 in y) → Function curve y=f(x)
 * 3. Quadratic in (x,y) → Conic section (GeoQuadraticCurve)
 * 4. Otherwise → General implicit curve F(x,y)=0 (marching squares)
 */
function createCurveFromEquation(
	equation: string,
	figure: Figure,
	line: number,
	label?: string,
	angleMode: AngleMode = 'deg',
	symbols?: SymbolTable
): BuiltinResult {
	// Split off optional domain restriction suffix (`sur ...` or `avec ...`).
	// This must happen before parseCustom because the suffix is not valid
	// math syntax — it's geometry-core DSL sugar.
	const split = splitDomainSuffix(equation);
	let domainResult: ParseDomainResult | null = null;
	if (split.keyword && split.suffix) {
		if (!split.core.trim()) {
			throw new DslRuntimeError(
				`courbe(): aucune équation avant le suffixe "${split.keyword}"`,
				line
			);
		}
		domainResult = parseDomainSuffix(split.suffix, split.keyword, symbols, line);
	}
	const coreEquation = split.core;

	// --- Try piecewise: y = { ... }
	// Piecewise blocks are not valid math syntax for parseCustom, so we need
	// to detect them BEFORE the regular parse pipeline and route to a dedicated
	// builder that produces a `GeoFunction` whose `expression` is a `PiecewiseNode`.
	{
		const eqIdx = coreEquation.indexOf('=');
		if (eqIdx >= 0) {
			const lhs = coreEquation.slice(0, eqIdx).trim();
			const rhs = coreEquation.slice(eqIdx + 1).trim();
			if (lhs === 'y' && isPiecewiseRhs(rhs)) {
				// A piecewise expression already defines the function case-by-case,
				// so combining it with an external `sur`/`avec` domain suffix is
				// conceptually redundant and confusing — reject it explicitly.
				if (domainResult) {
					throw new DslRuntimeError(
						`courbe(): un piecewise définit déjà la fonction par cas — la restriction "sur"/"avec" est redondante. Encodez la restriction directement dans les conditions du piecewise.`,
						line
					);
				}
				const result = parsePiecewise(rhs, symbols, line);
				return createPiecewiseFunctionFromAst(
					result.node,
					result.dependencies,
					equation,
					figure,
					line,
					label
				);
			}
		}
	}

	// Parse the equation string with mathAST
	let parsed: MathNode;
	try {
		parsed = parseCustom(coreEquation);
	} catch {
		throw new DslRuntimeError(`courbe(): erreur de syntaxe dans "${coreEquation}"`, line);
	}

	// Apply the active angle mode (wraps trig calls in deg mode).
	parsed = applyAngleMode(parsed, angleMode);

	// Substitute static variables (numbers in symbol table) into the equation.
	if (symbols) {
		const staticBindings: Record<string, MathNode> = {};
		for (const v of getVariables(parsed)) {
			if (v === 'x' || v === 'y') continue;
			const entry = symbols.get(v);
			if (entry?.type === 'nombre') {
				staticBindings[v] = mathNumber((entry.value ?? 0).toString());
			}
		}
		if (Object.keys(staticBindings).length > 0) {
			parsed = substitute(parsed, staticBindings);
		}
	}

	// Extract F(x,y) such that F = 0
	let F: MathNode;
	if (isRelation(parsed) && parsed.relation === '=') {
		F = subtract(parsed.left, parsed.right);
	} else {
		F = parsed;
	}

	// --- Try 1: Line (affine in both x and y) ---
	// Skip when a domain restriction is present: an affine function with a
	// restricted domain (e.g. `y = 2x sur [-1 ; 1]`) should be plotted as a
	// function curve, not a full line — let it fall through to Try 2.
	if (!domainResult) {
		const affineXY = extractAffineCombination(F, ['x', 'y']);
		if (affineXY.isAffine) {
			const a = affineXY.coefficients.get('x')!;
			const b = affineXY.coefficients.get('y')!;
			const c = affineXY.constant;

			if (isZeroExpression(a) && isZeroExpression(b)) {
				throw new DslRuntimeError(
					'courbe(): équation dégénérée (0 = 0 ou constante non nulle)',
					line
				);
			}

			return createLineFromCoefficients(a, b, c, equation, figure, label);
		}
	}

	// --- Try 2: y = f(x) (affine in y alone) ---
	const affineY = extractAffineCombination(F, ['y']);
	if (affineY.isAffine) {
		const g = affineY.coefficients.get('y')!; // coefficient of y
		const h = affineY.constant; // constant term (function of x)

		if (isZeroExpression(g)) {
			throw new DslRuntimeError("courbe(): la variable y est absente de l'expression", line);
		}

		return createFunctionFromCoefficients(
			g,
			h,
			equation,
			figure,
			line,
			label,
			domainResult ?? undefined
		);
	}

	// Domain suffix is only meaningful for y=f(x) curves (not lines, conics, implicit).
	if (domainResult) {
		throw new DslRuntimeError(
			`courbe(): restriction de domaine ("sur"/"avec") n'est supportée que pour les fonctions y = f(x)`,
			line
		);
	}

	// --- Try 3: Quadratic curve (conic section) ---
	const quadratic = extractQuadraticCombination(F, ['x', 'y']);
	if (quadratic.isQuadratic) {
		return createQuadraticCurveFromCoefficients(F, quadratic, equation, figure, line, label);
	}

	// --- Try 4: General implicit curve F(x,y) = 0 ---
	const compiledFn = compile(F);
	const testVal = compiledFn({ x: 0, y: 0 });
	if (isNaN(testVal)) {
		throw new DslRuntimeError(
			{
				summary: '`courbe()` : impossible de compiler `F(x, y)` pour cette équation.',
				hint: 'Vérifiez la syntaxe de l’équation et que toutes les variables sont reconnues.'
			},
			line
		);
	}

	return createImplicitCurve(F, compiledFn, equation, figure, label);
}

/** Create a line from affine coefficients ax + by + c = 0. */
function createLineFromCoefficients(
	a: MathNode,
	b: MathNode,
	c: MathNode,
	equation: string,
	figure: Figure,
	label?: string
): BuiltinResult {
	let p1: GeoPoint;
	let p2: GeoPoint;

	if (!isZeroExpression(b)) {
		const y1 = divide(opposite(c), b);
		const y2 = divide(opposite(add(a, c)), b);
		p1 = { x: exact(ZERO_NODE), y: exact(y1) };
		p2 = { x: exact(ONE_NODE), y: exact(y2) };
	} else {
		const xVal = divide(opposite(c), a);
		p1 = { x: exact(xVal), y: exact(ZERO_NODE) };
		p2 = { x: exact(xVal), y: exact(ONE_NODE) };
	}

	const pt1Id = figure.createFreePoint(p1, { visible: false, draggable: false });
	const pt2Id = figure.createFreePoint(p2, { visible: false, draggable: false });
	const lineId = figure.createLine(pt1Id, pt2Id, {
		label,
		equation: { a, b, c, expression: equation }
	});

	return { figureId: lineId, symbolType: 'droite' };
}

/**
 * Create a `GeoFunction` whose `expression` is a `PiecewiseNode`.
 *
 * Differs from `createFunctionFromCoefficients` in that:
 * - The expression is the parsed PiecewiseNode (no `g·y + h = 0` extraction).
 * - The symbolic derivative is computed per-branch via `differentiate`, then
 *   compiled. If differentiation throws (pathological branch content), we
 *   fall back to a constant-zero derivative so the curve still renders.
 * - The compiled function evaluates the piecewise via `compile(piecewiseNode)`.
 * - The slider/scalar dependencies are propagated for reactive re-render.
 */
function createPiecewiseFunctionFromAst(
	piecewiseNode: MathNode,
	dependencies: readonly string[],
	equation: string,
	figure: Figure,
	line: number,
	label?: string
): BuiltinResult {
	let compiledFn;
	try {
		compiledFn = compile(piecewiseNode);
	} catch (e) {
		throw new DslRuntimeError(
			`courbe(): impossible de compiler le piecewise — ${e instanceof Error ? e.message : ''}`,
			line
		);
	}

	let derivative: MathNode;
	let compiledDerivative: CompiledFn;
	try {
		derivative = differentiate(piecewiseNode, { variable: 'x', simplify: true });
		compiledDerivative = compile(derivative);
	} catch {
		derivative = ZERO_NODE;
		compiledDerivative = () => 0;
	}

	const fnId = figure.createFunction(
		piecewiseNode,
		derivative,
		compiledFn,
		compiledDerivative,
		equation,
		{
			label,
			dependencies: [...dependencies]
		}
	);

	return { figureId: fnId, symbolType: 'courbe' };
}

/** Create a GeoFunction from y = -h(x)/g(x) where F = g*y + h = 0. */
function createFunctionFromCoefficients(
	g: MathNode,
	h: MathNode,
	equation: string,
	figure: Figure,
	line: number,
	label?: string,
	domainResult?: ParseDomainResult
): BuiltinResult {
	// f(x) = -h / g. If g = 1, simplify to f(x) = -h.
	let f: MathNode;
	if (isZeroExpression(subtract(g, ONE_NODE))) {
		f = opposite(h);
	} else {
		f = divide(opposite(h), g);
	}

	// Compute f'(x) symbolically
	let fPrime: MathNode;
	try {
		fPrime = differentiate(f, { variable: 'x', simplify: true });
	} catch {
		throw new DslRuntimeError(`courbe(): impossible de calculer la dérivée de l'expression`, line);
	}

	// Compile both f and f' to fast closures
	let compiledFn, compiledDerivative;
	try {
		compiledFn = compile(f);
		compiledDerivative = compile(fPrime);
	} catch (e) {
		throw new DslRuntimeError(
			`courbe(): impossible de compiler l'expression — ${e instanceof Error ? e.message : ''}`,
			line
		);
	}

	const fnId = figure.createFunction(f, fPrime, compiledFn, compiledDerivative, equation, {
		label,
		...(domainResult
			? { domain: domainResult.domain, dependencies: domainResult.dependencies }
			: {})
	});

	return { figureId: fnId, symbolType: 'courbe' };
}

/** Create a GeoQuadraticCurve from extracted quadratic coefficients. */
function createQuadraticCurveFromCoefficients(
	F: MathNode,
	quadratic: { coefficients: ReadonlyMap<string, MathNode>; constant: MathNode },
	equation: string,
	figure: Figure,
	line: number,
	label?: string
): BuiltinResult {
	// Evaluate each coefficient to a number
	const evalCoeff = (key: string): number => {
		const node = quadratic.coefficients.get(key);
		if (!node) return 0;
		try {
			const fn = compile(node);
			const val = fn({});
			return typeof val === 'number' && Number.isFinite(val) ? val : 0;
		} catch {
			return 0;
		}
	};

	const evalConstant = (): number => {
		try {
			const fn = compile(quadratic.constant);
			const val = fn({});
			return typeof val === 'number' && Number.isFinite(val) ? val : 0;
		} catch {
			return 0;
		}
	};

	const A = evalCoeff('x^2');
	const B = evalCoeff('xy');
	const C = evalCoeff('y^2');
	const D = evalCoeff('x');
	const E = evalCoeff('y');
	const cst = evalConstant();

	const conic = classifyConic(A, B, C, D, E, cst);

	const qcId = figure.createQuadraticCurve(F, equation, [A, B, C, D, E, cst], conic, {
		label
	});

	return { figureId: qcId, symbolType: 'courbe' };
}

/** Create a general implicit curve F(x,y) = 0 rendered via marching squares. */
function createImplicitCurve(
	F: MathNode,
	compiledFn: CompiledFn,
	equation: string,
	figure: Figure,
	label?: string
): BuiltinResult {
	const icId = figure.createImplicitCurve(F, compiledFn, equation, { label });
	return { figureId: icId, symbolType: 'courbe' };
}

// =============================================================================
// courbe() — parametric branch (2 equations: x = ..., y = ...)
// =============================================================================

/**
 * Get the LHS variable name of an equation node (must be `x` or `y`),
 * or return the actual name if it is a single variable but not x/y, or null otherwise.
 */
function lhsVariableName(node: MathNode): string | null {
	if (isVariable(node)) return node.name;
	if (isGreek(node)) return node.letter;
	return null;
}

/** Parse one parametric equation string and check it is a Relation `x|y = RHS`.
 * Returns the LHS variable name and the RHS, throwing DSL errors with position-aware messages. */
function parseParametricEquation(
	eq: string,
	position: '1ère' | '2ème',
	line: number
): { lhs: string; rhs: MathNode } {
	let parsed: MathNode;
	try {
		parsed = parseCustom(eq);
	} catch {
		throw new DslRuntimeError(`courbe(): erreur de syntaxe dans "${eq}"`, line);
	}
	if (!isRelation(parsed) || parsed.relation !== '=') {
		throw new DslRuntimeError(
			`courbe(): ${position} équation invalide : attendu "x = ..." ou "y = ..." (reçu "${eq}")`,
			line
		);
	}
	const lhs = lhsVariableName(parsed.left);
	if (lhs === null) {
		throw new DslRuntimeError(
			`courbe(): ${position} équation invalide : LHS doit être x ou y (reçu "${eq}")`,
			line
		);
	}
	if (lhs !== 'x' && lhs !== 'y') {
		throw new DslRuntimeError(
			`courbe(): équation invalide : "${lhs}" non reconnu (utilise x, y)`,
			line
		);
	}
	return { lhs, rhs: parsed.right };
}

/** Resolve a named arg representing a t-bound to a ScalarParam (numeric or scalarRef). */
function resolveTBoundArg(
	val: ResolvedValue,
	name: string,
	toGeoValue: (v: ResolvedValue, line: number) => GeoValue,
	line: number
): ScalarParam {
	if (val.type === 'element' && val.elementType === 'scalar') {
		return { scalarRef: val.figureId };
	}
	if (val.type === 'nombre' || val.type === 'geoValue') {
		return toGeoValue(val, line);
	}
	throw new DslRuntimeError(`courbe(): ${name} doit être un nombre ou un scalaire/slider`, line);
}

/**
 * Substitute static numeric symbols (those bound to a `nombre` value in the
 * symbol table) directly into a MathNode. Scalar/slider references are left
 * as free variables (handled later via reactive dependencies).
 */
function substituteStaticBindings(node: MathNode, symbols: SymbolTable | undefined): MathNode {
	if (!symbols) return node;
	const staticBindings: Record<string, MathNode> = {};
	for (const v of getVariables(node)) {
		const entry = symbols.get(v);
		if (entry?.type === 'nombre') {
			staticBindings[v] = mathNumber((entry.value ?? 0).toString());
		}
	}
	if (Object.keys(staticBindings).length > 0) {
		return substitute(node, staticBindings);
	}
	return node;
}

/**
 * Resolve and validate t_min / t_max bounds (required, both ScalarParam-compatible,
 * tMin < tMax when both numeric). Optional `errorMessages` lets callers customize
 * messages for the polar branch (theta_min/theta_max instead of t_min/t_max).
 */
function resolveAndValidateBounds(
	named: Map<string, ResolvedValue>,
	keyMin: string,
	keyMax: string,
	toGeoValue: (v: ResolvedValue, line: number) => GeoValue,
	line: number,
	errorMessages: { missing: string; inverted: string }
): { tMin: ScalarParam; tMax: ScalarParam } {
	const tMinRaw = named.get(keyMin);
	const tMaxRaw = named.get(keyMax);
	if (tMinRaw === undefined || tMaxRaw === undefined) {
		throw new DslRuntimeError(errorMessages.missing, line);
	}
	const tMin = resolveTBoundArg(tMinRaw, keyMin, toGeoValue, line);
	const tMax = resolveTBoundArg(tMaxRaw, keyMax, toGeoValue, line);

	const tMinNum = !isScalarRef(tMin) && tMin.kind === 'numeric' ? tMin.value : null;
	const tMaxNum = !isScalarRef(tMax) && tMax.kind === 'numeric' ? tMax.value : null;
	if (tMinNum !== null && tMaxNum !== null && tMinNum >= tMaxNum) {
		throw new DslRuntimeError(errorMessages.inverted, line);
	}
	return { tMin, tMax };
}

/**
 * Shared back-end of the parametric and polar branches of `courbe()`.
 *
 * Given already-resolved x(t) and y(t) MathNodes plus the parameter name and
 * bounds, this helper handles:
 *   - Best-effort symbolic differentiation (dx/dt, dy/dt)
 *   - Mandatory compilation of x and y (failure → DslRuntimeError)
 *   - Best-effort compilation of derivatives (failure → null, sampler falls
 *     back to uniform sampling)
 *   - Reactive dependency collection (scalars/sliders referenced in x, y, tMin, tMax)
 *   - Element creation via `figure.createParametricCurve`, optionally tagging
 *     `polar` and `equationR` for polar curves.
 */
function buildParametricCurveFromXY(args: {
	xRhs: MathNode;
	yRhs: MathNode;
	parameterName: string;
	tMin: ScalarParam;
	tMax: ScalarParam;
	equationXOriginal: string;
	equationYOriginal: string;
	symbols: SymbolTable | undefined;
	figure: Figure;
	line: number;
	label: string | undefined;
	polar?: boolean;
	equationR?: string;
}): BuiltinResult {
	const {
		xRhs,
		yRhs,
		parameterName,
		tMin,
		tMax,
		equationXOriginal,
		equationYOriginal,
		symbols,
		figure,
		line,
		label,
		polar,
		equationR
	} = args;

	// --- F. Best-effort symbolic differentiation ---
	let xDerivative: MathNode | null = null;
	let yDerivative: MathNode | null = null;
	try {
		xDerivative = differentiate(xRhs, { variable: parameterName, simplify: true });
	} catch {
		xDerivative = null;
	}
	try {
		yDerivative = differentiate(yRhs, { variable: parameterName, simplify: true });
	} catch {
		yDerivative = null;
	}

	// --- G. Compile x(t) and y(t) (mandatory) ---
	let compiledX: CompiledFn;
	let compiledY: CompiledFn;
	try {
		compiledX = compile(xRhs);
	} catch (e) {
		throw new DslRuntimeError(
			`courbe(): impossible de compiler "${equationXOriginal}" — ${e instanceof Error ? e.message : ''}`,
			line
		);
	}
	try {
		compiledY = compile(yRhs);
	} catch (e) {
		throw new DslRuntimeError(
			`courbe(): impossible de compiler "${equationYOriginal}" — ${e instanceof Error ? e.message : ''}`,
			line
		);
	}

	// Compile derivatives best-effort. If compile fails, fall back to null
	// (sampler will use uniform sampling).
	let compiledXPrime: CompiledFn | null = null;
	let compiledYPrime: CompiledFn | null = null;
	if (xDerivative !== null) {
		try {
			compiledXPrime = compile(xDerivative);
		} catch {
			compiledXPrime = null;
			xDerivative = null;
		}
	}
	if (yDerivative !== null) {
		try {
			compiledYPrime = compile(yDerivative);
		} catch {
			compiledYPrime = null;
			yDerivative = null;
		}
	}

	// --- H. Collect reactive dependencies (scalars/sliders referenced anywhere) ---
	const dependencies = new Set<string>();
	if (symbols) {
		const xVars = getVariables(xRhs);
		const yVars = getVariables(yRhs);
		const allFreeVars = new Set<string>([...xVars, ...yVars]);
		allFreeVars.delete('x');
		allFreeVars.delete('y');
		allFreeVars.delete(parameterName);
		for (const name of allFreeVars) {
			const entry = symbols.get(name);
			if (entry?.type === 'scalar' && entry.figureId) {
				dependencies.add(entry.figureId);
			}
		}
	}
	if (isScalarRef(tMin)) dependencies.add(tMin.scalarRef);
	if (isScalarRef(tMax)) dependencies.add(tMax.scalarRef);

	const id = figure.createParametricCurve(
		xRhs,
		yRhs,
		xDerivative,
		yDerivative,
		compiledX,
		compiledY,
		compiledXPrime,
		compiledYPrime,
		parameterName,
		tMin,
		tMax,
		equationXOriginal,
		equationYOriginal,
		[...dependencies],
		{ label },
		polar,
		equationR
	);
	return { figureId: id, symbolType: 'courbe' };
}

/**
 * Build a parametric curve element from two equation strings (`x = ...`, `y = ...`).
 *
 * Algorithm:
 *   1. Parse both equations and ensure they are relations with LHS in {x, y}.
 *   2. Identify the x= and y= equation (order-independent).
 *   3. Validate t_min and t_max (required, both ScalarParam-compatible, t_min < t_max if numeric).
 *   4. Auto-detect the parameter (single free variable not in {x, y} ∪ defined symbols),
 *      or honor an explicit `param="..."` override.
 *   5–7. Differentiation, compilation, dependency collection, element creation
 *        (delegated to `buildParametricCurveFromXY`).
 */
function createParametricCurveFromEquations(
	eq1: string,
	eq2: string,
	named: Map<string, ResolvedValue>,
	figure: Figure,
	line: number,
	label: string | undefined,
	toGeoValue: (v: ResolvedValue, line: number) => GeoValue,
	symbols?: SymbolTable,
	angleMode: AngleMode = 'deg'
): BuiltinResult {
	// --- A. Parse both equations ---
	const { lhs: lhs1, rhs: rhs1 } = parseParametricEquation(eq1, '1ère', line);
	const { lhs: lhs2, rhs: rhs2 } = parseParametricEquation(eq2, '2ème', line);

	if (lhs1 === lhs2) {
		throw new DslRuntimeError(
			{
				summary: '`courbe()` paramétrique : il faut une équation en `x` et une en `y`.',
				hint: 'Exemple : `courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=2*pi)`.'
			},
			line
		);
	}

	// Apply the active angle mode to wrap any trig calls in each equation.
	let xRhs = applyAngleMode(lhs1 === 'x' ? rhs1 : rhs2, angleMode);
	let yRhs = applyAngleMode(lhs1 === 'y' ? rhs1 : rhs2, angleMode);
	const eqXOriginal = lhs1 === 'x' ? eq1 : eq2;
	const eqYOriginal = lhs1 === 'y' ? eq1 : eq2;

	// Substitute static variables (numbers in the symbol table) into the
	// equations BEFORE differentiation/compilation. Scalar references stay
	// symbolic (handled later via `dependencies`).
	xRhs = substituteStaticBindings(xRhs, symbols);
	yRhs = substituteStaticBindings(yRhs, symbols);

	// --- B. t_min / t_max validation ---
	const { tMin, tMax } = resolveAndValidateBounds(named, 't_min', 't_max', toGeoValue, line, {
		missing: 'courbe(): t_min et t_max obligatoires pour une courbe paramétrique',
		inverted: 'courbe(): t_max doit être strictement supérieur à t_min'
	});

	// --- C. Free-variable analysis ---
	const xVars = getVariables(xRhs);
	const yVars = getVariables(yRhs);
	const allVars = new Set<string>([...xVars, ...yVars]);
	allVars.delete('x');
	allVars.delete('y');

	// Defined symbols (scalars/sliders/etc. visible in the current scope).
	const definedSymbols = new Set<string>();
	if (symbols) {
		for (const [name] of symbols.allEntries()) {
			definedSymbols.add(name);
		}
	}

	// Candidates = variables free in expressions and not defined elsewhere.
	const candidates = [...allVars].filter((v) => !definedSymbols.has(v));
	candidates.sort();

	// --- D. Coherence: detect "different param in x vs y" before ambiguity check ---
	// Incoherent iff there exists a candidate variable exclusive to xRhs *and* a
	// (different) candidate variable exclusive to yRhs. Same variable in both
	// sides is fine — that's the normal case.
	const exclusiveX = candidates.filter((v) => xVars.has(v) && !yVars.has(v));
	const exclusiveY = candidates.filter((v) => yVars.has(v) && !xVars.has(v));
	if (exclusiveX.length > 0 && exclusiveY.length > 0) {
		throw new DslRuntimeError(
			`courbe(): paramètre incohérent : "${exclusiveX[0]}" en x, "${exclusiveY[0]}" en y`,
			line
		);
	}

	// --- E. Honor explicit param= or auto-detect ---
	let parameterName: string;
	const paramOverride = named.get('param');
	if (paramOverride !== undefined) {
		if (paramOverride.type !== 'string') {
			throw new DslRuntimeError(
				{
					summary: '`courbe()` : l’argument nommé `param` doit être une chaîne de caractères.',
					hint: 'Exemple : `courbe("x = u^2", "y = u", param="u", t_min=0, t_max=1)`.'
				},
				line
			);
		}
		parameterName = paramOverride.value;
		if (parameterName === 'x' || parameterName === 'y') {
			throw new DslRuntimeError(
				`courbe(): param ne peut pas être "x" ou "y" (réservés aux coordonnées)`,
				line
			);
		}
		if (!xVars.has(parameterName) && !yVars.has(parameterName)) {
			throw new DslRuntimeError(
				`courbe(): la variable "${parameterName}" n'apparaît pas dans les expressions`,
				line
			);
		}
	} else {
		if (candidates.length === 0) {
			throw new DslRuntimeError(
				{
					summary: '`courbe()` paramétrique : aucune variable de paramètre détectée.',
					hint: 'Le paramètre par défaut est `t`. Si vous utilisez un autre nom, précisez-le : `courbe(..., param="u", ...)`.'
				},
				line
			);
		}
		if (candidates.length >= 2) {
			throw new DslRuntimeError(
				`courbe(): paramètre ambigu : {${candidates.join(', ')}} ; précisez param="..."`,
				line
			);
		}
		parameterName = candidates[0];
	}

	return buildParametricCurveFromXY({
		xRhs,
		yRhs,
		parameterName,
		tMin,
		tMax,
		equationXOriginal: eqXOriginal,
		equationYOriginal: eqYOriginal,
		symbols,
		figure,
		line,
		label
	});
}

// =============================================================================
// courbe() — polar branch (1 equation: r = f(theta))
// =============================================================================

/**
 * Pre-substitute the user's textual `theta` ASCII with `\theta` LaTeX form so
 * that the custom parser produces a single GreekLetterNode (letter "theta")
 * instead of `t·h·e·t·a` implicit multiplication. Operates only on standalone
 * `theta` words (preceded by non-alphanumeric/underscore, no leading backslash,
 * not followed by alphanumeric/underscore).
 *
 * Examples:
 *   "r = 2*cos(theta)"     → "r = 2*cos(\\theta)"
 *   "r = sin(2*theta)"     → "r = sin(2*\\theta)"
 *   "r = \\theta"          → "r = \\theta"  (already LaTeX, untouched)
 *   "r = thetaplus"        → "r = thetaplus" (suffix attached, untouched)
 */
function normalizeThetaToLatex(eq: string): string {
	// Negative lookbehind: not preceded by a backslash (so \theta stays \theta)
	// nor by a word character. Word boundary on the right.
	return eq.replace(/(?<![\\\w])theta\b/g, '\\theta');
}

/**
 * Parse a polar equation string `r = f(theta)`. Returns the RHS MathNode and
 * the normalized RHS string (ASCII `theta`). Returns `null` (so the caller can
 * fall through to cartesian) when the LHS is not the variable `r`.
 *
 * Throws DslRuntimeError on syntax errors or non-relation input.
 */
function parsePolarEquation(eq: string, line: number): { rhs: MathNode; rhsString: string } | null {
	const normalized = normalizeThetaToLatex(eq);
	let parsed: MathNode;
	try {
		parsed = parseCustom(normalized);
	} catch {
		throw new DslRuntimeError(`courbe(): erreur de syntaxe dans "${eq}"`, line);
	}
	if (!isRelation(parsed) || parsed.relation !== '=') {
		// Not a relation → caller will handle (cartesian fallback or polar error).
		return null;
	}
	const lhs = lhsVariableName(parsed.left);
	if (lhs !== 'r') {
		// LHS is not r → not a polar equation. Caller should fall through.
		return null;
	}
	// Re-serialize the RHS in canonical custom form using ASCII theta.
	const rhsString = toCustom(parsed.right).replace(/\\theta/g, 'theta');
	return { rhs: parsed.right, rhsString };
}

/**
 * Build a parametric curve from a polar equation `r = f(theta)`.
 *
 * Algorithm:
 *   1. Reject t_min/t_max (polar requires theta_min/theta_max).
 *   2. Parse the equation; require LHS = `r`. If LHS != r and the user did not
 *      pass theta_min/theta_max, fall through to cartesian. Otherwise, error.
 *   3. Validate theta_min/theta_max (required, both ScalarParam-compatible,
 *      strict inequality if both numeric).
 *   4. Parameter is forced to `theta`. Reject any other free variable.
 *   5. Substitute static numeric symbols into the RHS.
 *   6. Build x(theta) = f(theta) * cos(theta), y(theta) = f(theta) * sin(theta)
 *      at the MathNode level. The trig calls are left in radians regardless of
 *      the active angle mode (polar branch always operates in radians).
 *   7. Delegate to `buildParametricCurveFromXY` with `polar=true` and the
 *      original RHS string preserved as `equationR`.
 */
function createPolarCurveFromEquation(
	eq: string,
	named: Map<string, ResolvedValue>,
	figure: Figure,
	line: number,
	label: string | undefined,
	toGeoValue: (v: ResolvedValue, line: number) => GeoValue,
	symbols?: SymbolTable
): BuiltinResult {
	// D4: t_min / t_max are wrong for polar — reject explicitly.
	if (named.has('t_min') || named.has('t_max')) {
		throw new DslRuntimeError(
			'courbe(): pour une courbe polaire, utiliser theta_min/theta_max (pas t_min/t_max)',
			line
		);
	}

	// --- A. Parse the polar equation ---
	const parsed = parsePolarEquation(eq, line);
	if (parsed === null) {
		throw new DslRuntimeError(
			`courbe(): équation polaire invalide : attendu "r = ..." (reçu "${eq}")`,
			line
		);
	}
	const { rhs: rhsRaw, rhsString } = parsed;

	// --- B. theta_min / theta_max validation (D1 + D2) ---
	const { tMin, tMax } = resolveAndValidateBounds(
		named,
		'theta_min',
		'theta_max',
		toGeoValue,
		line,
		{
			missing: 'courbe(): theta_min et theta_max obligatoires pour une courbe polaire',
			inverted: 'courbe(): theta_max doit être strictement supérieur à theta_min'
		}
	);

	// --- C. Substitute static numeric symbols, then validate free variables ---
	const rhs = substituteStaticBindings(rhsRaw, symbols);

	const rhsVars = getVariables(rhs);
	const definedSymbols = new Set<string>();
	if (symbols) {
		for (const [name] of symbols.allEntries()) {
			definedSymbols.add(name);
		}
	}
	// Free variables in rhs that are neither `theta` nor a defined symbol.
	// `x`, `y`, `r` are not special in the polar branch — if the user writes
	// `r = 1/x`, that's an unexpected variable and should error (D6).
	const freeOther = [...rhsVars].filter((v) => v !== 'theta' && !definedSymbols.has(v));
	if (freeOther.length > 0) {
		throw new DslRuntimeError(
			`courbe(): paramètre polaire attendu : theta (ou \\theta) — variable libre "${freeOther[0]}" non reconnue`,
			line
		);
	}

	// --- D. Build x(theta) = f(theta) * cos(theta), y(theta) = f(theta) * sin(theta) ---
	// The polar branch ALWAYS works in radians, regardless of the active
	// angleMode. We construct cos(theta) and sin(theta) directly without going
	// through `applyAngleMode`, and we also do NOT wrap the user's f(theta)
	// trig calls with the angle conversion.
	const thetaNode: MathNode = greek('theta');
	const cosTheta = cos(thetaNode);
	const sinTheta = sin(thetaNode);
	const xRhs = multiply(rhs, cosTheta);
	const yRhs = multiply(rhs, sinTheta);

	// Synthesize equationX/Y strings so existing serializer code can still
	// produce something coherent; the polar branch in the serializer will
	// override these in favor of the polar form.
	const equationXOriginal = `x = (${rhsString})*cos(theta)`;
	const equationYOriginal = `y = (${rhsString})*sin(theta)`;

	return buildParametricCurveFromXY({
		xRhs,
		yRhs,
		parameterName: 'theta',
		tMin,
		tMax,
		equationXOriginal,
		equationYOriginal,
		symbols,
		figure,
		line,
		label,
		polar: true,
		equationR: rhsString
	});
}

/** Create zero points (y=0 intersections) for a quadratic curve. */
function createQuadraticZeros(
	qcEl: { coefficients: readonly [number, number, number, number, number, number] },
	qcId: string,
	figure: Figure,
	line: number,
	label?: string,
	named?: Map<string, ResolvedValue>
): BuiltinMultiResult {
	const [A, _B, _C, D, _E, F] = qcEl.coefficients;
	// F(x, 0) = Ax² + Dx + F = 0
	const results: BuiltinResult[] = [];
	let xValues: number[] = [];

	if (Math.abs(A) < 1e-12) {
		// Linear in x: Dx + F = 0
		if (Math.abs(D) > 1e-12) {
			xValues = [-F / D];
		}
	} else {
		const disc = D * D - 4 * A * F;
		if (disc >= 0) {
			const sqrtDisc = Math.sqrt(disc);
			xValues = [(-D + sqrtDisc) / (2 * A), (-D - sqrtDisc) / (2 * A)];
			// Deduplicate if disc ≈ 0
			if (Math.abs(xValues[0] - xValues[1]) < 1e-10) {
				xValues = [xValues[0]];
			}
		}
	}

	for (const x of xValues) {
		// Create a free point at (x, 0) — not on the curve parametrically
		const ptId = figure.createFreePoint(
			{ x: numeric(x), y: numeric(0) },
			{ label: label ? `${label}${results.length + 1}` : undefined, draggable: false }
		);
		results.push({ figureId: ptId, symbolType: 'point' });
	}

	// Apply style from named args if any
	if (named?.has('couleur')) {
		const cv = named.get('couleur')!;
		const colorStr = cv.type === 'string' ? cv.value : '';
		const color = resolveColorName(colorStr);
		for (const r of results) {
			figure.updateStyle(r.figureId, { color });
		}
	}

	return { elements: results };
}
