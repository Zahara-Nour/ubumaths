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
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { buildStatChartScene, type StatChartScene } from '$lib/ubumark/utils/stat-chart-scene';

// =============================================================================
// Types
// =============================================================================

export type BinomialResult =
	| { readonly ok: true; readonly text: string; readonly chart: StatChartScene }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

const USAGE = 'Écris la commande ainsi : .binomiale X 10 0,3';

/** `X 10 0,3` puis, éventuellement, les options séparées par « ; » */
const HEAD = /^([A-Z])\s+(\S+)\s+(\S+)(?:\s+(.*))?$/;

// =============================================================================
// Fonctions
// =============================================================================

/** `.binomiale X 10 0,3 [P(X ⩽ 4) ; intervalle 0,95 ; seuil P(X > k) ⩽ 0,05]` */
export function binomialCommand(_atelier: Atelier, argument: string): BinomialResult {
	const head = HEAD.exec(argument.trim());
	if (!head) return { ok: false, message: USAGE };
	const [, variable, n, p, rest] = head;

	const queries: string[] = [];
	const lines = [`${variable} ~ B(${n} ; ${p})`, 'indicateurs: espérance ; variance ; écart type'];
	for (const option of (rest ?? '')
		.split(';')
		.map((o) => o.trim())
		.filter((o) => o !== '')) {
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

	// Le bloc d'une fiche, analysé et dessiné comme tel : mêmes messages, mêmes valeurs
	const node = parseStatChartContent('loi', lines.join('\n'));
	if (node.spec === null) {
		const message = node.errors[0]?.message ?? USAGE;
		return { ok: false, message: message.replace(/^Ligne \d+ : /, '') };
	}
	return {
		ok: true,
		text: `${variable} suit B(${n} ; ${p})`,
		chart: buildStatChartScene(node.spec, { locale: 'fr' })
	};
}
