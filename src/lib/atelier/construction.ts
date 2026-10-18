/**
 * Atelier — CALCULER une construction (géométrie v2, lot 2 : L1, L8)
 *
 * L1 (décision de David, 2026-10-18) : c'est l'atelier qui calcule une
 * construction, avec les fonctions PURES et EXACTES de `geometry-core`
 * (`compute/geo-arithmetic.ts`, `geometry/transformations.ts`) — jamais une
 * `Figure`. `I = milieu(A, B)` a ses coordonnées exactes dans le modèle, comme
 * un point tapé ; la vue Géométrie n'en est qu'une projection (`figure-sync.ts`).
 *
 * Rien n'est rangé : la définition, telle qu'écrite, est relue à chaque calcul
 * (invariant 4). Une construction en dépend d'autres par leur NOM ; le calcul
 * les suit, garde contre un cycle comprise.
 *
 * `keepNames` : les curseurs de la vue Géométrie, gardés en lettres (comme
 * `substitutedAstOf`) — les coordonnées sont alors des arbres qui les citent, et
 * la figure les compile pour suivre un curseur sans se reconstruire.
 *
 * @module atelier/construction
 */

import type { Atelier } from './atelier.svelte';
import type { AtelierObject } from './types';
import type { MathNode } from '$lib/mathAST/types';
import type { GeoPoint } from '$lib/geometry-core/types/primitives';
import { exact, isExact, type GeoValue } from '$lib/geometry-core/types/geo-value';
import {
	geoAdd,
	geoDiv,
	geoFromNumber,
	geoMul,
	geoOpposite,
	geoSqrt,
	geoSub,
	simplifyExact
} from '$lib/geometry-core/compute/geo-arithmetic';
import { geoEqual, geoIsZero } from '$lib/geometry-core/compute/compare';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { projectOnLine } from '$lib/geometry-core/geometry/transformations';
import {
	curveShapeOf,
	equationExpression,
	expandedEquation
} from '$lib/geometry-core/geometry/curve-nature';
import { numericNode } from '$lib/mathAST/common/numeric';
import {
	add,
	equals,
	multiply,
	opposite,
	parentheses,
	power,
	subtract,
	variable
} from '$lib/mathAST/factory';
import { toCustom } from '$lib/mathAST/custom-generator';
import { toLatex } from '$lib/mathAST/latex-generator';
import { substitutedAstOf, substitutedTextOf } from './engine';
import { astOf, pointCoordinatesOf, type Provenance } from './parse';
import { decimalCommaLatex, decimalCommaText } from './decimal-comma';
import type { ReadArgument, ReadCall } from './construction-read';
import {
	natureOf,
	specOf,
	type CircleSpec,
	type ConstructionNature,
	type ConstructionSpec,
	type KindOf,
	type LineShape,
	type LineSpec,
	type PointSpec
} from './construction-spec';

// =============================================================================
// Types
// =============================================================================

/** Une construction calculée : un point, une ligne portée par deux points, un cercle. */
export type Built =
	| { readonly shape: 'point'; readonly at: GeoPoint }
	| { readonly shape: LineShape; readonly from: GeoPoint; readonly to: GeoPoint }
	| { readonly shape: 'circle'; readonly center: GeoPoint; readonly radius: GeoValue };

export type BuiltOutcome =
	| { readonly ok: true; readonly built: Built; readonly call: ReadCall }
	| { readonly ok: false; readonly message: string };

interface BuildOptions {
	readonly keepNames?: ReadonlySet<string>;
}

interface Context {
	readonly atelier: Atelier;
	readonly keep: ReadonlySet<string> | undefined;
	/** Les objets en cours de calcul : un cycle s'arrête là. */
	readonly visiting: Set<string>;
}

// =============================================================================
// Constantes
// =============================================================================

const TWO = geoFromNumber(2);

/** Un refus de calcul, remonté en message par `constructionOf`. */
class Failure extends Error {}

// =============================================================================
// Lire
// =============================================================================

/** La définition de cet objet est-elle une construction (`milieu(A, B)`, `(AB)`) ? */
export function isConstruction(object: AtelierObject): boolean {
	return (
		(object.kind === 'point' || object.kind === 'curve') &&
		specOf(object.definition, object.provenance ?? 'url') !== null
	);
}

/** Le type des objets de l'atelier, pour typer une construction. */
export function kindsOf(atelier: Atelier): KindOf {
	return (name) => atelier.get(name)?.kind;
}

/** La nature d'une construction (« droite », « segment »…), ou `null`. */
export function constructionNatureOf(object: AtelierObject): ConstructionNature | null {
	if (object.kind !== 'point' && object.kind !== 'curve') return null;
	const read = specOf(object.definition, object.provenance ?? 'url');
	return read !== null && read.ok ? natureOf(read.call) : null;
}

// =============================================================================
// Calculer
// =============================================================================

/** Calculer l'objet `name` de l'atelier, s'il est une construction. */
export function constructionOf(
	atelier: Atelier,
	name: string,
	options: BuildOptions = {}
): BuiltOutcome {
	const ctx: Context = { atelier, keep: options.keepNames, visiting: new Set() };
	try {
		return objectBuilt(name, ctx);
	} catch (error) {
		if (error instanceof Failure) return { ok: false, message: error.message };
		throw error;
	}
}

/** Calculer une construction TAPÉE (sans nom : « tapé seul »). */
export function constructionFromText(
	atelier: Atelier,
	text: string,
	provenance: Provenance,
	options: BuildOptions = {}
): BuiltOutcome {
	const read = specOf(text, provenance, kindsOf(atelier));
	if (read === null) return { ok: false, message: `« ${text} » n’est pas une construction.` };
	if (!read.ok) return read;
	const ctx: Context = { atelier, keep: options.keepNames, visiting: new Set() };
	try {
		return { ok: true, built: built(read.spec, ctx), call: read.call };
	} catch (error) {
		if (error instanceof Failure) return { ok: false, message: error.message };
		throw error;
	}
}

function objectBuilt(name: string, ctx: Context): BuiltOutcome & { ok: true } {
	const object = ctx.atelier.get(name);
	if (object === undefined) throw new Failure(`« ${name} » n’est pas encore défini.`);
	if (ctx.visiting.has(name)) throw new Failure(`« ${name} » se construit à partir de lui-même.`);
	const read = specOf(object.definition, object.provenance ?? 'url', kindsOf(ctx.atelier));
	if (read === null) throw new Failure(`« ${name} » n’est pas une construction.`);
	if (!read.ok) throw new Failure(read.message);
	ctx.visiting.add(name);
	try {
		return { ok: true, built: built(read.spec, ctx), call: read.call };
	} finally {
		ctx.visiting.delete(name);
	}
}

function built(spec: ConstructionSpec, ctx: Context): Built {
	if (spec.result === 'point') return { shape: 'point', at: pointOf(spec.point, ctx) };
	if (spec.result === 'line') return lineOf(spec.line, ctx);
	return circleOf(spec.circle, ctx);
}

/** Un objet cité doit être prêt : sinon son propre message (attente, erreur) suffit. */
function usableObject(name: string, ctx: Context): AtelierObject {
	const object = ctx.atelier.get(name);
	if (object === undefined) throw new Failure(`« ${name} » n’est pas encore défini.`);
	if (object.status !== 'ok') {
		throw new Failure(
			object.status === 'error'
				? `Dépend de « ${name} », qui est en erreur.`
				: `En attente de « ${name} ».`
		);
	}
	return object;
}

/** Une valeur exacte, simplifiée quand elle ne cite aucun curseur gardé. */
function valueOf(ast: MathNode): GeoValue {
	return exact(simplifyExact(ast));
}

function scalarOf(text: string, ctx: Context): GeoValue {
	const read = substitutedTextOf(ctx.atelier, text, 'text', { keepNames: ctx.keep });
	if (!read.ok) throw new Failure(read.message);
	return valueOf(read.ast);
}

function pointOf(spec: PointSpec, ctx: Context): GeoPoint {
	switch (spec.kind) {
		case 'ref': {
			const object = usableObject(spec.name, ctx);
			if (object.kind !== 'point') throw new Failure(`« ${spec.name} » n’est pas un point.`);
			const coordinates = pointCoordinatesOf(object.definition);
			if (coordinates === null) {
				const inner = objectBuilt(spec.name, ctx).built;
				if (inner.shape !== 'point') throw new Failure(`« ${spec.name} » n’est pas un point.`);
				return inner.at;
			}
			const [x, y] = coordinates.map((c) => {
				const read = substitutedTextOf(ctx.atelier, c, object.provenance, {
					keepNames: ctx.keep
				});
				if (!read.ok) throw new Failure(read.message);
				return valueOf(read.ast);
			});
			return { x, y };
		}
		case 'coordinates':
			return { x: scalarOf(spec.x, ctx), y: scalarOf(spec.y, ctx) };
		case 'midpoint': {
			const a = pointOf(spec.a, ctx);
			const b = pointOf(spec.b, ctx);
			return { x: half(geoAdd(a.x, b.x)), y: half(geoAdd(a.y, b.y)) };
		}
		case 'segment-midpoint': {
			const line = lineOf(spec.segment, ctx);
			if (line.shape !== 'segment') {
				throw new Failure(
					'Seul un segment a un milieu : une droite, une demi-droite sont infinies.'
				);
			}
			return { x: half(geoAdd(line.from.x, line.to.x)), y: half(geoAdd(line.from.y, line.to.y)) };
		}
		case 'projection': {
			const point = pointOf(spec.point, ctx);
			const axis = lineOf(spec.axis, ctx);
			const projected = projectOnLine(point, axis.from, axis.to);
			if (projected === null) throw new Failure('L’axe de la projection n’est pas une droite.');
			return projected;
		}
	}
}

function half(value: GeoValue): GeoValue {
	// Diviser par 2 ne peut pas échouer
	return geoDiv(value, TWO) ?? value;
}

function samePoint(p: GeoPoint, q: GeoPoint): boolean {
	return geoEqual(p.x, q.x) && geoEqual(p.y, q.y);
}

const CONFUSED: Readonly<Record<LineShape, string>> = {
	line: 'Les deux points sont confondus : la droite n’est pas définie.',
	segment: 'Les deux points sont confondus : le segment est réduit à un point.',
	ray: 'Les deux points sont confondus : la demi-droite n’est pas définie.'
};

function lineOf(
	spec: LineSpec,
	ctx: Context
): { readonly shape: LineShape; readonly from: GeoPoint; readonly to: GeoPoint } {
	switch (spec.kind) {
		case 'ref':
			return namedLine(spec.name, ctx);
		case 'through': {
			const from = pointOf(spec.a, ctx);
			const to = pointOf(spec.b, ctx);
			if (samePoint(from, to)) throw new Failure(CONFUSED[spec.shape]);
			return { shape: spec.shape, from, to };
		}
		case 'parallel':
		case 'perpendicular': {
			const through = pointOf(spec.through, ctx);
			const base = lineOf(spec.to, ctx);
			const dx = geoSub(base.to.x, base.from.x);
			const dy = geoSub(base.to.y, base.from.y);
			// La perpendiculaire : le vecteur directeur tourné d'un quart de tour
			const [ux, uy] = spec.kind === 'parallel' ? [dx, dy] : [geoOpposite(dy), dx];
			return {
				shape: 'line',
				from: through,
				to: { x: geoAdd(through.x, ux), y: geoAdd(through.y, uy) }
			};
		}
	}
}

/** Une droite NOMMÉE : une construction (droite, segment, demi-droite), ou une équation de droite. */
function namedLine(
	name: string,
	ctx: Context
): { readonly shape: LineShape; readonly from: GeoPoint; readonly to: GeoPoint } {
	const object = usableObject(name, ctx);
	const notALine = `« ${name} » n’est pas une droite.`;
	if (object.kind !== 'curve') throw new Failure(notALine);
	if (isConstruction(object)) {
		const inner = objectBuilt(name, ctx).built;
		if (inner.shape === 'point' || inner.shape === 'circle') throw new Failure(notALine);
		return inner;
	}
	// `d : y = 3x − 2` (lot 1) : deux de ses points, exacts
	const substituted = substitutedAstOf(ctx.atelier, name, { keepNames: ctx.keep });
	if (!substituted.ok) throw new Failure(substituted.message);
	const raw = equationExpression(substituted.ast);
	const written = curveShapeOf(raw);
	const shape = written.kind === 'line' ? written : curveShapeOf(expandedEquation(raw));
	if (shape.kind !== 'line') throw new Failure(notALine);
	const [a, b, c] = [shape.a, shape.b, shape.c].map(valueOf);
	if (!geoIsZero(b)) {
		const at = (x: number): GeoPoint => {
			const gx = geoFromNumber(x);
			const y = geoDiv(geoOpposite(geoAdd(geoMul(a, gx), c)), b);
			if (y === null) throw new Failure(notALine);
			return { x: gx, y };
		};
		return { shape: 'line', from: at(0), to: at(1) };
	}
	const x = geoDiv(geoOpposite(c), a);
	if (x === null) throw new Failure(notALine);
	return {
		shape: 'line',
		from: { x, y: geoFromNumber(0) },
		to: { x, y: geoFromNumber(1) }
	};
}

function circleOf(spec: CircleSpec, ctx: Context): Built {
	switch (spec.kind) {
		case 'radius': {
			const center = pointOf(spec.center, ctx);
			const radius = scalarOf(spec.radius, ctx);
			const value = geoToNumber(radius);
			// NaN : un curseur gardé en lettre (figure), jugé par la figure elle-même
			if (value <= 0) throw new Failure('Le rayon d’un cercle est strictement positif.');
			return { shape: 'circle', center, radius };
		}
		case 'passing': {
			const center = pointOf(spec.center, ctx);
			const through = pointOf(spec.through, ctx);
			if (samePoint(center, through)) {
				throw new Failure(
					'Le centre et le point sont confondus : le cercle est réduit à un point.'
				);
			}
			return { shape: 'circle', center, radius: distance(center, through) };
		}
		case 'three': {
			const [a, b, c] = [spec.a, spec.b, spec.c].map((p) => pointOf(p, ctx));
			return circumcircle(a, b, c);
		}
	}
}

function distance(p: GeoPoint, q: GeoPoint): GeoValue {
	const dx = geoSub(q.x, p.x);
	const dy = geoSub(q.y, p.y);
	const squared = geoAdd(geoMul(dx, dx), geoMul(dy, dy));
	const root = geoSqrt(squared);
	if (root === null) throw new Failure('Cette longueur ne se calcule pas.');
	return root;
}

/**
 * Le cercle circonscrit, EXACT : les formules de `geometry/circumcircle.ts`
 * (qui, elle, calcule en nombres), menées en `GeoValue`.
 */
function circumcircle(a: GeoPoint, b: GeoPoint, c: GeoPoint): Built {
	const square = (p: GeoPoint) => geoAdd(geoMul(p.x, p.x), geoMul(p.y, p.y));
	const D = geoMul(
		TWO,
		geoAdd(
			geoAdd(geoMul(a.x, geoSub(b.y, c.y)), geoMul(b.x, geoSub(c.y, a.y))),
			geoMul(c.x, geoSub(a.y, b.y))
		)
	);
	const aligned = 'Les trois points sont alignés : aucun cercle ne passe par les trois.';
	if (geoIsZero(D)) throw new Failure(aligned);
	const [a2, b2, c2] = [square(a), square(b), square(c)];
	const ux = geoDiv(
		geoAdd(
			geoAdd(geoMul(a2, geoSub(b.y, c.y)), geoMul(b2, geoSub(c.y, a.y))),
			geoMul(c2, geoSub(a.y, b.y))
		),
		D
	);
	const uy = geoDiv(
		geoAdd(
			geoAdd(geoMul(a2, geoSub(c.x, b.x)), geoMul(b2, geoSub(a.x, c.x))),
			geoMul(c2, geoSub(b.x, a.x))
		),
		D
	);
	if (ux === null || uy === null) throw new Failure(aligned);
	const center = { x: ux, y: uy };
	return { shape: 'circle', center, radius: distance(center, a) };
}

// =============================================================================
// Dire ce qui est construit
// =============================================================================

/** L'arbre d'une valeur, pour l'afficher. */
export function nodeOf(value: GeoValue): MathNode {
	return isExact(value) ? value.node : numericNode(value.value);
}

function isNegative(value: GeoValue): boolean {
	return geoToNumber(value) < 0;
}

/** `m·x + p`, signes écrits comme on les écrit (`2x − 4`, `−x + 2`, `3x`). */
function signedSum(terms: readonly { coefficient: GeoValue; of: MathNode | null }[]): MathNode {
	let sum: MathNode | null = null;
	for (const { coefficient, of } of terms) {
		if (geoIsZero(coefficient)) continue;
		const negative = isNegative(coefficient);
		const size = negative ? geoOpposite(coefficient) : coefficient;
		const unit = of !== null && geoEqual(size, geoFromNumber(1));
		const term: MathNode =
			of === null ? nodeOf(size) : unit ? of : multiply(nodeOf(size), of, 'implicit');
		if (sum === null) sum = negative ? opposite(term) : term;
		else sum = negative ? subtract(sum, term) : add(sum, term);
	}
	return sum ?? numericNode(0);
}

/** L'équation réduite d'une droite : `y = mx + p`, ou `x = c` verticale. */
export function lineEquation(from: GeoPoint, to: GeoPoint): MathNode {
	const dx = geoSub(to.x, from.x);
	if (geoIsZero(dx)) return equals(variable('x'), nodeOf(from.x));
	const m = geoDiv(geoSub(to.y, from.y), dx) ?? geoFromNumber(0);
	const p = geoSub(from.y, geoMul(m, from.x));
	return equals(
		variable('y'),
		signedSum([
			{ coefficient: m, of: variable('x') },
			{ coefficient: p, of: null }
		])
	);
}

/** `(x − a)² + (y − b)² = r²`. */
export function circleEquation(center: GeoPoint, radius: GeoValue): MathNode {
	const square = (name: 'x' | 'y', shift: GeoValue): MathNode => {
		if (geoIsZero(shift)) return power(variable(name), numericNode(2));
		const inner = isNegative(shift)
			? add(variable(name), nodeOf(geoOpposite(shift)))
			: subtract(variable(name), nodeOf(shift));
		return power(parentheses(inner), numericNode(2));
	};
	return equals(add(square('x', center.x), square('y', center.y)), nodeOf(geoMul(radius, radius)));
}

/** La longueur d'un segment, exacte. */
export function segmentLength(from: GeoPoint, to: GeoPoint): GeoValue {
	return distance(from, to);
}

/**
 * Une écriture lisible en texte d'un arbre (carte, lecture d'écran) :
 * `y = 2x + 1`, `√5`, `1/2`, virgule décimale.
 */
export function plainText(node: MathNode): string {
	const custom = toCustom(node)
		.replace(/\{([^{}]*)\}/g, '($1)')
		.replace(/sqrt\((\d+)\)/g, '√$1')
		.replace(/sqrt\(/g, '√(')
		.replace(/(?<=[\w)√])\s*([+=]|-)\s*/g, ' $1 ')
		.replace(/=\s*/g, '= ')
		.replace(/\s+/g, ' ')
		.trim();
	// Une fraction seule, sans ses parenthèses de groupe : `1/2`, pas `(1/2)`
	const alone = /^\((-?[\d.]+\/[\d.]+)\)$/.exec(custom);
	return decimalCommaText(alone?.[1] ?? custom);
}

/** Le LaTeX d'un arbre, virgule décimale comprise. */
export function plainLatex(node: MathNode): string {
	return decimalCommaLatex(toLatex(node));
}

/**
 * Le LaTeX d'une construction TELLE QU'ÉCRITE (`\operatorname{milieu}(A, B)`,
 * `(AB)`), régénéré depuis la lecture : seuls des noms d'objets validés, les
 * mots du catalogue et le LaTeX de `toLatex` y entrent — jamais le texte saisi.
 */
export function constructionLatex(call: ReadCall): string {
	if (call.shortcut !== undefined) {
		const [a, b] = call.positional.map(argumentLatex);
		const [open, close] =
			call.shortcut === 'line' ? ['(', ')'] : call.shortcut === 'segment' ? ['[', ']'] : ['[', ')'];
		return `${open}${a}${b}${close}`;
	}
	const parts = [
		...call.positional.map(argumentLatex),
		...[...call.named].map(([key, value]) => `\\text{${key}}=${argumentLatex(value)}`)
	];
	const separator = parts.some((part) => part.includes('{,}')) ? ';\\,' : ',\\,';
	return `\\operatorname{${call.word}}\\left(${parts.join(separator)}\\right)`;
}

function argumentLatex(argument: ReadArgument): string {
	if (argument.kind === 'name') return argument.name.replace(/_(\d+)/, '_{$1}');
	if (argument.kind === 'call') return constructionLatex(argument.call);
	const ast = astOf(argument.text, 'text');
	return ast === null ? '?' : plainLatex(ast);
}

/**
 * Ce que la carte dit de la construction `name` (L7) : ses coordonnées exactes
 * (`I(1/2 ; 2)`), la longueur d'un segment, l'équation d'une droite ou d'un
 * cercle — en LaTeX pour l'écran, en texte pour la lecture d'écran. `null` si
 * elle ne se calcule pas (en attente, en erreur).
 */
export function constructionSummaryOf(
	atelier: Atelier,
	name: string
): { readonly latex: string; readonly text: string } | null {
	const object = atelier.get(name);
	if (object === undefined || object.status !== 'ok' || !isConstruction(object)) return null;
	const outcome = constructionOf(atelier, name);
	if (!outcome.ok) return null;
	const { built } = outcome;
	if (built.shape === 'point') {
		const [x, y] = [built.at.x, built.at.y].map(nodeOf);
		const latexName = name.replace(/_(\d+)/, '_{$1}');
		return {
			latex: `${latexName}\\left(${plainLatex(x)}\\,;\\,${plainLatex(y)}\\right)`,
			text: `${name}(${plainText(x)} ; ${plainText(y)})`
		};
	}
	if (built.shape === 'segment') {
		const length = nodeOf(segmentLength(built.from, built.to));
		return {
			latex: `\\text{longueur } ${plainLatex(length)}`,
			text: `longueur ${plainText(length)}`
		};
	}
	const equation =
		built.shape === 'circle'
			? circleEquation(built.center, built.radius)
			: lineEquation(built.from, built.to);
	return { latex: plainLatex(equation), text: plainText(equation) };
}
