/**
 * `données:` + `classes:` dans ```histogramme et ```frequences-cumulees
 * (v2, lot 4 PR b) : le bloc range la série brute dans ses classes.
 *
 * Spécification validée par David le 2026-10-03 (Q104, Q105) : moyenne et
 * médiane EXACTES (série brute) ; la lecture graphique du polygone reste une
 * lecture ; pas d'autres indicateurs ouverts.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type HistogramScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { describeList } from '$lib/statistics/describe';
import { formatApproxValue } from '$lib/statistics/format';
import type { StatChartKind } from '../../types/stat-chart';

// =============================================================================
// Helpers
// =============================================================================

const NOTES = [12, 3, 17, 5, 9, 14, 0, 19.5, 10, 7];
const BLOCK = `classes: 0 ; 5 ; 10 ; 15 ; 20\ndonnées: ${NOTES.join(' ; ').replaceAll('.', ',')}`;

function specOf(source: string, kind: StatChartKind = 'histogramme') {
	const node = parseStatChartContent(kind, source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function errorOf(source: string, kind: StatChartKind = 'histogramme') {
	const node = parseStatChartContent(kind, source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0].message;
}

const tally = (source: string, kind: StatChartKind = 'histogramme') =>
	specOf(source, kind).data.map((d) => [d.label, d.value]);

const v = (x: number) => formatApproxValue(x, 'fr');

// =============================================================================
// Rangement
// =============================================================================

describe('données + classes — rangement', () => {
	it('chaque valeur dans sa classe [a ; b[ : 5 va dans [5 ; 10[', () => {
		expect(tally(BLOCK)).toEqual([
			['[0 ; 5[', 2],
			['[5 ; 10[', 3],
			['[10 ; 15[', 3],
			['[15 ; 20[', 2]
		]);
	});

	it('mêmes classes, mêmes bornes que les lignes « [a ; b[ = effectif »', () => {
		const written = specOf('[0 ; 5[ = 2\n[5 ; 10[ = 3\n[10 ; 15[ = 3\n[15 ; 20[ = 2');

		expect(specOf(BLOCK).data.map((d) => [d.label, d.value, d.interval])).toEqual(
			written.data.map((d) => [d.label, d.value, d.interval])
		);
	});

	it('une classe vide reste une classe d’effectif 0 ; classes décimales', () => {
		expect(tally('classes: 0 ; 2,5 ; 5 ; 7,5\ndonnées: 1 ; 6 ; 7')).toEqual([
			['[0 ; 2,5[', 1],
			['[2,5 ; 5[', 0],
			['[5 ; 7,5[', 2]
		]);
	});

	it('polygone des fréquences cumulées : même rangement, lecture inchangée', () => {
		const spec = specOf(`${BLOCK}\nlecture: médiane`, 'frequences-cumulees');

		expect(spec.data.map((d) => d.value)).toEqual([2, 3, 3, 2]);
		expect(spec.reading).toBe('médiane');
	});

	it('plusieurs lignes `données:`, l’ordre des options est libre', () => {
		expect(tally('données: 1 ; 6\nclasses: 0 ; 5 ; 10\ndonnées: 7')).toEqual([
			['[0 ; 5[', 1],
			['[5 ; 10[', 2]
		]);
	});
});

// =============================================================================
// Indicateurs
// =============================================================================

describe('données + classes — indicateurs', () => {
	it('moyenne et médiane EXACTES, sur la série brute', () => {
		const scene = buildStatChartScene(specOf(`${BLOCK}\nindicateurs: moyenne ; médiane`));
		const s = describeList(NOTES)!;

		expect(scene.indicators).toEqual([`Moyenne ${v(s.mean)}`, `Médiane ${v(s.median)}`]);
	});

	it('sans `données:`, toujours estimées à partir des classes (inchangé)', () => {
		const scene = buildStatChartScene(specOf('[0 ; 10[ = 1\n[10 ; 20[ = 1\nindicateurs: moyenne'));

		expect(scene.indicators).toEqual([`Moyenne ${v(10)}`]);
	});

	it('classe médiane et effectif : inchangés ; autres indicateurs toujours refusés', () => {
		const scene = buildStatChartScene(specOf(`${BLOCK}\nindicateurs: effectif ; classe médiane`));

		expect(scene.indicators).toEqual(['Effectif total : 10', 'Classe médiane : [5 ; 10[']);
		expect(errorOf(`${BLOCK}\nindicateurs: quartiles`)).toMatch(
			/non disponible pour une série en classes/
		);
	});

	it('classe médiane : celle qui contient la médiane exacte (Q109)', () => {
		const scene = buildStatChartScene(
			specOf('classes: 0 ; 5 ; 10\ndonnées: 4 ; 6\nindicateurs: médiane ; classe médiane')
		);

		expect(scene.indicators).toEqual(['Médiane = 5', 'Classe médiane : [5 ; 10[']);
		// Sans série brute : la règle des 50 % reste la même
		const written = buildStatChartScene(
			specOf('[0 ; 5[ = 1\n[5 ; 10[ = 1\nindicateurs: classe médiane')
		);
		expect(written.indicators).toEqual(['Classe médiane : [0 ; 5[']);
	});

	it('polygone : la médiane exacte à côté de la lecture graphique', () => {
		const scene = buildStatChartScene(
			specOf(`${BLOCK}\nlecture: médiane\nindicateurs: médiane`, 'frequences-cumulees')
		);

		expect(scene.indicators).toEqual([`Médiane ${v(describeList(NOTES)!.median)}`]);
		expect((scene as { readings: unknown[] }).readings).toHaveLength(1);
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('données + classes — Typst', () => {
	it('mêmes effectifs et mêmes indicateurs qu’à l’écran', () => {
		const source = `${BLOCK}\nvaleurs: oui\nindicateurs: moyenne`;
		const scene = buildStatChartScene(specOf(source)) as HistogramScene;
		const typst = generateStatChartTypst(parseStatChartContent('histogramme', source));

		expect(typst).not.toContain('Figure indisponible');
		const values = [...typst.matchAll(/anchor: "south", text\(size: [\d.]+pt\)\[#"(\d+)"\]/g)].map(
			(m) => m[1]
		);
		expect(values).toEqual(scene.rects.map((r) => r.valueLabel));
		expect(values).toEqual(['2', '3', '3', '2']);
		expect(typst).toContain(scene.indicators[0]);
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('données + classes — erreurs situées', () => {
	it('valeur hors des classes, nommée, avec la classe en cause', () => {
		expect(errorOf('classes: 0 ; 5 ; 10 ; 15 ; 20\ndonnées: 12 ; 20')).toBe(
			'Ligne 2 : 20 sort des classes : la dernière est [15 ; 20[ (ajouter une borne, par exemple 25)'
		);
		expect(errorOf('classes: 0 ; 5 ; 10\ndonnées: 3 ; -1')).toBe(
			'Ligne 2 : −1 sort des classes : la première est [0 ; 5['
		);
	});

	it('bornes décimales et négatives : valeur pile sur une borne, borne suggérée exacte', () => {
		// 3/10 = 0,3 pile sur la borne : dans [0,3 ; 0,4[
		expect(tally('classes: 0,1 ; 0,2 ; 0,3 ; 0,4\ndonnées: 0,1 ; 3/10 ; 0,2')).toEqual([
			['[0,1 ; 0,2[', 1],
			['[0,2 ; 0,3[', 1],
			['[0,3 ; 0,4[', 1]
		]);
		expect(errorOf('classes: 0,1 ; 0,2 ; 0,3\ndonnées: 0,35')).toBe(
			'Ligne 2 : 0,35 sort des classes : la dernière est [0,2 ; 0,3[ (ajouter une borne, par exemple 0,4)'
		);
		expect(tally('classes: −10 ; −5 ; 0\ndonnées: −10 ; −5 ; −0,5')).toEqual([
			['[-10 ; -5[', 1],
			['[-5 ; 0[', 2]
		]);
	});

	it('valeur qui n’est pas un nombre', () => {
		expect(errorOf('classes: 0 ; 5\ndonnées: 3 ; Bus')).toBe(
			'Ligne 2 : « Bus » n’est pas un nombre : un histogramme demande des nombres'
		);
	});

	it('classes mal formées', () => {
		expect(errorOf('classes: 0 ; 5 ; 5 ; 10\ndonnées: 1')).toBe(
			'Ligne 1 : classes : les bornes doivent croître (5 puis 5)'
		);
		expect(errorOf('classes: 0 ; 10 ; 5\ndonnées: 1')).toBe(
			'Ligne 1 : classes : les bornes doivent croître (10 puis 5)'
		);
		expect(errorOf('classes: 0\ndonnées: 1')).toBe(
			'Ligne 1 : classes : au moins deux bornes (classes: 0 ; 5 ; 10)'
		);
		const bounds = Array.from({ length: 22 }, (_, i) => i).join(' ; ');
		expect(errorOf(`classes: ${bounds}\ndonnées: 1`)).toBe(
			'Ligne 1 : classes : au plus 20 classes (ici 21)'
		);
		expect(errorOf('classes: 0 ; cinq\ndonnées: 1')).toMatch(/^Ligne 1 : classes : « cinq »/);
		// Le message cite la borne écrite, pas une classe reconstituée
		expect(errorOf('classes: 0 ; 0,12345\ndonnées: 0')).toBe(
			'Ligne 1 : classes : au plus 4 décimales dans une borne (0,12345)'
		);
	});

	it('une option sans l’autre', () => {
		expect(errorOf('données: 1 ; 2')).toBe(
			'Ligne 1 : données : écrire aussi les classes (classes: 0 ; 5 ; 10)'
		);
		expect(errorOf('classes: 0 ; 5\n[0 ; 5[ = 3')).toBe(
			'Ligne 1 : classes : seulement avec données: (sinon écrire [0 ; 5[ = effectif)'
		);
	});

	it('données et lignes « [a ; b[ = effectif » : pas les deux', () => {
		expect(errorOf('classes: 0 ; 5\ndonnées: 1\n[0 ; 5[ = 3')).toBe(
			'Ligne 3 : soit les données, soit les effectifs (catégorie = effectif), pas les deux'
		);
	});

	it('`classes:` refusé dans les barres et le diagramme circulaire', () => {
		expect(errorOf('classes: 0 ; 5\ndonnées: 1', 'barres')).toMatch(
			/l'option « classes » ne s'applique pas aux diagrammes en barres/
		);
	});
});
