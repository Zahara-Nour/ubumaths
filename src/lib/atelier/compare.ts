/**
 * Atelier — `.comparer L M`, comparer deux séries de nombres
 *
 * Outils statistiques v2, lot 5, PR (a) (Q111-Q114, 2026-10-03 ; 2de `2-169` :
 * décrire les différences entre deux séries à l'aide d'indicateurs). Un tableau
 * d'indicateurs, une colonne par série, sous la ligne de l'historique. Les
 * listes ont des longueurs quelconques : pas d'individus appariés, contrairement
 * à `.croiser`.
 *
 * ⚠️ AUCUNE phrase de conclusion (Q112) : la comparaison écrite reste le
 * travail de l'élève.
 *
 * @module atelier/compare
 */

import type { Atelier } from './atelier.svelte';
import { isList, isQualitative, type ListObject } from './types';
import { summarizeList, type Summary } from '$lib/statistics/describe';
import { buildComparisonScene } from '$lib/ubumark/utils/comparison-scene';
import type { StatChartScene } from '$lib/ubumark/utils/stat-chart-scene';

// =============================================================================
// Types
// =============================================================================

export type CompareResult =
	| { readonly ok: true; readonly text: string; readonly chart: StatChartScene }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

const USAGE = 'Écris la commande ainsi : .comparer L M';

// =============================================================================
// Fonctions
// =============================================================================

/** « 5 valeurs », « 1 valeur » */
function valuesCount(n: number): string {
	return `${n} ${n === 1 ? 'valeur' : 'valeurs'}`;
}

/**
 * Les indicateurs d'une liste comparable, ou pourquoi elle ne l'est pas — la
 * même raison pour la commande et pour le bouton désactivé.
 */
function summaryOf(list: ListObject): { summary: Summary } | { problem: string } {
	if (isQualitative(list)) {
		const because =
			list.qualitativeBecause === undefined ? '' : ` (à cause de « ${list.qualitativeBecause} »)`;
		return {
			problem: `${list.name} est une liste qualitative${because} : comparer demande des nombres.`
		};
	}
	// Une liste en erreur (plus de 200 valeurs, virgules en séparateur) garde des
	// valeurs, ou n'en a aucune : son message dit pourquoi (revue, comme `.croiser`)
	if (list.status !== 'ok' && list.message !== undefined) return { problem: list.message };
	const outcome = summarizeList(list.values);
	if (outcome === null) return { problem: `« ${list.name} » n’a pas encore de valeurs.` };
	if (list.status !== 'ok') {
		return { problem: `« ${list.name} » ne peut pas être comparée pour le moment.` };
	}
	if (!outcome.ok) return { problem: outcome.message };
	return { summary: outcome.value };
}

/** Pourquoi L et M ne se comparent pas, s'ils ne le peuvent pas. */
export function compareProblem(first: ListObject, second: ListObject): string | undefined {
	for (const list of [first, second]) {
		const read = summaryOf(list);
		if ('problem' in read) return read.problem;
	}
	return undefined;
}

/** `.comparer L M` */
export function compareCommand(atelier: Atelier, argument: string): CompareResult {
	const parts = argument
		.trim()
		.split(/\s+/)
		.filter((part) => part !== '');
	if (parts.length !== 2) return { ok: false, message: USAGE };
	if (parts[0] === parts[1]) {
		return { ok: false, message: 'Compare deux listes différentes : .comparer L M.' };
	}

	const lists: ListObject[] = [];
	for (const name of parts) {
		const object = atelier.get(name);
		if (object === undefined || !isList(object)) {
			return { ok: false, message: `« ${name} » n’est pas une liste de l’atelier.` };
		}
		lists.push(object);
	}

	const series: { name: string; summary: Summary }[] = [];
	for (const list of lists) {
		const read = summaryOf(list);
		if ('problem' in read) return { ok: false, message: read.problem };
		series.push({ name: list.name, summary: read.summary });
	}

	const [first, second] = series;
	return {
		ok: true,
		text: `Comparaison de ${first.name} (${valuesCount(first.summary.count)}) et ${second.name} (${valuesCount(second.summary.count)})`,
		chart: buildComparisonScene(series, 'fr')
	};
}
