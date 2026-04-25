/**
 * Builtin function definitions for the DSL interpreter.
 *
 * Maps French DSL function names to Figure factory method calls.
 */

import type { Figure } from '../graph/figure';
import type { GeoValue } from '../types/geo-value';
import { exact } from '../types/geo-value';
import type { GeoPoint } from '../types/primitives';
import type { SymbolType } from './symbol-table';
import { DslRuntimeError } from './errors';
import {
	parseCustom,
	isRelation,
	subtract,
	divide,
	opposite,
	add,
	number as mathNumber
} from '$lib/mathAST';
import type { MathNode } from '$lib/mathAST';
import { extractAffineCombination, getPolynomialDegree } from '$lib/mathAST/analysis';
import { isZeroExpression } from '$lib/mathAST/normal';

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
const STYLE_ARGS = new Set([
	'couleur',
	'forme',
	'trait',
	'epaisseur',
	'rendu',
	'rugosite',
	'courbure',
	'motif',
	'sommets_nets'
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
	if (Object.keys(style).length > 0) {
		figure.updateStyle(elId, style);
	}
}

export function executeBuiltin(
	name: string,
	args: ResolvedArgs,
	figure: Figure,
	toGeoValue: (v: ResolvedValue, line: number) => GeoValue,
	toGeoPoint: (x: ResolvedValue, y: ResolvedValue, line: number) => GeoPoint,
	line: number,
	label?: string
): BuiltinResult | null {
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
		label
	);

	// Apply inline style args (couleur, forme, etc.) to any created element
	if (result && hasStyleArgs) {
		applyInlineStyle(figure, result.figureId, named, line);
	}

	return result;
}

function _executeBuiltinInner(
	name: string,
	pos: ResolvedValue[],
	named: Map<string, ResolvedValue>,
	figure: Figure,
	toGeoValue: (v: ResolvedValue, line: number) => GeoValue,
	toGeoPoint: (x: ResolvedValue, y: ResolvedValue, line: number) => GeoPoint,
	line: number,
	label?: string
): BuiltinResult | null {
	switch (name) {
		case 'point': {
			if (pos.length !== 2) throw new DslRuntimeError('point() attend 2 arguments (x, y)', line);
			const x = toGeoValue(pos[0], line);
			const y = toGeoValue(pos[1], line);
			const id = figure.createFreePoint({ x, y }, { label });
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

		case 'cercle': {
			if (pos.length !== 1)
				throw new DslRuntimeError('cercle() attend 1 argument positionnel (centre)', line);
			const centerId = requireElement(pos[0], 'centre', line);
			if (named.has('rayon')) {
				const radius = toGeoValue(named.get('rayon')!, line);
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

		case 'symetrie': {
			if (pos.length !== 1)
				throw new DslRuntimeError('symetrie() attend 1 argument positionnel (source)', line);
			const sourceId = requireElement(pos[0], 'source', line);
			if (named.has('centre')) {
				const centerId = requireElement(named.get('centre')!, 'centre', line);
				const id = figure.createReflectedPoint(sourceId, centerId, { label });
				return { figureId: id, symbolType: 'point' };
			}
			if (named.has('axe')) {
				const tuple = requireTuple(named.get('axe')!, 'axe', line);
				if (tuple.length !== 2) throw new DslRuntimeError('axe attend un tuple de 2 points', line);
				const id = figure.createReflectedOverLine(
					sourceId,
					requireElement(tuple[0], 'axe.1', line),
					requireElement(tuple[1], 'axe.2', line),
					{ label }
				);
				return { figureId: id, symbolType: 'point' };
			}
			throw new DslRuntimeError("symetrie() necessite 'centre' ou 'axe'", line);
		}

		case 'rotation': {
			if (pos.length !== 1)
				throw new DslRuntimeError('rotation() attend 1 argument positionnel (source)', line);
			const sourceId = requireElement(pos[0], 'source', line);
			const centerId = requireElement(
				named.get('centre') ?? { type: 'nombre', value: 0 },
				'centre',
				line
			);
			// DSL angles are in degrees, Figure API expects radians
			const angleDeg = requireNumber(
				named.get('angle') ?? { type: 'nombre', value: 0 },
				'angle',
				line
			);
			const angleRad: GeoValue = { kind: 'numeric', value: (angleDeg * Math.PI) / 180 };
			const id = figure.createRotatedPoint(sourceId, centerId, angleRad, { label });
			return { figureId: id, symbolType: 'point' };
		}

		case 'translation': {
			if (pos.length !== 1)
				throw new DslRuntimeError('translation() attend 1 argument positionnel (source)', line);
			const sourceId = requireElement(pos[0], 'source', line);
			const tuple = requireTuple(
				named.get('vecteur') ?? { type: 'nombre', value: 0 },
				'vecteur',
				line
			);
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

		case 'homothetie': {
			if (pos.length !== 1)
				throw new DslRuntimeError('homothetie() attend 1 argument positionnel (source)', line);
			const sourceId = requireElement(pos[0], 'source', line);
			const centerId = requireElement(
				named.get('centre') ?? { type: 'nombre', value: 0 },
				'centre',
				line
			);
			const factor = toGeoValue(named.get('rapport') ?? { type: 'nombre', value: 1 }, line);
			const id = figure.createDilatedPoint(sourceId, centerId, factor, { label });
			return { figureId: id, symbolType: 'point' };
		}

		case 'intersection': {
			if (pos.length !== 2) throw new DslRuntimeError('intersection() attend 2 arguments', line);
			const id = figure.createIntersectionLL(
				requireElement(pos[0], 'arg1', line),
				requireElement(pos[1], 'arg2', line),
				{ label }
			);
			return { figureId: id, symbolType: 'point' };
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
			const typeStr = named.has('type')
				? (named.get('type')! as { type: 'nombre'; value: number }).type === 'nombre'
					? 'distance'
					: 'distance'
				: pos.length === 2
					? 'distance'
					: pos.length === 3
						? 'angle'
						: 'area';
			const id = figure.createMeasure(typeStr as 'distance' | 'angle' | 'area', targetIds, {
				label
			});
			return { figureId: id, symbolType: 'measure' };
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
				// arc(O, rayon=3, debut=0, fin=90) — arc by angles (degrees in DSL)
				const centerId = requireElement(pos[0], 'centre', line);
				if (!named.has('rayon'))
					throw new DslRuntimeError("arc() avec 1 argument necessite 'rayon'", line);
				const radius = toGeoValue(named.get('rayon')!, line);
				const startDeg = named.has('debut') ? requireNumber(named.get('debut')!, 'debut', line) : 0;
				const endDeg = named.has('fin') ? requireNumber(named.get('fin')!, 'fin', line) : 360;
				const startRad: GeoValue = { kind: 'numeric', value: (startDeg * Math.PI) / 180 };
				const endRad: GeoValue = { kind: 'numeric', value: (endDeg * Math.PI) / 180 };
				const id = figure.createArcByAngles(centerId, radius, startRad, endRad, { label });
				return { figureId: id, symbolType: 'arc' };
			}
			throw new DslRuntimeError(
				'arc() attend soit 3 arguments (A, O, B) soit 1 argument + rayon/debut/fin',
				line
			);
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
			if (pos.length !== 1 || pos[0].type !== 'string') {
				throw new DslRuntimeError(
					'courbe() attend 1 argument string (ex: courbe("y = 2*x + 3"))',
					line
				);
			}
			const lineResult = createLineFromEquation(pos[0].value, figure, line, label);
			return lineResult;
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
	'cercle',
	'arc',
	'symetrie',
	'rotation',
	'translation',
	'homothetie',
	'intersection',
	'marque_angle',
	'angle_droit',
	'marque_segment',
	'mesure',
	'style',
	'courbe'
]);

/** Math functions that return numbers. */
export const MATH_FUNCTIONS = new Set(['sqrt', 'abs', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan']);

// =============================================================================
// courbe() — equation-based curve creation
// =============================================================================

const ZERO_NODE = mathNumber('0');
const ONE_NODE = mathNumber('1');

/**
 * Parse an equation string and create a line if the expression is affine in x and y.
 * Supports: "y = 2*x + 3", "2*x - y + 3 = 0", "x = 3", "2*x - y + 3" (implicit = 0).
 */
function createLineFromEquation(
	equation: string,
	figure: Figure,
	line: number,
	label?: string
): BuiltinResult {
	// Parse the equation string with mathAST
	let parsed: MathNode;
	try {
		parsed = parseCustom(equation);
	} catch {
		throw new DslRuntimeError(`courbe(): erreur de syntaxe dans "${equation}"`, line);
	}

	// Extract F(x,y) such that F = 0
	let F: MathNode;
	if (isRelation(parsed) && parsed.relation === '=') {
		// "left = right" → F = left - right
		F = subtract(parsed.left, parsed.right);
	} else {
		// No "=" → treat expression as F (implicit = 0)
		F = parsed;
	}

	// Check polynomial degree in x and y
	const degX = getPolynomialDegree(F, 'x');
	const degY = getPolynomialDegree(F, 'y');

	if ((degX !== null && degX > 1) || (degY !== null && degY > 1)) {
		throw new DslRuntimeError(
			`courbe(): les courbes non-linéaires ne sont pas encore supportées (degré x=${degX}, y=${degY})`,
			line
		);
	}
	if (degX === null || degY === null) {
		throw new DslRuntimeError(
			'courbe(): les fonctions transcendantes (sin, cos, exp, ...) ne sont pas encore supportées',
			line
		);
	}

	// Extract affine coefficients: F = a*x + b*y + c
	const affine = extractAffineCombination(F, ['x', 'y']);
	if (!affine.isAffine) {
		throw new DslRuntimeError(`courbe(): expression non-affine — ${affine.error}`, line);
	}

	const a = affine.coefficients.get('x')!;
	const b = affine.coefficients.get('y')!;
	const c = affine.constant;

	// Check for degenerate equation (a=0 and b=0)
	if (isZeroExpression(a) && isZeroExpression(b)) {
		throw new DslRuntimeError('courbe(): équation dégénérée (0 = 0 ou constante non nulle)', line);
	}

	// Build two exact points on the line
	let p1: GeoPoint;
	let p2: GeoPoint;

	if (!isZeroExpression(b)) {
		// Non-vertical: y = -(a*x + c) / b
		// P1 = (0, -c/b)
		const y1 = divide(opposite(c), b);
		// P2 = (1, -(a + c) / b)
		const y2 = divide(opposite(add(a, c)), b);
		p1 = { x: exact(ZERO_NODE), y: exact(y1) };
		p2 = { x: exact(ONE_NODE), y: exact(y2) };
	} else {
		// Vertical line: x = -c/a
		const xVal = divide(opposite(c), a);
		p1 = { x: exact(xVal), y: exact(ZERO_NODE) };
		p2 = { x: exact(xVal), y: exact(ONE_NODE) };
	}

	// Create two hidden support points and a line through them
	const pt1Id = figure.createFreePoint(p1, { visible: false });
	const pt2Id = figure.createFreePoint(p2, { visible: false });
	const lineId = figure.createLine(pt1Id, pt2Id, { label });

	return { figureId: lineId, symbolType: 'droite' };
}
