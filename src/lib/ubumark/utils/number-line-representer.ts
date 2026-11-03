/**
 * Droite graduée à représenter — état de l'élève, réponse, juge, phrases
 * ======================================================================
 *
 * L'élève représente un intervalle (` ```line ` + `representer: [2, +inf[`,
 * chantier `docs/wip/demi-droite-progress.md` § « Geste de l'élève ») : il pose
 * la borne (deux pour un intervalle borné), choisit le côté des solutions
 * (demi-droite) et bascule chaque borne comprise / exclue.
 *
 * Sa réponse s'écrit par `representerAnswer`, la même fonction que la réponse
 * attendue : `[2 ; +∞[`, `]-1 ; 3]`, bornes écrites comme les graduations
 * (`placerText` : `2/3`, `0,5`). Incomplète, elle reste lisible et jamais juste :
 * `2 comprise, côté ?`, `-1 comprise, autre borne ?`. Le juge
 * (`isRepresentedIntervalCorrect`) compare les nombres, sans la droite.
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/number-line-representer
 */

import type { NumberLineConfig, NumberLineSegment } from '../types/number-line';
import { numVal } from './number-line-render';
import { graduationCount, indexOfValue, placerText } from './number-line-placer';

// Types

/** Une borne posée : le rang de sa graduation, comprise ou exclue */
export interface RepresenterBorne {
	rank: number;
	included: boolean;
}

/** Côté des solutions d'une demi-droite */
export type RepresenterSide = 'gauche' | 'droite';

/**
 * Ce que l'élève a fait : ses bornes (dans l'ordre de pose ; rangées à
 * l'écriture), le côté choisi (demi-droite seulement)
 */
export interface RepresenterState {
	bornes: RepresenterBorne[];
	side: RepresenterSide | null;
}

/** Intervalle relu d'une réponse complète : bornes finies en nombres, null = infini */
interface ReadInterval {
	left: { text: string; value: number } | null;
	right: { text: string; value: number } | null;
	leftOpen: boolean;
	rightOpen: boolean;
}

// Constantes

const EMPTY_STATE: RepresenterState = { bornes: [], side: null };
const INCLUDED = 'comprise';
const EXCLUDED = 'exclue';
const MISSING_SIDE = 'côté ?';
const MISSING_BORNE = 'autre borne ?';
/** Nombre écrit par `placerText` : `7`, `-0,5`, `4/3` */
const NUMBER = String.raw`-?\d+(?:,\d+)?(?:/\d+)?`;
const COMPLETE = new RegExp(String.raw`^([[\]])\s*(-∞|${NUMBER})\s*;\s*(\+∞|${NUMBER})\s*([[\]])$`);
const PARTIAL = new RegExp(
	String.raw`^(${NUMBER}) (${INCLUDED}|${EXCLUDED}), (${MISSING_SIDE.replace('?', '\\?')}|${MISSING_BORNE.replace('?', '\\?')})$`
);

/** Nombre de la droite (`placerText`) : valeur ; NaN si illisible */
function numberOf(text: string): number {
	const [num, den] = text.replace(',', '.').split('/');
	return den === undefined ? Number(num) : Number(num) / Number(den);
}

/** Deux bornes égales (calculs en virgule flottante) */
function same(a: number, b: number): boolean {
	return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

// Functions

/** L'intervalle de `representer:` en état d'élève juste (bornes sur des graduations) */
export function expectedInterval(
	config: NumberLineConfig,
	interval: NumberLineSegment
): RepresenterState {
	const bornes: RepresenterBorne[] = [];
	if (!interval.startInfinite) {
		const rank = indexOfValue(config, numVal(interval.start));
		if (rank !== null) bornes.push({ rank, included: !interval.startOpen });
	}
	if (!interval.endInfinite) {
		const rank = indexOfValue(config, numVal(interval.end));
		if (rank !== null) bornes.push({ rank, included: !interval.endOpen });
	}
	const side = interval.endInfinite ? 'droite' : interval.startInfinite ? 'gauche' : null;
	return { bornes, side };
}

/**
 * La réponse d'un état : `[2 ; +∞[`, `[-1 ; 3[` ; incomplète `2 comprise, côté ?`,
 * `-1 comprise, autre borne ?` ; vide `''`. `bounded` : deux bornes attendues
 * (par défaut, dès que deux sont posées).
 */
export function representerAnswer(
	config: NumberLineConfig,
	state: RepresenterState,
	bounded = state.bornes.length === 2
): string {
	const bornes = [...state.bornes].sort((a, b) => a.rank - b.rank);
	if (bornes.length === 0) return '';
	const text = (borne: RepresenterBorne) => placerText(config, borne.rank);
	const first = bornes[0];
	if (bounded) {
		const second = bornes[1];
		if (second === undefined) {
			return `${text(first)} ${first.included ? INCLUDED : EXCLUDED}, ${MISSING_BORNE}`;
		}
		return `${first.included ? '[' : ']'}${text(first)} ; ${text(second)}${second.included ? ']' : '['}`;
	}
	if (state.side === null) {
		return `${text(first)} ${first.included ? INCLUDED : EXCLUDED}, ${MISSING_SIDE}`;
	}
	return state.side === 'droite'
		? `${first.included ? '[' : ']'}${text(first)} ; +∞[`
		: `]-∞ ; ${text(first)}${first.included ? ']' : '['}`;
}

/** Rang de la graduation d'un nombre écrit par `placerText` ; null hors de la droite */
function rankOf(config: NumberLineConfig, text: string): number | null {
	const value = numberOf(text);
	return Number.isFinite(value) ? indexOfValue(config, value) : null;
}

/** L'état d'une réponse (case relue, composant remonté) ; vide si illisible */
export function stateOfAnswer(
	config: NumberLineConfig,
	answer: string,
	bounded: boolean
): RepresenterState {
	const text = answer.trim();
	const partial = PARTIAL.exec(text);
	if (partial) {
		const rank = rankOf(config, partial[1]);
		const fits = bounded === (partial[3] === MISSING_BORNE);
		if (rank === null || !fits) return EMPTY_STATE;
		return { bornes: [{ rank, included: partial[2] === INCLUDED }], side: null };
	}
	const read = readInterval(text);
	if (read === null) return EMPTY_STATE;
	const left = read.left === null ? null : rankOf(config, read.left.text);
	const right = read.right === null ? null : rankOf(config, read.right.text);
	if ((read.left !== null && left === null) || (read.right !== null && right === null)) {
		return EMPTY_STATE;
	}
	const isBounded = left !== null && right !== null;
	if (isBounded !== bounded) return EMPTY_STATE;
	if (left !== null && right !== null) {
		return {
			bornes: [
				{ rank: left, included: !read.leftOpen },
				{ rank: right, included: !read.rightOpen }
			],
			side: null
		};
	}
	if (left !== null) return { bornes: [{ rank: left, included: !read.leftOpen }], side: 'droite' };
	if (right !== null) {
		return { bornes: [{ rank: right, included: !read.rightOpen }], side: 'gauche' };
	}
	return EMPTY_STATE;
}

/** Une réponse complète relue ; null si incomplète ou illisible */
function readInterval(answer: string): ReadInterval | null {
	const match = COMPLETE.exec(answer.trim());
	if (!match) return null;
	const bound = (text: string) => (text.endsWith('∞') ? null : { text, value: numberOf(text) });
	const left = bound(match[2]);
	const right = bound(match[3]);
	if (left === null && right === null) return null;
	if (left !== null && right !== null && left.value >= right.value) return null;
	return { left, right, leftOpen: match[1] === ']', rightOpen: match[4] === '[' };
}

/** Le juge : borne(s), côté et crochets tous justes ; sans la droite, sur les nombres */
export function isRepresentedIntervalCorrect(answer: string, expected: string): boolean {
	const a = readInterval(answer);
	const e = readInterval(expected);
	if (a === null || e === null) return false;
	const sameBound = (x: ReadInterval['left'], y: ReadInterval['left']) =>
		x === null || y === null ? x === y : same(x.value, y.value);
	return (
		sameBound(a.left, e.left) &&
		sameBound(a.right, e.right) &&
		(a.left === null || a.leftOpen === e.leftOpen) &&
		(a.right === null || a.rightOpen === e.rightOpen)
	);
}

/** La réponse attendue est-elle un intervalle (droite à représenter) ? */
export function isIntervalAnswer(expected: string): boolean {
	return readInterval(expected) !== null;
}

/** « Le nombre 2 est-il solution ? Le crochet dit le contraire. » */
function bracketMistake(text: string): string {
	return `Le nombre ${text} est-il solution ? Le crochet dit le contraire.`;
}

const WRONG_BORNE = 'La limite des solutions n’est pas là.';

/**
 * Les phrases de la correction d'une réponse fausse (points 13, 15 à 17 de la
 * phase 0) ; aucune pour une réponse juste ou vide
 */
export function representerMistakes(answer: string, expected: string): string[] {
	const text = answer.trim();
	if (text === '' || isRepresentedIntervalCorrect(text, expected)) return [];
	const partial = PARTIAL.exec(text);
	if (partial) {
		return [
			partial[3] === MISSING_SIDE
				? 'Choisis de quel côté sont les solutions.'
				: 'Pose les deux bornes.'
		];
	}
	const a = readInterval(text);
	const e = readInterval(expected);
	if (a === null || e === null) return [WRONG_BORNE];

	// Demi-droite attendue
	if (e.left === null || e.right === null) {
		const expectedBorne = (e.left ?? e.right)!;
		const borne = a.left ?? a.right;
		if (borne === null || (a.left !== null && a.right !== null)) return [WRONG_BORNE];
		if (!same(borne.value, expectedBorne.value)) return [WRONG_BORNE];
		const sameSide = (a.left === null) === (e.left === null);
		if (!sameSide) return [`Les solutions sont de l’autre côté de ${borne.text}.`];
		return [bracketMistake(borne.text)];
	}

	// Intervalle borné attendu
	if (a.left === null || a.right === null) return [WRONG_BORNE];
	if (!same(a.left.value, e.left.value) || !same(a.right.value, e.right.value)) {
		return [WRONG_BORNE];
	}
	return [
		...(a.leftOpen !== e.leftOpen ? [bracketMistake(a.left.text)] : []),
		...(a.rightOpen !== e.rightOpen ? [bracketMistake(a.right.text)] : [])
	];
}

/** Le segment à dessiner pour un état (borne(s) et côté connus) ; null sinon */
export function segmentOfState(
	config: NumberLineConfig,
	state: RepresenterState,
	bounded: boolean
): { start: number | null; end: number | null; startOpen: boolean; endOpen: boolean } | null {
	const bornes = [...state.bornes].sort((a, b) => a.rank - b.rank);
	const last = graduationCount(config) - 1;
	const inLine = bornes.every((b) => b.rank >= 0 && b.rank <= last);
	if (!inLine) return null;
	if (bounded) {
		if (bornes.length !== 2) return null;
		return {
			start: bornes[0].rank,
			end: bornes[1].rank,
			startOpen: !bornes[0].included,
			endOpen: !bornes[1].included
		};
	}
	const borne = bornes[0];
	if (borne === undefined || state.side === null) return null;
	return state.side === 'droite'
		? { start: borne.rank, end: null, startOpen: !borne.included, endOpen: true }
		: { start: null, end: borne.rank, startOpen: true, endOpen: !borne.included };
}
