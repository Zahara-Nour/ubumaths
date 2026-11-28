/**
 * Droite à graduer — partage, réponses, correction
 * ================================================
 *
 * L'élève partage lui-même chaque intervalle de `step` en n parts égales (outil
 * n° 61, `docs/wip/outil-graduer-segment-progress.md`), puis pose les points de
 * `placer:` sur SES graduations. La droite qu'il voit est celle de
 * `graduerConfig(config, n)` : pas `step / n`, grandes graduations (et nombres
 * écrits) sur celles de `step`.
 *
 * Cases : N = le nombre de parts (`partsAnswer`, `3`), N + 1 + k = le point k
 * (`placerAnswer` sur la droite partagée : la valeur, `\frac{5}{3}`, quel que soit
 * le partage — 10/6 vaut 5/3, jugé juste par le juge ordinaire).
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/number-line-graduer
 */

import type { NumberLineConfig, NumberLineNode, NumberLinePoint } from '../types/number-line';
import { parseCustom } from '#lib/mathAST/parser/custom/index.ts';
import { indexOfValue, placerAnswer } from './number-line-placer';

// Constantes

/** Parts au départ, et au moins : l'unité entière */
export const MIN_PARTS = 1;
/** Parts au plus (boutons de l'élève, `graduer:` de l'auteur) */
export const MAX_PARTS = 12;
/** `graduer:` de l'auteur : au moins 2 parts (1 ne partage rien) */
export const MIN_AUTHOR_PARTS = 2;
/** Couleur des points justes, dans la correction */
const SOLUTION_COLOR = 'vert';

// Functions

/** La droite partagée en `parts` parts par intervalle de `step` ; une part : la droite telle quelle */
export function graduerConfig(config: NumberLineConfig, parts: number): NumberLineConfig {
	if (parts <= 1) return config;
	const expression = `(${config.step.expression})/${parts}`;
	return {
		...config,
		step: { expression, ast: parseCustom(expression) },
		major: config.major * parts
	};
}

/** Réponse de la case des parts : `3` */
export function partsAnswer(parts: number): string {
	return String(parts);
}

/** Nombre de parts d'une réponse ; null si vide ou hors de 1..MAX_PARTS */
export function partsOfAnswer(answer: string): number | null {
	const text = answer.trim();
	if (!/^\d+$/.test(text)) return null;
	const parts = Number(text);
	return parts >= MIN_PARTS && parts <= MAX_PARTS ? parts : null;
}

/** Réponse attendue d'un point de valeur `value`, droite partagée en `parts` ; null hors grille */
export function graduerPointAnswer(
	config: NumberLineConfig,
	parts: number,
	value: number
): string | null {
	const fine = graduerConfig(config, parts);
	const k = indexOfValue(fine, value);
	return k === null ? null : placerAnswer(fine, k);
}

/** Nombre de cases : une pour les parts, une par point de `placer:` */
export function graduerCaseCount(node: NumberLineNode): number {
	return 1 + (node.placer?.length ?? 0);
}

/**
 * Phrase de la correction des parts (`parts` : celles de l'élève, null s'il n'a
 * rien choisi ; `expected` null : valeur masquée)
 */
export function partsMistake(parts: number | null, expected: number | null): string {
	if (expected === null) return `Tu as partagé l’unité en ${parts ?? 1} parts.`;
	if (parts === null || parts <= 1) {
		return `Tu n’as pas partagé l’unité ; il fallait la partager en ${expected} parts.`;
	}
	return `Tu as partagé l’unité en ${parts} parts ; il en fallait ${expected}.`;
}

/**
 * La droite juste : `d` parts, les points de `placer:` en vert, sans geste ; null
 * si le nombre de parts est masqué
 */
export function graduerSolutionNode(node: NumberLineNode): NumberLineNode | null {
	const parts = node.graduer?.parts ?? null;
	if (parts === null) return null;
	const config = graduerConfig(node.config, parts);
	const points: NumberLinePoint[] = (node.placer ?? []).map((target) => ({
		label: target.name,
		value: target.value,
		color: SOLUTION_COLOR
	}));
	return {
		...node,
		config,
		graduer: undefined,
		placer: undefined,
		caseIndex: undefined,
		points
	};
}
