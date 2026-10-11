/**
 * Blocs ```barres et ```circulaire — analyse du texte.
 *
 * Spécification validée par David le 2026-10-01
 * (`docs/archive/wip/outils-statistiques-progress.md`, lot 2).
 */

import { describe, it, expect } from 'vitest';
import {
	findStatChartBlocks,
	isStatChartBlockStart,
	parseStatChart,
	parseStatChartContent
} from '../../parser/stat-chart-parser';
import { STAT_CHART_LIMITS, type StatChartKind } from '../../types/stat-chart';

// =============================================================================
// Helpers
// =============================================================================

function specOf(kind: StatChartKind, source: string) {
	const node = parseStatChartContent(kind, source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function errorsOf(kind: StatChartKind, source: string) {
	const node = parseStatChartContent(kind, source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors;
}

const SPORTS = ['titre: Sport préféré', 'Football = 12', 'Natation = 8', 'Danse = 7'].join('\n');

// =============================================================================
// Détection
// =============================================================================

describe('repérer les blocs', () => {
	it('reconnaît ```barres et ```circulaire, et seulement eux', () => {
		expect(isStatChartBlockStart('```barres')).toBe('barres');
		expect(isStatChartBlockStart('```circulaire  ')).toBe('circulaire');
		expect(isStatChartBlockStart('```courbe')).toBeNull();
		expect(isStatChartBlockStart('```barresX')).toBeNull();
	});

	it('trouve un bloc fermé avec son type', () => {
		const lines = ['Texte', '```circulaire', 'A = 1', '```', 'Suite'];

		expect(findStatChartBlocks(lines)).toEqual([
			{ kind: 'circulaire', startIndex: 1, endIndex: 3, closed: true }
		]);
	});

	it('un bloc non fermé n’avale pas la suite du document, et le dit', () => {
		const lines = ['```barres', 'A = 1', 'B = 2', '', 'Un paragraphe ordinaire.'];
		const [range] = findStatChartBlocks(lines);

		expect(range.endIndex).toBe(2);
		const node = parseStatChart(lines, range.startIndex, range.endIndex);
		expect(node.spec).toBeNull();
		expect(node.errors.some((e) => /non fermé/.test(e.message))).toBe(true);
	});
});

// =============================================================================
// Cas nominal
// =============================================================================

describe('lire un bloc valide', () => {
	it('garde les catégories dans l’ordre écrit, avec leur ligne', () => {
		const spec = specOf('barres', SPORTS);

		expect(spec.data).toEqual([
			{ label: 'Football', value: 12, interval: null, line: 2 },
			{ label: 'Natation', value: 8, interval: null, line: 3 },
			{ label: 'Danse', value: 7, interval: null, line: 4 }
		]);
		expect(spec.unit).toBe('effectifs');
		expect(spec.title).toBe('Sport préféré');
	});

	it('valeurs par défaut', () => {
		const spec = specOf('barres', 'A = 1');

		expect(spec.size).toBe('moyenne');
		expect(spec.showValues).toBe(false);
		expect(spec.color).toBe('bleu');
		expect(spec.labels).toBe('pourcentages');
		expect(spec.axes).toEqual({ x: null, y: null });
		expect(spec.title).toBeNull();
		expect(spec.description).toBeNull();
	});

	it('lit toutes les options des barres', () => {
		const spec = specOf(
			'barres',
			[
				'axes: Sport ; Nombre d’élèves',
				'taille: grande',
				'valeurs: oui',
				'couleur: rouge',
				'description: Le football domine.',
				'A = 1'
			].join('\n')
		);

		expect(spec.axes).toEqual({ x: 'Sport', y: 'Nombre d’élèves' });
		expect(spec.size).toBe('grande');
		expect(spec.showValues).toBe(true);
		expect(spec.color).toBe('rouge');
		expect(spec.description).toBe('Le football domine.');
	});

	it('lit étiquettes:, avec ou sans accent', () => {
		expect(specOf('circulaire', 'étiquettes: angles\nA = 1').labels).toBe('angles');
		expect(specOf('circulaire', 'etiquettes: effectifs\nA = 1').labels).toBe('effectifs');
	});

	it('accepte la virgule et le point décimaux dans des pourcentages', () => {
		const spec = specOf('circulaire', 'A = 12,5 %\nB = 37.5%\nC = 50 %');

		expect(spec.unit).toBe('pourcentages');
		expect(spec.data.map((d) => d.value)).toEqual([12.5, 37.5, 50]);
	});

	it('une option l’emporte sur une ligne qui pourrait être une catégorie', () => {
		const spec = specOf('barres', 'titre: Score = 3\nA = 1');

		expect(spec.title).toBe('Score = 3');
		expect(spec.data).toHaveLength(1);
	});

	it('une clé inconnue suivie de « = » est une catégorie', () => {
		const spec = specOf('barres', 'Sport: Foot = 3');

		expect(spec.data[0]).toMatchObject({ label: 'Sport: Foot', value: 3 });
	});

	it('accepte un effectif nul', () => {
		expect(specOf('barres', 'A = 0\nB = 2').data[0].value).toBe(0);
		expect(specOf('circulaire', 'A = 0\nB = 2').data[0].value).toBe(0);
	});

	it('garde tels quels des noms qui contiennent # $ * " \\', () => {
		const label = 'Mot #1 *a* $x$ "b" \\c';
		expect(specOf('barres', `${label} = 4`).data[0].label).toBe(label);
	});

	it('ignore les lignes vides', () => {
		expect(specOf('barres', '\nA = 1\n\nB = 2\n').data).toHaveLength(2);
	});

	it('accepte des pourcentages qui font 100 à 0,5 près (33,3 ; 33,3 ; 33,4)', () => {
		expect(specOf('circulaire', 'A = 33,3 %\nB = 33,3 %\nC = 33,4 %').data).toHaveLength(3);
	});

	it('ne contrôle pas la somme des pourcentages d’un diagramme en barres', () => {
		expect(specOf('barres', 'A = 20 %\nB = 30 %').unit).toBe('pourcentages');
	});
});

// =============================================================================
// Erreurs d'auteur
// =============================================================================

describe('erreurs situées', () => {
	it('option inconnue', () => {
		const [error] = errorsOf('barres', 'A = 1\ncoleur: rouge');

		expect(error.line).toBe(2);
		expect(error.message).toMatch(/coleur/);
	});

	it('ligne sans « = »', () => {
		const [error] = errorsOf('barres', 'Football 12');

		expect(error.line).toBe(1);
		expect(error.message).toMatch(/=/);
	});

	it('« Vélo : 3 » : la piste du signe =, pas « option inconnue »', () => {
		const [error] = errorsOf('barres', 'Vélo : 3');

		expect(error.message).toMatch(/Vélo = 3/);
		expect(error.message).not.toMatch(/option/);
	});

	it('effectif non entier, avec la piste du séparateur', () => {
		const [error] = errorsOf('barres', 'Fille = 45,120');

		expect(error.message).toMatch(/entier/);
		expect(error.message).toContain('45,12');
	});

	it('effectif illisible (variable de modèle non remplacée)', () => {
		expect(errorsOf('barres', 'A = {{n}}')[0].message).toMatch(/\{\{n\}\}/);
	});

	it('effectif négatif', () => {
		expect(errorsOf('barres', 'A = -3')[0].message).toMatch(/négatif|positif/);
	});

	it('effectifs et pourcentages mélangés', () => {
		const [error] = errorsOf('barres', 'A = 12\nB = 30 %');

		expect(error.line).toBe(2);
		expect(error.message).toMatch(/mélang/);
	});

	it('catégorie en double', () => {
		const [error] = errorsOf('barres', 'A = 1\nB = 2\nA = 3');

		expect(error.line).toBe(3);
		expect(error.message).toMatch(/« A »/);
	});

	it('aucune donnée', () => {
		expect(errorsOf('barres', 'titre: Vide')[0].message).toMatch(/aucune donnée/i);
	});

	it('circulaire de total nul', () => {
		expect(errorsOf('circulaire', 'A = 0\nB = 0')[0].message).toMatch(/total nul/i);
	});

	it('circulaire en pourcentages dont la somme ne fait pas 100', () => {
		expect(errorsOf('circulaire', 'A = 50 %\nB = 42 %')[0].message).toMatch(/92/);
	});

	it('option réservée à l’autre diagramme', () => {
		expect(errorsOf('circulaire', 'axes: A ; B\nA = 1')[0].message).toMatch(/barres/);
		expect(errorsOf('barres', 'étiquettes: angles\nA = 1')[0].message).toMatch(/circulaire/);
	});

	it('valeur d’option invalide', () => {
		expect(errorsOf('barres', 'taille: immense\nA = 1')[0].message).toMatch(/immense/);
		expect(errorsOf('barres', 'couleur: fuchsia\nA = 1')[0].message).toMatch(/fuchsia/);
		expect(errorsOf('barres', 'valeurs: peut-être\nA = 1')[0].message).toMatch(/oui/);
	});

	it('option donnée deux fois', () => {
		expect(errorsOf('barres', 'titre: A\ntitre: B\nX = 1')[0].line).toBe(2);
	});

	it('catégorie sans nom', () => {
		expect(errorsOf('barres', ' = 4')[0].line).toBe(1);
	});

	it('nom de catégorie trop long', () => {
		const long = 'x'.repeat(STAT_CHART_LIMITS.labelLength + 1);

		expect(errorsOf('barres', `${long} = 1`)[0].message).toMatch(/40/);
	});

	it(`au plus ${STAT_CHART_LIMITS.barCategories} barres et ${STAT_CHART_LIMITS.pieSectors} secteurs`, () => {
		const lines = (n: number) => Array.from({ length: n }, (_, i) => `C${i} = 1`).join('\n');

		expect(errorsOf('barres', lines(STAT_CHART_LIMITS.barCategories + 1))[0].message).toMatch(/30/);
		expect(errorsOf('circulaire', lines(STAT_CHART_LIMITS.pieSectors + 1))[0].message).toMatch(
			/12/
		);
		expect(
			parseStatChartContent('barres', lines(STAT_CHART_LIMITS.barCategories)).spec
		).not.toBeNull();
	});

	it('effectif démesuré', () => {
		expect(errorsOf('barres', 'A = 10000000000')[0].message).toMatch(/grand/);
	});

	it('rapporte toutes les erreurs, pas seulement la première', () => {
		expect(errorsOf('barres', 'A = -1\nB 2\nC = x')).toHaveLength(3);
	});
});
