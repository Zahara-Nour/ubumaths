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
	substitute,
	piConstant
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
import {
	isPointElement,
	isCircle,
	isCircleBy3Points,
	isSegment,
	isRay,
	isPolygon,
	isArcByAngles,
	isArcByPoints,
	isSector,
	isAnnulus,
	isConicPolar,
	isQuadraticCurve,
	isAngle,
	isVector,
	isVectorByPoints,
	isLine
} from '../types/elements';
import type { GeoVector, GeoSegment, GeoLine, GeoStyle } from '../types/elements';
import { intersectLL } from '../geometry/intersections';
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

/** Result for builtins that return a scalar number (norme, produit_scalaire). */
export interface BuiltinScalarResult {
	scalarValue: number;
}

function requireElement(val: ResolvedValue, name: string, line: number): string {
	if (val.type !== 'element') {
		const got =
			val.type === 'nombre'
				? `nombre \`${val.value}\``
				: val.type === 'string'
					? `chaîne \`"${val.value}"\``
					: val.type === 'tuple'
						? `tuple (${val.elements.length} éléments)`
						: val.type === 'geoValue'
							? 'valeur exacte'
							: 'valeur inconnue';
		throw new DslRuntimeError(
			{
				summary: `\`${name}\` doit être un élément géométrique, ${got} reçu.`,
				hint:
					val.type === 'nombre'
						? 'Pour passer un nombre à un builtin qui attend un point, utilisez `point(x, y)` d’abord.'
						: 'Vérifiez le type de la variable passée — elle doit avoir été créée par un builtin (`point`, `cercle`, …).'
			},
			line
		);
	}
	return val.figureId;
}

function requireNumber(val: ResolvedValue, name: string, line: number): number {
	if (val.type === 'nombre') return val.value;
	if (val.type === 'geoValue') {
		// Exact GeoValues (e.g. `2*sqrt(3)`) are evaluated to their numeric
		// representation here. Callers that require a strict integer (n in
		// `polygone_regulier(O, r, n)`) should validate downstream via
		// Number.isInteger().
		return geoToNumber(val.value);
	}
	const got =
		val.type === 'element'
			? `un élément géométrique`
			: val.type === 'string'
				? `une chaîne`
				: val.type === 'tuple'
					? `un tuple`
					: 'une valeur non numérique';
	throw new DslRuntimeError(
		{
			summary: `\`${name}\` doit être un nombre, ${got} reçu.`
		},
		line
	);
}

function requireTuple(val: ResolvedValue, name: string, line: number): ResolvedValue[] {
	if (val.type !== 'tuple') {
		throw new DslRuntimeError(`"${name}" n'est pas un tuple`, line);
	}
	return val.elements;
}

/**
 * A ResolvedValue is "numeric-like" when it represents a scalar coming from
 * a DSL literal or computation : either `{type: 'nombre', value}` (legacy
 * fallback path) or `{type: 'geoValue', value}` (exact-by-default path
 * since 2026-05-19). Used by builtins that branch between numeric-arg
 * overloads and point-arg overloads (e.g. `image(url, x, y, largeur=W)`
 * vs `image(url, p1, p2, ...)`).
 */
function isNumericLikeArg(val: ResolvedValue): boolean {
	return val.type === 'nombre' || val.type === 'geoValue';
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
	// Visibility is a top-level field on GeoElement (not in `style`), handled separately.
	if (named.has('visible')) {
		const vis = namedToBoolean(named.get('visible')!, 'visible', line);
		if (vis) figure.showElement(elId);
		else figure.hideElement(elId);
	}
}

/**
 * Coerce a DSL named-arg value to boolean. Booleans (`vrai` / `faux`) are
 * coerced to numbers (1/0) by the interpreter, so we accept nombre only.
 */
function namedToBoolean(val: ResolvedValue, argName: string, line: number): boolean {
	if (val.type === 'nombre') return val.value !== 0;
	throw new DslRuntimeError(
		{
			summary: `\`${argName}\` doit être un booléen (\`vrai\`/\`faux\`) ou un nombre (\`0\`/\`1\`).`
		},
		line
	);
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

const POINT_FORMS = [
	{ syntax: 'point(x, y)', description: 'point libre aux coordonnées `(x, y)`' },
	{
		syntax: 'point(s.value, 0)',
		description: 'point dont l’abscisse suit la valeur du slider `s`'
	},
	{
		syntax: 'point(A, longueur=5, angle=30)',
		description: 'point à `5` unités de `A`, angle 30°'
	},
	{
		syntax: 'point(A, longueur=5, direction=B)',
		description: 'point à `5` unités de `A`, dans la direction de `B`'
	},
	{
		syntax: 'point(A, longueur=5, vecteur=u)',
		description: 'point à `5` unités de `A`, dans la direction du vecteur `u`'
	}
];

/**
 * Compute a unit direction (dx, dy) from the named-arg variants supported
 * by point() and segment(): angle=θ (in current angle mode), direction=B
 * (towards a point), vecteur=u (along a vector).
 */
function resolveDirection(
	ctx: BuiltinCtx,
	Apos: { x: GeoValue; y: GeoValue }
): { dx: number; dy: number } {
	const { named, figure, line, angleMode } = ctx;

	// Detect ambiguous direction args : at most one of {angle, direction, vecteur}.
	const directionKeys = ['angle', 'direction', 'vecteur'].filter((k) => named.has(k));
	if (directionKeys.length > 1) {
		throw new DslRuntimeError(
			{
				summary: `Direction ambigüe : \`${directionKeys.join('=`, `')}=\` ne peuvent pas être combinés.`,
				hint: 'Choisissez **un seul** argument parmi `angle=`, `direction=` ou `vecteur=` pour spécifier la direction.'
			},
			line
		);
	}

	if (named.has('angle')) {
		const angleVal = requireNumber(named.get('angle')!, 'angle', line);
		const rad = toRadians(angleVal, angleMode);
		return { dx: Math.cos(rad), dy: Math.sin(rad) };
	}
	if (named.has('direction')) {
		const Bid = requireElement(named.get('direction')!, 'direction', line);
		const Bpos = figure.getPosition(Bid);
		if (!Bpos)
			throw new DslRuntimeError(
				{ summary: '`direction=` : impossible de résoudre la position du point cible.' },
				line
			);
		const ddx = geoToNumber(Bpos.x) - geoToNumber(Apos.x);
		const ddy = geoToNumber(Bpos.y) - geoToNumber(Apos.y);
		const norm = Math.sqrt(ddx * ddx + ddy * ddy);
		if (norm < 1e-15)
			throw new DslRuntimeError(
				{
					summary: '`direction=` : les deux points sont confondus, direction indéterminée.'
				},
				line
			);
		return { dx: ddx / norm, dy: ddy / norm };
	}
	if (named.has('vecteur')) {
		const Vid = requireElement(named.get('vecteur')!, 'vecteur', line);
		const vc = figure.getVectorComponents(Vid);
		if (!vc)
			throw new DslRuntimeError(
				{ summary: '`vecteur=` : composantes du vecteur non résolues.' },
				line
			);
		const vdx = geoToNumber(vc.dx);
		const vdy = geoToNumber(vc.dy);
		const norm = Math.sqrt(vdx * vdx + vdy * vdy);
		if (norm < 1e-15)
			throw new DslRuntimeError(
				{ summary: '`vecteur=` : vecteur nul, direction indéterminée.' },
				line
			);
		return { dx: vdx / norm, dy: vdy / norm };
	}
	// Default : horizontal (angle = 0)
	return { dx: 1, dy: 0 };
}

function handlePoint(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, toGeoValue, line, label } = ctx;

	// Form 2: point(A, longueur=L, ...) — polar offset from an existing point
	if (pos.length === 1 && pos[0].type === 'element' && named.has('longueur')) {
		const Aid = requireElement(pos[0], 'A', line);
		const Apos = figure.getPosition(Aid);
		if (!Apos)
			throw new DslRuntimeError(
				{ summary: '`point()` : impossible de résoudre la position du point de référence.' },
				line
			);
		const L = requireNumber(named.get('longueur')!, 'longueur', line);
		const dir = resolveDirection(ctx, Apos);
		const x = geoToNumber(Apos.x) + dir.dx * L;
		const y = geoToNumber(Apos.y) + dir.dy * L;
		const id = figure.createFreePoint({ x: numeric(x), y: numeric(y) }, { label });
		return { figureId: id, symbolType: 'point' };
	}

	// Form 1: point(x, y) — absolute coordinates (existing)
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`point()\` attend 2 arguments (abscisse, ordonnée), ${pos.length} reçu(s).`,
				forms: POINT_FORMS
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

	if (pos.length >= 3 && isNumericLikeArg(pos[1]) && isNumericLikeArg(pos[2])) {
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
		const x = requireNumber(pos[1], 'x', line);
		const y = requireNumber(pos[2], 'y', line);
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
		const dx = named.has('dx') ? requireNumber(named.get('dx')!, 'dx', line) : undefined;
		const dy = named.has('dy') ? requireNumber(named.get('dy')!, 'dy', line) : undefined;
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

	if (pos.length >= 3 && isNumericLikeArg(pos[0]) && isNumericLikeArg(pos[1])) {
		const x = requireNumber(pos[0], 'x', line);
		const y = requireNumber(pos[1], 'y', line);
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
		const dx = named.has('dx') ? requireNumber(named.get('dx')!, 'dx', line) : undefined;
		const dy = named.has('dy') ? requireNumber(named.get('dy')!, 'dy', line) : undefined;
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
	if (pos.length >= 3 && isNumericLikeArg(pos[0]) && isNumericLikeArg(pos[1])) {
		const x = requireNumber(pos[0], 'x', line);
		const y = requireNumber(pos[1], 'y', line);
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
		const dx = named.has('dx') ? requireNumber(named.get('dx')!, 'dx', line) : undefined;
		const dy = named.has('dy') ? requireNumber(named.get('dy')!, 'dy', line) : undefined;
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
	// Form 1: milieu(s) where s is a segment — midpoint of an existing segment
	if (pos.length === 1) {
		const sId = requireElement(pos[0], 'segment', line);
		const el = figure.getElementById(sId);
		if (!el || !isSegment(el)) {
			const hintForType: Record<string, string> = {
				circleByRadius: 'Pour le centre d’un cercle, utilisez `centre(c)`.',
				circleByPoint: 'Pour le centre d’un cercle, utilisez `centre(c)`.',
				circleBy3Points:
					'Pour le centre d’un cercle, utilisez `cercle_circonscrit()` qui expose `centre()`.',
				ray: 'Une demi-droite n’a pas de milieu (longueur infinie).',
				line: 'Une droite n’a pas de milieu (longueur infinie).',
				polygon:
					'Pour le centre d’un polygone à 4 sommets, utilisez `centre(p)` (intersection des diagonales).',
				freePoint: 'Vous avez passé un seul point. Pour le milieu de deux points : `milieu(A, B)`.',
				dependentPoint:
					'Vous avez passé un seul point. Pour le milieu de deux points : `milieu(A, B)`.'
			};
			const elType = el?.type ?? '?';
			throw new DslRuntimeError(
				{
					summary: '`milieu()` : avec 1 argument, doit recevoir un segment.',
					hint: hintForType[elType] ?? `Type reçu : \`${elType}\`.`,
					forms: [
						{ syntax: 'milieu(A, B)', description: 'milieu des points `A` et `B`' },
						{ syntax: 'milieu(s)', description: 'milieu du segment `s`' }
					]
				},
				line
			);
		}
		const id = figure.createMidpoint(el.startId, el.endId, { label });
		return { figureId: id, symbolType: 'point' };
	}
	// Form 2: milieu(A, B) — existing
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`milieu()\` attend 1 (un segment) ou 2 (deux points) arguments, ${pos.length} reçu(s).`,
				forms: [
					{ syntax: 'milieu(A, B)', description: 'milieu des points `A` et `B`' },
					{ syntax: 'milieu(s)', description: 'milieu du segment `s`' }
				]
			},
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

const SEGMENT_FORMS = [
	{ syntax: 'segment(A, B)', description: 'segment `[AB]` entre deux points existants' },
	{
		syntax: 'segment(A, longueur=5, angle=30)',
		description: 'segment depuis `A`, longueur 5, angle 30°'
	},
	{
		syntax: 'segment(A, longueur=5, direction=B)',
		description: 'segment depuis `A`, longueur 5, vers `B`'
	},
	{
		syntax: 'segment(A, longueur=5, vecteur=u)',
		description: 'segment depuis `A`, longueur 5, dans la direction de `u`'
	}
];

function handleSegment(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label } = ctx;

	// Form 2: segment(A, longueur=L, ...) — anonymous endpoint, returns the segment
	if (pos.length === 1 && pos[0].type === 'element' && named.has('longueur')) {
		const Aid = requireElement(pos[0], 'A', line);
		const Apos = figure.getPosition(Aid);
		if (!Apos)
			throw new DslRuntimeError(
				{
					summary: '`segment()` : impossible de résoudre la position du point de départ.'
				},
				line
			);
		const L = requireNumber(named.get('longueur')!, 'longueur', line);
		const dir = resolveDirection(ctx, Apos);
		const x = geoToNumber(Apos.x) + dir.dx * L;
		const y = geoToNumber(Apos.y) + dir.dy * L;
		// The endpoint is a byproduct — created visible by default, but the user
		// can hide it via `extremite(s, 2)` + `masque(...)` if desired.
		const Bid = figure.createFreePoint({ x: numeric(x), y: numeric(y) });
		const id = figure.createSegment(Aid, Bid, { label });
		return { figureId: id, symbolType: 'segment' };
	}

	// Form 1: segment(A, B) — two existing points (existing)
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`segment()\` : combinaison d'arguments non reconnue (${pos.length} positionnels).`,
				forms: SEGMENT_FORMS
			},
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
	if (angleArg.type === 'element' && angleArg.elementType === 'angle') {
		// Overload: rotation(P, α, centre=O) where α is a GeoAngle.
		// Derive (or reuse) its measure scalar in radians and use it as the angle.
		const angleId = angleArg.figureId;
		const angleEl = figure.getElementById(angleId);
		if (!angleEl || !isAngle(angleEl)) {
			throw new DslRuntimeError(
				{ summary: '`rotation()` : `angle=` doit référencer un angle valide.' },
				line
			);
		}
		const cachedId = angleEl.measureScalarIds?.rad;
		let scalarId: string | undefined;
		if (cachedId) {
			const cached = figure.getElementById(cachedId);
			if (
				cached &&
				cached.type === 'scalar' &&
				cached.scalarKind === 'angle_measure' &&
				(cached.unite ?? 'rad') === 'rad'
			) {
				scalarId = cachedId;
			}
		}
		if (!scalarId) {
			scalarId = figure.createScalarAngleMeasure(angleEl.p1Id, angleEl.vertexId, angleEl.p2Id, {
				unite: 'rad'
			});
			figure.setAngleMeasureScalarId(angleId, scalarId, 'rad');
		}
		angleRad = { scalarRef: scalarId };
	} else if (angleArg.type === 'element' && angleArg.elementType === 'scalar') {
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

/** Forms accepted by mesure() — used in error hints. */
const MESURE_FORMS = [
	{ syntax: 'mesure(α)', description: 'mesure réactive de l’angle `α` (radians par défaut)' },
	{
		syntax: 'mesure(α, unite="deg")',
		description: 'mesure de l’angle `α` en degrés'
	},
	{
		syntax: 'mesure(A, V, B)',
		description: 'mesure de l’angle géométrique `AVB` (sommet `V`)'
	},
	{
		syntax: 'mesure(u, v)',
		description: 'angle non orienté entre deux vecteurs `u` et `v`'
	}
];

/**
 * Read the optional `unite="rad"|"deg"` named arg for mesure(). Default 'rad'.
 */
function readMesureUnite(named: Map<string, ResolvedValue>, line: number): 'rad' | 'deg' {
	const u = requireEnumNamed<'rad' | 'deg'>(named, 'unite', ANGLE_UNITE_VALUES, line, 'mesure');
	return u ?? 'rad';
}

function handleMesure(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label } = ctx;
	if (pos.length === 0) {
		throw new DslRuntimeError(
			{
				summary: '`mesure()` attend au moins 1 argument.',
				forms: MESURE_FORMS
			},
			line
		);
	}

	// Case A — mesure(α) with α = GeoAngle
	if (pos.length === 1 && pos[0].type === 'element') {
		const el = figure.getElementById(pos[0].figureId);
		if (!el) {
			throw new DslRuntimeError(
				{
					summary: '`mesure()` : élément inconnu en argument.',
					forms: MESURE_FORMS
				},
				line
			);
		}
		if (isAngle(el)) {
			const unite = readMesureUnite(named, line);
			// Cache via measureScalarIds[unite] : reuse the per-unit slot if it
			// already holds a valid scalar with the matching kind/unit. Each
			// unit has its own slot so mixing rad/deg queries does not thrash.
			const cachedId = el.measureScalarIds?.[unite];
			if (cachedId) {
				const cached = figure.getElementById(cachedId);
				if (
					cached &&
					cached.type === 'scalar' &&
					cached.scalarKind === 'angle_measure' &&
					(cached.unite ?? 'rad') === unite
				) {
					return { figureId: cachedId, symbolType: 'scalar' };
				}
			}
			const scalarId = figure.createScalarAngleMeasure(el.p1Id, el.vertexId, el.p2Id, {
				unite,
				label
			});
			figure.setAngleMeasureScalarId(el.id, scalarId, unite);
			return { figureId: scalarId, symbolType: 'scalar' };
		}
		// Case D — mesure(u) with 1 vector
		if (isVector(el)) {
			throw new DslRuntimeError(
				{
					summary: '`mesure()` n’est pas défini pour un vecteur seul.',
					hint: 'Utilise `norme(u)` pour la longueur du vecteur ou `angle_polaire(O, u)` pour son angle polaire.',
					forms: [
						{ syntax: 'norme(u)', description: 'longueur du vecteur `u`' },
						{ syntax: 'mesure(u, v)', description: 'angle entre 2 vecteurs' }
					]
				},
				line
			);
		}
		// Case E — mesure(s) with segment
		if (isSegment(el)) {
			throw new DslRuntimeError(
				{
					summary: '`mesure()` n’est pas défini pour un segment.',
					hint: 'Utilise `longueur(s)`.',
					forms: [{ syntax: 'longueur(s)', description: 'longueur du segment `s`' }]
				},
				line
			);
		}
		// Case F — other element types (point, circle, line, etc.)
		throw new DslRuntimeError(
			{
				summary: `\`mesure()\` n’est pas défini pour le type \`${el.type}\`.`,
				hint: '`mesure()` s’applique uniquement aux angles (et accepte les surcharges `(A,V,B)` ou `(u,v)`).',
				forms: MESURE_FORMS
			},
			line
		);
	}

	// Case C — mesure(u, v) with 2 vectors
	if (pos.length === 2 && pos[0].type === 'element' && pos[1].type === 'element') {
		const e1 = figure.getElementById(pos[0].figureId);
		const e2 = figure.getElementById(pos[1].figureId);
		if (e1 && e2 && isVector(e1) && isVector(e2)) {
			const unite = readMesureUnite(named, line);
			const scalarId = figure.createScalarVectorsAngleMeasure(e1.id, e2.id, {
				unite,
				label
			});
			return { figureId: scalarId, symbolType: 'scalar' };
		}
	}

	// Case B — mesure(A, V, B) with 3 points → invisible GeoAngle + derived scalar
	if (pos.length === 3) {
		const ids = pos.map((p, i) => requireElement(p, `arg${i + 1}`, line));
		// Validate all 3 are points
		for (let i = 0; i < 3; i++) {
			const el = figure.getElementById(ids[i]);
			if (!el || !isPointElement(el)) {
				throw new DslRuntimeError(
					{
						summary: `\`mesure(A, V, B)\` : l’argument ${i + 1} doit être un point.`,
						forms: MESURE_FORMS
					},
					line
				);
			}
		}
		const unite = readMesureUnite(named, line);
		// B2 (V2) — Dedup via `createHiddenAngleFor`: the same triplet
		// (p1, vertex, p2) reuses the same hidden GeoAngle across repeated
		// `mesure(A, V, B)` calls. We then reuse the per-unit `measureScalarIds`
		// cache on that angle so the derived scalar is created at most once
		// per unit.
		const angleId = figure.createHiddenAngleFor(ids[0], ids[1], ids[2]);
		const cachedAngle = figure.getElementById(angleId);
		if (cachedAngle && isAngle(cachedAngle)) {
			const cachedScalarId = cachedAngle.measureScalarIds?.[unite];
			if (cachedScalarId) {
				const cachedScalar = figure.getElementById(cachedScalarId);
				if (
					cachedScalar &&
					cachedScalar.type === 'scalar' &&
					cachedScalar.scalarKind === 'angle_measure' &&
					(cachedScalar.unite ?? 'rad') === unite
				) {
					return { figureId: cachedScalarId, symbolType: 'scalar' };
				}
			}
		}
		const scalarId = figure.createScalarAngleMeasure(ids[0], ids[1], ids[2], {
			unite,
			label
		});
		figure.setAngleMeasureScalarId(angleId, scalarId, unite);
		return { figureId: scalarId, symbolType: 'scalar' };
	}

	// Fallback : Case F — unsupported arity / argument mix
	throw new DslRuntimeError(
		{
			summary: `\`mesure()\` : combinaison d’arguments non reconnue (${pos.length} argument(s)).`,
			forms: MESURE_FORMS
		},
		line
	);
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
	if (pos.length >= 3 && isNumericLikeArg(pos[0]) && isNumericLikeArg(pos[1])) {
		const x = requireNumber(pos[0], 'x', line);
		const y = requireNumber(pos[1], 'y', line);
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
		const dx = named.has('dx') ? requireNumber(named.get('dx')!, 'dx', line) : undefined;
		const dy = named.has('dy') ? requireNumber(named.get('dy')!, 'dy', line) : undefined;
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

const ANGLE_FORMS = [
	{
		syntax: 'angle(A, V, B)',
		description: 'angle géométrique au sommet `V` formé par les côtés `[VA)` et `[VB)`'
	},
	{
		syntax: 'angle(u, v)',
		description: 'angle non orienté entre 2 vecteurs `u` et `v` (dans `[0, π]`)'
	},
	{
		syntax: 'angle(seg1, seg2)',
		description: 'angle entre 2 segments sécants (vertex = intersection ou extrémité commune)'
	},
	{
		syntax: 'angle(d1, d2)',
		description: 'angle aigu entre 2 droites sécantes (dans `[0, π/2]`)'
	},
	{
		syntax: 'angle_polaire(O, P)',
		description: 'angle polaire du vecteur `OP` par rapport à l’axe `Ox`'
	}
];

const ANGLE_MARQUE_VALUES = new Set(['arc', 'arcs2', 'arcs3', 'carre', 'aucune']);
const ANGLE_ORIENTATION_VALUES = new Set(['direct', 'indirect', 'auto']);
const ANGLE_KIND_VALUES = new Set(['saillant', 'rentrant']);
const ANGLE_SHOWLABEL_VALUES = new Set(['aucun', 'nom', 'mesure', 'mesure+nom']);
const ANGLE_UNITE_VALUES = new Set(['rad', 'deg']);

function requireEnumNamed<T extends string>(
	named: Map<string, ResolvedValue>,
	key: string,
	allowed: Set<string>,
	line: number,
	callerName: string
): T | undefined {
	if (!named.has(key)) return undefined;
	const val = named.get(key)!;
	if (val.type !== 'string' || !allowed.has(val.value)) {
		const allowedStr = [...allowed].map((v) => `\`"${v}"\``).join(', ');
		throw new DslRuntimeError(
			{
				summary: `\`${callerName}()\` : valeur invalide pour \`${key}\`.`,
				hint: `Valeurs autorisées : ${allowedStr}.`
			},
			line
		);
	}
	return val.value as T;
}

/** Read all V1+V2 named angle options (marque, orientation, kind, showLabel, unite, arcRadiusPx, arcSpacingPx). */
function readAngleNamedOptions(
	named: Map<string, ResolvedValue>,
	line: number
): {
	marque?: 'arc' | 'arcs2' | 'arcs3' | 'carre' | 'aucune';
	orientation?: 'direct' | 'indirect' | 'auto';
	kind?: 'saillant' | 'rentrant';
	showLabel?: 'aucun' | 'nom' | 'mesure' | 'mesure+nom';
	unite?: 'rad' | 'deg';
	arcRadiusPx?: number;
	arcSpacingPx?: number;
} {
	const marque = requireEnumNamed<'arc' | 'arcs2' | 'arcs3' | 'carre' | 'aucune'>(
		named,
		'marque',
		ANGLE_MARQUE_VALUES,
		line,
		'angle'
	);
	const orientation = requireEnumNamed<'direct' | 'indirect' | 'auto'>(
		named,
		'orientation',
		ANGLE_ORIENTATION_VALUES,
		line,
		'angle'
	);
	const kind = requireEnumNamed<'saillant' | 'rentrant'>(
		named,
		'kind',
		ANGLE_KIND_VALUES,
		line,
		'angle'
	);
	const showLabel = requireEnumNamed<'aucun' | 'nom' | 'mesure' | 'mesure+nom'>(
		named,
		'showLabel',
		ANGLE_SHOWLABEL_VALUES,
		line,
		'angle'
	);
	const unite = requireEnumNamed<'rad' | 'deg'>(named, 'unite', ANGLE_UNITE_VALUES, line, 'angle');
	const arcRadiusPx = named.has('arcRadiusPx')
		? requireNumber(named.get('arcRadiusPx')!, 'arcRadiusPx', line)
		: undefined;
	let arcSpacingPx: number | undefined;
	if (named.has('arcSpacingPx')) {
		const raw = requireNumber(named.get('arcSpacingPx')!, 'arcSpacingPx', line);
		if (!Number.isFinite(raw) || raw <= 0) {
			throw new DslRuntimeError(
				{
					summary: `\`angle()\` : \`arcSpacingPx\` doit être un nombre strictement positif, \`${raw}\` reçu.`,
					hint: 'Choisis une valeur > 0 (défaut : 6 px).'
				},
				line
			);
		}
		arcSpacingPx = raw;
	}
	return { marque, orientation, kind, showLabel, unite, arcRadiusPx, arcSpacingPx };
}

/** Resolve a vector element's (dx, dy) from the live positions; throws on degenerate. */
function resolveVectorNumericComponents(
	v: GeoVector,
	figure: Figure,
	argName: string,
	line: number
): { dx: number; dy: number } {
	const comp = figure.getVectorComponents(v.id);
	if (!comp) {
		throw new DslRuntimeError(
			{
				summary: `\`angle(u, v)\` : composantes du vecteur \`${argName}\` non calculables.`,
				hint: 'Vérifie que le vecteur est bien défini (points ancrés existants).'
			},
			line
		);
	}
	const dx = geoToNumber(comp.dx);
	const dy = geoToNumber(comp.dy);
	if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < 1e-15) {
		throw new DslRuntimeError(
			{
				summary: `\`angle(u, v)\` : vecteur \`${argName}\` de norme nulle, angle indéterminé.`,
				hint: 'Les 2 vecteurs doivent être non nuls.'
			},
			line
		);
	}
	return { dx, dy };
}

/** Build a GeoAngle from 3 (resolved) point ids and the named-options block. */
function buildAngleFromPoints(
	p1Id: string,
	vertexId: string,
	p2Id: string,
	named: Map<string, ResolvedValue>,
	figure: Figure,
	line: number,
	label: string | undefined
): BuiltinResult {
	const opts = readAngleNamedOptions(named, line);
	const id = figure.createAngle(p1Id, vertexId, p2Id, {
		label,
		marque: opts.marque,
		orientation: opts.orientation,
		kind: opts.kind,
		showLabel: opts.showLabel,
		unite: opts.unite,
		arcRadiusPx: opts.arcRadiusPx,
		arcSpacingPx: opts.arcSpacingPx
	});
	return { figureId: id, symbolType: 'angle' };
}

/** V1 — angle(A, V, B) overload (3 points). */
function handleAngle3Points(
	pos: ResolvedValue[],
	named: Map<string, ResolvedValue>,
	figure: Figure,
	line: number,
	label: string | undefined
): BuiltinResult {
	const aP1Id = requireElement(pos[0], 'A', line);
	const aVId = requireElement(pos[1], 'V', line);
	const aP2Id = requireElement(pos[2], 'B', line);
	return buildAngleFromPoints(aP1Id, aVId, aP2Id, named, figure, line, label);
}

/**
 * V2/A2 — angle(u, v) overload (2 vectors).
 *
 * Réactivité au drag des sources :
 * - Cas A (bound + bound, partage startId) : vertex/p1/p2 = points existants, réactifs natifs.
 * - Cas B (bound + bound sans point commun, A2) : vertex = u.startId (réactif), p1 = u.endId
 *   (réactif), p2 = TranslatedPointByVector(u.startId, v.id) — point caché reactif au drag de v
 *   et au drag du vertex.
 * - Cas C (au moins un free vector) : freePoints synthétiques statiques (drag de l'anchor du
 *   free vector NON reactif). Limitation A2.x — voir plan lucky-watching-fairy.md.
 */
function handleAngleVectors(
	u: GeoVector,
	v: GeoVector,
	named: Map<string, ResolvedValue>,
	figure: Figure,
	line: number,
	label: string | undefined
): BuiltinResult {
	// Validate non-zero norms early (throws structured DslRuntimeError).
	const compU = resolveVectorNumericComponents(u, figure, 'u', line);
	const compV = resolveVectorNumericComponents(v, figure, 'v', line);

	// Degenerate: u === v (same id) → mesure = 0. Build a synthetic triplet
	// (vertex, p1, p2=duplicate-shifted) so the graph has no duplicate parents.
	if (u.id === v.id) {
		const anchorPos = u.type === 'vectorByPoints' ? figure.getPosition(u.startId) : null;
		const vx = anchorPos ? geoToNumber(anchorPos.x) : 0;
		const vy = anchorPos ? geoToNumber(anchorPos.y) : 0;
		const vertexId = figure.createFreePoint(
			{ x: numeric(vx), y: numeric(vy) },
			{ visible: false, draggable: false }
		);
		const p1Id = figure.createFreePoint(
			{ x: numeric(vx + compU.dx), y: numeric(vy + compU.dy) },
			{ visible: false, draggable: false }
		);
		const p2Id = figure.createFreePoint(
			{ x: numeric(vx + compU.dx), y: numeric(vy + compU.dy) },
			{ visible: false, draggable: false }
		);
		return buildAngleFromPoints(p1Id, vertexId, p2Id, named, figure, line, label);
	}

	// Cas A (V2, INCHANGÉ) — both vectorByPoints sharing a common start point: reuse points.
	if (isVectorByPoints(u) && isVectorByPoints(v) && u.startId === v.startId) {
		// Also handle the rare case where the two end points coincide (different
		// vectorByPoints but same endId), which would also duplicate parents.
		if (u.endId !== v.endId) {
			return buildAngleFromPoints(u.endId, u.startId, v.endId, named, figure, line, label);
		}
	}

	// Cas B (A2) — both vectorByPoints sans point commun : pleinement réactif.
	if (isVectorByPoints(u) && isVectorByPoints(v)) {
		const vertexId = u.startId;
		const p1Id = u.endId;
		// p2 = u.startId translaté par v → suit le drag de v ET du vertex.
		const p2Id = figure.createTranslatedPointByVector(vertexId, v.id, { visible: false });
		return buildAngleFromPoints(p1Id, vertexId, p2Id, named, figure, line, label);
	}

	// Cas C (différé, statique) — au moins un free vector : ancrage par anchorX/anchorY non
	// representé comme point dans le graphe, donc on retombe sur des freePoints synthétiques
	// capturant les positions à la construction. Drag de l'anchor du free vector NON reactif
	// (limitation A2.x).

	// Choose vertex anchor : start of u if bound (vectorByPoints), else (0,0).
	let vertexX = 0;
	let vertexY = 0;
	let vertexId: string | undefined;
	if (isVectorByPoints(u)) {
		const start = figure.getPosition(u.startId);
		if (start) {
			vertexX = geoToNumber(start.x);
			vertexY = geoToNumber(start.y);
			vertexId = u.startId;
		}
	} else if (isVectorByPoints(v)) {
		const start = figure.getPosition(v.startId);
		if (start) {
			vertexX = geoToNumber(start.x);
			vertexY = geoToNumber(start.y);
			vertexId = v.startId;
		}
	}

	if (vertexId === undefined) {
		vertexId = figure.createFreePoint(
			{ x: numeric(vertexX), y: numeric(vertexY) },
			{ visible: false, draggable: false }
		);
	}

	// p1 = vertex + u : reuse endId if u is bound and anchored on this vertex,
	// else synthetic.
	let p1Id: string;
	if (isVectorByPoints(u) && u.startId === vertexId) {
		p1Id = u.endId;
	} else {
		p1Id = figure.createFreePoint(
			{ x: numeric(vertexX + compU.dx), y: numeric(vertexY + compU.dy) },
			{ visible: false, draggable: false }
		);
	}

	// p2 = vertex + v : reuse endId if v is bound and anchored on this vertex,
	// else synthetic.
	let p2Id: string;
	if (isVectorByPoints(v) && v.startId === vertexId) {
		p2Id = v.endId;
	} else {
		p2Id = figure.createFreePoint(
			{ x: numeric(vertexX + compV.dx), y: numeric(vertexY + compV.dy) },
			{ visible: false, draggable: false }
		);
	}

	return buildAngleFromPoints(p1Id, vertexId, p2Id, named, figure, line, label);
}

/** V2 — angle(seg1, seg2) overload (2 segments). */
function handleAngleSegments(
	s1: GeoSegment,
	s2: GeoSegment,
	named: Map<string, ResolvedValue>,
	figure: Figure,
	line: number,
	label: string | undefined
): BuiltinResult {
	// Case (a) — shared endpoint.
	const shared = findSharedEndpoint(s1, s2);
	if (shared) {
		return buildAngleFromPoints(
			shared.other1,
			shared.commonId,
			shared.other2,
			named,
			figure,
			line,
			label
		);
	}

	// Case (b) — disjoint, compute intersection of support lines via intersectLL.
	const p1 = figure.getPosition(s1.startId);
	const p2 = figure.getPosition(s1.endId);
	const p3 = figure.getPosition(s2.startId);
	const p4 = figure.getPosition(s2.endId);
	if (!p1 || !p2 || !p3 || !p4) {
		throw new DslRuntimeError(
			{
				summary: '`angle(seg1, seg2)` : positions des extrémités non calculables.'
			},
			line
		);
	}
	const inter = intersectLL(p1, p2, p3, p4);
	if (!inter) {
		throw new DslRuntimeError(
			{
				summary: '`angle(seg1, seg2)` : les 2 segments sont parallèles, l’angle n’est pas défini.',
				hint: 'Utilise `angle(d1, d2)` si tu veux la mesure entre 2 droites parallèles (qui vaut 0 par convention) ou réordonne les segments.',
				forms: ANGLE_FORMS
			},
			line
		);
	}

	const ix = geoToNumber(inter.x);
	const iy = geoToNumber(inter.y);

	// p1/p2 = farthest endpoint of each segment from the intersection (IDs réactifs natifs).
	// Le choix far/near est figé à la construction mais les positions suivent au drag.
	const far1Id = farthestEndpoint(s1.startId, s1.endId, p1, p2, ix, iy);
	const far2Id = farthestEndpoint(s2.startId, s2.endId, p3, p4, ix, iy);

	// Cas E (A2) — vertex via createIntersectionLL : réactif aux 4 endpoints des 2 segments.
	// La détection de parallèles ci-dessus (intersectLL direct) reste, car createIntersectionLL
	// ne throw pas et retourne un id dont la position vaut null si parallèles.
	const vertexId = figure.createIntersectionLL(s1.id, s2.id, { visible: false });
	figure.hideElement(vertexId);
	return buildAngleFromPoints(far1Id, vertexId, far2Id, named, figure, line, label);
}

function findSharedEndpoint(
	s1: GeoSegment,
	s2: GeoSegment
): { commonId: string; other1: string; other2: string } | null {
	if (s1.startId === s2.startId)
		return { commonId: s1.startId, other1: s1.endId, other2: s2.endId };
	if (s1.startId === s2.endId)
		return { commonId: s1.startId, other1: s1.endId, other2: s2.startId };
	if (s1.endId === s2.startId) return { commonId: s1.endId, other1: s1.startId, other2: s2.endId };
	if (s1.endId === s2.endId) return { commonId: s1.endId, other1: s1.startId, other2: s2.startId };
	return null;
}

function farthestEndpoint(
	startId: string,
	endId: string,
	startPos: GeoPoint,
	endPos: GeoPoint,
	ix: number,
	iy: number
): string {
	const sx = geoToNumber(startPos.x);
	const sy = geoToNumber(startPos.y);
	const ex = geoToNumber(endPos.x);
	const ey = geoToNumber(endPos.y);
	const dStart = Math.hypot(sx - ix, sy - iy);
	const dEnd = Math.hypot(ex - ix, ey - iy);
	return dEnd >= dStart ? endId : startId;
}

/** V2 — angle(d1, d2) overload (2 lines). Acute-angle convention. */
function handleAngleLines(
	d1: GeoLine,
	d2: GeoLine,
	named: Map<string, ResolvedValue>,
	figure: Figure,
	line: number,
	label: string | undefined
): BuiltinResult {
	const p1 = figure.getPosition(d1.point1Id);
	const p2 = figure.getPosition(d1.point2Id);
	const p3 = figure.getPosition(d2.point1Id);
	const p4 = figure.getPosition(d2.point2Id);
	if (!p1 || !p2 || !p3 || !p4) {
		throw new DslRuntimeError(
			{
				summary: '`angle(d1, d2)` : positions des points support non calculables.'
			},
			line
		);
	}
	const inter = intersectLL(p1, p2, p3, p4);
	if (!inter) {
		throw new DslRuntimeError(
			{
				summary: '`angle(d1, d2)` : les 2 droites sont parallèles, l’angle n’est pas défini.',
				hint: '2 droites parallèles ont un angle de 0 (convention). Utilise `mesure(0)` ou réordonne les droites.',
				forms: ANGLE_FORMS
			},
			line
		);
	}

	// Direction vectors for d1 and d2 (utilisés pour figer le choix angle aigu à construction).
	const d1x = geoToNumber(p2.x) - geoToNumber(p1.x);
	const d1y = geoToNumber(p2.y) - geoToNumber(p1.y);
	const d2x = geoToNumber(p4.x) - geoToNumber(p3.x);
	const d2y = geoToNumber(p4.y) - geoToNumber(p3.y);
	const len1 = Math.hypot(d1x, d1y);
	const len2 = Math.hypot(d2x, d2y);
	if (len1 < 1e-15 || len2 < 1e-15) {
		throw new DslRuntimeError(
			{
				summary: '`angle(d1, d2)` : une droite a une direction dégénérée.'
			},
			line
		);
	}

	// A2 — vertex via createIntersectionLL : réactif au drag des 4 points support des 2 droites.
	const vertexId = figure.createIntersectionLL(d1.id, d2.id, { visible: false });
	figure.hideElement(vertexId);

	// p1/p2 : on crée 2 vecteurs cachés alignés avec d1/d2, et 2 points translatés depuis
	// le vertex via ces vecteurs → pleinement réactifs au drag des points support des droites
	// ET au drag du vertex. Convention angle aigu : si le produit scalaire des directions est
	// négatif, on inverse v2 en échangeant ses extrémités (figé à la construction — la mesure
	// suit le drag mais peut traverser π/2 sans re-swap dynamique, acceptable).
	const v1Id = figure.createVectorByPoints(d1.point1Id, d1.point2Id, { visible: false });
	figure.hideElement(v1Id);
	const dot = d1x * d2x + d1y * d2y;
	const v2Id =
		dot >= 0
			? figure.createVectorByPoints(d2.point1Id, d2.point2Id, { visible: false })
			: figure.createVectorByPoints(d2.point2Id, d2.point1Id, { visible: false });
	figure.hideElement(v2Id);

	const p1Id = figure.createTranslatedPointByVector(vertexId, v1Id, { visible: false });
	const p2Id = figure.createTranslatedPointByVector(vertexId, v2Id, { visible: false });

	return buildAngleFromPoints(p1Id, vertexId, p2Id, named, figure, line, label);
}

function handleAngle(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label } = ctx;

	// 3 points — V1 path, unchanged.
	if (pos.length === 3) {
		return handleAngle3Points(pos, named, figure, line, label);
	}

	// 2 args — V2 dispatch on element types.
	if (pos.length === 2) {
		const arg0 = pos[0];
		const arg1 = pos[1];
		if (arg0.type !== 'element' || arg1.type !== 'element') {
			throw new DslRuntimeError(
				{
					summary:
						'`angle()` à 2 arguments doit recevoir 2 éléments géométriques (vecteurs, segments ou droites).',
					hint: "Pour l'angle polaire d'un vecteur, utilise `angle_polaire(O, P)`.",
					forms: ANGLE_FORMS
				},
				line
			);
		}
		const el0 = figure.getElementById(arg0.figureId);
		const el1 = figure.getElementById(arg1.figureId);
		if (!el0 || !el1) {
			throw new DslRuntimeError(
				{
					summary: '`angle()` : élément introuvable.',
					forms: ANGLE_FORMS
				},
				line
			);
		}
		if (isVector(el0) && isVector(el1)) {
			return handleAngleVectors(el0, el1, named, figure, line, label);
		}
		if (isSegment(el0) && isSegment(el1)) {
			return handleAngleSegments(el0, el1, named, figure, line, label);
		}
		if (isLine(el0) && isLine(el1)) {
			return handleAngleLines(el0, el1, named, figure, line, label);
		}
		// Falls through if types are mixed or unsupported (e.g. 2 points).
		// Special-case 2 points → hint at angle_polaire (V1 message preserved).
		if (isPointElement(el0) || isPointElement(el1)) {
			throw new DslRuntimeError(
				{
					summary:
						'`angle()` à 2 arguments doit recevoir 2 éléments du même type (vecteurs, segments ou droites).',
					hint: "Pour l'angle polaire d'un vecteur `OP`, utilise `angle_polaire(O, P)`. Pour un angle géométrique à 3 points, ajoute le 3ᵉ point : `angle(A, V, B)`.",
					forms: ANGLE_FORMS
				},
				line
			);
		}
		throw new DslRuntimeError(
			{
				summary: '`angle()` à 2 arguments : types incompatibles.',
				hint: 'Les 2 arguments doivent être du même type : 2 vecteurs, 2 segments, ou 2 droites. Pour un point polaire, utilise `angle_polaire(O, P)`.',
				forms: ANGLE_FORMS
			},
			line
		);
	}

	throw new DslRuntimeError(
		{
			summary: `\`angle()\` attend 2 ou 3 arguments, ${pos.length} reçu(s).`,
			hint: 'Utilise `angle(A, V, B)` pour un angle géométrique, ou `angle(u, v)` / `angle(seg1, seg2)` / `angle(d1, d2)`.',
			forms: ANGLE_FORMS
		},
		line
	);
}
HANDLERS.set('angle', handleAngle);

function handleAnglePolaire(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2) {
		throw new DslRuntimeError(
			{
				summary: `\`angle_polaire()\` attend 2 points (O, P), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'angle_polaire(O, P)',
						description: 'angle polaire du vecteur `OP` = `atan2(P.y - O.y, P.x - O.x)` en radians'
					}
				]
			},
			line
		);
	}
	const oId = requireElement(pos[0], 'O', line);
	const pId = requireElement(pos[1], 'P', line);
	const id = figure.createScalarPolarAngle(oId, pId, { label });
	return { figureId: id, symbolType: 'scalar' };
}
HANDLERS.set('angle_polaire', handleAnglePolaire);

// =============================================================================
// V3a — transporte(α, V', direction)
// =============================================================================

const TRANSPORTE_FORMS = [
	{
		syntax: "transporte(α, V')",
		description: "report d'angle au sommet `V'` (direction par défaut : axe `Ox`)"
	},
	{
		syntax: "transporte(α, V', P)",
		description: "report avec direction = rayon `V' → P`"
	},
	{
		syntax: "transporte(α, V', vec=v)",
		description: 'report avec direction = vecteur `v` (normalisé)'
	},
	{
		syntax: "transporte(α, V', angle=θ)",
		description: 'report avec direction = angle polaire `θ` (en mode courant)'
	}
];

/**
 * V3a — Resolve the unit direction (dx, dy) at V' for the new angle β.
 * Priority : 3e positionnel point > vec= > angle= > défaut axe Ox.
 * Returns null on absence (only when no direction at all).
 */
function resolveTransporteDirection(
	ctx: BuiltinCtx,
	VprimePos: { x: GeoValue; y: GeoValue }
): { dx: number; dy: number } {
	const { pos, named, figure, line, angleMode } = ctx;

	const hasPositionalP = pos.length >= 3;
	const hasVec = named.has('vec');
	const hasAngle = named.has('angle');

	// Exclusivité : au plus une source de direction.
	const sources: string[] = [];
	if (hasPositionalP) sources.push('P');
	if (hasVec) sources.push('vec=');
	if (hasAngle) sources.push('angle=');
	if (sources.length > 1) {
		throw new DslRuntimeError(
			{
				summary: `\`transporte()\` : direction ambigüe — ${sources.join(', ')} ne peuvent pas être combinés.`,
				hint: 'Choisis **une seule** source de direction parmi : point positionnel `P`, `vec=v`, ou `angle=θ`.',
				forms: TRANSPORTE_FORMS
			},
			line
		);
	}

	// Mode 1 : 3e positionnel = point P → direction = unit(P − V').
	if (hasPositionalP) {
		const Pid = requireElement(pos[2], 'P', line);
		const Ppos = figure.getPosition(Pid);
		if (!Ppos) {
			throw new DslRuntimeError(
				{
					summary: '`transporte()` : impossible de résoudre la position du point de direction `P`.',
					forms: TRANSPORTE_FORMS
				},
				line
			);
		}
		const ddx = geoToNumber(Ppos.x) - geoToNumber(VprimePos.x);
		const ddy = geoToNumber(Ppos.y) - geoToNumber(VprimePos.y);
		const norm = Math.hypot(ddx, ddy);
		if (!Number.isFinite(norm) || norm < 1e-15) {
			throw new DslRuntimeError(
				{
					summary: "`transporte()` : direction nulle (`P` confondu avec `V'`).",
					hint: "Choisis un point `P` différent de `V'` pour fixer la direction du nouveau côté.",
					forms: TRANSPORTE_FORMS
				},
				line
			);
		}
		return { dx: ddx / norm, dy: ddy / norm };
	}

	// Mode 2 : vec=v → direction = unit(v).
	if (hasVec) {
		const vId = requireElement(named.get('vec')!, 'vec', line);
		const comp = figure.getVectorComponents(vId);
		if (!comp) {
			throw new DslRuntimeError(
				{
					summary: '`transporte()` : composantes du vecteur `vec=` non résolues.',
					forms: TRANSPORTE_FORMS
				},
				line
			);
		}
		const vdx = geoToNumber(comp.dx);
		const vdy = geoToNumber(comp.dy);
		const norm = Math.hypot(vdx, vdy);
		if (!Number.isFinite(norm) || norm < 1e-15) {
			throw new DslRuntimeError(
				{
					summary: '`transporte()` : vecteur direction de norme nulle.',
					hint: 'Le vecteur passé via `vec=` doit être non nul.',
					forms: TRANSPORTE_FORMS
				},
				line
			);
		}
		return { dx: vdx / norm, dy: vdy / norm };
	}

	// Mode 3 : angle=θ → direction = (cos θ, sin θ) en mode courant.
	if (hasAngle) {
		const thetaRaw = requireNumber(named.get('angle')!, 'angle', line);
		const rad = toRadians(thetaRaw, angleMode);
		return { dx: Math.cos(rad), dy: Math.sin(rad) };
	}

	// Défaut : axe Ox.
	return { dx: 1, dy: 0 };
}

function handleTransporte(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label } = ctx;

	// Arity check.
	if (pos.length < 2) {
		throw new DslRuntimeError(
			{
				summary: `\`transporte()\` attend au moins 2 arguments (α, V'), ${pos.length} reçu(s).`,
				hint: "Forme minimale : `transporte(α, V')` (direction par défaut = axe `Ox`).",
				forms: TRANSPORTE_FORMS
			},
			line
		);
	}

	// Arg 1 : α (GeoAngle).
	const alphaId = requireElement(pos[0], 'α', line);
	const alphaEl = figure.getElementById(alphaId);
	if (!alphaEl || !isAngle(alphaEl)) {
		throw new DslRuntimeError(
			{
				summary: '`transporte()` : le 1er argument doit être un angle (`GeoAngle`).',
				hint: 'Crée un angle avec `angle(A, V, B)` ou une de ses surcharges `angle(u, v)` / `angle(seg1, seg2)` / `angle(d1, d2)`.',
				forms: TRANSPORTE_FORMS
			},
			line
		);
	}

	// Arg 2 : V' (point).
	const VprimeId = requireElement(pos[1], "V'", line);
	const Vprime = figure.getElementById(VprimeId);
	if (!Vprime || !isPointElement(Vprime)) {
		throw new DslRuntimeError(
			{
				summary: "`transporte()` : le 2ᵉ argument doit être un point (le nouveau sommet `V'`).",
				forms: TRANSPORTE_FORMS
			},
			line
		);
	}

	// Refus si V' confondu avec sommet de α (les positions doivent être lisibles).
	if (VprimeId === alphaEl.vertexId) {
		throw new DslRuntimeError(
			{
				summary: "`transporte()` : le nouveau sommet `V'` est confondu avec celui de `α`.",
				hint: "Choisis un sommet `V'` différent du sommet de `α` (sinon il n'y a pas de report).",
				forms: TRANSPORTE_FORMS
			},
			line
		);
	}
	const VprimePos = figure.getPosition(VprimeId);
	const alphaVertexPos = figure.getPosition(alphaEl.vertexId);
	if (!VprimePos || !alphaVertexPos) {
		throw new DslRuntimeError(
			{
				summary: '`transporte()` : positions des sommets non calculables.',
				forms: TRANSPORTE_FORMS
			},
			line
		);
	}
	const vpx = geoToNumber(VprimePos.x);
	const vpy = geoToNumber(VprimePos.y);
	const avx = geoToNumber(alphaVertexPos.x);
	const avy = geoToNumber(alphaVertexPos.y);
	if (Math.hypot(vpx - avx, vpy - avy) < 1e-15) {
		throw new DslRuntimeError(
			{
				summary: "`transporte()` : `V'` est positionnellement confondu avec le sommet de `α`.",
				hint: "Choisis un sommet `V'` distinct du sommet de `α`.",
				forms: TRANSPORTE_FORMS
			},
			line
		);
	}

	// Direction unitaire au nouveau sommet.
	const dir = resolveTransporteDirection(ctx, VprimePos);

	// Mesure scalaire de α (en radians). Réutilise le cache si disponible.
	let scalarId = alphaEl.measureScalarIds?.rad;
	if (!scalarId) {
		scalarId = figure.createScalarAngleMeasure(alphaEl.p1Id, alphaEl.vertexId, alphaEl.p2Id, {
			unite: 'rad'
		});
		figure.setAngleMeasureScalarId(alphaEl.id, scalarId, 'rad');
	}
	const measureRad = figure.getScalarValue(scalarId);
	if (measureRad == null || !Number.isFinite(measureRad)) {
		throw new DslRuntimeError(
			{
				summary: '`transporte()` : mesure de `α` non calculable.',
				forms: TRANSPORTE_FORMS
			},
			line
		);
	}

	// Construire les 2 points témoins : p1' = V' + d̂, p2' = rotation(p1', V', θ).
	const p1x = vpx + dir.dx;
	const p1y = vpy + dir.dy;
	const cosT = Math.cos(measureRad);
	const sinT = Math.sin(measureRad);
	// Rotation autour de V' d'angle measureRad appliquée à (p1x − vpx, p1y − vpy) = (dx, dy).
	const dx2 = cosT * dir.dx - sinT * dir.dy;
	const dy2 = sinT * dir.dx + cosT * dir.dy;
	const p2x = vpx + dx2;
	const p2y = vpy + dy2;

	const p1Id = figure.createFreePoint(
		{ x: numeric(p1x), y: numeric(p1y) },
		{ visible: false, draggable: false }
	);
	const p2Id = figure.createFreePoint(
		{ x: numeric(p2x), y: numeric(p2y) },
		{ visible: false, draggable: false }
	);

	// Héritage de style depuis α (sauf override en named arg).
	// Options enum héritées via `named.has(...)` détection.
	const overrideMarque = requireEnumNamed<'arc' | 'arcs2' | 'arcs3' | 'carre' | 'aucune'>(
		named,
		'marque',
		ANGLE_MARQUE_VALUES,
		line,
		'transporte'
	);
	const overrideOrientation = requireEnumNamed<'direct' | 'indirect' | 'auto'>(
		named,
		'orientation',
		ANGLE_ORIENTATION_VALUES,
		line,
		'transporte'
	);
	const overrideKind = requireEnumNamed<'saillant' | 'rentrant'>(
		named,
		'kind',
		ANGLE_KIND_VALUES,
		line,
		'transporte'
	);
	const overrideShowLabel = requireEnumNamed<'aucun' | 'nom' | 'mesure' | 'mesure+nom'>(
		named,
		'showLabel',
		ANGLE_SHOWLABEL_VALUES,
		line,
		'transporte'
	);
	const overrideUnite = requireEnumNamed<'rad' | 'deg'>(
		named,
		'unite',
		ANGLE_UNITE_VALUES,
		line,
		'transporte'
	);
	const overrideArcRadius = named.has('arcRadiusPx')
		? requireNumber(named.get('arcRadiusPx')!, 'arcRadiusPx', line)
		: undefined;
	let overrideArcSpacing: number | undefined;
	if (named.has('arcSpacingPx')) {
		const raw = requireNumber(named.get('arcSpacingPx')!, 'arcSpacingPx', line);
		if (!Number.isFinite(raw) || raw <= 0) {
			throw new DslRuntimeError(
				{
					summary: `\`transporte()\` : \`arcSpacingPx\` doit être un nombre strictement positif, \`${raw}\` reçu.`,
					hint: 'Choisis une valeur > 0 (défaut hérité de α ou 6 px).'
				},
				line
			);
		}
		overrideArcSpacing = raw;
	}

	// Style fill : héritage depuis α.style + override via `remplissage=` / `opacite_fond=`.
	const inheritedStyle = alphaEl.style;
	const styleOverride: Record<string, unknown> = {};
	if (named.has('remplissage')) {
		const fv = named.get('remplissage')!;
		const fillStr = fv.type === 'string' ? fv.value : fv.type === 'nombre' ? String(fv.value) : '';
		styleOverride.fillColor = resolveColorName(fillStr);
	}
	if (named.has('opacite_fond')) {
		styleOverride.fillOpacity = requireNumber(named.get('opacite_fond')!, 'opacite_fond', line);
	}
	// Style trait : héritage de couleur trait, opacity, strokeWidth, dash via copy.
	// Si l'utilisateur passe `couleur=`, on délègue à applyInlineStyle plus loin.
	const finalStyle: Record<string, unknown> = {
		...(inheritedStyle ?? {}),
		...styleOverride
	};
	const hasStyle = Object.keys(finalStyle).length > 0;

	// Couleur trait : héritée du α si pas d'override `couleur=`.
	const inheritedColor = alphaEl.color;

	const angleOptions = {
		label,
		color: inheritedColor,
		marque: overrideMarque ?? alphaEl.marque,
		orientation: overrideOrientation ?? alphaEl.orientation,
		kind: overrideKind ?? alphaEl.kind,
		showLabel: overrideShowLabel ?? alphaEl.showLabel,
		unite: overrideUnite ?? alphaEl.unite,
		arcRadiusPx: overrideArcRadius ?? alphaEl.arcRadiusPx,
		arcSpacingPx: overrideArcSpacing ?? alphaEl.arcSpacingPx,
		...(hasStyle ? { style: finalStyle as GeoStyle } : {})
	};

	const newAngleId = figure.createAngle(p1Id, VprimeId, p2Id, angleOptions);

	// Style commun couleur trait via inline named (`couleur=`, `epaisseur=`, ...).
	applyInlineStyle(figure, newAngleId, named, line);

	return { figureId: newAngleId, symbolType: 'angle' };
}
HANDLERS.set('transporte', handleTransporte);

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

// ─── Accesseurs purs ───────────────────────────────────────────
// Ces builtins ne créent rien : ils retournent une référence à un élément
// déjà existant dans la figure. Aucun effet visuel.

function handleCentre(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 1)
		throw new DslRuntimeError(
			{
				summary: `\`centre()\` attend 1 argument, ${pos.length} reçu(s).`,
				forms: [
					{ syntax: 'centre(c)', description: 'centre du cercle, arc, secteur ou conique `c`' },
					{
						syntax: 'centre(quad)',
						description: 'intersection des diagonales d’un quadrilatère'
					}
				]
			},
			line
		);
	const elId = requireElement(pos[0], 'objet', line);
	const el = figure.getElementById(elId);
	if (!el)
		throw new DslRuntimeError({ summary: `\`centre()\` : élément \`${elId}\` introuvable.` }, line);

	// Direct centerId for circles (except 3-point), arcs, sectors, annulus, conicPolar
	if (
		(isCircle(el) && !isCircleBy3Points(el)) ||
		isArcByAngles(el) ||
		isArcByPoints(el) ||
		isSector(el) ||
		isAnnulus(el) ||
		isConicPolar(el)
	) {
		// All these have a centerId field
		const centerId = (el as unknown as { centerId: string }).centerId;
		// Re-expose with optional label override via createMidpoint-like "alias" point ?
		// Simpler: return the existing center as-is. If the user wants to apply a label,
		// they can `montre(centre(c), label="O")` after.
		return { figureId: centerId, symbolType: 'point' };
	}

	// 3-point circle: no stored center, must compute it
	if (isCircleBy3Points(el)) {
		throw new DslRuntimeError(
			{
				summary: '`centre()` : non supporté pour un cercle défini par 3 points.',
				hint:
					'Utilisez `cercle_circonscrit(A, B, C)` (qui expose le centre via `centre(c)`) ' +
					'plutôt que `cercle(A, B, C)` direct.'
			},
			line
		);
	}

	// Quadrilateral polygon: intersection of diagonals
	if (isPolygon(el)) {
		const verts = el.dependsOn;
		if (verts.length !== 4) {
			throw new DslRuntimeError(
				{
					summary: `\`centre()\` : non défini pour un polygone à ${verts.length} sommets.`,
					hint: '`centre()` n’est défini que pour les quadrilatères (intersection des diagonales).'
				},
				line
			);
		}
		// Intersection of (verts[0] verts[2]) and (verts[1] verts[3]) — create two
		// hidden diagonals then take the LL intersection. The diagonals are needed
		// because Figure's intersection API operates on line-like elements.
		const diag1 = figure.createLine(verts[0], verts[2]);
		figure.hideElement(diag1);
		const diag2 = figure.createLine(verts[1], verts[3]);
		figure.hideElement(diag2);
		const id = figure.createIntersectionLL(diag1, diag2, { label });
		return { figureId: id, symbolType: 'point' };
	}

	if (isQuadraticCurve(el)) {
		// Conic center (for ellipse, hyperbola — parabola has no center)
		throw new DslRuntimeError(
			{
				summary: '`centre()` sur conique : non encore implémenté pour les courbes quadratiques.',
				hint: 'Pour ellipse/hyperbole, le centre se calcule via les axes — utilisez `axes(c)`.'
			},
			line
		);
	}

	if (isSegment(el)) {
		throw new DslRuntimeError(
			{
				summary: '`centre()` : pas défini pour un segment.',
				hint: 'Pour le milieu d’un segment, utilisez `milieu(s)`.'
			},
			line
		);
	}

	throw new DslRuntimeError(
		{
			summary: `\`centre()\` : non défini pour le type \`${el.type}\`.`,
			hint: 'Accepte : cercle, arc, secteur, anneau, conique polaire, quadrilatère.'
		},
		line
	);
}
HANDLERS.set('centre', handleCentre);

/** Returns the (p1, p2) endpoints of a segment-like element in creation order. */
function getSegmentLikeEndpoints(el: GeoElement): { p1: string; p2: string } | null {
	if (isSegment(el)) return { p1: el.startId, p2: el.endId };
	if (isRay(el)) return { p1: el.originId, p2: el.throughId };
	return null;
}

function handleExtremite(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line } = ctx;
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`extremite()\` attend 2 arguments, ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'extremite(s, 1)',
						description: '1ʳᵉ extrémité du segment (1er point passé à `segment()`)'
					},
					{
						syntax: 'extremite(s, 2)',
						description: '2ᵉ extrémité du segment (2ᵉ point ou point calculé)'
					}
				]
			},
			line
		);
	const sId = requireElement(pos[0], 'segment', line);
	const el = figure.getElementById(sId);
	const endpoints = el ? getSegmentLikeEndpoints(el) : null;
	if (!endpoints) {
		const hintForType: Record<string, string> = {
			circleByRadius: 'Pour un cercle, le centre s’obtient avec `centre(c)`.',
			circleByPoint: 'Pour un cercle, le centre s’obtient avec `centre(c)`.',
			circleBy3Points: 'Pour un cercle, utilisez `cercle_circonscrit(...)` qui expose `centre()`.',
			polygon: 'Pour un polygone, utilisez `sommet(p, i)` ou `sommets(p)`.',
			line: 'Pour une droite, il n’y a pas d’extrémités (longueur infinie).',
			arcByAngles: 'Pour un arc, le centre s’obtient avec `centre(a)`.',
			arcByPoints: 'Pour un arc, le centre s’obtient avec `centre(a)`.',
			vectorByPoints: 'Pour un vecteur, ses points sont accessibles via la définition d’origine.'
		};
		const elType = el?.type ?? '?';
		throw new DslRuntimeError(
			{
				summary: '`extremite()` : le 1er argument doit être un segment ou une demi-droite.',
				hint: hintForType[elType] ?? `Type reçu : \`${elType}\`.`
			},
			line
		);
	}
	const i = requireNumber(pos[1], 'index', line);
	if (i !== 1 && i !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`extremite()\` : l’index doit être 1 ou 2, reçu ${i}.`,
				hint: '1 = 1er point passé à `segment()`, 2 = 2ᵉ point.'
			},
			line
		);
	return { figureId: i === 1 ? endpoints.p1 : endpoints.p2, symbolType: 'point' };
}
HANDLERS.set('extremite', handleExtremite);

function handleExtremites(ctx: BuiltinCtx): BuiltinMultiResult {
	const { pos, figure, line } = ctx;
	if (pos.length !== 1)
		throw new DslRuntimeError(
			{
				summary: `\`extremites()\` attend 1 argument (un segment), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'extremites(s)',
						description: 'retourne le tuple `(p1, p2)` des deux extrémités du segment'
					}
				]
			},
			line
		);
	const sId = requireElement(pos[0], 'segment', line);
	const el = figure.getElementById(sId);
	const endpoints = el ? getSegmentLikeEndpoints(el) : null;
	if (!endpoints)
		throw new DslRuntimeError(
			{
				summary: '`extremites()` : l’argument doit être un segment ou une demi-droite.'
			},
			line
		);
	return {
		elements: [
			{ figureId: endpoints.p1, symbolType: 'point' },
			{ figureId: endpoints.p2, symbolType: 'point' }
		]
	};
}
HANDLERS.set('extremites', handleExtremites);

function handleSommet(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line } = ctx;
	// Allow sommet(α) for angles (1-arg accessor : returns the vertex point).
	if (pos.length === 1) {
		const elId = requireElement(pos[0], 'angle', line);
		const el = figure.getElementById(elId);
		if (el && isAngle(el)) {
			return { figureId: el.vertexId, symbolType: 'point' };
		}
		throw new DslRuntimeError(
			{
				summary: '`sommet()` à 1 argument attend un angle.',
				hint: 'Pour un polygone, utilise `sommet(p, i)`.',
				forms: [
					{ syntax: 'sommet(α)', description: 'point sommet de l’angle `α`' },
					{
						syntax: 'sommet(p, i)',
						description: 'i-ième sommet du polygone `p` (1-indexé)'
					}
				]
			},
			line
		);
	}
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`sommet()\` attend 1 ou 2 arguments, ${pos.length} reçu(s).`,
				forms: [
					{ syntax: 'sommet(α)', description: 'point sommet de l’angle `α`' },
					{
						syntax: 'sommet(p, i)',
						description: 'i-ième sommet du polygone (1-indexé, dans l’ordre de création)'
					}
				]
			},
			line
		);
	const polyId = requireElement(pos[0], 'polygone', line);
	const el = figure.getElementById(polyId);
	// 2-arg form on an angle is unusual ; route to a friendly error.
	if (el && isAngle(el)) {
		throw new DslRuntimeError(
			{
				summary: '`sommet(α, i)` n’existe pas pour un angle.',
				hint: 'Utilise `sommet(α)` pour le sommet et `cote(α, 1)` ou `cote(α, 2)` pour les côtés.'
			},
			line
		);
	}
	if (!el || !isPolygon(el)) {
		const hintForType: Record<string, string> = {
			segment: 'Pour les extrémités d’un segment, utilisez `extremite(s, 1)` ou `extremite(s, 2)`.',
			ray: 'Pour les extrémités d’une demi-droite, utilisez `extremite(r, 1)` ou `extremite(r, 2)`.',
			circleByRadius: 'Un cercle n’a pas de sommets ; pour son centre utilisez `centre(c)`.',
			circleByPoint: 'Un cercle n’a pas de sommets ; pour son centre utilisez `centre(c)`.',
			triangle:
				'Les triangles stdlib retournent maintenant un polygone : `t = triangle_equilateral(A, B)` puis `sommet(t, 3)`.'
		};
		const elType = el?.type ?? '?';
		throw new DslRuntimeError(
			{
				summary: '`sommet()` : le 1er argument doit être un polygone.',
				hint: hintForType[elType] ?? `Type reçu : \`${elType}\`.`
			},
			line
		);
	}
	const i = requireNumber(pos[1], 'index', line);
	if (!Number.isInteger(i) || i < 1 || i > el.dependsOn.length)
		throw new DslRuntimeError(
			{
				summary: `\`sommet()\` : l’index doit être un entier entre 1 et ${el.dependsOn.length}, reçu ${i}.`
			},
			line
		);
	return { figureId: el.dependsOn[i - 1], symbolType: 'point' };
}
HANDLERS.set('sommet', handleSommet);

function handleCote(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line } = ctx;
	const COTE_FORMS = [
		{ syntax: 'cote(α, 1)', description: 'point côté 1 de l’angle (= `p1`)' },
		{ syntax: 'cote(α, 2)', description: 'point côté 2 de l’angle (= `p2`)' }
	];
	if (pos.length !== 2) {
		throw new DslRuntimeError(
			{
				summary: `\`cote()\` attend 2 arguments (α, i), ${pos.length} reçu(s).`,
				forms: COTE_FORMS
			},
			line
		);
	}
	const angleId = requireElement(pos[0], 'α', line);
	const angleEl = figure.getElementById(angleId);
	if (!angleEl || !isAngle(angleEl)) {
		throw new DslRuntimeError(
			{
				summary: '`cote()` attend un angle en premier argument.',
				hint: 'Crée un angle avec `angle(A, V, B)`.',
				forms: COTE_FORMS
			},
			line
		);
	}
	const idx = requireNumber(pos[1], 'index', line);
	if (!Number.isInteger(idx) || (idx !== 1 && idx !== 2)) {
		throw new DslRuntimeError(
			{
				summary: `\`cote()\` : l’index doit être 1 ou 2, reçu ${idx}.`,
				forms: COTE_FORMS
			},
			line
		);
	}
	return {
		figureId: idx === 1 ? angleEl.p1Id : angleEl.p2Id,
		symbolType: 'point'
	};
}
HANDLERS.set('cote', handleCote);

function handleSommets(ctx: BuiltinCtx): BuiltinMultiResult {
	const { pos, figure, line } = ctx;
	if (pos.length !== 1)
		throw new DslRuntimeError(
			{
				summary: `\`sommets()\` attend 1 argument (un polygone), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'sommets(p)',
						description: 'retourne le tuple de tous les sommets, dans l’ordre de création'
					}
				]
			},
			line
		);
	const polyId = requireElement(pos[0], 'polygone', line);
	const el = figure.getElementById(polyId);
	if (!el || !isPolygon(el))
		throw new DslRuntimeError({ summary: '`sommets()` : l’argument doit être un polygone.' }, line);
	return {
		elements: el.dependsOn.map((vId) => ({ figureId: vId, symbolType: 'point' as SymbolType }))
	};
}
HANDLERS.set('sommets', handleSommets);

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

// ─── Verbes de visibilité ──────────────────────────────────────

function handleMontre(ctx: BuiltinCtx): null {
	const { pos, named, figure, line } = ctx;
	if (pos.length !== 1)
		throw new DslRuntimeError(
			{
				summary: `\`montre()\` attend 1 argument (l’élément à afficher), ${pos.length} reçu(s).`,
				forms: [
					{ syntax: 'montre(O)', description: 'rend l’élément visible' },
					{
						syntax: 'montre(O, couleur="rouge", forme="croix")',
						description: 'visible + applique le style en un coup'
					}
				]
			},
			line
		);
	const elId = requireElement(pos[0], 'element', line);
	const el = figure.getElementById(elId);
	if (!el)
		throw new DslRuntimeError({ summary: `\`montre()\` : élément \`${elId}\` introuvable.` }, line);
	figure.showElement(elId);
	// Apply any additional style args in one shot.
	if (named.size > 0) {
		applyInlineStyle(figure, elId, named, line);
	}
	return null;
}
HANDLERS.set('montre', handleMontre);

function handleMasque(ctx: BuiltinCtx): null {
	const { pos, figure, line } = ctx;
	if (pos.length !== 1)
		throw new DslRuntimeError(
			{
				summary: `\`masque()\` attend 1 argument (l’élément à cacher), ${pos.length} reçu(s).`,
				forms: [{ syntax: 'masque(O)', description: 'rend l’élément invisible' }]
			},
			line
		);
	const elId = requireElement(pos[0], 'element', line);
	const el = figure.getElementById(elId);
	if (!el)
		throw new DslRuntimeError({ summary: `\`masque()\` : élément \`${elId}\` introuvable.` }, line);
	figure.hideElement(elId);
	return null;
}
HANDLERS.set('masque', handleMasque);

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

// ════════════════════════════════════════════════════════════════════
// Stdlib builtins — migrated from dsl/stdlib.ts
// ════════════════════════════════════════════════════════════════════
//
// These builtins replace the former stdlib macros. Each produces a single
// primary object; intermediate computed points are created directly with
// `visible: false` (no createElement+masque round-trip).
//
// The DSL `macro foo(...): ...` mechanism remains intact, reserved for
// user-defined construction recordings.

/** Resolve a positional point arg to its math (x, y) coordinates. */
function pointXY(
	figure: Figure,
	val: ResolvedValue,
	name: string,
	line: number
): { x: number; y: number } {
	const id = requireElement(val, name, line);
	const pos = figure.getPosition(id);
	if (!pos) throw new DslRuntimeError({ summary: `Position de \`${name}\` introuvable.` }, line);
	return { x: geoToNumber(pos.x), y: geoToNumber(pos.y) };
}

/** Require N positional point args and return their IDs + math coords. */
function requireNPoints(
	ctx: BuiltinCtx,
	expected: number,
	names: string[],
	macroName: string,
	syntaxForm: { syntax: string; description: string }
): { ids: string[]; coords: { x: number; y: number }[] } {
	const { pos, figure, line } = ctx;
	if (pos.length !== expected)
		throw new DslRuntimeError(
			{
				summary: `\`${macroName}()\` attend ${expected} points (${names.join(', ')}), ${pos.length} argument(s) reçu(s).`,
				forms: [syntaxForm]
			},
			line
		);
	const ids: string[] = [];
	const coords: { x: number; y: number }[] = [];
	for (let i = 0; i < expected; i++) {
		const id = requireElement(pos[i], names[i], line);
		const xy = pointXY(figure, pos[i], names[i], line);
		ids.push(id);
		coords.push(xy);
	}
	return { ids, coords };
}

/**
 * Exact rotation angle = (num/denom) * pi (in radians).
 *
 * For remarkable values (pi/2, pi/3, pi/4, pi/6), MathAST evaluate(mode:'exact')
 * knows cos/sin exactly, so `figure.createRotatedPoint(P, C, exactPiFraction(...))`
 * keeps the derived point's coordinates exact when the source coordinates are exact.
 *
 * cf. `geometry/transformations.ts` (geoCos / geoSin).
 */
function exactPiFraction(num: number, denom: number): GeoValue {
	if (num === 0) return numeric(0);
	let numerator: MathNode;
	if (num === 1) numerator = piConstant();
	else if (num === -1) numerator = opposite(piConstant());
	else numerator = multiply(mathNumber(num), piConstant(), 'implicit');
	if (denom === 1) return exact(numerator);
	return exact(divide(numerator, mathNumber(denom), 'fraction'));
}

/** Pre-built constants for the most common angles. */
const PI_OVER_2 = exactPiFraction(1, 2);
const PI_OVER_3 = exactPiFraction(1, 3);
const NEG_PI_OVER_2 = exactPiFraction(-1, 2);

/** Create a hidden derived point and ensure it is not visible. */
function createHiddenMidpoint(figure: Figure, aId: string, bId: string): string {
	const id = figure.createMidpoint(aId, bId);
	figure.hideElement(id);
	return id;
}

function createHiddenRotatedPoint(
	figure: Figure,
	sourceId: string,
	centerId: string,
	angle: ScalarParam
): string {
	const id = figure.createRotatedPoint(sourceId, centerId, angle, { visible: false });
	return id;
}

function createHiddenTranslatedPoint(
	figure: Figure,
	sourceId: string,
	vectorStartId: string,
	vectorEndId: string
): string {
	const id = figure.createTranslatedPoint(sourceId, vectorStartId, vectorEndId, { visible: false });
	return id;
}

function createHiddenLine(figure: Figure, aId: string, bId: string): string {
	const id = figure.createLine(aId, bId);
	figure.hideElement(id);
	return id;
}

function createHiddenIntersectionLL(figure: Figure, l1Id: string, l2Id: string): string {
	const id = figure.createIntersectionLL(l1Id, l2Id);
	figure.hideElement(id);
	return id;
}

/** Build the perpendicular bisector of [AB] as a hidden dynamic line. */
function buildPerpendicularBisector(figure: Figure, aId: string, bId: string): string {
	const M = createHiddenMidpoint(figure, aId, bId);
	const H = createHiddenRotatedPoint(figure, aId, M, PI_OVER_2);
	return createHiddenLine(figure, M, H);
}

/** Build the altitude from vertex A in triangle ABC as a hidden dynamic line. */
function buildAltitudeFromA(figure: Figure, aId: string, bId: string, cId: string): string {
	// Translate A by vector BC → Q  (so vec AQ = BC, line AQ // line BC)
	const Q = createHiddenTranslatedPoint(figure, aId, bId, cId);
	// Rotate Q around A by π/2 → R  (so AR ⊥ AQ, hence AR ⊥ BC)
	const R = createHiddenRotatedPoint(figure, Q, aId, PI_OVER_2);
	return createHiddenLine(figure, aId, R);
}

/** Build the angular bisector at vertex V of angle AVB as a hidden dynamic line (compass construction). */
function buildAngularBisector(figure: Figure, aId: string, vId: string, bId: string): string {
	const dVA = figure.createScalarDistance(vId, aId);
	const dVB = figure.createScalarDistance(vId, bId);
	const ratio = figure.createScalarExpression(
		(s) => {
			const a = s.get(dVA);
			const b = s.get(dVB);
			if (a == null || b == null || b === 0) return 1;
			return a / b;
		},
		[dVA, dVB]
	);
	const Bprime = figure.createDilatedPoint(bId, vId, { scalarRef: ratio }, { visible: false });
	const M = createHiddenMidpoint(figure, aId, Bprime);
	return createHiddenLine(figure, vId, M);
}

// ─── 1. mediatrice(A, B) → droite ───────────────────────────────────

function handleMediatrice(ctx: BuiltinCtx): BuiltinResult {
	const { figure, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 2, ['A', 'B'], 'mediatrice', {
		syntax: 'mediatrice(A, B)',
		description: 'médiatrice du segment `[AB]`'
	});
	const [Aid, Bid] = ids;
	const [A, B] = coords;
	const ddx = B.x - A.x;
	const ddy = B.y - A.y;
	if (ddx * ddx + ddy * ddy < 1e-30)
		throw new DslRuntimeError(
			{
				summary:
					'`mediatrice(A, B)` : les points `A` et `B` sont confondus, la médiatrice n’est pas définie.'
			},
			line
		);
	// M = midpoint(A, B), H = rotation of A around M by π/2 → H is on the perpendicular at M
	const M = createHiddenMidpoint(figure, Aid, Bid);
	const H = createHiddenRotatedPoint(figure, Aid, M, PI_OVER_2);
	const id = figure.createLine(M, H, { label });
	return { figureId: id, symbolType: 'droite' };
}
HANDLERS.set('mediatrice', handleMediatrice);

// ─── 2. perpendiculaire(P, A, B) → droite ───────────────────────────

function handlePerpendiculaire(ctx: BuiltinCtx): BuiltinResult {
	const { figure, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 3, ['P', 'A', 'B'], 'perpendiculaire', {
		syntax: 'perpendiculaire(P, A, B)',
		description: 'droite passant par `P`, perpendiculaire à la droite `(AB)`'
	});
	const [Pid, Aid, Bid] = ids;
	const [, A, B] = coords;
	const dx = B.x - A.x;
	const dy = B.y - A.y;
	if (dx * dx + dy * dy < 1e-30)
		throw new DslRuntimeError(
			{ summary: '`perpendiculaire(P, A, B)` : `A` et `B` sont confondus, direction indéfinie.' },
			line
		);
	// Q = P + (B - A) → (PQ) // (AB). Then R = rotation of Q around P by π/2 → (PR) ⊥ (AB).
	const Q = createHiddenTranslatedPoint(figure, Pid, Aid, Bid);
	const R = createHiddenRotatedPoint(figure, Q, Pid, PI_OVER_2);
	const id = figure.createLine(Pid, R, { label });
	return { figureId: id, symbolType: 'droite' };
}
HANDLERS.set('perpendiculaire', handlePerpendiculaire);

// ─── 3. parallele(P, A, B) → droite ─────────────────────────────────

function handleParallele(ctx: BuiltinCtx): BuiltinResult {
	const { figure, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 3, ['P', 'A', 'B'], 'parallele', {
		syntax: 'parallele(P, A, B)',
		description: 'droite passant par `P`, parallèle à la droite `(AB)`'
	});
	const [Pid, Aid, Bid] = ids;
	const [, A, B] = coords;
	const dx = B.x - A.x;
	const dy = B.y - A.y;
	if (dx * dx + dy * dy < 1e-30)
		throw new DslRuntimeError(
			{ summary: '`parallele(P, A, B)` : `A` et `B` sont confondus, direction indéfinie.' },
			line
		);
	// Q = P + (B - A): (PQ) parallèle à (AB).
	const Q = createHiddenTranslatedPoint(figure, Pid, Aid, Bid);
	const id = figure.createLine(Pid, Q, { label });
	return { figureId: id, symbolType: 'droite' };
}
HANDLERS.set('parallele', handleParallele);

// ─── 4. mediane(A, B, C) → segment ──────────────────────────────────

function handleMediane(ctx: BuiltinCtx): BuiltinResult {
	const { figure, label } = ctx;
	const { ids } = requireNPoints(ctx, 3, ['A', 'B', 'C'], 'mediane', {
		syntax: 'mediane(A, B, C)',
		description: 'médiane du triangle `ABC` issue de `A` (segment vers le milieu de `[BC]`)'
	});
	const [Aid, Bid, Cid] = ids;
	const M = createHiddenMidpoint(figure, Bid, Cid);
	const id = figure.createSegment(Aid, M, { label });
	return { figureId: id, symbolType: 'segment' };
}
HANDLERS.set('mediane', handleMediane);

// ─── 5. bissectrice(A, V, B) → droite ───────────────────────────────
//
// Compass construction (dynamic) :
//   B' = dilation of B around V by ratio |VA|/|VB|  →  on the half-line (V,B), |VB'| = |VA|
//   M  = midpoint(A, B')                            →  M is on the angular bisector
//   bisector = line(V, M)
//
// All intermediates use factory methods, so a drag of A, V, or B propagates correctly.

const BISSECTRICE_FORMS = [
	{
		syntax: 'bissectrice(A, V, B)',
		description: 'bissectrice de l’angle `AVB` (sommet `V`)'
	},
	{
		syntax: 'bissectrice(α)',
		description: 'bissectrice de l’angle `α` (équivaut à `bissectrice(p1, V, p2)`)'
	}
];

/**
 * Build the bisector line for points (Aid, Vid, Bid). Throws structured errors
 * if any pair is coincident or the three points form a flat opposed configuration.
 */
function buildBisectorLine(
	ctx: BuiltinCtx,
	Aid: string,
	Vid: string,
	Bid: string,
	A: { x: number; y: number },
	V: { x: number; y: number },
	B: { x: number; y: number }
): string {
	const { figure, line, label } = ctx;
	const uX = A.x - V.x;
	const uY = A.y - V.y;
	const wX = B.x - V.x;
	const wY = B.y - V.y;
	const uLen = Math.hypot(uX, uY);
	const wLen = Math.hypot(wX, wY);
	if (uLen < 1e-15 || wLen < 1e-15)
		throw new DslRuntimeError(
			{
				summary:
					'`bissectrice(A, V, B)` : `A` ou `B` est confondu avec `V`, l’angle n’est pas défini.'
			},
			line
		);
	const uHatX = uX / uLen;
	const uHatY = uY / uLen;
	const wHatX = wX / wLen;
	const wHatY = wY / wLen;
	if ((uHatX + wHatX) ** 2 + (uHatY + wHatY) ** 2 < 1e-15)
		throw new DslRuntimeError(
			{
				summary:
					'`bissectrice(A, V, B)` : `A`, `V`, `B` sont alignés et opposés depuis `V` — bissectrice indéterminée (deux directions possibles).'
			},
			line
		);
	const dVA = figure.createScalarDistance(Vid, Aid);
	const dVB = figure.createScalarDistance(Vid, Bid);
	const ratio = figure.createScalarExpression(
		(scalars) => {
			const a = scalars.get(dVA);
			const b = scalars.get(dVB);
			if (a == null || b == null || b === 0) return 1;
			return a / b;
		},
		[dVA, dVB]
	);
	const Bprime = figure.createDilatedPoint(Bid, Vid, { scalarRef: ratio }, { visible: false });
	const M = createHiddenMidpoint(figure, Aid, Bprime);
	return figure.createLine(Vid, M, { label });
}

function handleBissectrice(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line } = ctx;
	// Overload: bissectrice(α) where α is a GeoAngle.
	if (pos.length === 1) {
		const elId = requireElement(pos[0], 'α', line);
		const el = figure.getElementById(elId);
		if (!el || !isAngle(el)) {
			throw new DslRuntimeError(
				{
					summary: '`bissectrice()` à 1 argument attend un angle (`GeoAngle`).',
					forms: BISSECTRICE_FORMS
				},
				line
			);
		}
		const A = figure.getPosition(el.p1Id);
		const V = figure.getPosition(el.vertexId);
		const B = figure.getPosition(el.p2Id);
		if (!A || !V || !B) {
			throw new DslRuntimeError(
				{ summary: '`bissectrice(α)` : position de l’un des points de `α` introuvable.' },
				line
			);
		}
		const coords = [A, V, B].map((p) => ({
			x: geoToNumber(p.x),
			y: geoToNumber(p.y)
		}));
		const id = buildBisectorLine(
			ctx,
			el.p1Id,
			el.vertexId,
			el.p2Id,
			coords[0],
			coords[1],
			coords[2]
		);
		return { figureId: id, symbolType: 'droite' };
	}
	// Existing 3-points form.
	const { ids, coords } = requireNPoints(ctx, 3, ['A', 'V', 'B'], 'bissectrice', {
		syntax: 'bissectrice(A, V, B)',
		description: 'bissectrice de l’angle `AVB` (sommet `V`)'
	});
	const id = buildBisectorLine(ctx, ids[0], ids[1], ids[2], coords[0], coords[1], coords[2]);
	return { figureId: id, symbolType: 'droite' };
}
HANDLERS.set('bissectrice', handleBissectrice);

// ─── 6. triangle(A, B, C) → polygone ────────────────────────────────

function handleTriangle(ctx: BuiltinCtx): BuiltinResult {
	const { figure, label } = ctx;
	const { ids } = requireNPoints(ctx, 3, ['A', 'B', 'C'], 'triangle', {
		syntax: 'triangle(A, B, C)',
		description: 'triangle (polygone à 3 sommets)'
	});
	const id = figure.createPolygon(ids as [string, string, string], { label });
	return { figureId: id, symbolType: 'polygone' };
}
HANDLERS.set('triangle', handleTriangle);

// ─── 7. triangle_equilateral(A, B) → polygone ───────────────────────

function handleTriangleEquilateral(ctx: BuiltinCtx): BuiltinResult {
	const { figure, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 2, ['A', 'B'], 'triangle_equilateral', {
		syntax: 'triangle_equilateral(A, B)',
		description: 'triangle équilatéral de côté `[AB]` (3ᵉ sommet calculé par rotation à 60°)'
	});
	const [A, B] = coords;
	if (Math.hypot(B.x - A.x, B.y - A.y) < 1e-15)
		throw new DslRuntimeError(
			{ summary: '`triangle_equilateral(A, B)` : `A` et `B` sont confondus, côté nul.' },
			line
		);
	// C = rotation of B around A by π/3 (counter-clockwise). Exact angle preserves
	// exactness of derived coordinates when A and B have exact coordinates.
	const C = createHiddenRotatedPoint(figure, ids[1], ids[0], PI_OVER_3);
	const id = figure.createPolygon([ids[0], ids[1], C], { label });
	return { figureId: id, symbolType: 'polygone' };
}
HANDLERS.set('triangle_equilateral', handleTriangleEquilateral);

// ─── 8. triangle_isocele(A, B, angle=40) → polygone ─────────────────

function handleTriangleIsocele(ctx: BuiltinCtx): BuiltinResult {
	const { figure, named, line, label, angleMode } = ctx;
	const { ids, coords } = requireNPoints(ctx, 2, ['A', 'B'], 'triangle_isocele', {
		syntax: 'triangle_isocele(A, B, angle=40)',
		description: 'triangle isocèle (préserve la sémantique de la macro originale)'
	});
	const angleDeg = named.has('angle') ? requireNumber(named.get('angle')!, 'angle', line) : 40;
	const [A, B] = coords;
	if (Math.hypot(B.x - A.x, B.y - A.y) < 1e-15)
		throw new DslRuntimeError(
			{ summary: '`triangle_isocele(A, B, …)` : `A` et `B` sont confondus, côté nul.' },
			line
		);
	// Preserve original macro semantics: C = rotation of midpoint(A,B) around A
	// by (90 - angle/2) — interpreted in current angle mode.
	const M = createHiddenMidpoint(figure, ids[0], ids[1]);
	const rotAngleVal = 90 - angleDeg / 2;
	const rad = toRadians(rotAngleVal, angleMode);
	const C = createHiddenRotatedPoint(figure, M, ids[0], numeric(rad));
	const id = figure.createPolygon([ids[0], ids[1], C], { label });
	return { figureId: id, symbolType: 'polygone' };
}
HANDLERS.set('triangle_isocele', handleTriangleIsocele);

// ─── 9. triangle_rectangle(A, B, angle=45) → polygone + marque ──────

function handleTriangleRectangle(ctx: BuiltinCtx): BuiltinResult {
	const { figure, named, line, label, angleMode } = ctx;
	const { ids, coords } = requireNPoints(ctx, 2, ['A', 'B'], 'triangle_rectangle', {
		syntax: 'triangle_rectangle(A, B, angle=45)',
		description:
			'triangle rectangle en `A` ; `angle` détermine l’angle BAC (3ᵉ sommet par rotation)'
	});
	const angleDeg = named.has('angle') ? requireNumber(named.get('angle')!, 'angle', line) : 45;
	const [A, B] = coords;
	if (Math.hypot(B.x - A.x, B.y - A.y) < 1e-15)
		throw new DslRuntimeError(
			{ summary: '`triangle_rectangle(A, B, …)` : `A` et `B` sont confondus, côté nul.' },
			line
		);
	const rad = toRadians(angleDeg, angleMode);
	const C = createHiddenRotatedPoint(figure, ids[1], ids[0], numeric(rad));
	const polyId = figure.createPolygon([ids[0], ids[1], C], { label });
	figure.createAngle(ids[1], ids[0], C, { marque: 'carre' });
	return { figureId: polyId, symbolType: 'polygone' };
}
HANDLERS.set('triangle_rectangle', handleTriangleRectangle);

// ─── 10. parallelogramme(A, B, C) → polygone ────────────────────────

function handleParallelogramme(ctx: BuiltinCtx): BuiltinResult {
	const { figure, label } = ctx;
	const { ids } = requireNPoints(ctx, 3, ['A', 'B', 'C'], 'parallelogramme', {
		syntax: 'parallelogramme(A, B, C)',
		description:
			'parallélogramme `ABCD` ; le 4ᵉ sommet `D` calculé pour que `ABCD` soit un parallélogramme'
	});
	const [Aid, Bid, Cid] = ids;
	// D = A + (C - B). createTranslatedPoint(source=A, vector=B→C) does exactly that.
	const D = createHiddenTranslatedPoint(figure, Aid, Bid, Cid);
	const id = figure.createPolygon([Aid, Bid, Cid, D], { label });
	return { figureId: id, symbolType: 'polygone' };
}
HANDLERS.set('parallelogramme', handleParallelogramme);

// ─── 11. rectangle(A, B, largeur=2) → polygone + marque ─────────────
//
// Dynamic construction :
//   Q = rotation of B around A by π/2     (vec AQ = perp(AB) of length |AB|)
//   D = dilation of Q around A by largeur/|AB|  (D = A + perp_unit(AB) * largeur)
//   C = translation of D by vec(A → B)    (C = D + (B - A))

function handleRectangle(ctx: BuiltinCtx): BuiltinResult {
	const { figure, named, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 2, ['A', 'B'], 'rectangle', {
		syntax: 'rectangle(A, B, largeur=2)',
		description: 'rectangle de côté `[AB]` et de largeur donnée (perpendiculaire à `AB`)'
	});
	const largeur = named.has('largeur') ? requireNumber(named.get('largeur')!, 'largeur', line) : 2;
	const [A, B] = coords;
	const [Aid, Bid] = ids;
	if (Math.hypot(B.x - A.x, B.y - A.y) < 1e-15)
		throw new DslRuntimeError(
			{ summary: '`rectangle(A, B, …)` : `A` et `B` sont confondus, direction indéfinie.' },
			line
		);
	const Q = createHiddenRotatedPoint(figure, Bid, Aid, PI_OVER_2);
	const dAB = figure.createScalarDistance(Aid, Bid);
	const scaleRatio = figure.createScalarExpression(
		(scalars) => {
			const d = scalars.get(dAB);
			if (d == null || d === 0) return 0;
			return largeur / d;
		},
		[dAB]
	);
	const D = figure.createDilatedPoint(Q, Aid, { scalarRef: scaleRatio }, { visible: false });
	const C = createHiddenTranslatedPoint(figure, D, Aid, Bid);
	const polyId = figure.createPolygon([Aid, Bid, C, D], { label });
	figure.createAngle(D, Aid, Bid, { marque: 'carre' });
	return { figureId: polyId, symbolType: 'polygone' };
}
HANDLERS.set('rectangle', handleRectangle);

// ─── 12. carre(A, B) → polygone + marque ────────────────────────────

function handleCarre(ctx: BuiltinCtx): BuiltinResult {
	const { figure, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 2, ['A', 'B'], 'carre', {
		syntax: 'carre(A, B)',
		description: 'carré `ABCD` de côté `[AB]` ; `C` et `D` calculés par rotations de ±90°'
	});
	const [A, B] = coords;
	const [Aid, Bid] = ids;
	if (Math.hypot(B.x - A.x, B.y - A.y) < 1e-15)
		throw new DslRuntimeError(
			{ summary: '`carre(A, B)` : `A` et `B` sont confondus, côté nul.' },
			line
		);
	// C = rotation of A around B by +π/2 ; D = rotation of B around A by -π/2.
	// Exact angles preserve exactness when A and B are exact.
	const C = createHiddenRotatedPoint(figure, Aid, Bid, PI_OVER_2);
	const D = createHiddenRotatedPoint(figure, Bid, Aid, NEG_PI_OVER_2);
	const polyId = figure.createPolygon([Aid, Bid, C, D], { label });
	figure.createAngle(D, Aid, Bid, { marque: 'carre' });
	return { figureId: polyId, symbolType: 'polygone' };
}
HANDLERS.set('carre', handleCarre);

// ─── 13. losange(A, B, angle=60) → polygone ─────────────────────────

function handleLosange(ctx: BuiltinCtx): BuiltinResult {
	const { figure, named, line, label, angleMode } = ctx;
	const { ids, coords } = requireNPoints(ctx, 2, ['A', 'B'], 'losange', {
		syntax: 'losange(A, B, angle=60)',
		description: 'losange `ABCD` de côté `[AB]` ; `C` rotation de `A` autour de `B` par `angle`'
	});
	const angleDeg = named.has('angle') ? requireNumber(named.get('angle')!, 'angle', line) : 60;
	const [A, B] = coords;
	const [Aid, Bid] = ids;
	if (Math.hypot(B.x - A.x, B.y - A.y) < 1e-15)
		throw new DslRuntimeError(
			{ summary: '`losange(A, B, …)` : `A` et `B` sont confondus, côté nul.' },
			line
		);
	const rad = toRadians(angleDeg, angleMode);
	// C = rotation of A around B by `angle` ; D = translation of C by (B → A) = C + (A - B).
	const C = createHiddenRotatedPoint(figure, Aid, Bid, numeric(rad));
	const D = createHiddenTranslatedPoint(figure, C, Bid, Aid);
	const id = figure.createPolygon([Aid, Bid, C, D], { label });
	return { figureId: id, symbolType: 'polygone' };
}
HANDLERS.set('losange', handleLosange);

// ─── 14. polygone_regulier(O, r, n) → polygone (BREAKING) ───────────

function handlePolygoneRegulier(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 3)
		throw new DslRuntimeError(
			{
				summary: `\`polygone_regulier()\` attend 3 arguments (centre, rayon, n), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'polygone_regulier(O, r, n)',
						description: 'polygone régulier à `n` sommets, centré en `O`, rayon `r`'
					}
				]
			},
			line
		);
	const Oid = requireElement(pos[0], 'O', line);
	const r = requireNumber(pos[1], 'rayon', line);
	const n = requireNumber(pos[2], 'n', line);
	if (!Number.isInteger(n) || n < 3)
		throw new DslRuntimeError(
			{ summary: `\`polygone_regulier()\` : \`n\` doit être un entier ≥ 3, reçu ${n}.` },
			line
		);
	if (r <= 0)
		throw new DslRuntimeError(
			{ summary: '`polygone_regulier()` : le rayon doit être strictement positif.' },
			line
		);
	// P[0] = (O.x + r, O.y) as a dynamic computed point.
	// P[i] = rotation of P[0] around O by 2πi/n — dynamic via createRotatedPoint.
	const oxScalar = figure.createScalarCoordinate(Oid, 'x');
	const oyScalar = figure.createScalarCoordinate(Oid, 'y');
	const oxPlusR = figure.createScalarExpression(
		(scalars) => (scalars.get(oxScalar) ?? 0) + r,
		[oxScalar]
	);
	const P0 = figure.createComputedPoint(
		{ scalarRef: oxPlusR },
		{ scalarRef: oyScalar },
		{ visible: false }
	);
	const vertexIds: string[] = [P0];
	for (let i = 1; i < n; i++) {
		const angle = exactPiFraction(2 * i, n);
		vertexIds.push(createHiddenRotatedPoint(figure, P0, Oid, angle));
	}
	const id = figure.createPolygon(vertexIds as [string, string, string, ...string[]], { label });
	return { figureId: id, symbolType: 'polygone' };
}
HANDLERS.set('polygone_regulier', handlePolygoneRegulier);

// ─── 15. etoile(O, r, n, saut=2) → polygone (BREAKING) ──────────────

function handleEtoile(ctx: BuiltinCtx): BuiltinResult {
	const { pos, named, figure, line, label } = ctx;
	if (pos.length !== 3)
		throw new DslRuntimeError(
			{
				summary: `\`etoile()\` attend 3 arguments positionnels (centre, rayon, n), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'etoile(O, r, n, saut=2)',
						description:
							'polygone étoilé à `n` sommets, centré en `O`, rayon `r` ; `saut` détermine la forme'
					}
				]
			},
			line
		);
	const Oid = requireElement(pos[0], 'O', line);
	const r = requireNumber(pos[1], 'rayon', line);
	const n = requireNumber(pos[2], 'n', line);
	const saut = named.has('saut') ? requireNumber(named.get('saut')!, 'saut', line) : 2;
	if (!Number.isInteger(n) || n < 5)
		throw new DslRuntimeError(
			{ summary: `\`etoile()\` : \`n\` doit être un entier ≥ 5, reçu ${n}.` },
			line
		);
	if (!Number.isInteger(saut) || saut < 2 || saut >= n)
		throw new DslRuntimeError(
			{ summary: `\`etoile()\` : \`saut\` doit être un entier entre 2 et n-1, reçu ${saut}.` },
			line
		);
	if (r <= 0)
		throw new DslRuntimeError(
			{ summary: '`etoile()` : le rayon doit être strictement positif.' },
			line
		);
	// Build n vertices on the circle centered at O, radius r, as dynamic derived points.
	const oxScalar = figure.createScalarCoordinate(Oid, 'x');
	const oyScalar = figure.createScalarCoordinate(Oid, 'y');
	const oxPlusR = figure.createScalarExpression(
		(scalars) => (scalars.get(oxScalar) ?? 0) + r,
		[oxScalar]
	);
	const P0 = figure.createComputedPoint(
		{ scalarRef: oxPlusR },
		{ scalarRef: oyScalar },
		{ visible: false }
	);
	const rawPoints: string[] = [P0];
	for (let i = 1; i < n; i++) {
		const angle = exactPiFraction(2 * i, n);
		rawPoints.push(createHiddenRotatedPoint(figure, P0, Oid, angle));
	}
	// Visit order : 0, saut, 2*saut, ... mod n until we return to 0.
	// For gcd(saut, n)=1 this yields all n vertices in a single star polyline.
	// For gcd != 1, the cycle closes early (e.g. n=6, saut=2 → 0, 2, 4 then
	// back to 0) and we produce a smaller polygon (the "degenerate" inner
	// component of the star figure).
	const orderedIds: string[] = [];
	const visited = new Set<number>();
	let idx = 0;
	while (!visited.has(idx)) {
		visited.add(idx);
		orderedIds.push(rawPoints[idx]);
		idx = (idx + saut) % n;
	}
	if (orderedIds.length < 3)
		throw new DslRuntimeError(
			{
				summary: `\`etoile()\` : la combinaison n=${n}, saut=${saut} produit moins de 3 sommets distincts.`,
				hint: 'Choisissez un `saut` tel que `gcd(saut, n) < n/3` pour obtenir une étoile non-dégénérée.'
			},
			line
		);
	const id = figure.createPolygon(orderedIds as [string, string, string, ...string[]], { label });
	return { figureId: id, symbolType: 'polygone' };
}
HANDLERS.set('etoile', handleEtoile);

// ─── 16. corde(c, d) → segment ──────────────────────────────────────

function handleCorde(ctx: BuiltinCtx): BuiltinResult {
	const { pos, figure, line, label } = ctx;
	if (pos.length !== 2)
		throw new DslRuntimeError(
			{
				summary: `\`corde()\` attend 2 arguments (cercle, droite), ${pos.length} reçu(s).`,
				forms: [
					{
						syntax: 'corde(c, d)',
						description:
							'corde du cercle `c` par la droite `d` (segment entre les deux intersections)'
					}
				]
			},
			line
		);
	const arg1 = pos[0];
	const arg2 = pos[1];
	const id1 = requireElement(arg1, 'arg1', line);
	const id2 = requireElement(arg2, 'arg2', line);
	const type1 = arg1.type === 'element' ? arg1.elementType : undefined;
	const type2 = arg2.type === 'element' ? arg2.elementType : undefined;
	let circleId: string;
	let lineId: string;
	if (type1 === 'cercle' && (type2 === 'droite' || type2 === 'segment' || type2 === 'demidroite')) {
		circleId = id1;
		lineId = id2;
	} else if (
		type2 === 'cercle' &&
		(type1 === 'droite' || type1 === 'segment' || type1 === 'demidroite')
	) {
		circleId = id2;
		lineId = id1;
	} else {
		throw new DslRuntimeError(
			{
				summary: '`corde()` attend un cercle et une droite (ou segment / demi-droite).',
				hint: 'Vérifiez que vous passez bien un `cercle()` et une `droite()`.'
			},
			line
		);
	}
	const P1 = figure.createIntersectionLC(lineId, circleId, 0, { visible: false });
	const P2 = figure.createIntersectionLC(lineId, circleId, 1, { visible: false });
	const id = figure.createSegment(P1, P2, { label });
	return { figureId: id, symbolType: 'segment' };
}
HANDLERS.set('corde', handleCorde);

// ─── 17. cercle_circonscrit(A, B, C) → cercle ───────────────────────

/** Compute the circumcenter of three points via Cramer's formula. Returns null if collinear. */
function computeCircumcenter(
	A: { x: number; y: number },
	B: { x: number; y: number },
	C: { x: number; y: number }
): { x: number; y: number } | null {
	const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
	if (Math.abs(D) < 1e-12) return null;
	const Asq = A.x * A.x + A.y * A.y;
	const Bsq = B.x * B.x + B.y * B.y;
	const Csq = C.x * C.x + C.y * C.y;
	const Ox = (Asq * (B.y - C.y) + Bsq * (C.y - A.y) + Csq * (A.y - B.y)) / D;
	const Oy = (Asq * (C.x - B.x) + Bsq * (A.x - C.x) + Csq * (B.x - A.x)) / D;
	return { x: Ox, y: Oy };
}

function handleCercleCirconscrit(ctx: BuiltinCtx): BuiltinResult {
	const { figure, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 3, ['A', 'B', 'C'], 'cercle_circonscrit', {
		syntax: 'cercle_circonscrit(A, B, C)',
		description: 'cercle passant par les 3 points ; centre via `centre(c)`'
	});
	const [A, B, C] = coords;
	const [Aid, Bid, Cid] = ids;
	if (!computeCircumcenter(A, B, C))
		throw new DslRuntimeError(
			{
				summary:
					'`cercle_circonscrit(A, B, C)` : les 3 points sont alignés, le cercle n’existe pas.'
			},
			line
		);
	// Circumcenter = intersection of two perpendicular bisectors. All hidden,
	// fully dynamic via factory methods.
	const bisAB = buildPerpendicularBisector(figure, Aid, Bid);
	const bisBC = buildPerpendicularBisector(figure, Bid, Cid);
	const O = createHiddenIntersectionLL(figure, bisAB, bisBC);
	const id = figure.createCircleByPoint(O, Aid, { label });
	return { figureId: id, symbolType: 'cercle' };
}
HANDLERS.set('cercle_circonscrit', handleCercleCirconscrit);

// ─── 18. cercle_inscrit(A, B, C) → cercle ───────────────────────────

function handleCercleInscrit(ctx: BuiltinCtx): BuiltinResult {
	const { figure, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 3, ['A', 'B', 'C'], 'cercle_inscrit', {
		syntax: 'cercle_inscrit(A, B, C)',
		description: 'cercle inscrit au triangle `ABC` ; centre via `centre(c)`'
	});
	const [A, B, C] = coords;
	const [Aid, Bid, Cid] = ids;
	const a = Math.hypot(B.x - C.x, B.y - C.y);
	const b = Math.hypot(C.x - A.x, C.y - A.y);
	const c = Math.hypot(A.x - B.x, A.y - B.y);
	if (a + b + c < 1e-15)
		throw new DslRuntimeError(
			{ summary: '`cercle_inscrit(A, B, C)` : les 3 points sont confondus.' },
			line
		);
	if (!computeCircumcenter(A, B, C))
		throw new DslRuntimeError(
			{
				summary:
					'`cercle_inscrit(A, B, C)` : triangle dégénéré (les 3 points sont alignés ou confondus).'
			},
			line
		);
	// Incenter = intersection of two angular bisectors. Radius = distance from
	// incenter to any side. Fully dynamic.
	const bisA = buildAngularBisector(figure, Bid, Aid, Cid);
	const bisB = buildAngularBisector(figure, Aid, Bid, Cid);
	const I = createHiddenIntersectionLL(figure, bisA, bisB);
	const sideAB = createHiddenLine(figure, Aid, Bid);
	const rScalar = figure.createScalarDistancePointLine(I, sideAB);
	const id = figure.createCircleByRadius(I, { scalarRef: rScalar }, { label });
	return { figureId: id, symbolType: 'cercle' };
}
HANDLERS.set('cercle_inscrit', handleCercleInscrit);

// ─── 19. cercle_euler(A, B, C) → cercle ─────────────────────────────

function handleCercleEuler(ctx: BuiltinCtx): BuiltinResult {
	const { figure, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 3, ['A', 'B', 'C'], 'cercle_euler', {
		syntax: 'cercle_euler(A, B, C)',
		description: 'cercle des neuf points du triangle `ABC` ; centre via `centre(c)`'
	});
	const [A, B, C] = coords;
	const [Aid, Bid, Cid] = ids;
	if (!computeCircumcenter(A, B, C))
		throw new DslRuntimeError(
			{
				summary: '`cercle_euler(A, B, C)` : les 3 points sont alignés, le cercle n’existe pas.'
			},
			line
		);
	// Euler circle center = midpoint of (circumcenter, orthocenter).
	// Radius = circumradius / 2.
	const bisAB = buildPerpendicularBisector(figure, Aid, Bid);
	const bisBC = buildPerpendicularBisector(figure, Bid, Cid);
	const O = createHiddenIntersectionLL(figure, bisAB, bisBC);
	const altA = buildAltitudeFromA(figure, Aid, Bid, Cid);
	const altB = buildAltitudeFromA(figure, Bid, Aid, Cid);
	const H = createHiddenIntersectionLL(figure, altA, altB);
	const E = createHiddenMidpoint(figure, O, H);
	const R = figure.createScalarDistance(O, Aid);
	const halfR = figure.createScalarExpression((s) => (s.get(R) ?? 0) / 2, [R]);
	const id = figure.createCircleByRadius(E, { scalarRef: halfR }, { label });
	return { figureId: id, symbolType: 'cercle' };
}
HANDLERS.set('cercle_euler', handleCercleEuler);

// ─── 20. centre_gravite(A, B, C) → point ────────────────────────────

function handleCentreGravite(ctx: BuiltinCtx): BuiltinResult {
	const { figure, label } = ctx;
	const { ids } = requireNPoints(ctx, 3, ['A', 'B', 'C'], 'centre_gravite', {
		syntax: 'centre_gravite(A, B, C)',
		description: 'centre de gravité (centroïde) du triangle `ABC`'
	});
	const [Aid, Bid, Cid] = ids;
	// G divides the median from A to midpoint(B, C) in ratio 2:1 from A.
	// G = dilation of midpoint(B, C) around A by factor 2/3.
	const M_BC = createHiddenMidpoint(figure, Bid, Cid);
	const id = figure.createDilatedPoint(M_BC, Aid, numeric(2 / 3), { label });
	return { figureId: id, symbolType: 'point' };
}
HANDLERS.set('centre_gravite', handleCentreGravite);

// ─── 21. orthocentre(A, B, C) → point ───────────────────────────────

function handleOrthocentre(ctx: BuiltinCtx): BuiltinResult {
	const { figure, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 3, ['A', 'B', 'C'], 'orthocentre', {
		syntax: 'orthocentre(A, B, C)',
		description: 'orthocentre du triangle `ABC` (intersection des hauteurs)'
	});
	const [A, B, C] = coords;
	const [Aid, Bid, Cid] = ids;
	if (!computeCircumcenter(A, B, C))
		throw new DslRuntimeError(
			{
				summary:
					'`orthocentre(A, B, C)` : les 3 points sont alignés, l’orthocentre n’est pas défini (à l’infini).'
			},
			line
		);
	// H = intersection of two altitudes. Fully dynamic via factory methods.
	const altA = buildAltitudeFromA(figure, Aid, Bid, Cid);
	const altB = buildAltitudeFromA(figure, Bid, Aid, Cid);
	const id = figure.createIntersectionLL(altA, altB, { label });
	return { figureId: id, symbolType: 'point' };
}
HANDLERS.set('orthocentre', handleOrthocentre);

// ─── 22. hauteur(A, B, C) → droite ──────────────────────────────────

function handleHauteur(ctx: BuiltinCtx): BuiltinResult {
	const { figure, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 3, ['A', 'B', 'C'], 'hauteur', {
		syntax: 'hauteur(A, B, C)',
		description:
			'hauteur issue de `A` dans le triangle `ABC` (perpendiculaire à `(BC)` passant par `A`)'
	});
	const [, B, C] = coords;
	const [Aid, Bid, Cid] = ids;
	const dx = C.x - B.x;
	const dy = C.y - B.y;
	if (dx * dx + dy * dy < 1e-30)
		throw new DslRuntimeError(
			{ summary: '`hauteur(A, B, C)` : `B` et `C` sont confondus, direction `(BC)` indéfinie.' },
			line
		);
	// Q = A + (C - B) (line AQ parallel to BC), then R = rotation of Q around A by π/2
	// (line AR perpendicular to BC). Altitude = (A, R).
	const Q = createHiddenTranslatedPoint(figure, Aid, Bid, Cid);
	const R = createHiddenRotatedPoint(figure, Q, Aid, PI_OVER_2);
	const id = figure.createLine(Aid, R, { label });
	return { figureId: id, symbolType: 'droite' };
}
HANDLERS.set('hauteur', handleHauteur);

// ─── 23. droite_euler(A, B, C) → droite ─────────────────────────────

function handleDroiteEuler(ctx: BuiltinCtx): BuiltinResult {
	const { figure, line, label } = ctx;
	const { ids, coords } = requireNPoints(ctx, 3, ['A', 'B', 'C'], 'droite_euler', {
		syntax: 'droite_euler(A, B, C)',
		description:
			'droite d’Euler du triangle `ABC` (passe par centroïde, orthocentre, centre du cercle circonscrit)'
	});
	const [A, B, C] = coords;
	const [Aid, Bid, Cid] = ids;
	const O = computeCircumcenter(A, B, C);
	if (!O)
		throw new DslRuntimeError(
			{
				summary:
					'`droite_euler(A, B, C)` : les 3 points sont alignés, la droite d’Euler n’est pas définie.'
			},
			line
		);
	const Gx = (A.x + B.x + C.x) / 3;
	const Gy = (A.y + B.y + C.y) / 3;
	const Hx = A.x + B.x + C.x - 2 * O.x;
	const Hy = A.y + B.y + C.y - 2 * O.y;
	if (Math.hypot(Hx - Gx, Hy - Gy) < 1e-10)
		throw new DslRuntimeError(
			{
				summary:
					'`droite_euler(A, B, C)` : le triangle est équilatéral, `G = H = O`, la droite n’est pas définie.',
				hint: 'Pour un triangle équilatéral, les trois points remarquables coïncident — la droite d’Euler dégénère en un point.'
			},
			line
		);
	// G = centroid (via dilation pattern). H = orthocenter (intersection of altitudes).
	const M_BC = createHiddenMidpoint(figure, Bid, Cid);
	const G = figure.createDilatedPoint(M_BC, Aid, numeric(2 / 3), { visible: false });
	const altA = buildAltitudeFromA(figure, Aid, Bid, Cid);
	const altB = buildAltitudeFromA(figure, Bid, Aid, Cid);
	const H = createHiddenIntersectionLL(figure, altA, altB);
	const id = figure.createLine(G, H, { label });
	return { figureId: id, symbolType: 'droite' };
}
HANDLERS.set('droite_euler', handleDroiteEuler);

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
	'angle_polaire',
	'transporte',
	'perimetre',
	'pente',
	'rayon',
	'slider',
	'secteur',
	'couronne',
	'puissance',
	'centre',
	'extremite',
	'extremites',
	'sommet',
	'sommets',
	'cote',
	'montre',
	'masque',
	'mediatrice',
	'perpendiculaire',
	'parallele',
	'mediane',
	'bissectrice',
	'triangle',
	'triangle_equilateral',
	'triangle_isocele',
	'triangle_rectangle',
	'parallelogramme',
	'rectangle',
	'carre',
	'losange',
	'polygone_regulier',
	'etoile',
	'corde',
	'cercle_circonscrit',
	'cercle_inscrit',
	'cercle_euler',
	'centre_gravite',
	'orthocentre',
	'hauteur',
	'droite_euler'
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

	// Static check: when both bounds resolve to concrete GeoValues (numeric or
	// exact — exact comes from DSL literals like `0` or `2*pi`), validate
	// tMin < tMax. ScalarRefs (sliders) are skipped: their value isn't known until recompute.
	const tMinNum = !isScalarRef(tMin) ? geoToNumber(tMin) : null;
	const tMaxNum = !isScalarRef(tMax) ? geoToNumber(tMax) : null;
	if (
		tMinNum !== null &&
		tMaxNum !== null &&
		Number.isFinite(tMinNum) &&
		Number.isFinite(tMaxNum) &&
		tMinNum >= tMaxNum
	) {
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
