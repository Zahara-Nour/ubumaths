/**
 * Figure à colorier — réponse de l'élève, réponse attendue et jugement
 * ====================================================================
 *
 * L'élève colorie des parts d'un bloc ```partage (`colorier: 3/8`, chantier
 * `docs/wip/fractions-a-colorier-progress.md`).
 *
 * - Réponse de la case : les rangs coloriés, triés, séparés par « , » (`"1, 4, 6"`) ;
 *   `''` quand rien n'est colorié. Elle garde QUELLES parts : la correction
 *   redessine la figure de l'élève.
 * - Réponse attendue : `"3/8"` = parts à colorier / parts de la figure
 *   (`expectedColoringAnswer`) — la fraction écrite par le prof ramenée à CETTE
 *   figure (`1/2` sur une bande de 4 : `2/4`).
 * - Jugement : juste dès que le NOMBRE de parts coloriées est celui attendu,
 *   quelles que soient les parts (2 parts sur 4 : juste pour ½).
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/partage-colorier
 */

import { partageTotal, type PartageSpec } from '../types/partage';

// Constantes

const EXPECTED_REGEX = /^(\d+)\/(\d+)$/;

export const NOTHING_COLORED = 'Tu n’as rien colorié.';

// Functions

/** Réponse de la case pour ces rangs coloriés ; '' quand aucun */
export function coloredAnswer(ranks: readonly number[]): string {
	return [...ranks].sort((a, b) => a - b).join(', ');
}

/** Rangs d'une réponse pour une figure de `total` parts ; null si illisible, hors figure ou en double */
export function ranksOfAnswer(answer: string, total: number): number[] | null {
	const text = answer.trim();
	if (text === '') return [];
	const items = text.split(',').map((item) => item.trim());
	if (items.some((item) => !/^\d+$/.test(item))) return null;
	const ranks = items.map(Number);
	if (ranks.some((rank) => rank < 1 || rank > total)) return null;
	if (new Set(ranks).size !== ranks.length) return null;
	return ranks.sort((a, b) => a - b);
}

/** Réponse attendue d'une figure à colorier : `3/8` (parts à colorier / parts) */
export function expectedColoringAnswer(spec: PartageSpec): string {
	return `${spec.colorier?.parts ?? 0}/${partageTotal(spec.shape)}`;
}

/** Lecture de la réponse attendue ; null si illisible */
function readExpected(expected: string): { parts: number; total: number } | null {
	const match = EXPECTED_REGEX.exec(expected.trim());
	return match ? { parts: Number(match[1]), total: Number(match[2]) } : null;
}

/** Les parts coloriées par l'élève (`answer`) valent-elles la fraction attendue (`expected`) ? */
export function isColoringCorrect(answer: string, expected: string): boolean {
	const wanted = readExpected(expected);
	if (wanted === null) return false;
	const ranks = ranksOfAnswer(answer, wanted.total);
	return ranks !== null && ranks.length === wanted.parts;
}

const partsOf = (count: number) => `${count} part${count > 1 ? 's' : ''}`;

/** Les phrases de la correction, pour un coloriage faux (`count` parts coloriées) */
export function coloringMistakes(count: number, spec: PartageSpec): string[] {
	if (count === 0) return [NOTHING_COLORED];
	const { colorier } = spec;
	if (!colorier) return [];
	return [
		`Tu as colorié ${partsOf(count)} sur ${partageTotal(spec.shape)} ; il fallait en colorier ${colorier.parts} (${colorier.num}/${colorier.den}).`
	];
}
