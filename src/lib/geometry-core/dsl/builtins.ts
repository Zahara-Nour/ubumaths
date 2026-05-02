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
import {
	parseCustom,
	isRelation,
	isVariable,
	isGreek,
	subtract,
	divide,
	opposite,
	add,
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

export type AngleMode = 'deg' | 'rad';

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
	switch (name) {
		case 'point': {
			if (pos.length !== 2) throw new DslRuntimeError('point() attend 2 arguments (x, y)', line);
			const xParam = toScalarParam(pos[0], toGeoValue, line);
			const yParam = toScalarParam(pos[1], toGeoValue, line);
			if (isScalarRef(xParam) || isScalarRef(yParam)) {
				const id = figure.createComputedPoint(xParam, yParam, { label });
				return { figureId: id, symbolType: 'point' };
			}
			const id = figure.createFreePoint({ x: xParam, y: yParam }, { label });
			return { figureId: id, symbolType: 'point' };
		}

		case 'milieu': {
			if (pos.length !== 2) throw new DslRuntimeError('milieu() attend 2 arguments (A, B)', line);
			const id = figure.createMidpoint(
				requireElement(pos[0], 'arg1', line),
				requireElement(pos[1], 'arg2', line),
				{ label }
			);
			return { figureId: id, symbolType: 'point' };
		}

		case 'segment': {
			if (pos.length !== 2) throw new DslRuntimeError('segment() attend 2 arguments (A, B)', line);
			const id = figure.createSegment(
				requireElement(pos[0], 'arg1', line),
				requireElement(pos[1], 'arg2', line),
				{ label }
			);
			return { figureId: id, symbolType: 'segment' };
		}

		case 'droite': {
			if (pos.length !== 2) throw new DslRuntimeError('droite() attend 2 arguments (A, B)', line);
			const id = figure.createLine(
				requireElement(pos[0], 'arg1', line),
				requireElement(pos[1], 'arg2', line),
				{ label }
			);
			return { figureId: id, symbolType: 'droite' };
		}

		case 'demidroite': {
			if (pos.length !== 2)
				throw new DslRuntimeError('demidroite() attend 2 arguments (A, B)', line);
			const id = figure.createRay(
				requireElement(pos[0], 'arg1', line),
				requireElement(pos[1], 'arg2', line),
				{ label }
			);
			return { figureId: id, symbolType: 'demidroite' };
		}

		case 'vecteur': {
			if (pos.length !== 2) throw new DslRuntimeError('vecteur() attend 2 arguments', line);
			// Detect: vecteur(A, B) (bound) vs vecteur(3, 2) or vecteur(sqrt(2), 3) (free)
			const arg0 = pos[0];
			const arg1 = pos[1];
			const isNumericLike = (a: ResolvedValue) => a.type === 'nombre' || a.type === 'geoValue';
			if (isNumericLike(arg0) && isNumericLike(arg1)) {
				// Free vector by components (supports exact values like sqrt(2))
				const dx = toGeoValue(arg0, line);
				const dy = toGeoValue(arg1, line);
				// Optional anchor: ancre=(x, y)
				let anchor: { x: GeoValue; y: GeoValue } | undefined;
				if (named.has('ancre')) {
					const tuple = requireTuple(named.get('ancre')!, 'ancre', line);
					if (tuple.length !== 2)
						throw new DslRuntimeError('ancre attend un tuple de 2 nombres', line);
					anchor = { x: toGeoValue(tuple[0], line), y: toGeoValue(tuple[1], line) };
				}
				const id = figure.createFreeVector(dx, dy, anchor, { label });
				return { figureId: id, symbolType: 'vecteur' };
			} else {
				// Bound vector by two points
				const id = figure.createVectorByPoints(
					requireElement(arg0, 'arg1', line),
					requireElement(arg1, 'arg2', line),
					{ label }
				);
				return { figureId: id, symbolType: 'vecteur' };
			}
		}

		case 'norme': {
			if (pos.length !== 1) throw new DslRuntimeError('norme() attend 1 argument (vecteur)', line);
			const nVecId = requireElement(pos[0], 'vecteur', line);
			const id = figure.createScalarNorme(nVecId, { label });
			return { figureId: id, symbolType: 'scalar' };
		}

		case 'produit_scalaire': {
			if (pos.length !== 2)
				throw new DslRuntimeError('produit_scalaire() attend 2 arguments (u, v)', line);
			const psV1 = requireElement(pos[0], 'u', line);
			const psV2 = requireElement(pos[1], 'v', line);
			const psC1 = figure.getVectorComponents(psV1);
			const psC2 = figure.getVectorComponents(psV2);
			if (!psC1 || !psC2)
				throw new DslRuntimeError('produit_scalaire(): composantes non resolues', line);
			const dot =
				geoToNumber(psC1.dx) * geoToNumber(psC2.dx) + geoToNumber(psC1.dy) * geoToNumber(psC2.dy);
			return { scalarValue: dot };
		}

		case 'angle_vecteurs': {
			if (pos.length !== 2)
				throw new DslRuntimeError('angle_vecteurs() attend 2 arguments (u, v)', line);
			const avV1 = requireElement(pos[0], 'u', line);
			const avV2 = requireElement(pos[1], 'v', line);
			const avC1 = figure.getVectorComponents(avV1);
			const avC2 = figure.getVectorComponents(avV2);
			if (!avC1 || !avC2)
				throw new DslRuntimeError('angle_vecteurs(): composantes non resolues', line);
			const ax1 = geoToNumber(avC1.dx),
				ay1 = geoToNumber(avC1.dy);
			const ax2 = geoToNumber(avC2.dx),
				ay2 = geoToNumber(avC2.dy);
			const dotProd = ax1 * ax2 + ay1 * ay2;
			const len1 = Math.sqrt(ax1 * ax1 + ay1 * ay1);
			const len2 = Math.sqrt(ax2 * ax2 + ay2 * ay2);
			if (len1 < 1e-15 || len2 < 1e-15)
				throw new DslRuntimeError('angle_vecteurs(): vecteur nul', line);
			const cosA = Math.max(-1, Math.min(1, dotProd / (len1 * len2)));
			const angleRad = Math.acos(cosA);
			return {
				scalarValue: angleMode === 'deg' ? (angleRad * 180) / Math.PI : angleRad
			};
		}

		case 'cercle': {
			if (pos.length === 3) {
				// cercle(A, B, C) — circle through 3 points
				const p1Id = requireElement(pos[0], 'point1', line);
				const p2Id = requireElement(pos[1], 'point2', line);
				const p3Id = requireElement(pos[2], 'point3', line);
				// Check collinearity at creation time
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
						throw new DslRuntimeError('cercle(A, B, C): les 3 points sont alignes', line);
				}
				const id = figure.createCircleBy3Points(p1Id, p2Id, p3Id, { label });
				return { figureId: id, symbolType: 'cercle' };
			}
			if (pos.length !== 1)
				throw new DslRuntimeError(
					'cercle() attend 1 argument (centre) ou 3 arguments (A, B, C)',
					line
				);
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
			throw new DslRuntimeError("cercle() necessite 'rayon' ou 'passant'", line);
		}

		case 'polygone': {
			if (pos.length < 3) throw new DslRuntimeError('polygone() attend au moins 3 sommets', line);
			const vertexIds = pos.map((p, i) => requireElement(p, `sommet ${i + 1}`, line));
			const id = figure.createPolygon(vertexIds as [string, string, string, ...string[]], {
				label
			});
			return { figureId: id, symbolType: 'polygone' };
		}

		case 'symetrie': {
			// 0 positional args → create transformation object
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
				throw new DslRuntimeError("symetrie() necessite 'centre' ou 'axe'", line);
			}
			// 1+ positional args → direct application
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
			throw new DslRuntimeError("symetrie() necessite 'centre' ou 'axe'", line);
		}

		case 'rotation': {
			const centerId = requireElement(
				named.get('centre') ?? { type: 'nombre', value: 0 },
				'centre',
				line
			);
			const angleArg = named.get('angle') ?? { type: 'nombre' as const, value: 0 };
			// Convert angle to radians according to the active angle mode.
			// In 'rad' mode the value is already in radians (no conversion).
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
			// 0 positional args → create transformation object
			if (pos.length === 0) {
				const id = figure.createRotation(centerId, angleRad, { label });
				return { figureId: id, symbolType: 'transformation' };
			}
			// 1+ positional args → direct application
			const sourceId = requireElement(pos[0], 'source', line);
			const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
			if (sourceEl.elementType === 'point') {
				const id = figure.createRotatedPoint(sourceId, centerId, angleRad, { label });
				return { figureId: id, symbolType: 'point' };
			}
			// Non-point: create temp transformation, delegate
			const tId = figure.createRotation(centerId, angleRad);
			return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
		}

		case 'translation': {
			const vecteurArg = named.get('vecteur');
			if (!vecteurArg) throw new DslRuntimeError('translation() requiert vecteur=...', line);

			// 0 positional args → create transformation object
			if (pos.length === 0) {
				if (vecteurArg.type === 'element' && vecteurArg.elementType === 'vecteur') {
					const id = figure.createTranslationByVector(vecteurArg.figureId!, { label });
					return { figureId: id, symbolType: 'transformation' };
				}
				const tuple = requireTuple(vecteurArg, 'vecteur', line);
				if (tuple.length !== 2)
					throw new DslRuntimeError('vecteur attend un tuple de 2 points', line);
				const id = figure.createTranslation(
					requireElement(tuple[0], 'vecteur.1', line),
					requireElement(tuple[1], 'vecteur.2', line),
					{ label }
				);
				return { figureId: id, symbolType: 'transformation' };
			}

			// 1+ positional args → direct application
			const sourceId = requireElement(pos[0], 'source', line);
			const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
			if (sourceEl.elementType === 'point') {
				if (vecteurArg.type === 'element' && vecteurArg.elementType === 'vecteur') {
					const id = figure.createTranslatedPointByVector(sourceId, vecteurArg.figureId!, {
						label
					});
					return { figureId: id, symbolType: 'point' };
				}
				const tuple = requireTuple(vecteurArg, 'vecteur', line);
				if (tuple.length !== 2)
					throw new DslRuntimeError('vecteur attend un tuple de 2 points', line);
				const id = figure.createTranslatedPoint(
					sourceId,
					requireElement(tuple[0], 'vecteur.1', line),
					requireElement(tuple[1], 'vecteur.2', line),
					{ label }
				);
				return { figureId: id, symbolType: 'point' };
			}
			// Non-point: create temp transformation, delegate
			let tId: string;
			if (vecteurArg.type === 'element' && vecteurArg.elementType === 'vecteur') {
				tId = figure.createTranslationByVector(vecteurArg.figureId!);
			} else {
				const tuple = requireTuple(vecteurArg, 'vecteur', line);
				if (tuple.length !== 2)
					throw new DslRuntimeError('vecteur attend un tuple de 2 points', line);
				tId = figure.createTranslation(
					requireElement(tuple[0], 'vecteur.1', line),
					requireElement(tuple[1], 'vecteur.2', line)
				);
			}
			return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
		}

		case 'homothetie': {
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
			// 0 positional args → create transformation object
			if (pos.length === 0) {
				const id = figure.createHomothety(centerId, factor, { label });
				return { figureId: id, symbolType: 'transformation' };
			}
			// 1+ positional args → direct application
			const sourceId = requireElement(pos[0], 'source', line);
			const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
			if (sourceEl.elementType === 'point') {
				const id = figure.createDilatedPoint(sourceId, centerId, factor, { label });
				return { figureId: id, symbolType: 'point' };
			}
			// Non-point: create temp transformation, delegate
			const tId = figure.createHomothety(centerId, factor);
			return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
		}

		case 'projection': {
			const droiteArg = named.get('axe');
			if (!droiteArg) throw new DslRuntimeError("projection() necessite 'axe'", line);
			const { p1, p2 } = resolveAxeArg(droiteArg, figure, line);
			// 0 positional args → create transformation object
			if (pos.length === 0) {
				const id = figure.createProjection(p1, p2, { label });
				return { figureId: id, symbolType: 'transformation' };
			}
			// 1+ positional args → direct application
			const sourceId = requireElement(pos[0], 'source', line);
			const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
			if (sourceEl.elementType === 'point') {
				const id = figure.createProjectedPoint(sourceId, p1, p2, { label });
				return { figureId: id, symbolType: 'point' };
			}
			const tId = figure.createProjection(p1, p2);
			return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
		}

		case 'inversion': {
			const centerId = requireElement(
				named.get('centre') ?? { type: 'nombre', value: 0 },
				'centre',
				line
			);
			const radius = toGeoValue(named.get('rayon') ?? { type: 'nombre', value: 1 }, line);
			// 0 positional args → create transformation object
			if (pos.length === 0) {
				const id = figure.createInversion(centerId, radius, { label });
				return { figureId: id, symbolType: 'transformation' };
			}
			// 1+ positional args → direct application
			const sourceId = requireElement(pos[0], 'source', line);
			const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
			if (sourceEl.elementType === 'point') {
				const id = figure.createInvertedPoint(sourceId, centerId, radius, { label });
				return { figureId: id, symbolType: 'point' };
			}
			const tId = figure.createInversion(centerId, radius);
			return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
		}

		case 'affinite': {
			const axeArg = named.get('axe');
			if (!axeArg) throw new DslRuntimeError("affinite() necessite 'axe'", line);
			const { p1, p2 } = resolveAxeArg(axeArg, figure, line);
			const factor = toGeoValue(named.get('rapport') ?? { type: 'nombre', value: 1 }, line);
			// 0 positional args → create transformation object
			if (pos.length === 0) {
				const id = figure.createAffinity(p1, p2, factor, { label });
				return { figureId: id, symbolType: 'transformation' };
			}
			// 1+ positional args → direct application
			const sourceId = requireElement(pos[0], 'source', line);
			const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
			if (sourceEl.elementType === 'point') {
				const id = figure.createAffinityPoint(sourceId, p1, p2, factor, { label });
				return { figureId: id, symbolType: 'point' };
			}
			const tId = figure.createAffinity(p1, p2, factor);
			return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
		}

		case 'similitude': {
			const centerId = requireElement(
				named.get('centre') ?? { type: 'nombre', value: 0 },
				'centre',
				line
			);
			const angleArg = named.get('angle') ?? { type: 'nombre' as const, value: 0 };
			// Convert angle to radians according to the active angle mode.
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
			// 0 positional args → create transformation object
			if (pos.length === 0) {
				const id = figure.createSimilitude(centerId, simAngleRad, simFactor, { label });
				return { figureId: id, symbolType: 'transformation' };
			}
			// 1+ positional args → direct application
			const sourceId = requireElement(pos[0], 'source', line);
			const sourceEl = pos[0] as { type: 'element'; elementType: SymbolType };
			const tId = figure.createSimilitude(centerId, simAngleRad, simFactor);
			return applyTransformationToElement(figure, tId, sourceId, sourceEl.elementType, { label });
		}

		case 'transforme': {
			if (pos.length !== 2)
				throw new DslRuntimeError('transforme() attend 2 arguments (transformation, objet)', line);
			const transformArg = pos[0];
			if (transformArg.type !== 'element' || transformArg.elementType !== 'transformation')
				throw new DslRuntimeError(
					'transforme(): le premier argument doit etre une transformation',
					line
				);
			const sourceArg = pos[1];
			if (sourceArg.type !== 'element')
				throw new DslRuntimeError(
					'transforme(): le second argument doit etre un element geometrique',
					line
				);
			const result = applyTransformationToElement(
				figure,
				transformArg.figureId!,
				sourceArg.figureId!,
				sourceArg.elementType!,
				{ label }
			);
			// Record origin for serialization roundtrip
			figure.recordTransformeOrigin(result.figureId, transformArg.figureId!, sourceArg.figureId!);
			return result;
		}

		case 'compose': {
			if (pos.length < 2)
				throw new DslRuntimeError('compose() attend au moins 2 transformations', line);
			const transformIds: string[] = [];
			for (let i = 0; i < pos.length; i++) {
				const arg = pos[i];
				if (arg.type !== 'element' || arg.elementType !== 'transformation')
					throw new DslRuntimeError(
						`compose(): l'argument ${i + 1} doit etre une transformation`,
						line
					);
				transformIds.push(arg.figureId!);
			}
			const id = figure.createComposition(transformIds, { label });
			return { figureId: id, symbolType: 'transformation' };
		}

		case 'intersection': {
			if (pos.length < 2 || pos.length > 3)
				throw new DslRuntimeError('intersection() attend 2 ou 3 arguments', line);

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

			// Check if a 'courbe' element is actually a quadraticCurve (not GeoFunction/GeoImplicitCurve)
			const isQuadraticCourbe = (figureId: string): boolean => {
				const el = figure.getElementById(figureId);
				return !!el && el.type === 'quadraticCurve';
			};

			// Detect quadratic curves and functions among 'courbe' elements
			const isQuad1 = isCourbeType(type1) && isQuadraticCourbe(id1);
			const isQuad2 = isCourbeType(type2) && isQuadraticCourbe(id2);

			const isFunctionCourbe = (figureId: string): boolean => {
				const el = figure.getElementById(figureId);
				return !!el && el.type === 'function';
			};
			const isFunc1 = isCourbeType(type1) && isFunctionCourbe(id1);
			const isFunc2 = isCourbeType(type2) && isFunctionCourbe(id2);

			// Reject implicit curves (not functions, not conics)
			if (isCourbeType(type1) && !isQuad1 && !isFunc1) {
				throw new DslRuntimeError(
					'intersection(): les courbes implicites ne sont pas supportees',
					line
				);
			}
			if (isCourbeType(type2) && !isQuad2 && !isFunc2) {
				throw new DslRuntimeError(
					'intersection(): les courbes implicites ne sont pas supportees',
					line
				);
			}

			// Reject unsupported combos: function + circle/conic
			if ((isFunc1 && isCircleType(type2)) || (isCircleType(type1) && isFunc2)) {
				throw new DslRuntimeError(
					'intersection(): combinaison fonction/cercle non supportee',
					line
				);
			}
			if ((isFunc1 && isQuad2) || (isQuad1 && isFunc2)) {
				throw new DslRuntimeError(
					'intersection(): combinaison fonction/conique non supportee',
					line
				);
			}

			// Determine combination and validate index
			const isQQ =
				(isQuad1 && isQuad2) ||
				(isQuad1 && isCircleType(type2)) ||
				(isCircleType(type1) && isQuad2);
			const isLF = (isLineType(type1) && isFunc2) || (isFunc1 && isLineType(type2));
			const isFF = isFunc1 && isFunc2;

			// Index validation: LF/FF have no max (unbounded), others are bounded
			let maxIndex: number | null;
			if (isLF || isFF) {
				maxIndex = null; // unbounded
			} else if (isQQ) {
				maxIndex = 4;
			} else {
				maxIndex = 2;
			}

			let dslIndex = 1;
			if (pos.length === 3) {
				dslIndex = requireNumber(pos[2], 'index', line);
				if (!Number.isInteger(dslIndex) || dslIndex < 1)
					throw new DslRuntimeError('intersection(): index doit etre >= 1', line);
				if (maxIndex !== null && dslIndex > maxIndex)
					throw new DslRuntimeError(`intersection(): index doit etre entre 1 et ${maxIndex}`, line);
			}

			// LL
			if (isLineType(type1) && isLineType(type2)) {
				const id = figure.createIntersectionLL(id1, id2, { label });
				return { figureId: id, symbolType: 'point' };
			}
			// LC / CL
			if (isLineType(type1) && isCircleType(type2)) {
				const id = figure.createIntersectionLC(id1, id2, (dslIndex - 1) as 0 | 1, { label });
				return { figureId: id, symbolType: 'point' };
			}
			if (isCircleType(type1) && isLineType(type2)) {
				const id = figure.createIntersectionLC(id2, id1, (dslIndex - 1) as 0 | 1, { label });
				return { figureId: id, symbolType: 'point' };
			}
			// CC
			if (isCircleType(type1) && isCircleType(type2)) {
				const id = figure.createIntersectionCC(id1, id2, (dslIndex - 1) as 0 | 1, { label });
				return { figureId: id, symbolType: 'point' };
			}
			// LQ / QL
			if (isLineType(type1) && isQuad2) {
				const id = figure.createIntersectionLQ(id1, id2, (dslIndex - 1) as 0 | 1, { label });
				return { figureId: id, symbolType: 'point' };
			}
			if (isQuad1 && isLineType(type2)) {
				const id = figure.createIntersectionLQ(id2, id1, (dslIndex - 1) as 0 | 1, { label });
				return { figureId: id, symbolType: 'point' };
			}
			// QQ (conic+conic, circle+conic, conic+circle)
			if (isQQ) {
				const id = figure.createIntersectionQQ(id1, id2, (dslIndex - 1) as 0 | 1 | 2 | 3, {
					label
				});
				return { figureId: id, symbolType: 'point' };
			}
			// LF / FL (line + function, swap auto)
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
			// FF (function + function)
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
				'intersection(): combinaison non supportee (attendu: droite/droite, droite/cercle, cercle/cercle, droite/conique, conique/conique, droite/fonction, ou fonction/fonction)',
				line
			);
		}

		case 'marque_angle': {
			if (pos.length < 3)
				throw new DslRuntimeError('marque_angle() attend 3 arguments (P1, V, P2)', line);
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

		case 'angle_droit': {
			if (pos.length < 3)
				throw new DslRuntimeError('angle_droit() attend 3 arguments (P1, V, P2)', line);
			const id = figure.createAngleMark(
				requireElement(pos[0], 'P1', line),
				requireElement(pos[1], 'V', line),
				requireElement(pos[2], 'P2', line),
				{ rightAngle: true, label }
			);
			return { figureId: id, symbolType: 'angleMark' };
		}

		case 'marque_segment': {
			if (pos.length < 2)
				throw new DslRuntimeError('marque_segment() attend 2 arguments (A, B)', line);
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

		case 'mesure': {
			if (pos.length < 2) throw new DslRuntimeError('mesure() attend au moins 2 arguments', line);
			const targetIds = pos.map((p, i) => requireElement(p, `arg${i + 1}`, line));

			// Create the appropriate scalar
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

			// Create auto-positioned text displaying the scalar value
			const format = autoPosition === 'bisector' ? ':deg' : ':.2f';
			const textId = figure.createText(
				`{${scalarId}${format}}`,
				[scalarId],
				{ autoPosition, autoTargetIds: targetIds },
				{ label }
			);
			return { figureId: textId, symbolType: 'text' };
		}

		case 'texte': {
			// texte(x, y, "template") — free position
			// texte(point, "template", dx=..., dy=...) — anchored
			if (pos.length < 2) throw new DslRuntimeError('texte() attend au moins 2 arguments', line);

			let template: string;
			let positioning: {
				anchorId?: string;
				anchorOffset?: { dx: number; dy: number };
				position?: { x: number; y: number };
			};

			if (pos.length >= 3 && pos[0].type === 'nombre' && pos[1].type === 'nombre') {
				// texte(x, y, "template")
				const x = (pos[0] as { type: 'nombre'; value: number }).value;
				const y = (pos[1] as { type: 'nombre'; value: number }).value;
				if (pos[2].type !== 'string')
					throw new DslRuntimeError('texte(): le 3e argument doit etre une chaine', line);
				template = (pos[2] as { type: 'string'; value: string }).value;
				positioning = { position: { x, y } };
			} else if (pos[0].type === 'element') {
				// texte(point, "template", dx=..., dy=...)
				const anchorId = requireElement(pos[0], 'anchor', line);
				if (pos[1].type !== 'string')
					throw new DslRuntimeError('texte(): le 2e argument doit etre une chaine', line);
				template = (pos[1] as { type: 'string'; value: string }).value;
				const dx = named.has('dx')
					? (named.get('dx')! as { type: 'nombre'; value: number }).value
					: undefined;
				const dy = named.has('dy')
					? (named.get('dy')! as { type: 'nombre'; value: number }).value
					: undefined;
				positioning = {
					anchorId,
					anchorOffset:
						dx !== undefined || dy !== undefined ? { dx: dx ?? 0, dy: dy ?? 0 } : undefined
				};
			} else {
				throw new DslRuntimeError(
					'texte() attend: texte(x, y, "text") ou texte(point, "text", dx=..., dy=...)',
					line
				);
			}

			// Extract scalar references from the template — replace symbolic names with figure IDs
			const scalarRefs: string[] = [];
			template = template.replace(/\{(\w+)/g, (_match, refName: string) => {
				const refSym = symbols.get(refName);
				if (refSym?.figureId && refSym.type === 'scalar') {
					scalarRefs.push(refSym.figureId);
					return `{${refSym.figureId}`;
				}
				return `{${refName}`;
			});

			const textId = figure.createText(template, scalarRefs, positioning, { label });
			return { figureId: textId, symbolType: 'text' };
		}

		case 'aire': {
			// Overload: `aire(f, a, b)` (3 args, first is a GeoFunction) computes the
			// geometric area between f and the x-axis on [a, b]. Otherwise falls back
			// to the polygon-area behavior (`aire(P1, P2, ..., Pn)` for n ≥ 3 points).
			// Note: if 3 args and pos[0] is an element that is NOT a GeoFunction
			// (e.g. a circle), the code falls through to the polygon branch, which
			// will then produce an error about "point1". Acceptable for V1.
			// See `docs/wip/geometry/aire-study.md` §0 décision 2.
			if (pos.length === 3 && pos[0].type === 'element') {
				const candidateEl = figure.getElementById(pos[0].figureId);
				if (candidateEl && candidateEl.type === 'function') {
					return interpretAreaBuiltin({
						name: 'aire',
						f: { id: pos[0].figureId, expression: candidateEl.expression },
						lowerArg: pos[1],
						upperArg: pos[2],
						signed: false,
						// Green default (cf. aire-study.md §0 décision 3) to contrast with
						// integrale's blue on figures showing both. Overridden by applyInlineStyle
						// when the user passes `couleur=...` (style.color > color in resolveStyle).
						defaultColor: '#22c55e',
						line,
						label,
						figure
					});
				}
			}

			// Default: polygon area (≥ 3 points).
			if (pos.length < 3)
				throw new DslRuntimeError('aire() attend au moins 3 arguments (points)', line);
			const pointIds = pos.map((p, i) => requireElement(p, `point${i + 1}`, line));
			const id = figure.createScalarArea(pointIds, { label });
			return { figureId: id, symbolType: 'scalar' };
		}

		case 'mtexte': {
			if (pos.length < 2) throw new DslRuntimeError('mtexte() attend au moins 2 arguments', line);
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
					throw new DslRuntimeError('mtexte(): le 3e argument doit etre une chaine', line);
				mtTemplate = (pos[2] as { type: 'string'; value: string }).value;
				mtPositioning = { position: { x, y } };
			} else if (pos[0].type === 'element') {
				const anchorId = requireElement(pos[0], 'anchor', line);
				if (pos[1].type !== 'string')
					throw new DslRuntimeError('mtexte(): le 2e argument doit etre une chaine', line);
				mtTemplate = (pos[1] as { type: 'string'; value: string }).value;
				const dx = named.has('dx')
					? (named.get('dx')! as { type: 'nombre'; value: number }).value
					: undefined;
				const dy = named.has('dy')
					? (named.get('dy')! as { type: 'nombre'; value: number }).value
					: undefined;
				mtPositioning = {
					anchorId,
					anchorOffset:
						dx !== undefined || dy !== undefined ? { dx: dx ?? 0, dy: dy ?? 0 } : undefined
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

		case 'rtexte': {
			if (pos.length < 2) throw new DslRuntimeError('rtexte() attend au moins 2 arguments', line);
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
					throw new DslRuntimeError('rtexte(): le 3e argument doit etre une chaine', line);
				rtTemplate = (pos[2] as { type: 'string'; value: string }).value;
				rtPositioning = { position: { x, y } };
			} else if (pos[0].type === 'element') {
				const anchorId = requireElement(pos[0], 'anchor', line);
				if (pos[1].type !== 'string')
					throw new DslRuntimeError('rtexte(): le 2e argument doit etre une chaine', line);
				rtTemplate = (pos[1] as { type: 'string'; value: string }).value;
				const dx = named.has('dx')
					? (named.get('dx')! as { type: 'nombre'; value: number }).value
					: undefined;
				const dy = named.has('dy')
					? (named.get('dy')! as { type: 'nombre'; value: number }).value
					: undefined;
				rtPositioning = {
					anchorId,
					anchorOffset:
						dx !== undefined || dy !== undefined ? { dx: dx ?? 0, dy: dy ?? 0 } : undefined
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

		case 'image': {
			// image("url", x, y, largeur=W)                    — free position
			// image("url", x, y, largeur=W, hauteur=H)         — free + height
			// image("url", point, largeur=W, dx=D, dy=E)       — anchored to 1 point
			// image("url", pointA, pointB)                      — rectangle between 2 points
			// All modes support couche="fond"|"avant" (default avant)
			if (pos.length < 2) throw new DslRuntimeError('image() attend au moins 2 arguments', line);
			if (pos[0].type !== 'string')
				throw new DslRuntimeError('image(): le 1er argument doit etre une URL (chaine)', line);
			const imgUrl = (pos[0] as { type: 'string'; value: string }).value;
			// Security: only allow http(s) and relative URLs (block javascript:, data:, etc.)
			if (!/^https?:\/\/|^\//.test(imgUrl))
				throw new DslRuntimeError('image(): URL doit commencer par http://, https://, ou /', line);

			// Read optional couche param
			let imgLayer: 'fond' | 'avant' | undefined;
			if (named.has('couche')) {
				const cv = named.get('couche')!;
				const layerStr = cv.type === 'string' ? cv.value : '';
				if (layerStr !== 'fond' && layerStr !== 'avant')
					throw new DslRuntimeError('image(): couche doit etre "fond" ou "avant"', line);
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
				// image("url", x, y, largeur=W)
				if (!named.has('largeur'))
					throw new DslRuntimeError('image(): largeur=... est obligatoire', line);
				imgWidth = requireNumber(named.get('largeur')!, 'largeur', line);
				imgHeight = named.has('hauteur')
					? requireNumber(named.get('hauteur')!, 'hauteur', line)
					: undefined;
				const x = (pos[1] as { type: 'nombre'; value: number }).value;
				const y = (pos[2] as { type: 'nombre'; value: number }).value;
				imgPositioning = { position: { x, y } };
			} else if (pos.length >= 3 && pos[1].type === 'element' && pos[2].type === 'element') {
				// image("url", pointA, pointB) — 2-point rectangle mode
				const point1Id = requireElement(pos[1], 'point1', line);
				const point2Id = requireElement(pos[2], 'point2', line);
				imgWidth = 0; // width is computed from points at render time
				imgHeight = undefined;
				imgPositioning = { point1Id, point2Id };
			} else if (pos[1].type === 'element') {
				// image("url", point, largeur=W, dx=..., dy=...)
				if (!named.has('largeur'))
					throw new DslRuntimeError('image(): largeur=... est obligatoire', line);
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
					anchorOffset:
						dx !== undefined || dy !== undefined ? { dx: dx ?? 0, dy: dy ?? 0 } : undefined
				};
			} else {
				throw new DslRuntimeError(
					'image() attend: image("url", x, y, largeur=...) ou image("url", point, largeur=...) ou image("url", pointA, pointB)',
					line
				);
			}

			// Read optional visual transform params (from serialized transformed images)
			// NOTE: rotation= is in RADIANS (unlike angle= in rotation() which is in degrees).
			// These are internal serialization params, not intended for direct user input.
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

		case 'distance': {
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

		case 'angle': {
			if (pos.length === 2) {
				// angle(O, A) → polar angle of A relative to O (signed, -180..180 degrees)
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

		case 'perimetre': {
			if (pos.length < 3)
				throw new DslRuntimeError('perimetre() attend au moins 3 arguments (points)', line);
			const perimPointIds = pos.map((p, i) => requireElement(p, `point${i + 1}`, line));
			const id = figure.createScalarPerimeter(perimPointIds, { label });
			return { figureId: id, symbolType: 'scalar' };
		}

		case 'pente': {
			if (pos.length !== 1)
				throw new DslRuntimeError(
					'pente() attend 1 argument (droite, segment ou demidroite)',
					line
				);
			const penteArg = pos[0];
			if (
				penteArg.type !== 'element' ||
				(penteArg.elementType !== 'droite' &&
					penteArg.elementType !== 'segment' &&
					penteArg.elementType !== 'demidroite')
			)
				throw new DslRuntimeError('pente() attend une droite, un segment ou une demi-droite', line);
			const penteLineId = penteArg.figureId;
			const id = figure.createScalarSlope(penteLineId, { label });
			return { figureId: id, symbolType: 'scalar' };
		}

		case 'rayon': {
			if (pos.length !== 1) throw new DslRuntimeError('rayon() attend 1 argument (cercle)', line);
			const rayonArg = pos[0];
			if (rayonArg.type !== 'element' || rayonArg.elementType !== 'cercle')
				throw new DslRuntimeError('rayon() attend un cercle', line);
			const rayonCircleId = rayonArg.figureId;
			const id = figure.createScalarRadius(rayonCircleId, { label });
			return { figureId: id, symbolType: 'scalar' };
		}

		case 'slider': {
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

		case 'arc': {
			if (pos.length === 3) {
				// arc(A, O, B) — arc by 3 points (start, center, end)
				const startId = requireElement(pos[0], 'start', line);
				const centerId = requireElement(pos[1], 'centre', line);
				const endId = requireElement(pos[2], 'end', line);
				const id = figure.createArcByPoints(startId, centerId, endId, { label });
				return { figureId: id, symbolType: 'arc' };
			}
			if (pos.length === 1) {
				// arc(O, rayon=3, debut=0, fin=90) — angles interpreted per active angleMode.
				const centerId = requireElement(pos[0], 'centre', line);
				if (!named.has('rayon'))
					throw new DslRuntimeError("arc() avec 1 argument necessite 'rayon'", line);
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
				'arc() attend soit 3 arguments (A, O, B) soit 1 argument + rayon/debut/fin',
				line
			);
		}

		case 'secteur': {
			if (pos.length === 3) {
				// secteur(O, A, B) — sector by center and two points
				const centerId = requireElement(pos[0], 'centre', line);
				const startId = requireElement(pos[1], 'start', line);
				const endId = requireElement(pos[2], 'end', line);
				const id = figure.createSectorByPoints(centerId, startId, endId, { label });
				return { figureId: id, symbolType: 'secteur' as SymbolType };
			}
			if (pos.length === 1) {
				// secteur(O, rayon=3, debut=0, fin=90) — angles per active angleMode.
				const centerId = requireElement(pos[0], 'centre', line);
				if (!named.has('rayon'))
					throw new DslRuntimeError("secteur() avec 1 argument necessite 'rayon'", line);
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
				'secteur() attend soit 3 arguments (O, A, B) soit 1 argument + rayon/debut/fin',
				line
			);
		}

		case 'couronne': {
			if (pos.length !== 1)
				throw new DslRuntimeError('couronne() attend 1 argument positionnel (centre)', line);
			const centerId = requireElement(pos[0], 'centre', line);
			if (!named.has('r1') || !named.has('r2'))
				throw new DslRuntimeError("couronne() necessite 'r1' et 'r2'", line);
			const r1 = toScalarParam(named.get('r1')!, toGeoValue, line);
			const r2 = toScalarParam(named.get('r2')!, toGeoValue, line);
			// Validate r1 < r2 for numeric values
			const r1Num = typeof r1 === 'object' && 'scalarRef' in r1 ? null : geoToNumber(r1);
			const r2Num = typeof r2 === 'object' && 'scalarRef' in r2 ? null : geoToNumber(r2);
			if (r1Num !== null && r2Num !== null && r1Num >= r2Num)
				throw new DslRuntimeError('couronne(): r1 doit etre inferieur a r2', line);
			const id = figure.createAnnulus(centerId, r1, r2, { label });
			return { figureId: id, symbolType: 'couronne' as SymbolType };
		}

		case 'puissance': {
			if (pos.length !== 2)
				throw new DslRuntimeError('puissance() attend 2 arguments (point, cercle)', line);
			const pointId = requireElement(pos[0], 'point', line);
			const circleArg = pos[1];
			if (circleArg.type !== 'element' || circleArg.elementType !== 'cercle')
				throw new DslRuntimeError('puissance() attend un cercle comme 2e argument', line);
			const circleId = circleArg.figureId;
			const id = figure.createScalarPower(pointId, circleId, { label });
			return { figureId: id, symbolType: 'scalar' };
		}

		case 'style': {
			// style(element, couleur=..., forme=..., tirets=...)
			if (pos.length < 1)
				throw new DslRuntimeError('style() attend au moins 1 argument (element)', line);
			const elId = requireElement(pos[0], 'element', line);
			applyInlineStyle(figure, elId, named, line);
			return null; // style() returns nothing
		}

		case 'courbe': {
			// 1 string positional → cartesian curve (line / function / quadratic / implicit).
			if (pos.length === 1 && pos[0].type === 'string') {
				if (named.has('t_min') || named.has('t_max')) {
					throw new DslRuntimeError(
						"courbe(): t_min/t_max ne s'applique qu'à une courbe paramétrique (2 équations)",
						line
					);
				}
				return createCurveFromEquation(pos[0].value, figure, line, label, angleMode, symbols);
			}
			// 2 strings positional → parametric curve.
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
				'courbe() attend 1 ou 2 arguments string (1 = équation cartésienne, 2 = équations paramétriques x= et y=)',
				line
			);
		}

		case 'tangente': {
			if (pos.length !== 2) {
				throw new DslRuntimeError('tangente() attend 2 arguments (f, P ou x0)', line);
			}
			const tFnId = requireElement(pos[0], 'fonction', line);
			const tFnEl = figure.getElementById(tFnId);

			if (tFnEl && tFnEl.type === 'quadraticCurve') {
				// Tangent to quadratic curve
				if (pos[1].type === 'element') {
					const ptId = pos[1].figureId;
					const ptEl = figure.getElementById(ptId);
					if (!ptEl || ptEl.type !== 'pointOnQuadraticCurve') {
						throw new DslRuntimeError(
							'tangente(): le deuxieme argument doit etre un point_sur ou un nombre',
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
				throw new DslRuntimeError('tangente(): le premier argument doit etre une courbe', line);
			}

			// Second arg: pointOnCurve (dynamic) or number (fixed x₀)
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

		case 'derivee': {
			if (pos.length !== 1) {
				throw new DslRuntimeError('derivee() attend 1 argument (une fonction)', line);
			}
			const dFnId = requireElement(pos[0], 'fonction', line);
			const dFnEl = figure.getElementById(dFnId);
			if (!dFnEl || dFnEl.type !== 'function') {
				throw new DslRuntimeError("derivee(): l'argument doit être une courbe y = f(x)", line);
			}

			// f' is f.derivative (already symbolically computed at f's creation).
			// For the new function: expression = f', derivative = f''.
			let fPrimePrime: MathNode;
			try {
				fPrimePrime = differentiate(dFnEl.derivative, { variable: 'x', simplify: true });
			} catch {
				throw new DslRuntimeError('derivee(): impossible de calculer la dérivée seconde', line);
			}

			// Reuse f.compiledDerivative as g's compiledFn: by GeoFunction's invariant,
			// compiledDerivative === compile(derivative), so calling compile() again would
			// be redundant.
			let dCompiledDerivative: CompiledFn;
			try {
				dCompiledDerivative = compile(fPrimePrime);
			} catch (e) {
				throw new DslRuntimeError(
					`derivee(): impossible de compiler la dérivée — ${e instanceof Error ? e.message : ''}`,
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

		case 'integrale': {
			if (pos.length !== 3) {
				throw new DslRuntimeError('integrale() attend 3 arguments (f, a, b)', line);
			}
			const intFnId = requireElement(pos[0], 'fonction', line);
			const intFnEl = figure.getElementById(intFnId);
			if (!intFnEl || intFnEl.type !== 'function') {
				throw new DslRuntimeError(
					'integrale(): le 1er argument doit etre une courbe y = f(x)',
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

		case 'aire_entre': {
			// V3 — aire géométrique entre deux courbes y = f(x) et y = g(x) sur [a, b].
			// Spec: docs/wip/geometry/aire-entre-study.md
			if (pos.length !== 4) {
				throw new DslRuntimeError('aire_entre() attend 4 arguments (f, g, a, b)', line);
			}
			const fnId = requireElement(pos[0], 'fonction 1', line);
			const fnEl = figure.getElementById(fnId);
			if (!fnEl || fnEl.type !== 'function') {
				throw new DslRuntimeError(
					'aire_entre(): le 1er argument doit etre une courbe y = f(x)',
					line
				);
			}
			const gnId = requireElement(pos[1], 'fonction 2', line);
			const gnEl = figure.getElementById(gnId);
			if (!gnEl || gnEl.type !== 'function') {
				throw new DslRuntimeError(
					'aire_entre(): le 2e argument doit etre une courbe y = g(x)',
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
				// Orange (cf. aire-entre-study.md §0 décision 6) — triade
				// bleu(integrale) / vert(aire) / orange(aire_entre).
				defaultColor: '#fb923c',
				line,
				label,
				figure
			});
		}

		case 'asymptotes': {
			if (pos.length !== 1) {
				throw new DslRuntimeError('asymptotes() attend 1 argument (conique)', line);
			}
			const asymCurveId = requireElement(pos[0], 'conique', line);
			const asymCurveEl = figure.getElementById(asymCurveId);
			if (!asymCurveEl || asymCurveEl.type !== 'quadraticCurve') {
				throw new DslRuntimeError("asymptotes(): l'argument doit etre une conique", line);
			}
			if (asymCurveEl.conic.type !== 'hyperbola') {
				throw new DslRuntimeError('asymptotes(): la conique doit etre une hyperbole', line);
			}
			const asymLines = asymptoteLines(asymCurveEl.conic);
			if (!asymLines) {
				throw new DslRuntimeError('asymptotes(): impossible de calculer les asymptotes', line);
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

		case 'axes': {
			if (pos.length !== 1) {
				throw new DslRuntimeError('axes() attend 1 argument (conique)', line);
			}
			const axesCurveId = requireElement(pos[0], 'conique', line);
			const axesCurveEl = figure.getElementById(axesCurveId);
			if (!axesCurveEl || axesCurveEl.type !== 'quadraticCurve') {
				throw new DslRuntimeError("axes(): l'argument doit etre une conique", line);
			}
			if (axesCurveEl.conic.type === 'circle') {
				throw new DslRuntimeError("axes(): un cercle a une infinite d'axes de symetrie", line);
			}
			const axLines = computeAxisLines(axesCurveEl.conic);
			if (!axLines || axLines.length === 0) {
				throw new DslRuntimeError('axes(): impossible de calculer les axes', line);
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

		case 'directrice': {
			if (pos.length !== 1) {
				throw new DslRuntimeError('directrice() attend 1 argument (conique)', line);
			}
			const dirCurveId = requireElement(pos[0], 'conique', line);
			const dirCurveEl = figure.getElementById(dirCurveId);
			if (!dirCurveEl || dirCurveEl.type !== 'quadraticCurve') {
				throw new DslRuntimeError("directrice(): l'argument doit etre une conique", line);
			}
			if (dirCurveEl.conic.type !== 'parabola') {
				throw new DslRuntimeError('directrice(): la conique doit etre une parabole', line);
			}
			const dirLine = computeDirectrixLine(dirCurveEl.conic);
			if (!dirLine) {
				throw new DslRuntimeError('directrice(): impossible de calculer la directrice', line);
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

		case 'foyers': {
			if (pos.length !== 1) {
				throw new DslRuntimeError('foyers() attend 1 argument (conique)', line);
			}
			const foyersCurveId = requireElement(pos[0], 'conique', line);
			const foyersCurveEl = figure.getElementById(foyersCurveId);
			if (!foyersCurveEl || foyersCurveEl.type !== 'quadraticCurve') {
				throw new DslRuntimeError("foyers(): l'argument doit etre une conique", line);
			}
			const foci = computeFociPoints(foyersCurveEl.conic);
			if (!foci || foci.length === 0) {
				throw new DslRuntimeError('foyers(): impossible de calculer les foyers', line);
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

		case 'excentricite': {
			if (pos.length !== 1) {
				throw new DslRuntimeError('excentricite() attend 1 argument (conique)', line);
			}
			const eccCurveId = requireElement(pos[0], 'conique', line);
			const eccCurveEl = figure.getElementById(eccCurveId);
			if (!eccCurveEl || eccCurveEl.type !== 'quadraticCurve') {
				throw new DslRuntimeError("excentricite(): l'argument doit etre une conique", line);
			}
			const ecc = computeEccentricity(eccCurveEl.conic);
			if (isNaN(ecc)) {
				throw new DslRuntimeError('excentricite(): conique degeneree', line);
			}
			return { scalarValue: ecc } as BuiltinScalarResult;
		}

		case 'polaire': {
			if (pos.length !== 2) {
				throw new DslRuntimeError('polaire() attend 2 arguments (point, conique)', line);
			}
			const polPointId = requireElement(pos[0], 'point', line);
			const polCurveId = requireElement(pos[1], 'conique', line);
			const polPointEl = figure.getElementById(polPointId);
			if (!polPointEl || !isPointElement(polPointEl)) {
				throw new DslRuntimeError('polaire(): le premier argument doit etre un point', line);
			}
			const polCurveEl = figure.getElementById(polCurveId);
			if (!polCurveEl || polCurveEl.type !== 'quadraticCurve') {
				throw new DslRuntimeError('polaire(): le deuxieme argument doit etre une conique', line);
			}
			const polId = figure.createConicPolar(polCurveId, polPointId, { label });
			return { figureId: polId, symbolType: 'polaire' };
		}

		case 'point_sur': {
			if (pos.length < 1 || pos.length > 2) {
				throw new DslRuntimeError('point_sur() attend 1-2 arguments (objet, param?)', line);
			}
			const psId = requireElement(pos[0], 'objet', line);
			const psEl = figure.getElementById(psId);
			if (!psEl) {
				throw new DslRuntimeError('point_sur(): objet introuvable', line);
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
				const t =
					conicType === 'circle' || conicType === 'ellipse' ? toRadians(tRaw, angleMode) : tRaw;
				const ptId = figure.createPointOnQuadraticCurve(psId, t, { label });
				return { figureId: ptId, symbolType: 'point' };
			}

			if (psEl.type === 'function') {
				const x0Val =
					pos.length >= 2
						? toGeoValue(pos[1], line)
						: toGeoValue({ type: 'nombre', value: 0 }, line);
				const ptId = figure.createPointOnCurve(psId, x0Val, { label });
				return { figureId: ptId, symbolType: 'point' };
			}

			throw new DslRuntimeError(
				'point_sur(): le premier argument doit etre un segment, droite, demidroite, cercle, arc ou courbe',
				line
			);
		}

		case 'zeros':
		case 'extrema':
		case 'inflections': {
			if (pos.length !== 1) {
				throw new DslRuntimeError(`${name}() attend 1 argument (f)`, line);
			}
			const cpFnId = requireElement(pos[0], 'fonction', line);
			const cpFnEl = figure.getElementById(cpFnId);

			// zeros() on quadratic curve: solve Ax² + Dx + F = 0 (y=0)
			if (cpFnEl && cpFnEl.type === 'quadraticCurve' && name === 'zeros') {
				return createQuadraticZeros(cpFnEl, cpFnId, figure, line, label, named);
			}

			if (!cpFnEl || cpFnEl.type !== 'function') {
				throw new DslRuntimeError(`${name}(): le premier argument doit etre une courbe`, line);
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
				// inflections: need f''
				let d2, cd2;
				try {
					d2 = differentiate(cpFnEl.derivative, { variable: 'x', simplify: true });
					cd2 = compile(d2);
				} catch {
					throw new DslRuntimeError(
						'inflections(): impossible de calculer la derivee seconde',
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

			// Create non-draggable GeoPointOnCurve for each critical point
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

		case 'lieu': {
			if (pos.length !== 2) {
				throw new DslRuntimeError('lieu() attend 2 arguments (traceur, conducteur)', line);
			}
			const tracerId = requireElement(pos[0], 'traceur', line);
			const driverId = requireElement(pos[1], 'conducteur', line);

			const driverEl = figure.getElementById(driverId);
			if (!driverEl) {
				throw new DslRuntimeError(`lieu(): conducteur "${driverId}" introuvable`, line);
			}
			const driverOnPath =
				driverEl.type === 'pointOnCurve' ||
				driverEl.type === 'pointOnQuadraticCurve' ||
				driverEl.type === 'pointOnSegment' ||
				driverEl.type === 'pointOnLine' ||
				driverEl.type === 'pointOnCircle' ||
				driverEl.type === 'pointOnArc';
			if (!driverOnPath) {
				throw new DslRuntimeError('lieu(): le conducteur doit etre un point_sur', line);
			}

			const tracerEl = figure.getElementById(tracerId);
			if (!tracerEl) {
				throw new DslRuntimeError(`lieu(): traceur "${tracerId}" introuvable`, line);
			}

			// Verify tracer depends on driver (walk dependsOn chain)
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

		case 'trace': {
			if (pos.length !== 1) {
				throw new DslRuntimeError('trace() attend 1 argument (point)', line);
			}
			const trackedId = requireElement(pos[0], 'point', line);
			const trackedEl = figure.getElementById(trackedId);
			if (!trackedEl) {
				throw new DslRuntimeError(`trace(): point "${trackedId}" introuvable`, line);
			}
			if (!isPointElement(trackedEl)) {
				throw new DslRuntimeError("trace(): l'argument doit etre un point", line);
			}
			const trId = figure.createTrace(trackedId, { label });
			return { figureId: trId, symbolType: 'trace' as SymbolType };
		}

		default:
			return null; // Not a builtin — might be a macro
	}
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
	// Parse the equation string with mathAST
	let parsed: MathNode;
	try {
		parsed = parseCustom(equation);
	} catch {
		throw new DslRuntimeError(`courbe(): erreur de syntaxe dans "${equation}"`, line);
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

	// --- Try 2: y = f(x) (affine in y alone) ---
	const affineY = extractAffineCombination(F, ['y']);
	if (affineY.isAffine) {
		const g = affineY.coefficients.get('y')!; // coefficient of y
		const h = affineY.constant; // constant term (function of x)

		if (isZeroExpression(g)) {
			throw new DslRuntimeError("courbe(): la variable y est absente de l'expression", line);
		}

		return createFunctionFromCoefficients(g, h, equation, figure, line, label);
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
		throw new DslRuntimeError('courbe(): impossible de compiler F(x,y) pour cette équation', line);
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

/** Create a GeoFunction from y = -h(x)/g(x) where F = g*y + h = 0. */
function createFunctionFromCoefficients(
	g: MathNode,
	h: MathNode,
	equation: string,
	figure: Figure,
	line: number,
	label?: string
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
		label
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
 * Build a parametric curve element from two equation strings (`x = ...`, `y = ...`).
 *
 * Algorithm:
 *   1. Parse both equations and ensure they are relations with LHS in {x, y}.
 *   2. Identify the x= and y= equation (order-independent).
 *   3. Validate t_min and t_max (required, both ScalarParam-compatible, t_min < t_max if numeric).
 *   4. Auto-detect the parameter (single free variable not in {x, y} ∪ defined symbols),
 *      or honor an explicit `param="..."` override.
 *   5. Best-effort symbolic differentiation of x(t), y(t).
 *   6. Compile x(t) and y(t) (mandatory).
 *   7. Collect dependency ids (scalars/sliders referenced in x, y, t_min, t_max).
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
		throw new DslRuntimeError('courbe(): il faut une équation en x et une en y', line);
	}

	// Apply the active angle mode to wrap any trig calls in each equation.
	let xRhs = applyAngleMode(lhs1 === 'x' ? rhs1 : rhs2, angleMode);
	let yRhs = applyAngleMode(lhs1 === 'y' ? rhs1 : rhs2, angleMode);
	const eqXOriginal = lhs1 === 'x' ? eq1 : eq2;
	const eqYOriginal = lhs1 === 'y' ? eq1 : eq2;

	// Substitute static variables (numbers in the symbol table) into the
	// equations BEFORE differentiation/compilation. Scalar references stay
	// symbolic (handled later via `dependencies`).
	if (symbols) {
		const staticBindings: Record<string, MathNode> = {};
		for (const v of new Set([...getVariables(xRhs), ...getVariables(yRhs)])) {
			const entry = symbols.get(v);
			if (entry?.type === 'nombre') {
				staticBindings[v] = mathNumber((entry.value ?? 0).toString());
			}
		}
		if (Object.keys(staticBindings).length > 0) {
			xRhs = substitute(xRhs, staticBindings);
			yRhs = substitute(yRhs, staticBindings);
		}
	}

	// --- B. t_min / t_max validation ---
	const tMinRaw = named.get('t_min');
	const tMaxRaw = named.get('t_max');
	if (tMinRaw === undefined || tMaxRaw === undefined) {
		throw new DslRuntimeError(
			'courbe(): t_min et t_max obligatoires pour une courbe paramétrique',
			line
		);
	}
	const tMin = resolveTBoundArg(tMinRaw, 't_min', toGeoValue, line);
	const tMax = resolveTBoundArg(tMaxRaw, 't_max', toGeoValue, line);

	// Static check t_min < t_max only if both are numeric.
	const tMinNum = !isScalarRef(tMin) && tMin.kind === 'numeric' ? tMin.value : null;
	const tMaxNum = !isScalarRef(tMax) && tMax.kind === 'numeric' ? tMax.value : null;
	if (tMinNum !== null && tMaxNum !== null && tMinNum >= tMaxNum) {
		throw new DslRuntimeError('courbe(): t_max doit être strictement supérieur à t_min', line);
	}

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
			throw new DslRuntimeError('courbe(): param doit être une chaîne de caractères', line);
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
			throw new DslRuntimeError('courbe(): aucune variable de paramètre détectée', line);
		}
		if (candidates.length >= 2) {
			throw new DslRuntimeError(
				`courbe(): paramètre ambigu : {${candidates.join(', ')}} ; précisez param="..."`,
				line
			);
		}
		parameterName = candidates[0];
	}

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
			`courbe(): impossible de compiler "${eqXOriginal}" — ${e instanceof Error ? e.message : ''}`,
			line
		);
	}
	try {
		compiledY = compile(yRhs);
	} catch (e) {
		throw new DslRuntimeError(
			`courbe(): impossible de compiler "${eqYOriginal}" — ${e instanceof Error ? e.message : ''}`,
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
		eqXOriginal,
		eqYOriginal,
		[...dependencies],
		{ label }
	);
	return { figureId: id, symbolType: 'courbe' };
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
