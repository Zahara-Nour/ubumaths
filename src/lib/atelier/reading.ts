/**
 * Atelier — la lecture graphique de l'image
 *
 * Une ligne `f(2)` réussie dans la console se LIT aussi sur le graphe : des
 * pointillés de 2 sur l'axe des abscisses jusqu'à la courbe, puis jusqu'à f(2)
 * sur l'axe des ordonnées (lot 3 bis de
 * `docs/wip/atelier-refonte-interface-phase0.md`, choix de David du 2026-10-18).
 *
 * La ligne est relue par le parseur de l'atelier (`astOf`), la même lecture que
 * le moteur : jamais une expression régulière sur le texte tapé. Seul un appel
 * NU se lit — `f(2)+1` n'est pas une image.
 *
 * @module atelier/reading
 */

import type { MathNode } from '$lib/mathAST/types';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { evaluateAt } from '$lib/grapheur/evaluator';
import { astOf } from './parse';
import type { CalcResult } from './calcul';

// =============================================================================
// Constantes
// =============================================================================

/** Les lectures gardées par courbe : au-delà, le graphe se brouille. */
export const MAX_READINGS = 3;

/**
 * Les lignes relues, en partant de la fin : la synchronisation relit la
 * console à chaque nouvelle ligne, et une lecture plus ancienne que ça n'a
 * plus rien à dire sur le graphe.
 */
const SCANNED_LINES = 100;

/** Les seuls noms permis dans l'argument : des constantes. */
const CONSTANTS = new Set(['pi', 'e']);

/**
 * Les lignes déjà relues, par noms de fonctions et texte : la synchronisation
 * relit la console à chaque révision de l'atelier, un glissé de curseur
 * compris, et une ligne ne change jamais (revue de #1497). Vidé au-delà de
 * `CACHE_LIMIT` entrées, pour ne pas grossir sans fin.
 */
const callCache = new Map<string, ReturnType<typeof readingCallOf>>();
const CACHE_LIMIT = 1000;

// =============================================================================
// Fonctions
// =============================================================================

/** L'abscisse d'un argument sans variable, ou `null`. */
function constantValue(argument: MathNode): number | null {
	const names = [...getVariables(argument)];
	if (names.some((name) => !CONSTANTS.has(name))) return null;
	return evaluateAt(argument, 0);
}

/**
 * L'image qu'une ligne de console demande, `{ name: 'f', at: 2 }` pour `f(2)`,
 * ou `null` si la ligne n'est pas un appel nu d'une fonction de l'atelier sur
 * un nombre. `f'(2)` se lit sur la carte de la dérivée.
 */
export function readingCallOf(
	text: string,
	functionNames: readonly string[]
): { readonly name: string; readonly at: number } | null {
	const ast = astOf(text, 'text', functionNames);
	if (ast === null || ast.type !== 'function' || ast.args.length !== 1) return null;
	// `f^{-1}(5)` est une image de la réciproque, pas de f (revue de #1497)
	if (ast.isInverse) return null;
	const name = ast.name + "'".repeat(ast.derivativeOrder ?? 0);
	if (!functionNames.includes(name)) return null;
	const at = constantValue(ast.args[0]);
	return at === null ? null : { name, at };
}

/** `readingCallOf`, sans relire une ligne déjà lue avec les mêmes noms. */
function cachedCall(text: string, functionNames: readonly string[]) {
	const key = `${functionNames.join('\u0000')}\u0001${text}`;
	if (callCache.has(key)) return callCache.get(key) ?? null;
	if (callCache.size >= CACHE_LIMIT) callCache.clear();
	const call = readingCallOf(text, functionNames);
	callCache.set(key, call);
	return call;
}

/** Ce que la lecture regarde d'une ligne de console. */
interface ReadableEntry {
	readonly label: string;
	readonly failed: boolean;
	readonly result?: CalcResult;
}

/**
 * Les abscisses lues dans la console, par courbe : les `MAX_READINGS`
 * dernières, de la plus ancienne à la plus récente. Une abscisse relue ne
 * compte qu'une fois, à sa place la plus récente.
 */
export function consoleReadings(
	entries: readonly ReadableEntry[],
	functionNames: readonly string[]
): Map<string, number[]> {
	const readings = new Map<string, number[]>();
	const oldest = Math.max(0, entries.length - SCANNED_LINES);
	for (let i = entries.length - 1; i >= oldest; i--) {
		const entry = entries[i];
		if (entry.failed || entry.result?.kind !== 'calcul') continue;
		const call = cachedCall(entry.label, functionNames);
		if (call === null) continue;
		const list = readings.get(call.name) ?? [];
		if (list.length >= MAX_READINGS || list.includes(call.at)) continue;
		list.unshift(call.at);
		readings.set(call.name, list);
	}
	return readings;
}
