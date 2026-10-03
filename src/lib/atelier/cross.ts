/**
 * Atelier — `.croiser L M`, le tableau croisé de deux listes qualitatives
 *
 * Outils statistiques v2, lot 2, PR (b) (Q88-Q89, 2026-10-02 ; 2de `2-175` :
 * dresser le tableau croisé de deux variables qualitatives à partir du fichier
 * des individus). L et M donnent une entrée par individu ; le tableau est
 * celui de la v1 (`tableau-croise`), dessiné sous la ligne de l'historique.
 *
 * Le tableau est construit SANS passer par le texte d'un bloc : une modalité
 * `titre: Z` y serait lue comme une option (revue de #661).
 *
 * @module atelier/cross
 */

import type { Atelier } from './atelier.svelte';
import { isList, isQualitative, type ListObject } from './types';
import { individualEntries } from './parse';
import type { StatChartSpec } from '$lib/ubumark/types/stat-chart';
import type { CrossTableDisplay } from '$lib/ubumark/types/stat-chart';
import { buildStatChartScene, type StatChartScene } from '$lib/ubumark/utils/stat-chart-scene';

// =============================================================================
// Types
// =============================================================================

export type CrossResult =
	| { readonly ok: true; readonly text: string; readonly chart: StatChartScene }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

const USAGE = 'Écris la commande ainsi : .croiser L M, ou avec lignes, colonnes ou fréquences.';

/** L'option tapée → ce que le tableau affiche (Q89) */
const DISPLAYS: Readonly<Record<string, CrossTableDisplay>> = {
	fréquences: 'fréquences',
	frequences: 'fréquences',
	lignes: 'fréquences par ligne',
	colonnes: 'fréquences par colonne'
};

// =============================================================================
// Fonctions
// =============================================================================

function listNamed(atelier: Atelier, name: string): ListObject | null {
	const object = atelier.get(name);
	return object !== undefined && isList(object) ? object : null;
}

/**
 * Pourquoi L et M ne se croisent pas, s'ils ne le peuvent pas — la même raison
 * pour la commande et pour le bouton désactivé.
 */
export function crossProblem(rows: ListObject, columns: ListObject): string | undefined {
	for (const list of [rows, columns]) {
		// Une liste refusée (21 modalités, modalité trop longue) garde ses entrées
		// BRUTES, non fusionnées : on la refuse avec son message (revue)
		if (list.status !== 'ok') {
			return list.message ?? `« ${list.name} » ne peut pas être croisée pour le moment.`;
		}
		if (!isQualitative(list)) {
			return `${list.name} est une liste de nombres : le tableau croisé croise deux listes de mots.`;
		}
		// Un trou décalerait les individus suivants (revue de `.filtrer`)
		const read = individualEntries(list.definition, true);
		if ('hole' in read) return holeMessage(list.name, read.hole);
	}
	// `Total` est réservé aux totaux du tableau, comme dans un bloc de la v1
	// (sinon deux colonnes « Total », revue)
	for (const list of [rows, columns]) {
		if (list.categories!.some((c) => c.trim().toLocaleLowerCase('fr') === 'total')) {
			return `« Total » est réservé aux totaux du tableau : renomme cette modalité dans ${list.name}.`;
		}
	}
	const a = rows.categories?.length ?? 0;
	const b = columns.categories?.length ?? 0;
	if (a !== b) {
		return `${rows.name} a ${a} entrées et ${columns.name} ${b} : il faut une entrée par individu.`;
	}
	return undefined;
}

/** Le message d'une liste trouée : il dit pourquoi, et où */
export function holeMessage(name: string, position: number): string {
	return `L'entrée n° ${position} de ${name} est vide ou illisible : il faut une entrée par individu, dans le même ordre que les autres listes.`;
}

/**
 * Une modalité qu'on peut citer telle quelle dans `.filtrer` : sans `et`, `ou`,
 * `non`, `si` en mot, ni parenthèse, ni opérateur (revue : `noir et blanc`
 * donnait une piste refusée)
 */
function quotable(label: string): boolean {
	return !/[()<>=≠≤≥!]/.test(label) && !/(^|\s)(et|ou|non|si)(\s|$)/i.test(label);
}

/** Les modalités distinctes, dans l'ordre d'apparition (Q88) */
function distinct(categories: readonly string[]): string[] {
	return [...new Set(categories)];
}

/** `.croiser L M [lignes | colonnes | fréquences]` */
export function crossCommand(atelier: Atelier, argument: string): CrossResult {
	const parts = argument.trim().split(/\s+/);
	if (parts.length < 2 || parts.length > 3) return { ok: false, message: USAGE };
	const [rowsName, columnsName, option] = parts;
	const display: CrossTableDisplay | undefined =
		option === undefined ? 'effectifs' : DISPLAYS[option.toLowerCase()];
	if (display === undefined) return { ok: false, message: USAGE };
	if (rowsName === columnsName) {
		return { ok: false, message: 'Croise deux listes différentes : .croiser L M.' };
	}

	for (const name of [rowsName, columnsName]) {
		if (listNamed(atelier, name) === null) {
			return { ok: false, message: `« ${name} » n’est pas une liste de l’atelier.` };
		}
	}
	const rows = listNamed(atelier, rowsName)!;
	const columns = listNamed(atelier, columnsName)!;
	const problem = crossProblem(rows, columns);
	if (problem !== undefined) return { ok: false, message: problem };

	const rowCategories = rows.categories!;
	const columnCategories = columns.categories!;
	const rowLabels = distinct(rowCategories);
	const columnLabels = distinct(columnCategories);
	const cells = rowLabels.map(() => columnLabels.map(() => 0));
	rowCategories.forEach((row, i) => {
		cells[rowLabels.indexOf(row)][columnLabels.indexOf(columnCategories[i])]++;
	});

	const spec: StatChartSpec = {
		kind: 'tableau-croise',
		data: [],
		unit: 'effectifs',
		title: null,
		axes: { x: null, y: null },
		description: null,
		size: 'moyenne',
		showValues: false,
		color: 'bleu',
		labels: 'effectifs',
		areaLegend: null,
		direction: 'croissantes',
		reading: 'aucune',
		indicators: [],
		table: {
			rows: rowLabels,
			columns: columnLabels,
			cells,
			showTotals: true,
			display,
			masked: [],
			corner: `${rowsName} \\ ${columnsName}`
		},
		law: null,
		simulation: null,
		rawValues: null,
		series: null,
		twoSeries: null,
		frequencyTable: null
	};

	const count = rowCategories.length;
	return {
		ok: true,
		text: [
			`Tableau croisé de ${rowsName} (lignes) et ${columnsName} (colonnes), ${count} individu${count > 1 ? 's' : ''}`,
			// Q90 : la piste vers `.filtrer`, avec les noms et des modalités réelles —
			// seulement si elles se citent telles quelles
			...(quotable(rowLabels[0]) && quotable(columnLabels[0])
				? [
						`Pour filtrer : .filtrer ${rowsName} = ${rowLabels[0]} et ${columnsName} = ${columnLabels[0]}`
					]
				: [])
		].join('\n'),
		chart: buildStatChartScene(spec, { locale: 'fr' })
	};
}
