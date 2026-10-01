/**
 * Bloc ```tableau-croise — analyse, scène, Typst.
 *
 * Spécification validée par David le 2026-10-01
 * (`docs/wip/outils-statistiques-progress.md`, lot 4).
 */

import { describe, it, expect, vi } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type CrossTableScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import * as crossTableModule from '$lib/statistics/cross-table';

vi.mock('$lib/statistics/cross-table', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/statistics/cross-table')>();
	return { ...original, crossTable: vi.fn(original.crossTable) };
});

// =============================================================================
// Helpers
// =============================================================================

const BASE = [
	'lignes: Fille ; Garçon',
	'colonnes: Externe ; Demi-pensionnaire',
	'Fille = 45 ; 120',
	'Garçon = 50 ; 110'
].join('\n');

function specOf(source: string) {
	const node = parseStatChartContent('tableau-croise', source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function errorOf(source: string) {
	const node = parseStatChartContent('tableau-croise', source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0];
}

function sceneOf(source: string, locale: 'fr' | 'en' = 'fr') {
	return buildStatChartScene(specOf(source), { locale }) as CrossTableScene;
}

/** Textes des cases, ligne par ligne (en-têtes de ligne compris) */
function texts(scene: CrossTableScene) {
	return scene.rows.map((row) => [row.header, ...row.cells.map((c) => c.text)]);
}

// =============================================================================
// Analyse
// =============================================================================

describe('tableau croisé — analyse', () => {
	it('lit lignes, colonnes et cases, avec leurs valeurs par défaut', () => {
		const table = specOf(BASE).table!;

		expect(table.rows).toEqual(['Fille', 'Garçon']);
		expect(table.columns).toEqual(['Externe', 'Demi-pensionnaire']);
		expect(table.cells).toEqual([
			[45, 120],
			[50, 110]
		]);
		expect(table.showTotals).toBe(true);
		expect(table.display).toBe('effectifs');
		expect(table.masked).toEqual([]);
		expect(table.corner).toBeNull();
	});

	it('les lignes de données peuvent venir dans n’importe quel ordre', () => {
		const source = BASE.split('\n');
		const table = specOf([source[0], source[1], source[3], source[2]].join('\n')).table!;

		expect(table.cells[0]).toEqual([45, 120]);
	});

	it('options : afficher, totaux, masquer, coin', () => {
		const table = specOf(
			`${BASE}\nafficher: frequences par ligne\ntotaux: non\nmasquer: Fille/Externe ; Garçon/Demi-pensionnaire\ncoin: Sexe \\ Régime`
		).table!;

		expect(table.display).toBe('fréquences par ligne');
		expect(table.showTotals).toBe(false);
		expect(table.masked).toEqual([
			{ row: 'Fille', column: 'Externe' },
			{ row: 'Garçon', column: 'Demi-pensionnaire' }
		]);
		expect(table.corner).toBe('Sexe \\ Régime');
	});

	it('« ? » : case inconnue et cachée', () => {
		expect(specOf(BASE.replace('110', '?')).table!.cells[1]).toEqual([50, null]);
	});

	it('noms hostiles acceptés tels quels', () => {
		const source = BASE.replace('Fille ; Garçon', 'F #1 $x$ ; "G" \\b')
			.replace('Fille =', 'F #1 $x$ =')
			.replace('Garçon =', '"G" \\b =');

		expect(specOf(source).table!.rows).toEqual(['F #1 $x$', '"G" \\b']);
	});
});

describe('tableau croisé — erreurs situées', () => {
	it('lignes: ou colonnes: absent', () => {
		expect(errorOf('colonnes: A ; B\nX = 1 ; 2').message).toMatch(/lignes/);
		expect(errorOf('lignes: X\nX = 1 ; 2').message).toMatch(/colonnes/);
	});

	it('ligne de données inconnue, en double, ou manquante', () => {
		expect(errorOf(`${BASE}\nAutre = 1 ; 2`).message).toMatch(/Autre/);
		expect(errorOf(`${BASE}\nFille = 1 ; 2`).message).toMatch(/Fille/);
		expect(errorOf(BASE.split('\n').slice(0, 3).join('\n')).message).toMatch(/Garçon/);
	});

	it('mauvais nombre de valeurs', () => {
		const error = errorOf(BASE.replace('45 ; 120', '45 ; 120 ; 3'));

		expect(error.line).toBe(3);
		expect(error.message).toMatch(/2 valeurs attendues, 3 reçues/);
	});

	it('nom en double, ou « Total » réservé', () => {
		expect(errorOf(BASE.replace('Fille ; Garçon', 'Fille ; Fille')).message).toMatch(/Fille/);
		expect(errorOf(BASE.replace('Externe ; Demi', 'Total ; Demi')).message).toMatch(/Total/);
	});

	it('masquer: une case qui n’existe pas, ou Total sans totaux', () => {
		expect(errorOf(`${BASE}\nmasquer: Fille/Interne`).message).toMatch(/Fille\/Interne/);
		expect(errorOf(`${BASE}\ntotaux: non\nmasquer: Total/Externe`).message).toMatch(/Total/);
	});

	it('au plus 8 lignes et 8 colonnes', () => {
		const names = Array.from({ length: 9 }, (_, i) => `L${i}`);
		const rows = names.map((n) => `${n} = 1`).join('\n');

		expect(errorOf(`lignes: ${names.join(' ; ')}\ncolonnes: C\n${rows}`).message).toMatch(/8/);
	});

	it('effectifs et pourcentages mélangés', () => {
		expect(errorOf(BASE.replace('120', '12 %')).message).toMatch(/mélang/);
	});

	it('fréquences impossibles avec une case « ? »', () => {
		expect(errorOf(`${BASE.replace('110', '?')}\nafficher: fréquences`).message).toMatch(/\?/);
	});

	it('fréquences d’un tableau tout nul', () => {
		const zeros = BASE.replace('45 ; 120', '0 ; 0').replace('50 ; 110', '0 ; 0');

		expect(errorOf(`${zeros}\nafficher: fréquences`).message).toMatch(/total nul/i);
	});

	// Revue du lot 4
	it('un nom ne peut pas contenir « / » (séparateur de masquer:)', () => {
		expect(errorOf(BASE.replace('Externe ; Demi-pensionnaire', 'km/h ; x')).message).toMatch(/\//);
	});

	it('doublon à la casse près', () => {
		expect(errorOf(BASE.replace('Fille ; Garçon', 'Fille ; fille')).message).toMatch(/fille/i);
	});

	it('masquer: « total » en minuscules désigne les totaux', () => {
		expect(specOf(`${BASE}\nmasquer: total/Externe`).table!.masked).toEqual([
			{ row: 'Total', column: 'Externe' }
		]);
	});

	it('taille: et description: ne s’appliquent pas à un tableau', () => {
		expect(errorOf(`${BASE}\ntaille: grande`).message).toMatch(/tableaux croisés/);
		expect(errorOf(`${BASE}\ndescription: Un tableau`).message).toMatch(/tableaux croisés/);
	});

	it('erreurs situées : ligne sans données, fréquences impossibles, total nul', () => {
		const missing = BASE.split('\n').slice(0, 3).join('\n');
		expect(errorOf(missing).line).toBe(1);
		expect(errorOf(`${BASE.replace('110', '?')}\nafficher: fréquences`).line).toBe(5);
		const zeros = BASE.replace('45 ; 120', '0 ; 0').replace('50 ; 110', '0 ; 0');
		expect(errorOf(`${zeros}\nafficher: fréquences`).line).toBe(5);
	});

	it('option d’un autre bloc', () => {
		expect(errorOf(`${BASE}\nvaleurs: oui`).message).toMatch(/tableaux croisés|barres/);
	});
});

// =============================================================================
// Scène
// =============================================================================

describe('tableau croisé — scène', () => {
	it('effectifs et totaux', () => {
		const scene = sceneOf(BASE);

		expect(scene.columnHeaders).toEqual(['Externe', 'Demi-pensionnaire', 'Total']);
		expect(texts(scene)).toEqual([
			['Fille', '45', '120', '165'],
			['Garçon', '50', '110', '160'],
			['Total', '95', '230', '325']
		]);
	});

	it('fréquences sur le total', () => {
		expect(texts(sceneOf(`${BASE}\nafficher: fréquences`))).toEqual([
			['Fille', '13,8 %', '36,9 %', '50,8 %'],
			['Garçon', '15,4 %', '33,8 %', '49,2 %'],
			['Total', '29,2 %', '70,8 %', '100 %']
		]);
	});

	it('fréquences par ligne', () => {
		expect(texts(sceneOf(`${BASE}\nafficher: fréquences par ligne`))).toEqual([
			['Fille', '27,3 %', '72,7 %', '100 %'],
			['Garçon', '31,3 %', '68,8 %', '100 %'],
			['Total', '29,2 %', '70,8 %', '100 %']
		]);
	});

	it('fréquences par colonne', () => {
		expect(texts(sceneOf(`${BASE}\nafficher: fréquences par colonne`))).toEqual([
			['Fille', '47,4 %', '52,2 %', '50,8 %'],
			['Garçon', '52,6 %', '47,8 %', '49,2 %'],
			['Total', '100 %', '100 %', '100 %']
		]);
	});

	it('anglais : point décimal', () => {
		expect(texts(sceneOf(`${BASE}\nafficher: fréquences`, 'en'))[0][1]).toBe('13.8 %');
	});

	it('masquer: cases vides et marquées, totaux exacts', () => {
		const scene = sceneOf(`${BASE}\nmasquer: Fille/Demi-pensionnaire ; Total/Total`);

		expect(scene.rows[0].cells[1]).toMatchObject({ text: '', hidden: true });
		expect(scene.rows[0].cells[2]).toMatchObject({ text: '165', hidden: false });
		expect(scene.rows[2].cells[2]).toMatchObject({ text: '', hidden: true });
	});

	it('« ? » : la case et les totaux qui en dépendent sont cachés', () => {
		const scene = sceneOf(BASE.replace('110', '?'));

		expect(texts(scene)).toEqual([
			['Fille', '45', '120', '165'],
			['Garçon', '50', '', ''],
			['Total', '95', '', '']
		]);
		expect(scene.rows[1].cells[1].hidden).toBe(true);
	});

	it('sans totaux : ni ligne ni colonne Total', () => {
		const scene = sceneOf(`${BASE}\ntotaux: non`);

		expect(scene.columnHeaders).toEqual(['Externe', 'Demi-pensionnaire']);
		expect(scene.rows.map((r) => r.header)).toEqual(['Fille', 'Garçon']);
	});

	it('titre et coin', () => {
		const scene = sceneOf(`${BASE}\ntitre: Régime des élèves\ncoin: Sexe \\ Régime`);

		expect(scene.title).toBe('Régime des élèves');
		expect(scene.corner).toBe('Sexe \\ Régime');
		expect(sceneOf(BASE).accessibleTitle).toBe('Tableau croisé');
	});

	// Audit a11y du lot 4 : textes lus dans la langue du document, et sans symbole muet
	it('textes accessibles selon la langue du document', () => {
		expect(sceneOf(BASE).hiddenLabel).toBe('case à compléter');
		expect(sceneOf(BASE, 'en').hiddenLabel).toBe('blank cell');
		expect(sceneOf(BASE, 'en').accessibleTitle).toBe('Contingency table');
	});

	it('fréquence non définie : « — » à l’écran, « non définie » au lecteur d’écran', () => {
		const zeros = BASE.replace('45 ; 120', '0 ; 0');
		const cell = sceneOf(`${zeros}\nafficher: fréquences par ligne`).rows[0].cells[0];

		expect(cell).toMatchObject({ text: '—', srText: 'non définie' });
	});

	it('coin « Sexe \\ Régime » lu comme « lignes : Sexe, colonnes : Régime »', () => {
		const scene = sceneOf(`${BASE}\ncoin: Sexe \\ Régime`);

		expect(scene.cornerSpoken).toBe('lignes : Sexe, colonnes : Régime');
		expect(sceneOf(`${BASE}\ncoin: Effectifs`).cornerSpoken).toBe('Effectifs');
	});

	it('les fréquences viennent du module statistique', () => {
		vi.mocked(crossTableModule.crossTable).mockClear();

		sceneOf(`${BASE}\nafficher: fréquences`);

		expect(crossTableModule.crossTable).toHaveBeenCalled();
	});
});

// =============================================================================
// Typst
// =============================================================================

describe('tableau croisé — Typst', () => {
	const count = (text: string, marker: string) => text.split(marker).length - 1;

	it('un tableau Typst, une case par cellule (en-têtes compris)', () => {
		const typst = generateStatChartTypst(parseStatChartContent('tableau-croise', BASE));

		expect(typst).toContain('#table(');
		// 4 lignes (en-tête + 2 + Total) × 4 colonnes (coin + 2 + Total)
		expect(count(typst, '// case')).toBe(16);
	});

	it('textes d’auteur en chaînes échappées ; case masquée vide', () => {
		const source = `${BASE.replace('Fille ; Garçon', 'F #1 $x$ ; Garçon').replace('Fille =', 'F #1 $x$ =')}\nmasquer: Garçon/Externe`;
		const typst = generateStatChartTypst(parseStatChartContent('tableau-croise', source));

		expect(typst).toContain('#"F #1 $x$"');
		// Témoin : sans `masquer:`, la case 50 est bien écrite
		const plain = generateStatChartTypst(parseStatChartContent('tableau-croise', BASE));
		expect(plain).toContain('#"50"');
		expect(typst).not.toContain('#"50"');
	});
});
