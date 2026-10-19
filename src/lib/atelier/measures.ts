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
import { numeric, exact, isExact, type GeoValue } from '$lib/geometry-core/types/geo-value';
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
import {
	divide,
	multiply,
	number as mathNumber,
	opposite,
	piConstant,
	sqrt
} from '$lib/mathAST/factory';
import type { AngleUnit } from './angle-unit';
import { isUnit } from '$lib/mathAST/guards';
import { transformAST } from '$lib/mathAST/visitor';
import { parentheses } from '$lib/mathAST/factory';
import { astOf } from './parse';
import { format as formatUnit } from '$lib/mathAST/units';
import { toCustom } from '$lib/mathAST/custom-generator';
import { toLatex } from '$lib/mathAST/latex-generator';
import {
	readArguments,
	readConstruction,
	type MeasureWord,
	type ReadArgument,
	type ReadCall
} from './construction-read';
import { PAIR, isLatex, measureCalls, plainName } from './measures-read';
import { specOfCall } from './construction-spec';
import { kindsOf, lineOutcome, nodeOf, pointOutcome, segmentLength } from './construction';
import type { Provenance } from './parse';

export {
	citesMeasure,
	hasAngleCall,
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
	| { readonly ok: false; readonly message: string; readonly pending?: boolean };

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

/** `pending` : un point cité attend (PR 3 : une intersection vide) — la mesure attend avec lui. */
class Failure extends Error {
	constructor(
		message: string,
		readonly pending = false
	) {
		super(message);
	}
}

/** Une mesure approchée : un angle non remarquable, ou un point qui n'est qu'approché (PR 3). */
function isApproximate(result: Measured): boolean {
	return result.approximate || !isExact(result.value);
}

// =============================================================================
// Calculer
// =============================================================================

function pointOfArgument(atelier: Atelier, argument: ReadArgument): GeoPoint {
	if (argument.kind === 'name') {
		const object = atelier.get(argument.name);
		if (object === undefined) throw new Failure(`« ${argument.name} » n’est pas encore défini.`);
		if (object.kind !== 'point') throw new Failure(`« ${argument.name} » n’est pas un point.`);
		const read = pointOutcome(atelier, { kind: 'ref', name: argument.name });
		if (!read.ok) throw new Failure(read.message, read.reason === 'pending');
		return read.point;
	}
	if (argument.kind === 'call') {
		const typed = specOfCall(argument.call, kindsOf(atelier));
		if (!typed.ok) throw new Failure(typed.message);
		if (typed.spec.result === 'point') {
			const read = pointOutcome(atelier, typed.spec.point);
			if (!read.ok) throw new Failure(read.message, read.reason === 'pending');
			return read.point;
		}
		throw new Failure(`« ${argument.call.text} » n’est pas un point.`);
	}
	throw new Failure(`« ${argument.text} » n’est pas un point.`);
}

/** Le second argument de `distance` : un point, ou une droite (droite, segment, demi-droite). */
function pointOrLine(
	atelier: Atelier,
	argument: ReadArgument,
	from: string
): { readonly point: GeoPoint } | { readonly from: GeoPoint; readonly to: GeoPoint } {
	const kind = argument.kind === 'name' ? atelier.get(argument.name)?.kind : undefined;
	// Décision de David (2026-10-18) : la distance à un SEGMENT ou à une DEMI-DROITE
	// n'est pas celle de sa droite (le DSL, lui, mesure à la droite) — refusée, avec l'aide
	const portion = portionOf(atelier, argument);
	if (portion !== null) {
		const line = portion.ends === null ? 'd' : `(${portion.ends.join('')})`;
		throw new Failure(
			`${portion.word} : la distance se mesure à une droite. Pour la distance à la droite, écris distance(${from}, ${line}).`
		);
	}
	const isLine =
		(argument.kind === 'name' && kind === 'curve') ||
		(argument.kind === 'call' &&
			argument.call.word !== 'milieu' &&
			argument.call.word !== 'point' &&
			argument.call.word !== 'projection' &&
			argument.call.word !== 'intersection' &&
			argument.call.word !== 'point_sur');
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
	if (!read.ok) throw new Failure(read.message, read.reason === 'pending');
	return read;
}

/**
 * Un segment ou une demi-droite (écrit, `[AB]`, ou nommé, `s = [AB]`) : sa nature
 * et les deux points qui le portent quand ils sont nommés — sinon `null`.
 */
function portionOf(
	atelier: Atelier,
	argument: ReadArgument
): { readonly word: string; readonly ends: readonly [string, string] | null } | null {
	let call: ReadCall | null = null;
	if (argument.kind === 'call') call = argument.call;
	else if (argument.kind === 'name') {
		const object = atelier.get(argument.name);
		if (object?.kind === 'curve') {
			const read = readConstruction(object.definition, object.provenance ?? 'url');
			call = read !== null && read.ok ? read.call : null;
		}
	}
	if (call === null || (call.word !== 'segment' && call.word !== 'demidroite')) return null;
	const [a, b] = call.positional;
	const ends: readonly [string, string] | null =
		a?.kind === 'name' && b?.kind === 'name' ? [a.name, b.name] : null;
	const word = call.word === 'segment' ? 'Un segment' : 'Une demi-droite';
	return { word, ends };
}

function points(atelier: Atelier, args: readonly ReadArgument[]): GeoPoint[] {
	return args.map((argument) => pointOfArgument(atelier, argument));
}

/**
 * Un polygone CROISÉ : deux côtés non voisins qui se coupent en un point
 * intérieur à chacun. C'est le seul refus (décision de David du 2026-10-19) :
 * un polygone aplati (sommets confondus, tous alignés, côtés qui se touchent ou
 * se recouvrent) a une aire, nulle s'il est plat. En nombres, à 10⁻¹² près.
 */
function isCrossed(vertices: readonly GeoPoint[]): boolean {
	const p = vertices.map((v) => [geoToNumber(v.x), geoToNumber(v.y)] as const);
	const n = p.length;
	const EPS = 1e-12;
	const cross = (o: readonly number[], a: readonly number[], b: readonly number[]) =>
		(a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
	const sign = (v: number) => (v > EPS ? 1 : v < -EPS ? -1 : 0);
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			if (j === i + 1 || (i === 0 && j === n - 1)) continue;
			const [a, b, c, d] = [p[i], p[(i + 1) % n], p[j], p[(j + 1) % n]];
			const [d1, d2, d3, d4] = [cross(c, d, a), cross(c, d, b), cross(a, b, c), cross(a, b, d)].map(
				sign
			);
			if (d1 * d2 < 0 && d3 * d4 < 0) return true;
		}
	}
	return false;
}

function measure(atelier: Atelier, word: MeasureWord, args: readonly ReadArgument[]): Measured {
	switch (word) {
		case 'distance': {
			if (args.length !== 2)
				throw new Failure('distance s’écrit distance(A ; B) ou distance(A ; d).');
			const [from] = points(atelier, [args[0]]);
			// Le premier argument tel qu'écrit (`milieu(A, B)`), pour l'aide
			const first =
				args[0].kind === 'name'
					? args[0].name
					: args[0].kind === 'call'
						? args[0].call.text
						: args[0].text;
			const to = pointOrLine(atelier, args[1], first);
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
			if (isCrossed(vertices)) {
				throw new Failure(`Le polygone ${names} est croisé : ses côtés se coupent.`);
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

/**
 * Un angle en degrés, écrit en grandeur dans l'unité du réglage : `(60[°])`,
 * `((\pi/3)[rad])` — LaTeX : `\left(60\unit{°}\right)`. Exact s'il l'est, en
 * pleine précision sinon. La trigonométrie du moteur lit l'unité (`cos(60[°])` = 1/2).
 */
function writtenAngle(degrees: GeoValue, unit: AngleUnit, latex: boolean): string {
	if (isNaNValue(degrees)) throw new Failure('Cet angle ne se calcule pas.');
	const symbol = unit === 'deg' ? '°' : 'rad';
	const value =
		unit === 'deg'
			? degrees
			: isExact(degrees)
				? exact(
						simplifyExact(
							divide(
								multiply(degrees.node, piConstant(), 'implicit'),
								mathNumber('180'),
								'fraction'
							)
						)
					)
				: numeric((geoToNumber(degrees) * Math.PI) / 180);
	const node = nodeOf(value);
	return latex
		? `\\left(${toLatex(node)}\\unit{${symbol}}\\right)`
		: `((${toCustom(node)})[${symbol}])`;
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
			approximate ||= isApproximate(result);
			// Un angle est une GRANDEUR, dans l'unité du réglage (décision de David, 2026-10-18)
			const value =
				call.word === 'angle'
					? writtenAngle(result.value, atelier.angleUnit, latex)
					: written(result.value, latex);
			out = `${out.slice(0, call.start)}${value}${out.slice(call.end)}`;
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
			approximate ||= isApproximate(result);
			return written(result.value, latex);
		});
	} catch (error) {
		if (error instanceof Failure) {
			return error.pending
				? { ok: false, message: error.message, pending: true }
				: { ok: false, message: error.message };
		}
		throw error;
	}
	return { ok: true, text: out, changed, approximate };
}

/** Le nœud d'une grandeur d'angle : `90` → `(90)[°]`, ou `π/2` → `(π/2)[rad]`. */
function angleNode(degrees: GeoValue, unit: AngleUnit): MathNode {
	if (isNaNValue(degrees)) throw new Failure('Cet angle ne se calcule pas.');
	const value =
		unit === 'deg'
			? degrees
			: isExact(degrees)
				? exact(
						simplifyExact(
							divide(
								multiply(degrees.node, piConstant(), 'implicit'),
								mathNumber('180'),
								'fraction'
							)
						)
					)
				: numeric((geoToNumber(degrees) * Math.PI) / 180);
	const template = astOf(unit === 'deg' ? '1[°]' : '1[rad]', 'text');
	if (template === null || !isUnit(template)) throw new Failure('Cet angle ne se calcule pas.');
	return { ...template, expression: nodeOf(value) };
}

/** Le nœud d'une longueur, d'une aire, d'un périmètre. */
function valueNode(value: GeoValue): MathNode {
	if (isNaNValue(value)) {
		throw new Failure(
			'Cette mesure ne se calcule pas : un des points n’a pas de coordonnées finies.'
		);
	}
	return nodeOf(value);
}

/** La marque d'une mesure dans le texte relu : un nom indicé que personne n'écrit. */
const MARK_BASE = 90000;

/**
 * L'ARBRE d'un texte, chaque mesure remplacée par son nœud exact — angles en
 * grandeur (`(π/2)[rad]`). ⚠️ Pas par le texte : `(({1/2}\pi)[rad])` relu en
 * détection devient du LaTeX et ne se lit plus (revue de la PR 2). Chaque mesure
 * est d'abord une marque (`m_90000`), lue par le parseur de la provenance, puis
 * remplacée dans l'arbre.
 */
export function measuredAst(
	atelier: Atelier,
	text: string,
	provenance: Provenance,
	functionNames?: readonly string[]
):
	| { readonly ok: true; readonly ast: MathNode | null; readonly approximate: boolean }
	| { readonly ok: false; readonly message: string; readonly pending?: boolean } {
	const latex = isLatex(provenance);
	const isPoint = (name: string) => atelier.get(name)?.kind === 'point';
	const nodes: MathNode[] = [];
	const mark = (node: MathNode) => {
		nodes.push(node);
		const index = MARK_BASE + nodes.length - 1;
		return latex ? ` m_{${index}} ` : ` m_${index} `;
	};
	let out = text;
	let approximate = false;
	try {
		for (const call of measureCalls(text, provenance).reverse()) {
			const read = readArguments(call.content, call.word);
			if (!read.ok) throw new Failure(read.message);
			const result = measure(atelier, call.word, read.args);
			approximate ||= isApproximate(result);
			const node =
				call.word === 'angle'
					? angleNode(result.value, atelier.angleUnit)
					: valueNode(result.value);
			out = `${out.slice(0, call.start)}${mark(node)}${out.slice(call.end)}`;
		}
		out = out.replace(PAIR, (whole, a: string, b: string) => {
			const [p, q] = [plainName(a), plainName(b)];
			if (!isPoint(p) || !isPoint(q)) return whole;
			const result = measure(atelier, 'distance', [
				{ kind: 'name', name: p },
				{ kind: 'name', name: q }
			]);
			approximate ||= isApproximate(result);
			return mark(valueNode(result.value));
		});
	} catch (error) {
		if (error instanceof Failure) {
			return error.pending
				? { ok: false, message: error.message, pending: true }
				: { ok: false, message: error.message };
		}
		throw error;
	}
	const read = astOf(out, provenance, functionNames);
	if (read === null) return { ok: true, ast: null, approximate };
	const markOf = (node: MathNode): number | null => {
		if (node.type === 'variable') {
			const match = /^m_\{?(\d+)\}?$/.exec(node.name);
			return match === null ? null : Number(match[1]);
		}
		if (node.type === 'subscript' && node.base.type === 'variable' && node.base.name === 'm') {
			const sub = node.subscript;
			return sub.type === 'number' ? Number(sub.value) : null;
		}
		return null;
	};
	const replaced = transformAST(read, {
		enterVariable: (node) => replacement(markOf(node)),
		enterSubscript: (node) => replacement(markOf(node))
	});
	function replacement(index: number | null): { node: MathNode; skip: true } | undefined {
		if (index === null) return undefined;
		const node = nodes[index - MARK_BASE];
		return node === undefined ? undefined : { node: parentheses(node), skip: true };
	}
	return { ok: true, ast: replaced, approximate };
}

/** Les fonctions qui prennent un angle et rendent un NOMBRE : l'angle n'y est plus une grandeur. */
const TRIGONOMETRIC = new Set(['sin', 'cos', 'tan']);

/**
 * L'arbre contient-il une grandeur d'angle (° ou rad) HORS d'un sin, cos, tan ?
 * `cos(angle(…))·x` n'en contient pas ; `angle(…)·x` si (revue de la PR 2).
 */
export function hasBareAngle(ast: MathNode): boolean {
	let found = false;
	const visit = (node: unknown): void => {
		if (found || node === null || typeof node !== 'object') return;
		const current = node as MathNode;
		if (current.type === 'function' && TRIGONOMETRIC.has(current.name)) return;
		if (isUnit(current)) {
			const symbol = formatUnit(current.unit, 'original');
			if (symbol === '°' || symbol === 'rad') {
				found = true;
				return;
			}
		}
		for (const value of Object.values(current as unknown as Record<string, unknown>)) {
			if (Array.isArray(value)) value.forEach(visit);
			else visit(value);
		}
	};
	visit(ast);
	return found;
}
