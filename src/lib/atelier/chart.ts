/**
 * Atelier — le diagramme en bâtons d'une liste (vue Données)
 *
 * Chantier outils statistiques, lot 5 (Q35-Q36) : une liste L donne ses valeurs
 * distinctes ; leurs effectifs viennent de L elle-même (chaque valeur compte
 * pour 1) ou d'une partenaire M.
 *
 * ⚠️ Aucun dessin ni contrôle propre ici : le module statistique regroupe et
 * trie (`summarizeTable`), puis le diagramme passe par le MÊME parseur que le
 * bloc ```barres d'un énoncé. Un effectif invalide reçoit donc le même message,
 * et l'écran le même composant (`StatChart.svelte`).
 *
 * @module atelier/chart
 */

import type { Atelier } from './atelier.svelte';
import { isList, type ListObject } from './types';
import { summarizeTable } from '$lib/statistics/describe';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { STAT_CHART_LIMITS, type StatChartNode } from '$lib/ubumark/types/stat-chart';

// =============================================================================
// Types
// =============================================================================

export type ListChart =
	| { readonly ok: true; readonly node: StatChartNode }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

/** Ce que la ligne d'indicateurs dit sous le diagramme (Q36) */
const INDICATORS = 'effectif ; moyenne ; médiane ; quartiles';

/** Le préfixe « Ligne n : » renvoie au texte généré, que l'élève ne voit pas */
const LINE_PREFIX = /^Ligne \d+ : /;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Un nombre écrit comme l'élève l'écrit : virgule décimale, signe moins ASCII,
 * au plus 2 décimales — une valeur saisie `1/3` vaut 0,333… (Q45).
 */
function written(value: number): string {
	return String(Math.round(value * 100) / 100).replace('.', ',');
}

function listNamed(atelier: Atelier, name: string): ListObject | null {
	const object = atelier.get(name);
	return object !== undefined && isList(object) ? object : null;
}

/**
 * Le diagramme en bâtons de la liste `name`, effectifs pris dans `partner`
 * (ou 1 par valeur), ou pourquoi il n'y en a pas.
 */
export function listChart(atelier: Atelier, name: string, partner: string | null): ListChart {
	const list = listNamed(atelier, name);
	if (list === null) return { ok: false, message: `« ${name} » n'est pas une liste.` };
	if (list.values.length === 0) {
		return { ok: false, message: `« ${name} » n'a pas encore de valeurs.` };
	}

	let counts: readonly number[] = list.values.map(() => 1);
	if (partner !== null) {
		const other = listNamed(atelier, partner);
		if (other === null) {
			return { ok: false, message: `La liste des effectifs « ${partner} » n'existe plus.` };
		}
		counts = other.values;
	}

	// Valeurs distinctes, triées, effectifs additionnés : le module statistique
	const table = summarizeTable(list.values, counts);
	if (table === null || !table.ok) {
		return { ok: false, message: table?.ok === false ? table.message : 'Aucune donnée.' };
	}
	const rows = table.value.rows;
	if (rows.length > STAT_CHART_LIMITS.barCategories) {
		return {
			ok: false,
			message: `Trop de valeurs distinctes pour un diagramme en bâtons (${STAT_CHART_LIMITS.barCategories} au plus) : ${rows.length} ici.`
		};
	}

	// Le titre nomme la liste et la partenaire : sous trois colonnes, l'élève
	// au lecteur d'écran doit savoir de quel diagramme il s'agit (audit a11y)
	const title =
		partner === null ? `Diagramme de ${name}` : `Diagramme de ${name}, effectifs ${partner}`;
	const source = [
		`titre: ${title}`,
		`axes: ${name} ; Effectif`,
		`indicateurs: ${INDICATORS}`,
		...rows.map((row) => `${written(row.value)} = ${written(row.count)}`)
	].join('\n');
	const node = parseStatChartContent('barres', source);
	if (node.spec === null) {
		return {
			ok: false,
			message: node.errors[0]?.message.replace(LINE_PREFIX, '') ?? 'Diagramme impossible.'
		};
	}
	return { ok: true, node };
}
