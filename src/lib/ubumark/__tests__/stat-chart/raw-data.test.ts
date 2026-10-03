/**
 * `données:` dans les blocs ```barres et ```circulaire (v2, lot 4 PR a) : le
 * bloc dépouille lui-même la série brute.
 *
 * Spécification validée par David le 2026-10-03 (Q100-Q103, Q105).
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { describeList } from '$lib/statistics/describe';
import { formatApproxValue } from '$lib/statistics/format';
import type { StatChartKind } from '../../types/stat-chart';

// =============================================================================
// Helpers
// =============================================================================

function specOf(source: string, kind: StatChartKind = 'barres') {
	const node = parseStatChartContent(kind, source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function errorOf(source: string, kind: StatChartKind = 'barres') {
	const node = parseStatChartContent(kind, source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0].message;
}

/** Catégories et effectifs, dans l'ordre du diagramme */
const tally = (source: string, kind: StatChartKind = 'barres') =>
	specOf(source, kind).data.map((d) => [d.label, d.value]);

// =============================================================================
// Dépouillement
// =============================================================================

describe('données — dépouillement', () => {
	it('des nombres : effectifs par valeur, dans l’ordre croissant', () => {
		expect(tally('données: 12 ; 15 ; 12 ; 8')).toEqual([
			['8', 1],
			['12', 2],
			['15', 1]
		]);
	});

	it('décimaux et négatifs triés comme des nombres ; même valeur écrite autrement', () => {
		expect(tally('données: 12,5 ; −3 ; 2 ; 12,50 ; 10')).toEqual([
			['-3', 1],
			['2', 1],
			['10', 1],
			['12,5', 2]
		]);
	});

	it('des mots : sans la casse, accents comptés, première écriture et ordre d’apparition', () => {
		expect(tally('données: Bus ; vélo ; bus ; Vélo ; À pied ; velo')).toEqual([
			['Bus', 2],
			['vélo', 2],
			['À pied', 1],
			['velo', 1]
		]);
	});

	it('nombres et mots mélangés : série qualitative, ordre d’apparition', () => {
		expect(tally('données: 12 ; Bus ; 3 ; 12')).toEqual([
			['12', 2],
			['Bus', 1],
			['3', 1]
		]);
	});

	it('lus comme dans l’atelier (Q92) : +3, 1e3, 0012, -0, fractions ; noms récrits', () => {
		expect(tally('données: +3 ; 2 ; 1e3 ; 0012 ; 12')).toEqual([
			['2', 1],
			['3', 1],
			['12', 2],
			['1000', 1]
		]);
		expect(tally('données: -0 ; 0 ; 12,50 ; 12,5')).toEqual([
			['0', 2],
			['12,5', 2]
		]);
		// Des nombres : ordre croissant, et 1/2 = 0,5 = 2/4
		expect(tally('données: 1/2 ; 1/4 ; 0,5 ; +2/4')).toEqual([
			['1/4', 1],
			['1/2', 3]
		]);
	});

	it('une modalité garde son écriture : vrai signe moins, accents composés (NFC)', () => {
		expect(tally('données: A−B ; A−B')).toEqual([['A−B', 2]]);
		expect(tally(`données: ${'e\u0301t\u00e9'} ; ${'\u00e9t\u00e9'}`)).toEqual([
			['e\u0301t\u00e9', 2]
		]);
	});

	it('plusieurs lignes `données:` mises bout à bout ; point-virgule final permis', () => {
		expect(tally('données: 1 ; 2 ;\ndonnées: 2 ; 3')).toEqual([
			['1', 1],
			['2', 2],
			['3', 1]
		]);
	});

	it('diagramme circulaire : même dépouillement', () => {
		expect(tally('données: Bus ; Vélo ; Bus', 'circulaire')).toEqual([
			['Bus', 2],
			['Vélo', 1]
		]);
	});

	it('les options gardent leur sens', () => {
		const spec = specOf('titre: Notes\ndonnées: 8 ; 12\nvaleurs: oui');

		expect(spec.title).toBe('Notes');
		expect(spec.showValues).toBe(true);
		expect(spec.unit).toBe('effectifs');
	});
});

// =============================================================================
// Indicateurs
// =============================================================================

describe('données — indicateurs calculés sur la série brute', () => {
	it('moyenne, médiane, quartiles : ceux du module statistique', () => {
		const raw = [8, 12, 12, 15, 20, 9, 14];
		const scene = buildStatChartScene(
			specOf(`données: ${raw.join(' ; ')}\nindicateurs: moyenne ; médiane ; quartiles`)
		);
		const s = describeList(raw)!;
		const v = (x: number) => formatApproxValue(x, 'fr');

		expect(scene.indicators).toEqual([
			`Moyenne ${v(s.mean)}`,
			`Médiane ${v(s.median)}`,
			`Q1 ${v(s.q1)}`,
			`Q3 ${v(s.q3)}`
		]);
	});

	it('décimaux, signe moins, série paire, fractions : ceux du module statistique', () => {
		const raw = [12.5, -3, 12.5, 2, 10, 0.25];
		const scene = buildStatChartScene(
			specOf(
				'données: 12,50 ; −3 ; 12,5 ; 2 ; 10 ; 1/4\nindicateurs: moyenne ; médiane ; quartiles'
			)
		);
		const s = describeList(raw)!;
		const v = (x: number) => formatApproxValue(x, 'fr');

		expect(scene.indicators).toEqual([
			`Moyenne ${v(s.mean)}`,
			`Médiane ${v(s.median)}`,
			`Q1 ${v(s.q1)}`,
			`Q3 ${v(s.q3)}`
		]);
	});

	it('une série qualitative refuse les indicateurs (message habituel)', () => {
		expect(errorOf('données: Bus ; Vélo\nindicateurs: moyenne')).toMatch(
			/toutes les catégories doivent être des nombres/
		);
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('données — Typst', () => {
	it('les effectifs dépouillés sont ceux du PDF', () => {
		const typst = generateStatChartTypst(
			parseStatChartContent('barres', 'données: 12 ; 15 ; 12 ; 8\nvaleurs: oui')
		);

		expect(typst).not.toContain('Figure indisponible');
		// Catégories dans l'ordre croissant, et les effectifs écrits dans cet ordre
		const at = (text: string) => typst.indexOf(`[#"${text}"]`);
		expect(at('8')).toBeGreaterThan(-1);
		expect(at('8')).toBeLessThan(at('12'));
		expect(at('12')).toBeLessThan(at('15'));
		const values = [...typst.matchAll(/anchor: "south", text\(size: [\d.]+pt\)\[#"(\d+)"\]/g)].map(
			(m) => m[1]
		);
		expect(values).toEqual(['1', '2', '1']);
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('données — erreurs situées', () => {
	it('données et lignes « catégorie = effectif » : pas les deux', () => {
		const message = 'soit les données, soit les effectifs (catégorie = effectif), pas les deux';
		expect(errorOf('données: 1 ; 2\nA = 3')).toBe(`Ligne 2 : ${message}`);
		expect(errorOf('A = 3\ndonnées: 1 ; 2')).toBe(`Ligne 2 : ${message}`);
	});

	it('au plus 500 valeurs : 500 passent, 501 non', () => {
		const many = (n: number) => Array.from({ length: n }, (_, i) => i % 5).join(' ; ');
		expect(specOf(`données: ${many(500)}`).data).toHaveLength(5);
		expect(errorOf(`données: ${many(501)}`)).toBe(
			'Ligne 1 : données : au plus 500 valeurs (ici 501)'
		);
	});

	it('valeurs différentes : 30 barres et 12 secteurs passent, une de plus non', () => {
		const distinct = (n: number) => Array.from({ length: n }, (_, i) => i).join(' ; ');
		expect(specOf(`données: ${distinct(30)}`).data).toHaveLength(30);
		expect(errorOf(`données: ${distinct(31)}`)).toBe(
			'Ligne 1 : données : 31 valeurs différentes, au plus 30 barres'
		);
		expect(specOf(`données: ${distinct(12)}`, 'circulaire').data).toHaveLength(12);
		expect(errorOf(`données: ${distinct(13)}`, 'circulaire')).toBe(
			'Ligne 1 : données : 13 valeurs différentes, au plus 12 secteurs'
		);
	});

	it('l’erreur pointe la bonne ligne `données:`', () => {
		expect(errorOf(`titre: T\ndonnées: a ; b\n\ndonnées: ${'x'.repeat(41)}`)).toMatch(
			/^Ligne 4 : nom de catégorie trop long/
		);
		expect(errorOf('données: 1 ; 2\ndonnées: 3 ; ; 4')).toBe(
			'Ligne 2 : valeur vide (un « ; » de trop ?)'
		);
	});

	it('valeur vide, ligne sans valeur, modalité trop longue', () => {
		expect(errorOf('données: 12 ; ; 15')).toBe('Ligne 1 : valeur vide (un « ; » de trop ?)');
		expect(errorOf('données:')).toBe('Ligne 1 : données : aucune valeur');
		expect(errorOf(`données: ${'x'.repeat(41)}`)).toMatch(/^Ligne 1 : .*trop long/);
	});

	it('des virgules pour séparer : la correction montrée ; 12,5 reste un décimal', () => {
		expect(errorOf('données: 12, 15, 8')).toBe(
			'Ligne 1 : séparer les valeurs par des points-virgules : 12 ; 15 ; 8'
		);
		expect(errorOf('données: fille, garçon')).toBe(
			'Ligne 1 : séparer les valeurs par des points-virgules : fille ; garçon'
		);
		// Mélanges et fractions : refusés aussi ; un décimal n'est pas coupé
		expect(errorOf('données: 12, Bus')).toBe(
			'Ligne 1 : séparer les valeurs par des points-virgules : 12 ; Bus'
		);
		expect(errorOf('données: 1/2, 1/4')).toBe(
			'Ligne 1 : séparer les valeurs par des points-virgules : 1/2 ; 1/4'
		);
		expect(errorOf('données: 12,5, 13')).toBe(
			'Ligne 1 : séparer les valeurs par des points-virgules : 12,5 ; 13'
		);
		expect(tally('données: 12,5 ; 3')).toEqual([
			['3', 1],
			['12,5', 1]
		]);
	});

	it('refusé dans un tableau croisé, une loi, une simulation', () => {
		for (const kind of ['tableau-croise', 'loi', 'simulation'] as const) {
			expect(errorOf('données: 1 ; 2', kind)).toMatch(/« données » ne s'applique pas aux/);
		}
	});
});
