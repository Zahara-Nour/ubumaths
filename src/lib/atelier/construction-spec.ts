/**
 * Atelier — ce que DÉCRIT une construction lue (géométrie v2, lot 2 : L2, L3, L8)
 *
 * `construction-read.ts` lit la structure ; ce module la TYPE : chaque argument
 * doit être un point, une droite ou un nombre, selon le mot et sa forme
 * (`parallele(P, d)` ou `parallele(P, A, B)`). Un nom inconnu de l'atelier est
 * accepté là où il est attendu : l'objet sera en attente (D9). Un nom du
 * mauvais type est refusé avec sa raison (« « d » n'est pas un point. »).
 *
 * Aucun calcul ici (voir `construction.ts`) : ce module ne lit que le texte et
 * le TYPE des objets cités, pour que `parseDefinition` (sans atelier) et
 * `recomputeAll` (avec) partagent les mêmes contrôles — invariant 4 : tout
 * contrôle vit dans la lecture.
 *
 * @module atelier/construction-spec
 */

import type { ObjectKind } from './types';
import {
	readConstruction,
	type ConstructionWord,
	type ReadArgument,
	type ReadCall
} from './construction-read';
import type { Provenance } from './parse';

// =============================================================================
// Types
// =============================================================================

export type PointSpec =
	| { readonly kind: 'ref'; readonly name: string }
	| { readonly kind: 'coordinates'; readonly x: string; readonly y: string }
	| { readonly kind: 'midpoint'; readonly a: PointSpec; readonly b: PointSpec }
	| { readonly kind: 'segment-midpoint'; readonly segment: LineSpec }
	| { readonly kind: 'projection'; readonly point: PointSpec; readonly axis: LineSpec };

export type LineShape = 'line' | 'segment' | 'ray';

export type LineSpec =
	| { readonly kind: 'ref'; readonly name: string }
	| {
			readonly kind: 'through';
			readonly shape: LineShape;
			readonly a: PointSpec;
			readonly b: PointSpec;
	  }
	| {
			readonly kind: 'parallel' | 'perpendicular';
			readonly through: PointSpec;
			readonly to: LineSpec;
	  };

export type CircleSpec =
	| { readonly kind: 'radius'; readonly center: PointSpec; readonly radius: string }
	| { readonly kind: 'passing'; readonly center: PointSpec; readonly through: PointSpec }
	| { readonly kind: 'three'; readonly a: PointSpec; readonly b: PointSpec; readonly c: PointSpec };

export type ConstructionSpec =
	| { readonly result: 'point'; readonly point: PointSpec }
	| { readonly result: 'line'; readonly line: LineSpec }
	| { readonly result: 'circle'; readonly circle: CircleSpec };

/** Le type d'un objet de l'atelier, ou `undefined` s'il n'existe pas (encore). */
export type KindOf = (name: string) => ObjectKind | undefined;

export type SpecOutcome =
	| { readonly ok: true; readonly spec: ConstructionSpec; readonly call: ReadCall }
	| { readonly ok: false; readonly message: string };

/** Ce que l'élève lit sous la carte : la NATURE de l'objet construit. */
export type ConstructionNature = 'point' | 'droite' | 'segment' | 'demi-droite' | 'cercle';

// =============================================================================
// Constantes
// =============================================================================

/** Les écritures de chaque mot, pour l'aide d'un appel mal formé. */
const FORMS: Readonly<Record<ConstructionWord, string>> = {
	point: 'point(1 ; 2)',
	milieu: 'milieu(A ; B) ou milieu(s)',
	projection: 'projection(A ; axe=d)',
	droite: 'droite(A ; B)',
	segment: 'segment(A ; B)',
	demidroite: 'demidroite(A ; B)',
	parallele: 'parallele(P ; d) ou parallele(P ; A ; B)',
	perpendiculaire: 'perpendiculaire(P ; d) ou perpendiculaire(P ; A ; B)',
	cercle: 'cercle(O ; 3), cercle(O ; rayon=3), cercle(O ; passant=A) ou cercle(A ; B ; C)'
};

const SHAPE_OF_WORD: Readonly<Partial<Record<ConstructionWord, LineShape>>> = {
	droite: 'line',
	segment: 'segment',
	demidroite: 'ray'
};

// =============================================================================
// Typage
// =============================================================================

class TypeRefusal extends Error {}

function formsMessage(word: ConstructionWord): string {
	return `${word} s’écrit ${FORMS[word]}.`;
}

/** Ce que construit un appel, sans rien typer : point, droite (et ses parts) ou cercle. */
function resultOf(call: ReadCall): ConstructionSpec['result'] {
	if (call.word === 'point' || call.word === 'milieu' || call.word === 'projection') return 'point';
	if (call.word === 'cercle') return 'circle';
	return 'line';
}

function shown(argument: ReadArgument): string {
	return argument.kind === 'name'
		? argument.name
		: argument.kind === 'call'
			? argument.call.text
			: argument.text;
}

function asPoint(argument: ReadArgument, kindOf: KindOf): PointSpec {
	if (argument.kind === 'name') {
		const kind = kindOf(argument.name);
		if (kind !== undefined && kind !== 'point') {
			throw new TypeRefusal(`« ${argument.name} » n’est pas un point.`);
		}
		return { kind: 'ref', name: argument.name };
	}
	if (argument.kind === 'call' && resultOf(argument.call) === 'point') {
		const spec = typed(argument.call, kindOf);
		if (spec.result === 'point') return spec.point;
	}
	throw new TypeRefusal(`« ${shown(argument)} » n’est pas un point.`);
}

function asLine(argument: ReadArgument, kindOf: KindOf): LineSpec {
	if (argument.kind === 'name') {
		const kind = kindOf(argument.name);
		if (kind !== undefined && kind !== 'curve') {
			throw new TypeRefusal(`« ${argument.name} » n’est pas une droite.`);
		}
		return { kind: 'ref', name: argument.name };
	}
	if (argument.kind === 'call' && resultOf(argument.call) === 'line') {
		const spec = typed(argument.call, kindOf);
		if (spec.result === 'line') return spec.line;
	}
	throw new TypeRefusal(`« ${shown(argument)} » n’est pas une droite.`);
}

/** Un nombre : son TEXTE, lu plus tard comme une valeur de l'atelier. */
function asScalar(argument: ReadArgument, kindOf: KindOf): string {
	if (argument.kind === 'scalar') return argument.text;
	if (argument.kind === 'name') {
		const kind = kindOf(argument.name);
		if (kind !== undefined && kind !== 'value') {
			throw new TypeRefusal(`« ${argument.name} » n’est pas un nombre.`);
		}
		return argument.name;
	}
	// `(ab)` en place d'un nombre : un produit, pas une droite
	if (argument.call.shortcut === 'line') return argument.call.text;
	throw new TypeRefusal(`« ${argument.call.text} » n’est pas un nombre.`);
}

function expectArity(call: ReadCall, counts: readonly number[], named = 0): void {
	if (!counts.includes(call.positional.length) || call.named.size !== named) {
		throw new TypeRefusal(formsMessage(call.word));
	}
}

function typed(call: ReadCall, kindOf: KindOf): ConstructionSpec {
	const [p0, p1, p2] = call.positional;
	switch (call.word) {
		case 'point':
			expectArity(call, [2]);
			return {
				result: 'point',
				point: { kind: 'coordinates', x: asScalar(p0, kindOf), y: asScalar(p1, kindOf) }
			};
		case 'milieu': {
			expectArity(call, [1, 2]);
			if (call.positional.length === 2) {
				return {
					result: 'point',
					point: { kind: 'midpoint', a: asPoint(p0, kindOf), b: asPoint(p1, kindOf) }
				};
			}
			// `milieu(s)` : le milieu d'un SEGMENT
			if (p0.kind === 'call' && p0.call.word !== 'segment') {
				throw new TypeRefusal('Une droite n’a pas de milieu : son milieu est celui d’un segment.');
			}
			return { result: 'point', point: { kind: 'segment-midpoint', segment: asLine(p0, kindOf) } };
		}
		case 'projection': {
			const axis = call.named.get('axe');
			if (axis === undefined || call.positional.length !== 1 || call.named.size !== 1) {
				throw new TypeRefusal(formsMessage(call.word));
			}
			return {
				result: 'point',
				point: { kind: 'projection', point: asPoint(p0, kindOf), axis: asLine(axis, kindOf) }
			};
		}
		case 'droite':
		case 'segment':
		case 'demidroite':
			expectArity(call, [2]);
			return {
				result: 'line',
				line: {
					kind: 'through',
					shape: SHAPE_OF_WORD[call.word] ?? 'line',
					a: asPoint(p0, kindOf),
					b: asPoint(p1, kindOf)
				}
			};
		case 'parallele':
		case 'perpendiculaire': {
			expectArity(call, [2, 3]);
			const kind = call.word === 'parallele' ? 'parallel' : 'perpendicular';
			const to: LineSpec =
				call.positional.length === 2
					? asLine(p1, kindOf)
					: { kind: 'through', shape: 'line', a: asPoint(p1, kindOf), b: asPoint(p2, kindOf) };
			return { result: 'line', line: { kind, through: asPoint(p0, kindOf), to } };
		}
		case 'cercle':
			return { result: 'circle', circle: typedCircle(call, kindOf) };
	}
}

function typedCircle(call: ReadCall, kindOf: KindOf): CircleSpec {
	const [p0, p1, p2] = call.positional;
	const radius = call.named.get('rayon');
	const passing = call.named.get('passant');
	if (radius !== undefined || passing !== undefined) {
		if (call.positional.length !== 1 || call.named.size !== 1) {
			throw new TypeRefusal(formsMessage('cercle'));
		}
		const center = asPoint(p0, kindOf);
		return radius !== undefined
			? { kind: 'radius', center, radius: asScalar(radius, kindOf) }
			: { kind: 'passing', center, through: asPoint(passing!, kindOf) };
	}
	if (call.positional.length === 3) {
		return {
			kind: 'three',
			a: asPoint(p0, kindOf),
			b: asPoint(p1, kindOf),
			c: asPoint(p2, kindOf)
		};
	}
	if (call.positional.length !== 2) throw new TypeRefusal(formsMessage('cercle'));
	// `cercle(O, A)` : centre O passant par A, ou diamètre [OA] ? L'élève le dit
	const pointLike =
		(p1.kind === 'name' && kindOf(p1.name) === 'point') ||
		(p1.kind === 'call' && resultOf(p1.call) === 'point');
	if (pointLike) {
		throw new TypeRefusal(
			`Pour le cercle de centre ${shown(p0)} passant par ${shown(p1)}, écris cercle(${shown(p0)}, passant=${shown(p1)}).`
		);
	}
	return { kind: 'radius', center: asPoint(p0, kindOf), radius: asScalar(p1, kindOf) };
}

/** Typer un appel lu ; un refus de type remonte en message. */
export function specOfCall(call: ReadCall, kindOf: KindOf): SpecOutcome {
	try {
		return { ok: true, spec: typed(call, kindOf), call };
	} catch (error) {
		if (error instanceof TypeRefusal) return { ok: false, message: error.message };
		throw error;
	}
}

/**
 * La construction que décrit une définition, ou `null` si ce n'en est pas une.
 * `kindOf` donne le type des objets cités (sans atelier : tout est inconnu, seuls
 * les contrôles de forme jouent).
 */
export function specOf(
	definition: string,
	provenance: Provenance,
	kindOf: KindOf = () => undefined
): SpecOutcome | null {
	const read = readConstruction(definition, provenance);
	if (read === null) return null;
	if (!read.ok) return read;
	return specOfCall(read.call, kindOf);
}

/** Le type d'objet de l'atelier qu'une construction crée : un point, ou une courbe. */
export function objectKindOf(spec: ConstructionSpec): 'point' | 'curve' {
	return spec.result === 'point' ? 'point' : 'curve';
}

/** La nature, lue sur l'appel (la parallèle est une droite, le milieu un point). */
export function natureOf(call: ReadCall): ConstructionNature {
	switch (call.word) {
		case 'point':
		case 'milieu':
		case 'projection':
			return 'point';
		case 'segment':
			return 'segment';
		case 'demidroite':
			return 'demi-droite';
		case 'cercle':
			return 'cercle';
		default:
			return 'droite';
	}
}

/** Les noms d'objets cités, et les textes numériques (rayon, coordonnées) d'une construction. */
export function partsOf(spec: ConstructionSpec): {
	readonly names: readonly string[];
	readonly scalars: readonly string[];
} {
	const names: string[] = [];
	const scalars: string[] = [];
	const point = (p: PointSpec): void => {
		switch (p.kind) {
			case 'ref':
				names.push(p.name);
				return;
			case 'coordinates':
				scalars.push(p.x, p.y);
				return;
			case 'midpoint':
				point(p.a);
				point(p.b);
				return;
			case 'segment-midpoint':
				line(p.segment);
				return;
			case 'projection':
				point(p.point);
				line(p.axis);
				return;
		}
	};
	const line = (l: LineSpec): void => {
		switch (l.kind) {
			case 'ref':
				names.push(l.name);
				return;
			case 'through':
				point(l.a);
				point(l.b);
				return;
			default:
				point(l.through);
				line(l.to);
		}
	};
	if (spec.result === 'point') point(spec.point);
	else if (spec.result === 'line') line(spec.line);
	else {
		const c = spec.circle;
		if (c.kind === 'radius') {
			point(c.center);
			scalars.push(c.radius);
		} else if (c.kind === 'passing') {
			point(c.center);
			point(c.through);
		} else {
			point(c.a);
			point(c.b);
			point(c.c);
		}
	}
	return { names: [...new Set(names)], scalars };
}
