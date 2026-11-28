/**
 * Escalier à construire dans un repère — réponse, juge, geste, phrases, corrigé
 * ============================================================================
 *
 * L'élève construit u₁…u_N d'une suite récurrente u(n+1) = f(u(n)) (bloc ```courbe,
 * `construire N` sur la ligne de la suite, outil 48,
 * `docs/wip/outil-escalier-suite-progress.md`) : il touche l'axe des abscisses pour
 * chaque terme ; sa marche se dessine (monter à la hauteur de son terme, aller à la
 * droite y = x, redescendre à l'axe).
 *
 * Réponse de la case k : la chaîne des termes de l'élève jusqu'à k, point décimal,
 * séparés par « ; », vide pour un terme pas posé (`1.73;;2.8`). Réponse attendue :
 * `escalier k=2 ; u0=0 ; marge=0.12 ; f=sqrt(2*(x)+3)` ; le terme k est juste s'il
 * est à moins de la marge de f(terme k − 1 DE L'ÉLÈVE), u₀ pour le premier : une
 * erreur ne coûte qu'une case, comme au crayon.
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/courbe-construire
 */

import { parseCustom } from '#lib/mathAST/parser/custom/index.ts';
import { compile } from '#lib/mathAST/eval/compile.ts';
import type { CourbeStaircaseToBuild, CourbeWindow } from '../types/courbe';
import { clean, type CourbePlacedPoint } from './courbe-placer';
import { decimalString } from './number-line-placer';

// Types

/** Ce que dit la réponse attendue d'une case */
export interface StaircaseExpected {
	/** Rang du terme dans la construction : 1 pour u₁ */
	k: number;
	/** u₀ */
	start: number;
	margin: number;
	/** f en x, syntaxe maison mathAST */
	relation: string;
}

/** Un trait de la marche */
export interface StaircaseSegment {
	from: CourbePlacedPoint;
	to: CourbePlacedPoint;
}

/** Ce que la phrase de la correction sait de la suite */
export type StaircaseForMistake = Pick<
	CourbeStaircaseToBuild,
	'sequenceName' | 'firstIndex' | 'start' | 'relation' | 'margin'
>;

// Constantes

/** Marge du juge : part de la largeur de la fenêtre (décision de David, 2026-11-28) */
export const BUILD_MARGIN_RATIO = 0.03;

/** Le toucher est arrondi au plus à cette part de la largeur (écriture stable) */
const SNAP_RATIO = 0.01;

const NUMBER = '-?\\d+(?:\\.\\d+)?';
const EXPECTED_REGEX = new RegExp(
	`^escalier k=(\\d+) ; u0=(${NUMBER}) ; marge=(${NUMBER}) ; f=(.+)$`
);
const TERM_REGEX = new RegExp(`^${NUMBER}$`);

/** Écart toléré au-delà de la marge (calculs en virgule flottante) */
const EPSILON = 1e-9;

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

// Functions

/** Marge du juge pour une fenêtre */
export function buildMargin(window: CourbeWindow): number {
	return clean(BUILD_MARGIN_RATIO * (window.xMax - window.xMin));
}

/** Réponse attendue de la case k */
export function staircaseExpected(e: StaircaseExpected): string {
	return `escalier k=${e.k} ; u0=${decimalString(e.start)} ; marge=${decimalString(e.margin)} ; f=${e.relation}`;
}

/** Ce que dit une réponse attendue écrite par `staircaseExpected` ; null sinon */
export function readStaircaseExpected(expected: string): StaircaseExpected | null {
	const match = EXPECTED_REGEX.exec(expected.trim());
	if (!match) return null;
	const k = Number(match[1]);
	if (k < 1) return null;
	return { k, start: Number(match[2]), margin: Number(match[3]), relation: match[4].trim() };
}

/** Réponse de la case k : les termes 1 à k de l'élève, '' s'il n'en a posé aucun */
export function staircaseAnswer(terms: readonly (number | null)[], k: number): string {
	const chain = Array.from({ length: k }, (_, i) => terms[i] ?? null);
	if (chain.every((t) => t === null)) return '';
	return chain.map((t) => (t === null ? '' : decimalString(t))).join(';');
}

/** Les termes d'une réponse écrite par `staircaseAnswer` (null : pas posé ou illisible) */
export function readStaircaseAnswer(answer: string): (number | null)[] {
	if (answer.trim() === '') return [];
	return answer.split(';').map((part) => {
		const text = part.trim();
		return TERM_REGEX.test(text) ? Number(text) : null;
	});
}

/** f, lue dans la syntaxe maison ; null si elle ne se lit pas ou porte une autre variable que x */
export function relationEvaluator(relation: string): ((x: number) => number | null) | null {
	let evaluate: (env: Record<string, number>) => number;
	try {
		const ast = parseCustom(relation);
		if ([...variablesOf(ast)].some((v) => v !== 'x')) return null;
		evaluate = compile(ast);
	} catch {
		return null;
	}
	return (x: number) => {
		if (!Number.isFinite(x)) return null;
		try {
			const y = evaluate({ x });
			return Number.isFinite(y) ? y : null;
		} catch {
			return null;
		}
	};
}

/** Les variables libres d'un AST */
function variablesOf(node: unknown, found: Set<string> = new Set()): Set<string> {
	if (Array.isArray(node)) {
		for (const child of node) variablesOf(child, found);
		return found;
	}
	if (node === null || typeof node !== 'object') return found;
	const record = node as Record<string, unknown>;
	if (record.type === 'variable' && typeof record.name === 'string') {
		found.add(record.name);
		return found;
	}
	for (const value of Object.values(record)) variablesOf(value, found);
	return found;
}

/** Le terme k de l'élève et celui d'où il part (u₀ pour le premier) ; null : absent */
function studentStep(
	terms: readonly (number | null)[],
	k: number,
	start: number
): { previous: number | null; current: number | null } {
	return {
		previous: k === 1 ? start : (terms[k - 2] ?? null),
		current: terms[k - 1] ?? null
	};
}

/** Le terme k de l'élève est-il à moins de la marge de f(son terme k − 1) ? */
export function isStaircaseTermCorrect(answer: string, expected: string): boolean {
	const e = readStaircaseExpected(expected);
	if (e === null) return false;
	const f = relationEvaluator(e.relation);
	if (f === null) return false;
	const { previous, current } = studentStep(readStaircaseAnswer(answer), e.k, e.start);
	if (previous === null || current === null) return false;
	const target = f(previous);
	if (target === null) return false;
	return withinMargin(current, target, e.margin);
}

/** Le terme posé est-il à moins de la marge du terme construit ? */
function withinMargin(current: number, target: number, margin: number): boolean {
	return Math.abs(current - target) <= margin + EPSILON * Math.max(1, Math.abs(target));
}

/** Pas d'arrondi du toucher : une puissance de 10, au plus 1 % de la largeur */
function snapStep(window: CourbeWindow): number {
	return 10 ** Math.floor(Math.log10(SNAP_RATIO * (window.xMax - window.xMin)));
}

/** L'abscisse touchée, arrondie (au plus 1 % de la largeur) et ramenée dans la fenêtre */
export function snapAbscissa(window: CourbeWindow, x: number): number {
	const step = snapStep(window);
	const rounded = clean(Math.round(x / step) * step);
	return Math.min(window.xMax, Math.max(window.xMin, rounded));
}

/** Clavier : un pas d'arrondi vers la droite (+1) ou la gauche (−1) */
export function moveAbscissa(window: CourbeWindow, x: number, direction: number): number {
	return snapAbscissa(window, x + direction * snapStep(window));
}

/**
 * La marche de termes donnés depuis u₀ : pour chaque terme, monter de l'axe à sa
 * hauteur, aller à la droite y = x, redescendre à l'axe ; arrêt au premier terme
 * absent. `axisY` : ordonnée où l'axe des abscisses est dessiné
 */
export function studentCobweb(
	start: number,
	terms: readonly (number | null)[],
	axisY: number
): StaircaseSegment[] {
	const segments: StaircaseSegment[] = [];
	let previous = start;
	for (const term of terms) {
		if (term === null) break;
		segments.push(
			{ from: { x: previous, y: axisY }, to: { x: previous, y: term } },
			{ from: { x: previous, y: term }, to: { x: term, y: term } },
			{ from: { x: term, y: term }, to: { x: term, y: axisY } }
		);
		previous = term;
	}
	return segments;
}

/** Ordonnée où l'axe des abscisses est dessiné : 0, sinon le bord le plus proche (scène) */
export function abscissaAxisY(window: CourbeWindow): number {
	if (window.yMin <= 0 && 0 <= window.yMax) return 0;
	return window.yMin > 0 ? window.yMin : window.yMax;
}

/** Le vrai escalier, depuis u₀ : celui de la correction et du corrigé */
export function solutionCobweb(
	build: CourbeStaircaseToBuild,
	window: CourbeWindow
): StaircaseSegment[] {
	return studentCobweb(build.start, build.terms, abscissaAxisY(window));
}

/** `u₂` : nom de la suite, rang en indice */
export function termName(name: string, rank: number): string {
	const digits = String(rank)
		.split('')
		.map((d) => SUBSCRIPTS[Number(d)] ?? d)
		.join('');
	return `${name}${digits}`;
}

/** Nombre écrit pour l'élève : deux décimales, virgule (`2,54`) */
export function twoDecimals(value: number): string {
	const text = (Math.round(value * 100) / 100).toFixed(2).replace('.', ',');
	return text === '-0,00' ? '0,00' : text;
}

/**
 * La phrase de la correction pour le terme k (1 pour u₁) ; null s'il est juste.
 * « Depuis ton u₁, la construction mène à u₂ ≈ 2,54. », « Il faut placer u₂. »
 */
export function staircaseMistake(
	build: StaircaseForMistake,
	k: number,
	answer: string
): string | null {
	const name = (j: number) => termName(build.sequenceName, build.firstIndex + j);
	const { previous, current } = studentStep(readStaircaseAnswer(answer), k, build.start);
	if (current === null) return `Il faut placer ${name(k)}.`;
	if (previous === null)
		return `Place d’abord ${name(k - 1)} : ${name(k)} se construit depuis lui.`;
	const f = relationEvaluator(build.relation);
	const target = f === null ? null : f(previous);
	if (target === null) {
		return `Depuis ton ${name(k - 1)}, la construction ne mène à aucun ${name(k)}.`;
	}
	if (withinMargin(current, target, build.margin)) return null;
	const from = k === 1 ? name(0) : `ton ${name(k - 1)}`;
	return `Depuis ${from}, la construction mène à ${name(k)} ≈ ${twoDecimals(target)}.`;
}
