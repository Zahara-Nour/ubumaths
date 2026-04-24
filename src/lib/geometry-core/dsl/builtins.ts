/**
 * Builtin function definitions for the DSL interpreter.
 *
 * Maps French DSL function names to Figure factory method calls.
 */

import type { Figure } from '../graph/figure';
import type { GeoValue } from '../types/geo-value';
import type { GeoPoint } from '../types/primitives';
import type { SymbolType } from './symbol-table';
import { DslRuntimeError } from './errors';

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

		case 'style': {
			// style(element, couleur=..., forme=..., tirets=...)
			if (pos.length < 1)
				throw new DslRuntimeError('style() attend au moins 1 argument (element)', line);
			const elId = requireElement(pos[0], 'element', line);
			const style: Record<string, unknown> = {};
			if (named.has('couleur')) {
				const cv = named.get('couleur')!;
				const colorStr =
					cv.type === 'string' ? cv.value : cv.type === 'nombre' ? String(cv.value) : '';
				style.color = resolveColorName(colorStr);
			}
			if (named.has('forme')) {
				const fv = named.get('forme')!;
				style.pointShape = fv.type === 'string' ? fv.value : 'dot';
			}
			if (named.has('tirets')) {
				style.dash = 'dashed';
			}
			if (named.has('pointilles')) {
				style.dash = 'dotted';
			}
			if (named.has('epaisseur')) {
				style.strokeWidth = requireNumber(named.get('epaisseur')!, 'epaisseur', line);
			}
			figure.updateStyle(elId, style);
			return null; // style() returns nothing
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
	'symetrie',
	'rotation',
	'translation',
	'homothetie',
	'intersection',
	'marque_angle',
	'angle_droit',
	'marque_segment',
	'mesure',
	'style'
]);

/** Math functions that return numbers. */
export const MATH_FUNCTIONS = new Set(['sqrt', 'abs', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan']);
