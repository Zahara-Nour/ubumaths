/**
 * Atelier — les MESURES de la figure (géométrie v2, lot 2, PR 2 : L4)
 *
 * `AM` (deux points de l'atelier, collés), `distance(A, B)`, `distance(A, d)`,
 * `aire(A, M, N, P)`, `perimetre(…)` (`périmètre`), `angle(A, B, C)` en degrés :
 * des VALEURS, calculées par l'atelier, exactes d'abord (L1 : jamais par une
 * `Figure`). Une définition, une ligne de Calcul les écrivent comme l'élève sur
 * sa copie (`S = AM × MN`) ; pour le moteur, chaque mesure est REMPLACÉE par sa
 * valeur exacte avant la lecture (`measuredText`) — le même pont que les noms
 * d'objets (`engine.ts`).
 *
 * `AM` n'est une longueur que si A et M sont deux POINTS de l'atelier : `ab`
 * reste a·b (L4). Une mesure est relue à chaque calcul : elle suit ses points,
 * curseurs compris.
 *
 * @module atelier/measures
 */

import type { Atelier } from './atelier.svelte';
import type { MathNode } from '$lib/mathAST/types';
import type { GeoPoint } from '$lib/geometry-core/types/primitives';
import { numeric, exact, type GeoValue } from '$lib/geometry-core/types/geo-value';
import {
	geoAdd,
	geoDiv,
	geoFromNumber,
	geoMul,
	geoOpposite,
	geoSub,
	simplifyExact
} from '$lib/geometry-core/compute/geo-arithmetic';
import { geoEqual, geoIsZero } from '$lib/geometry-core/compute/compare';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { divide, number as mathNumber, opposite, sqrt } from '$lib/mathAST/factory';
import { toCustom } from '$lib/mathAST/custom-generator';
import { toLatex } from '$lib/mathAST/latex-generator';
import { numericNode } from '$lib/mathAST/common/numeric';
import { readArguments, type MeasureWord, type ReadArgument } from './construction-read';
import { PAIR, isLatex, measureCalls, plainName } from './measures-read';
import { specOfCall } from './construction-spec';
import {
	kindsOf,
	lineOutcome,
	nodeOf,
	plainLatex,
	plainText,
	pointOutcome,
	segmentLength
} from './construction';
import { substitutedAstOf } from './engine';
import type { Provenance } from './parse';

export {
	citesMeasure,
	hasMeasureCall,
	measureCallNames,
	measureShapeRefusal,
	pairNames,
	renamePairs,
	withoutMeasureCalls,
	withoutMeasures
} from './measures-read';

// =============================================================================
// Types
// =============================================================================

/** Une mesure calculée : sa valeur, et si elle n'est qu'approchée (angle non remarquable). */
interface Measured {
	readonly value: GeoValue;
	readonly approximate: boolean;
}

export type MeasuredText =
	| {
			readonly ok: true;
			readonly text: string;
			/** Le texte cite-t-il une mesure ? */
			readonly changed: boolean;
			/** Une mesure n'a qu'une valeur approchée (« ≈ ») */
			readonly approximate: boolean;
	  }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

/** Les angles remarquables : cos → degrés. */
const REMARKABLE: readonly (readonly [MathNode, number])[] = [
	[mathNumber('1'), 0],
	[divide(sqrt(mathNumber('3')), mathNumber('2'), 'fraction'), 30],
	[divide(sqrt(mathNumber('2')), mathNumber('2'), 'fraction'), 45],
	[divide(mathNumber('1'), mathNumber('2'), 'fraction'), 60],
	[mathNumber('0'), 90],
	[opposite(divide(mathNumber('1'), mathNumber('2'), 'fraction')), 120],
	[opposite(divide(sqrt(mathNumber('2')), mathNumber('2'), 'fraction')), 135],
	[opposite(divide(sqrt(mathNumber('3')), mathNumber('2'), 'fraction')), 150],
	[opposite(mathNumber('1')), 180]
];

/** Décimales d'un angle approché : celles du mode décimal de l'atelier (`≈ 0,7071`). */
const ANGLE_DECIMALS = 4;

class Failure extends Error {}

// =============================================================================
// Calculer
// =============================================================================

function pointOfArgument(atelier: Atelier, argument: ReadArgument): GeoPoint {
	if (argument.kind === 'name') {
		const object = atelier.get(argument.name);
		if (object === undefined) throw new Failure(`« ${argument.name} » n’est pas encore défini.`);
		if (object.kind !== 'point') throw new Failure(`« ${argument.name} » n’est pas un point.`);
		const read = pointOutcome(atelier, { kind: 'ref', name: argument.name });
		if (!read.ok) throw new Failure(read.message);
		return read.point;
	}
	if (argument.kind === 'call') {
		const typed = specOfCall(argument.call, kindsOf(atelier));
		if (!typed.ok) throw new Failure(typed.message);
		if (typed.spec.result === 'point') {
			const read = pointOutcome(atelier, typed.spec.point);
			if (!read.ok) throw new Failure(read.message);
			return read.point;
		}
		throw new Failure(`« ${argument.call.text} » n’est pas un point.`);
	}
	throw new Failure(`« ${argument.text} » n’est pas un point.`);
}

/** Le second argument de `distance` : un point, ou une droite (droite, segment, demi-droite). */
function pointOrLine(
	atelier: Atelier,
	argument: ReadArgument
): { readonly point: GeoPoint } | { readonly from: GeoPoint; readonly to: GeoPoint } {
	const kind = argument.kind === 'name' ? atelier.get(argument.name)?.kind : undefined;
	const isLine =
		(argument.kind === 'name' && kind === 'curve') ||
		(argument.kind === 'call' &&
			argument.call.word !== 'milieu' &&
			argument.call.word !== 'point' &&
			argument.call.word !== 'projection');
	if (!isLine) return { point: pointOfArgument(atelier, argument) };
	const spec =
		argument.kind === 'name'
			? ({ kind: 'ref', name: argument.name } as const)
			: (() => {
					const typed =
						argument.kind === 'call' ? specOfCall(argument.call, kindsOf(atelier)) : null;
					if (typed === null || !typed.ok)
						throw new Failure(typed?.message ?? 'Une droite est attendue.');
					if (typed.spec.result !== 'line')
						throw new Failure(`« ${argument.call.text} » n’est pas une droite.`);
					return typed.spec.line;
				})();
	const read = lineOutcome(atelier, spec);
	if (!read.ok) throw new Failure(read.message);
	return read;
}

function points(atelier: Atelier, args: readonly ReadArgument[]): GeoPoint[] {
	return args.map((argument) => pointOfArgument(atelier, argument));
}

/**
 * Ce qui empêche un polygone d'avoir une aire : deux côtés non voisins qui se
 * coupent (`crossed`), ou qui se touchent hors de leurs extrémités communes,
 * deux côtés voisins qui se recouvrent (`touching`). En nombres, à 10⁻¹² près.
 */
function polygonDefect(vertices: readonly GeoPoint[]): 'crossed' | 'touching' | null {
	const p = vertices.map((v) => [geoToNumber(v.x), geoToNumber(v.y)] as const);
	const n = p.length;
	const EPS = 1e-12;
	const cross = (o: readonly number[], a: readonly number[], b: readonly number[]) =>
		(a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
	const sign = (v: number) => (v > EPS ? 1 : v < -EPS ? -1 : 0);
	/** `q` sur le segment [a ; b], extrémités comprises (q aligné avec a et b). */
	const within = (a: readonly number[], b: readonly number[], q: readonly number[]) =>
		Math.min(a[0], b[0]) - EPS <= q[0] &&
		q[0] <= Math.max(a[0], b[0]) + EPS &&
		Math.min(a[1], b[1]) - EPS <= q[1] &&
		q[1] <= Math.max(a[1], b[1]) + EPS;
	let touching = false;
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const [a, b, c, d] = [p[i], p[(i + 1) % n], p[j], p[(j + 1) % n]];
			const neighbours = j === i + 1 || (i === 0 && j === n - 1);
			if (neighbours) {
				// Deux côtés voisins alignés qui reviennent en arrière : ils se recouvrent
				const [shared, first, second] = j === i + 1 ? [b, a, d] : [a, b, c];
				const u = [first[0] - shared[0], first[1] - shared[1]];
				const v = [second[0] - shared[0], second[1] - shared[1]];
				if (sign(u[0] * v[1] - u[1] * v[0]) === 0 && u[0] * v[0] + u[1] * v[1] > EPS) {
					touching = true;
				}
				continue;
			}
			const [d1, d2, d3, d4] = [cross(c, d, a), cross(c, d, b), cross(a, b, c), cross(a, b, d)].map(
				sign
			);
			if (d1 * d2 < 0 && d3 * d4 < 0) return 'crossed';
			if (
				(d1 === 0 && within(c, d, a)) ||
				(d2 === 0 && within(c, d, b)) ||
				(d3 === 0 && within(a, b, c)) ||
				(d4 === 0 && within(a, b, d))
			) {
				touching = true;
			}
		}
	}
	return touching ? 'touching' : null;
}

function measure(atelier: Atelier, word: MeasureWord, args: readonly ReadArgument[]): Measured {
	switch (word) {
		case 'distance': {
			if (args.length !== 2)
				throw new Failure('distance s’écrit distance(A ; B) ou distance(A ; d).');
			const [from] = points(atelier, [args[0]]);
			const to = pointOrLine(atelier, args[1]);
			if ('point' in to) return { value: segmentLength(from, to.point), approximate: false };
			// |AB × AP| / AB : la distance de P à la droite (AB), comme le DSL
			const ux = geoSub(to.to.x, to.from.x);
			const uy = geoSub(to.to.y, to.from.y);
			const cross = geoSub(
				geoMul(ux, geoSub(from.y, to.from.y)),
				geoMul(uy, geoSub(from.x, to.from.x))
			);
			const size = geoToNumber(cross) < 0 ? geoOpposite(cross) : cross;
			const value = geoDiv(size, segmentLength(to.from, to.to));
			if (value === null) throw new Failure('La droite n’est pas définie.');
			return { value, approximate: false };
		}
		case 'aire':
		case 'perimetre': {
			if (args.length < 3) {
				throw new Failure(
					`${word === 'aire' ? 'aire' : 'perimetre'} demande au moins trois points.`
				);
			}
			const vertices = points(atelier, args);
			const names = args.map((a) => (a.kind === 'name' ? a.name : '…')).join('');
			for (let i = 0; i < vertices.length; i++) {
				for (let j = i + 1; j < vertices.length; j++) {
					if (geoEqual(vertices[i].x, vertices[j].x) && geoEqual(vertices[i].y, vertices[j].y)) {
						throw new Failure(`Le polygone ${names} a deux sommets confondus.`);
					}
				}
			}
			const defect = polygonDefect(vertices);
			if (defect === 'crossed') {
				throw new Failure(`Le polygone ${names} est croisé : ses côtés se coupent.`);
			}
			if (defect === 'touching') {
				throw new Failure(
					`Le polygone ${names} a des côtés qui se touchent ou se recouvrent : il n’a pas d’aire.`
				);
			}
			let sum: GeoValue = geoFromNumber(0);
			for (let i = 0; i < vertices.length; i++) {
				const [p, q] = [vertices[i], vertices[(i + 1) % vertices.length]];
				sum = geoAdd(
					sum,
					word === 'aire' ? geoSub(geoMul(p.x, q.y), geoMul(q.x, p.y)) : segmentLength(p, q)
				);
			}
			if (word === 'perimetre') return { value: sum, approximate: false };
			const half = geoDiv(sum, geoFromNumber(2)) ?? sum;
			return { value: geoToNumber(half) < 0 ? geoOpposite(half) : half, approximate: false };
		}
		case 'angle': {
			if (args.length !== 3) throw new Failure('angle s’écrit angle(A ; B ; C) : l’angle en B.');
			const [a, b, c] = points(atelier, args);
			const u = { x: geoSub(a.x, b.x), y: geoSub(a.y, b.y) };
			const v = { x: geoSub(c.x, b.x), y: geoSub(c.y, b.y) };
			const zero = (w: { x: GeoValue; y: GeoValue }) => geoIsZero(w.x) && geoIsZero(w.y);
			if (zero(u) || zero(v)) {
				throw new Failure('Le sommet et un des points sont confondus : l’angle n’est pas défini.');
			}
			const dot = geoAdd(geoMul(u.x, v.x), geoMul(u.y, v.y));
			const lengths = geoMul(segmentLength(a, b), segmentLength(c, b));
			const cosine = geoDiv(dot, lengths);
			if (cosine === null) throw new Failure('L’angle n’est pas défini.');
			for (const [node, degrees] of REMARKABLE) {
				if (geoEqual(cosine, exact(simplifyExact(node)))) {
					return { value: geoFromNumber(degrees), approximate: false };
				}
			}
			const degrees = (Math.acos(Math.max(-1, Math.min(1, geoToNumber(cosine)))) * 180) / Math.PI;
			// Pleine précision : l'arrondi est celui de l'AFFICHAGE (revue de la PR 2)
			return { value: numeric(degrees), approximate: true };
		}
	}
}

/** L'écriture d'une valeur dans le texte, LaTeX ou non, entre parenthèses. */
function written(value: GeoValue, latex: boolean): string {
	if (isNaNValue(value))
		throw new Failure(
			'Cette mesure ne se calcule pas : un des points n’a pas de coordonnées finies.'
		);
	const node = nodeOf(value);
	return latex ? `\\left(${toLatex(node)}\\right)` : `(${toCustom(node)})`;
}

function isNaNValue(value: GeoValue): boolean {
	return !Number.isFinite(geoToNumber(value));
}

/**
 * Le texte, chaque mesure remplacée par sa valeur exacte (`aire(A, B, C)` →
 * `(6)`, `AE` → `(sqrt(5))`) — ce que lit le moteur. `changed` : il y en avait.
 * Le refus d'une mesure qui ne se calcule pas (point absent, polygone croisé…).
 */
export function measuredText(atelier: Atelier, text: string, provenance: Provenance): MeasuredText {
	const latex = isLatex(provenance);
	const isPoint = (name: string) => atelier.get(name)?.kind === 'point';
	let out = text;
	let changed = false;
	let approximate = false;
	try {
		for (const call of measureCalls(text, provenance).reverse()) {
			const read = readArguments(call.content, call.word);
			if (!read.ok) throw new Failure(read.message);
			const result = measure(atelier, call.word, read.args);
			approximate ||= result.approximate;
			out = `${out.slice(0, call.start)}${written(result.value, latex)}${out.slice(call.end)}`;
			changed = true;
		}
		out = out.replace(PAIR, (whole, a: string, b: string) => {
			const [p, q] = [plainName(a), plainName(b)];
			if (!isPoint(p) || !isPoint(q)) return whole;
			const result = measure(atelier, 'distance', [
				{ kind: 'name', name: p },
				{ kind: 'name', name: q }
			]);
			changed = true;
			return written(result.value, latex);
		});
	} catch (error) {
		if (error instanceof Failure) return { ok: false, message: error.message };
		throw error;
	}
	return { ok: true, text: out, changed, approximate };
}

/**
 * Ce que la carte d'une mesure nommée dit de sa valeur (L7) : `6`, `√5`,
 * `≈ 36,8699` — en LaTeX pour l'écran, en texte pour la lecture d'écran. `null`
 * pour un objet qui n'est pas une mesure prête.
 */
export function measureSummaryOf(
	atelier: Atelier,
	name: string
): { readonly latex: string; readonly text: string } | null {
	const object = atelier.get(name);
	if (object === undefined || object.kind !== 'value' || object.status !== 'ok') return null;
	const read = atelier.measuredOf(object);
	if (read === null || !read.ok || !read.changed) return null;
	const substituted = substitutedAstOf(atelier, name);
	if (!substituted.ok) return null;
	const node = simplifyExact(substituted.ast);
	if (read.approximate) {
		const value = geoToNumber(exact(node));
		if (!Number.isFinite(value)) return null;
		const shown = numericNode(Number(value.toFixed(ANGLE_DECIMALS)));
		return { latex: `\\approx ${plainLatex(shown)}`, text: `≈ ${plainText(shown)}` };
	}
	return { latex: plainLatex(node), text: plainText(node) };
}
