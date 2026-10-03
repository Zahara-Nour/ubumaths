/**
 * Bloc ```effectifs — le tableau de dépouillement (Q125-Q129, Q133), lot PR (a).
 *
 * Spécification validée par David le 2026-10-03 : données comme les autres
 * blocs, `lignes:` (effectifs, fréquences, cumulés), colonne Total, sens des
 * cumuls, horizontal jusqu'à 12 valeurs, langue de la fiche.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type FrequencyTableScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { parseMarkdown, type BlockNode, type ListNode } from '$lib/ubumark';
import type { StatChartNode } from '../../types/stat-chart';

// =============================================================================
// Helpers
// =============================================================================

const NOTES = 'données: 12 ; 15 ; 12 ; 8 ; 15 ; 12';

function specOf(source: string) {
	const node = parseStatChartContent('effectifs', source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function errorOf(source: string) {
	const node = parseStatChartContent('effectifs', source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0].message;
}

const tableOf = (source: string, locale: 'fr' | 'en' = 'fr') =>
	buildStatChartScene(specOf(source), { locale }) as FrequencyTableScene;

/** Le tableau tel qu'on le lit : en-tête, puis une ligne par grandeur */
const grid = (scene: FrequencyTableScene) => [
	[scene.valueHeader, ...scene.columns],
	...scene.rows.map((row) => [row.header, ...row.cells])
];

// =============================================================================
// Cas nominaux
// =============================================================================

describe('effectifs — le tableau', () => {
	it('l’exemple de la spécification', () => {
		expect(grid(tableOf(`${NOTES}\nlignes: effectifs ; fréquences ; effectifs cumulés`))).toEqual([
			['Valeur', '8', '12', '15', 'Total'],
			['Effectif', '1', '3', '2', '6'],
			['Fréquence', '16,7 %', '50 %', '33,3 %', '100 %'],
			['Effectif cumulé croissant', '1', '4', '6', '']
		]);
	});

	it('par défaut : les effectifs seulement, avec le total', () => {
		expect(grid(tableOf(NOTES))).toEqual([
			['Valeur', '8', '12', '15', 'Total'],
			['Effectif', '1', '3', '2', '6']
		]);
	});

	it('des lignes « valeur = effectif », dans l’ordre de l’auteur ; des mots', () => {
		expect(grid(tableOf('Bus = 3\nVélo = 1'))).toEqual([
			['Valeur', 'Bus', 'Vélo', 'Total'],
			['Effectif', '3', '1', '4']
		]);
	});

	it('des classes, écrites ou à partir de `classes:` + `données:`', () => {
		const written = tableOf('[0 ; 10[ = 4\n[10 ; 20[ = 6\nlignes: effectifs ; effectifs cumulés');
		expect(grid(written)).toEqual([
			['Classe', '[0 ; 10[', '[10 ; 20[', 'Total'],
			['Effectif', '4', '6', '10'],
			['Effectif cumulé croissant', '4', '10', '']
		]);
		expect(grid(tableOf('classes: 0 ; 10 ; 20\ndonnées: 3 ; 12 ; 15'))).toEqual([
			['Classe', '[0 ; 10[', '[10 ; 20[', 'Total'],
			['Effectif', '1', '2', '3']
		]);
	});

	it('fréquences décimales au centième ; total à 1', () => {
		expect(grid(tableOf(`${NOTES}\nlignes: fréquences\nfréquences: décimales`))[1]).toEqual([
			'Fréquence',
			'0,17',
			'0,50',
			'0,33',
			'1,00'
		]);
		// `fréquences: pourcentages` : le défaut, écrit
		expect(grid(tableOf(`${NOTES}\nlignes: fréquences\nfréquences: pourcentages`))[1][2]).toBe(
			'50 %'
		);
	});

	it('fréquences cumulées ; sens décroissant', () => {
		const scene = tableOf(
			`${NOTES}\nlignes: effectifs cumulés ; fréquences cumulées\nsens: décroissantes`
		);
		expect(grid(scene).slice(1)).toEqual([
			['Effectif cumulé décroissant', '6', '5', '2', ''],
			['Fréquence cumulée décroissante', '100 %', '83,3 %', '33,3 %', '']
		]);
	});

	it('`totaux: non` retire la colonne ; `titre:` légende le tableau', () => {
		const scene = tableOf(`titre: Notes\n${NOTES}\ntotaux: non`);
		expect(scene.columns).toEqual(['8', '12', '15']);
		expect(scene.caption).toBe('Notes');
		expect(tableOf(NOTES).caption).toBe('Tableau des effectifs');
	});

	it('horizontal jusqu’à 12 valeurs, vertical au-delà', () => {
		const values = (n: number) => `données: ${Array.from({ length: n }, (_, i) => i).join(' ; ')}`;
		expect(tableOf(values(12)).vertical).toBe(false);
		expect(tableOf(values(13)).vertical).toBe(true);
	});

	it('fiche en anglais (Q133)', () => {
		const scene = tableOf(`${NOTES}\nlignes: effectifs ; fréquences ; effectifs cumulés`, 'en');
		expect(grid(scene).map((row) => row[0])).toEqual([
			'Value',
			'Frequency',
			'Relative frequency',
			'Cumulative frequency'
		]);
		expect(scene.rows[1].cells[0]).toBe('16.7%');
		expect(scene.caption).toBe('Frequency table');
		expect(scene.columns.at(-1)).toBe('Total');
		const down = tableOf(
			`${NOTES}\nlignes: effectifs cumulés ; fréquences cumulées\nsens: décroissantes`,
			'en'
		);
		expect(down.rows.map((r) => r.header)).toEqual([
			'Decreasing cumulative frequency',
			'Decreasing cumulative relative frequency'
		]);
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('effectifs — Typst', () => {
	it('les mêmes cases qu’à l’écran, dans l’ordre', () => {
		const source = `${NOTES}\nlignes: effectifs ; fréquences ; effectifs cumulés`;
		const typst = generateStatChartTypst(parseStatChartContent('effectifs', source));
		const cells = [
			...typst.matchAll(/^ {2}(?:text\(weight: "bold"\))?\[#"((?:[^"\\]|\\.)*)"\]/gm)
		].map(
			// Espaces insécables dans le PDF (« 100 % » ne se coupe pas) : même texte
			(m) => m[1].replace(/\u00a0/g, ' ')
		);

		expect(typst).toContain('#table(');
		expect(typst).toContain('hyphenate: false');
		expect(cells).toEqual(grid(tableOf(source)).flat());
	});

	it('dans un document : reconnu au premier niveau et dans une liste', () => {
		const block = ['```effectifs', NOTES, '```'];
		const top = parseMarkdown(['Avant.', '', ...block, '', 'Après.'].join('\n'));
		const list = parseMarkdown(
			['1. Compléter :', '', ...block.map((l) => `   ${l}`), '2. Suite.'].join('\n')
		).children[0] as ListNode;
		const charts = (children: BlockNode[]) =>
			children.filter((c): c is StatChartNode => c.type === 'stat-chart').map((c) => c.kind);

		expect(charts(top.children)).toEqual(['effectifs']);
		expect(charts(list.items[0].children as BlockNode[])).toEqual(['effectifs']);
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('effectifs — erreurs situées', () => {
	it('une ligne cumulée avec des mots', () => {
		expect(errorOf('Bus = 3\nVélo = 1\nlignes: effectifs cumulés')).toBe(
			'Ligne 3 : effectifs cumulés : seulement pour des nombres ou des classes'
		);
	});

	it('des valeurs dans le désordre avec un cumul (revue : cumul faux)', () => {
		expect(errorOf('15 = 2\n8 = 1\n12 = 3\nlignes: effectifs cumulés')).toBe(
			"Ligne 2 : effectifs cumulés : écrire les valeurs dans l'ordre croissant (8 après 15)"
		);
		// Sans cumul : l'ordre de l'auteur reste libre
		expect(grid(tableOf('15 = 2\n8 = 1'))[0]).toEqual(['Valeur', '15', '8', 'Total']);
		// Vrai signe moins accepté (lecture de l'atelier)
		expect(grid(tableOf('−3 = 1\n2 = 1\nlignes: effectifs cumulés'))[1]).toEqual([
			'Effectif cumulé croissant',
			'1',
			'2',
			''
		]);
	});

	it('un effectif total nul', () => {
		expect(errorOf('A = 0\nB = 0\nlignes: fréquences')).toBe(
			'Ligne 1 : effectif total nul : rien à dépouiller'
		);
	});

	it('`classes:` avec des lignes [a ; b[ : un message qui le dit', () => {
		expect(errorOf('classes: 0 ; 10 ; 20\n[0 ; 10[ = 4')).toBe(
			'Ligne 1 : classes : inutile, les lignes [a ; b[ donnent déjà les classes'
		);
	});

	it('des pourcentages', () => {
		expect(errorOf('A = 35 %\nB = 65 %')).toBe(
			'Ligne 1 : écrire des effectifs, pas des pourcentages'
		);
	});

	it('`lignes:` : une ligne inconnue ou donnée deux fois', () => {
		expect(errorOf(`${NOTES}\nlignes: effectifs ; moyennes`)).toBe(
			'Ligne 2 : lignes : « moyennes » inconnue (choisir : effectifs, fréquences, effectifs cumulés, fréquences cumulées)'
		);
		expect(errorOf(`${NOTES}\nlignes: effectifs ; effectifs`)).toBe(
			'Ligne 2 : lignes : « effectifs » donnée deux fois'
		);
	});

	it('`sens:` sans ligne cumulée ; `fréquences:` sans ligne de fréquences', () => {
		expect(errorOf(`${NOTES}\nsens: décroissantes`)).toBe(
			'Ligne 2 : sens : seulement avec une ligne cumulée'
		);
		expect(errorOf(`${NOTES}\nfréquences: décimales`)).toBe(
			'Ligne 2 : fréquences : seulement avec une ligne de fréquences'
		);
	});

	it('mélange de classes et de valeurs ; deux séries', () => {
		expect(errorOf('[0 ; 10[ = 4\n12 = 3')).toBe(
			'Ligne 2 : écrire toutes les lignes en classes [a ; b[, ou aucune'
		);
		expect(errorOf('données A: 1\ndonnées B: 2')).toBe(
			'Ligne 1 : une seule série par tableau d’effectifs'
		);
	});
});
