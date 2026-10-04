/**
 * Atelier — `.binomiale X 10 0,3`, la loi binomiale (Q142, 2026-10-03)
 *
 * La commande écrit le bloc ```loi correspondant (`X ~ B(n ; p)`, E, V, σ, et
 * les options de la ligne) et en montre la scène sous la ligne de
 * l'historique : les MÊMES textes et les mêmes valeurs exactes que dans une
 * fiche, sans code de calcul en double.
 *
 * ⚠️ Aucune liste n'est créée : les listes de l'atelier stockent des
 * décimaux, et une loi B(20 ; 0,3) (dénominateurs 10^20) n'y serait plus
 * exacte — l'action « Loi » la refuserait (Q142).
 *
 * @module atelier/binomial
 */

import type { Atelier } from './atelier.svelte';
import {
	lawOptions,
	lawUsageError,
	normalizeLawArgument,
	runLawBlock,
	type LawCommandResult
} from './law-commands';

// =============================================================================
// Types
// =============================================================================

export type BinomialResult = LawCommandResult;

// =============================================================================
// Constantes
// =============================================================================

const EXAMPLE = '.binomiale X 10 0,3';

/** `X 10 0,3` puis, éventuellement, les options séparées par « ; » */
const HEAD = /^([A-Z])\s+(\S+)\s+(\S+)(?:\s+(.*))?$/;

// =============================================================================
// Fonctions
// =============================================================================

/** `.binomiale X 10 0,3 [P(X ⩽ 4) ; intervalle 0,95 ; seuil P(X > k) ⩽ 0,05]` */
export function binomialCommand(_atelier: Atelier, argument: string): BinomialResult {
	const written = normalizeLawArgument(argument);
	const head = HEAD.exec(written);
	if (!head) return lawUsageError(written, EXAMPLE);
	const [, variable, n, p, rest] = head;

	const queries: string[] = [];
	// Le diagramme en bâtons, comme les autres lois discrètes (accord de David, 2026-10-04)
	const lines = [
		`${variable} ~ B(${n} ; ${p})`,
		'indicateurs: espérance ; variance ; écart type',
		'diagramme: oui'
	];
	for (const option of lawOptions(rest)) {
		// Une option sans valeur : dire ce qui manque (revue)
		if (/^(intervalle|seuil)$/i.test(option)) {
			const example = /^i/i.test(option) ? 'intervalle 0,95' : `seuil P(${variable} > k) ⩽ 0,05`;
			return { ok: false, message: `« ${option} » sans valeur : écrire par exemple ${example}` };
		}
		if (option.startsWith('P(')) queries.push(option);
		else if (/^intervalle\s+/i.test(option))
			lines.push(`intervalle: ${option.replace(/^intervalle\s+/i, '')}`);
		else if (/^seuil\s+/i.test(option)) lines.push(`seuil: ${option.replace(/^seuil\s+/i, '')}`);
		else {
			return {
				ok: false,
				message: `« ${option} » : écrire P(${variable} ⩽ 4), intervalle 0,95 ou seuil P(${variable} > k) ⩽ 0,05`
			};
		}
	}
	if (queries.length > 0) lines.push(`probabilités: ${queries.join(' ; ')}`);

	// Le texte reste « X suit B(n ; p) », même pour B(1 ; p) (le titre dit « Bernoulli »)
	return runLawBlock(lines, variable, `${variable} suit B(${n} ; ${p})`, EXAMPLE);
}
