/**
 * Harnais de l'oracle du domaine : lit l'attendu écrit à la main, interroge
 * `computeDomain`, et confronte le résultat :
 * (a) à l'attendu (bornes : valeur ET crochet ; points exclus ; période) ;
 * (b) à un ARBITRE NUMÉRIQUE indépendant : f évaluée par `compile` sur une
 *     grille fine + bornes ± ε doit être définie (finie, réelle) exactement
 *     sur le domaine annoncé — l'arbitre vérifie aussi l'attendu lui-même ;
 * (c) à l'exactitude des bornes rendues : aucun décimal (0.333…) quand la
 *     saisie n'en contient pas.
 * Une contrainte non résolue (`unresolved`) ou une exception = refus.
 */

import { computeDomain } from '../../compute';
import { formatInterval } from '../../format';
import { parseLatex } from '../../../parser';
import { compile } from '../../../eval';
import { findNodes } from '../../../transforms';
import type { MathNode } from '../../../types';
import type { Domain } from '../../types';
import type { DomainEntry } from './corpus';

// =============================================================================
// Ensembles numériques (attendu ET moteur ramenés à la même forme)
// =============================================================================

interface NumInterval {
	readonly lo: number;
	readonly loClosed: boolean;
	readonly hi: number;
	readonly hiClosed: boolean;
}

export interface NumSet {
	readonly intervals: readonly NumInterval[];
	readonly excluded: readonly number[];
	readonly periodic: { readonly base: number; readonly period: number } | null;
}

const BOUND_TOLERANCE = 1e-9;
/** Écart autour d'une borne en deçà duquel l'arbitre ne juge pas (flottants). */
const SKIP_RADIUS = 1e-9;
const EPSILONS = [1e-6, 1e-3, 0.1];

function evalConstant(latex: string): number {
	const value = compile(parseLatex(latex))({});
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`Borne illisible dans l'attendu : ${latex}`);
	}
	return value;
}

function bound(text: string): number {
	const t = text.trim();
	if (t === '-oo') return -Infinity;
	if (t === '+oo') return Infinity;
	return evalConstant(t);
}

/** Lit la notation de l'attendu (voir `corpus.ts`). */
export function parseExpected(expected: string): NumSet {
	const text = expected.trim();
	if (text === '∅') return { intervals: [], excluded: [], periodic: null };
	const periodic = /^R \\ \{(.+) \+ k (.+)\}$/.exec(text);
	if (periodic) {
		return {
			intervals: [{ lo: -Infinity, loClosed: false, hi: Infinity, hiClosed: false }],
			excluded: [],
			periodic: { base: bound(periodic[1]), period: bound(periodic[2]) }
		};
	}
	const [main, excludedPart] = text.split(' \\ ');
	const excluded = excludedPart
		? excludedPart.replace(/^\{/, '').replace(/\}$/, '').split(' ; ').map(bound)
		: [];
	if (main === 'R') {
		return {
			intervals: [{ lo: -Infinity, loClosed: false, hi: Infinity, hiClosed: false }],
			excluded,
			periodic: null
		};
	}
	const intervals = main.split(' U ').map((part): NumInterval => {
		const m = /^([[\]])(.+) ; (.+)([[\]])$/.exec(part.trim());
		if (!m) throw new Error(`Intervalle illisible dans l'attendu : ${part}`);
		return { lo: bound(m[2]), loClosed: m[1] === '[', hi: bound(m[3]), hiClosed: m[4] === ']' };
	});
	return { intervals, excluded, periodic: null };
}

function nodeValue(node: MathNode): number {
	if (node.type === 'infinity') return node.sign === 'positive' ? Infinity : -Infinity;
	const value = compile(node)({});
	return typeof value === 'number' ? value : NaN;
}

/** Domaine du moteur → ensemble numérique ; null si forme non lisible. */
export function domainToNumSet(domain: Domain): NumSet | null {
	switch (domain.kind) {
		case 'universal':
			return {
				intervals: [{ lo: -Infinity, loClosed: false, hi: Infinity, hiClosed: false }],
				excluded: [],
				periodic: null
			};
		case 'empty':
			return { intervals: [], excluded: [], periodic: null };
		case 'interval_set':
			return {
				intervals: domain.intervals.map((i) => ({
					lo: nodeValue(i.lower.value),
					loClosed: i.lower.type === 'closed',
					hi: nodeValue(i.upper.value),
					hiClosed: i.upper.type === 'closed'
				})),
				excluded: (domain.excludedPoints ?? []).map((p) => nodeValue(p.value)),
				periodic: null
			};
		case 'periodic_exclusion':
			return {
				intervals: [{ lo: -Infinity, loClosed: false, hi: Infinity, hiClosed: false }],
				excluded: [],
				periodic: { base: nodeValue(domain.basePoint), period: nodeValue(domain.period) }
			};
		default:
			return null;
	}
}

function onPeriodic(x: number, p: { base: number; period: number }): boolean {
	const k = Math.round((x - p.base) / p.period);
	return Math.abs(x - (p.base + k * p.period)) < BOUND_TOLERANCE;
}

export function contains(set: NumSet, x: number): boolean {
	if (set.excluded.some((e) => Math.abs(e - x) < BOUND_TOLERANCE)) return false;
	if (set.periodic && onPeriodic(x, set.periodic)) return false;
	return set.intervals.some(
		(i) =>
			(x > i.lo || (i.loClosed && Math.abs(x - i.lo) < BOUND_TOLERANCE)) &&
			(x < i.hi || (i.hiClosed && Math.abs(x - i.hi) < BOUND_TOLERANCE))
	);
}

/** Points « spéciaux » d'un ensemble (bornes finies, exclus, périodiques). */
function specialPoints(set: NumSet): number[] {
	const points: number[] = [...set.excluded];
	for (const i of set.intervals) {
		if (Number.isFinite(i.lo)) points.push(i.lo);
		if (Number.isFinite(i.hi)) points.push(i.hi);
	}
	if (set.periodic) {
		for (let k = -8; k <= 8; k++) points.push(set.periodic.base + k * set.periodic.period);
	}
	return points;
}

function nearSpecial(x: number, specials: readonly number[]): boolean {
	return specials.some((s) => Math.abs(x - s) < SKIP_RADIUS * Math.max(1, Math.abs(s)));
}

/** Grille d'échantillonnage : pas « irrationnel » + bornes ± ε. */
function samplePoints(specials: readonly number[]): number[] {
	const points: number[] = [];
	for (let x = -10.00731; x <= 10; x += 0.0137) points.push(x);
	for (const s of specials) {
		for (const eps of EPSILONS) points.push(s - eps, s + eps);
	}
	return points.filter((x) => Math.abs(x) <= 12);
}

/** f définie en x : valeur numérique finie et réelle. */
function definedAt(f: (scope: Record<string, number>) => unknown, x: number): boolean {
	try {
		const v = f({ x });
		return typeof v === 'number' && Number.isFinite(v);
	} catch {
		return false;
	}
}

/** Points où « f définie » et « x ∈ set » divergent (3 premiers). */
export function numericMismatches(
	entry: DomainEntry,
	set: NumSet,
	others: NumSet[] = []
): number[] {
	const f = compile(parseLatex(entry.f));
	const specials = [set, ...others].flatMap(specialPoints);
	const out: number[] = [];
	for (const x of samplePoints(specials)) {
		if (nearSpecial(x, specials)) continue;
		if (definedAt(f, x) !== contains(set, x)) {
			out.push(x);
			if (out.length >= 3) break;
		}
	}
	return out;
}

function sameNumber(a: number, b: number): boolean {
	if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
	return Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a));
}

/**
 * Forme canonique : chaque point exclu intérieur coupe son intervalle, deux
 * intervalles ouverts jointifs restent distincts — `ℝ \ {1}` et
 * `]-∞ ; 1[ ∪ ]1 ; +∞[` sont le même ensemble.
 */
function canonical(set: NumSet): NumSet {
	const intervals: NumInterval[] = [];
	for (const i of [...set.intervals].sort((x, y) => x.lo - y.lo)) {
		let lo = i.lo;
		let loClosed = i.loClosed;
		const cuts = set.excluded.filter((e) => e > i.lo && e < i.hi).sort((x, y) => x - y);
		for (const c of cuts) {
			intervals.push({ lo, loClosed, hi: c, hiClosed: false });
			lo = c;
			loClosed = false;
		}
		const closesOnExcluded = (v: number) => set.excluded.some((e) => sameNumber(e, v));
		intervals.push({
			lo,
			loClosed: loClosed && !closesOnExcluded(lo),
			hi: i.hi,
			hiClosed: i.hiClosed && !closesOnExcluded(i.hi)
		});
	}
	return { intervals, excluded: [], periodic: set.periodic };
}

/** Comparaison structurelle : bornes, crochets, exclus, périodicité. */
function sameSet(rawA: NumSet, rawB: NumSet): boolean {
	const a = canonical(rawA);
	const b = canonical(rawB);
	if (a.intervals.length !== b.intervals.length) return false;
	const sortI = (s: NumSet) => [...s.intervals].sort((x, y) => x.lo - y.lo);
	const ia = sortI(a);
	const ib = sortI(b);
	for (let i = 0; i < ia.length; i++) {
		if (!sameNumber(ia[i].lo, ib[i].lo) || !sameNumber(ia[i].hi, ib[i].hi)) return false;
		if (Number.isFinite(ia[i].lo) && ia[i].loClosed !== ib[i].loClosed) return false;
		if (Number.isFinite(ia[i].hi) && ia[i].hiClosed !== ib[i].hiClosed) return false;
	}
	const ea = [...a.excluded].sort((x, y) => x - y);
	const eb = [...b.excluded].sort((x, y) => x - y);
	if (ea.length !== eb.length || ea.some((v, i) => !sameNumber(v, eb[i]))) return false;
	if (!a.periodic !== !b.periodic) return false;
	if (a.periodic && b.periodic) {
		if (!sameNumber(a.periodic.period, b.periodic.period)) return false;
		if (!onPeriodic(b.periodic.base, a.periodic)) return false;
	}
	return true;
}

/** Bornes rendues avec un décimal (0.3333…) alors que la saisie n'en a pas. */
function inexactBounds(domain: Domain, entry: DomainEntry): string[] {
	if (/\d\.\d/.test(entry.f)) return [];
	const nodes: MathNode[] = [];
	if (domain.kind === 'interval_set') {
		for (const i of domain.intervals) nodes.push(i.lower.value, i.upper.value);
		for (const p of domain.excludedPoints ?? []) nodes.push(p.value);
	} else if (domain.kind === 'periodic_exclusion') {
		nodes.push(domain.basePoint, domain.period);
	}
	return nodes
		.flatMap((n) => findNodes(n, (m) => m.type === 'number' && m.value.includes('.')))
		.map((m) => (m.type === 'number' ? m.value : ''));
}

// =============================================================================
// Verdict
// =============================================================================

export interface DomainVerdict {
	readonly entry: DomainEntry;
	readonly refused: boolean;
	readonly rendered: string;
	readonly wrong: readonly string[];
}

export function judgeEntry(entry: DomainEntry): DomainVerdict {
	let domain: Domain;
	try {
		const result = computeDomain(parseLatex(entry.f), 'x');
		if (result.unresolved && result.unresolved.length > 0) {
			return { entry, refused: true, rendered: 'refus', wrong: [] };
		}
		domain = result.domain;
	} catch {
		return { entry, refused: true, rendered: 'exception', wrong: [] };
	}
	const rendered = safeFormat(domain);
	const wrong: string[] = [];
	const engine = domainToNumSet(domain);
	if (!engine) {
		return { entry, refused: false, rendered, wrong: [`forme non lisible (${domain.kind})`] };
	}
	const inexact = inexactBounds(domain, entry);
	if (inexact.length > 0) wrong.push(`borne décimale ${inexact[0]}`);
	if (entry.expected !== 'REFUS') {
		const expected = parseExpected(entry.expected);
		if (!sameSet(engine, expected)) wrong.push(`attendu ${entry.expected}`);
		const mism = numericMismatches(entry, engine, [expected]);
		if (mism.length > 0) wrong.push(`arbitre numérique en x = ${mism[0].toFixed(6)}`);
	} else {
		const mism = numericMismatches(entry, engine);
		if (mism.length > 0) wrong.push(`arbitre numérique en x = ${mism[0].toFixed(6)}`);
	}
	return { entry, refused: false, rendered, wrong };
}

function safeFormat(domain: Domain): string {
	try {
		return formatInterval(domain);
	} catch {
		return `(${domain.kind})`;
	}
}
