/**
 * `série:` (v2, lot 4 PR c, Q106) : écrire la série brute dans la fiche.
 *
 * Spécification validée par David le 2026-10-03 : `affichée` (telle qu'écrite,
 * au-dessus de la figure), `triée` (ordre croissant, nombres seulement),
 * `seule` (la série sans la figure ni les indicateurs : l'énoncé).
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
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

const sceneOf = (source: string, kind: StatChartKind = 'barres', locale: 'fr' | 'en' = 'fr') =>
	buildStatChartScene(specOf(source, kind), { locale });

const typstOf = (source: string, kind: StatChartKind = 'barres', language = 'fr') =>
	generateStatChartTypst(parseStatChartContent(kind, source), { language });

// =============================================================================
// Scène
// =============================================================================

describe('série — texte', () => {
	it('affichée : telle qu’écrite, vrai signe moins, virgule décimale', () => {
		const scene = sceneOf('données: 12 ; −3 ; 12.5 ; 8\nsérie: affichée');

		expect(scene.series).toBe('Série : 12 ; −3 ; 12,5 ; 8');
		expect(scene.seriesOnly).toBe(false);
	});

	it('triée : ordre croissant des valeurs ; fractions gardées', () => {
		expect(sceneOf('données: 12 ; 1/2 ; -3 ; 8\nsérie: triee').series).toBe(
			'Série : −3 ; 1/2 ; 8 ; 12'
		);
	});

	it('des mots, plusieurs lignes `données:`, document anglais', () => {
		expect(sceneOf('données: Bus ; vélo\ndonnées: Bus\nsérie: affichée').series).toBe(
			'Série : Bus ; vélo ; Bus'
		);
		expect(sceneOf('données: 12,5 ; 3\nsérie: affichée', 'barres', 'en').series).toBe(
			'Data: 12.5 ; 3'
		);
	});

	it('seule : la série, sans indicateurs ; dans les quatre blocs', () => {
		const scene = sceneOf('données: 12 ; 8\nsérie: seule\nindicateurs: moyenne');

		expect(scene.seriesOnly).toBe(true);
		expect(scene.series).toBe('Série : 12 ; 8');
		expect(scene.indicators).toEqual([]);
		expect(sceneOf('données: Bus\nsérie: seule', 'circulaire').seriesOnly).toBe(true);
		expect(sceneOf('classes: 0 ; 10\ndonnées: 3 ; 4\nsérie: triée', 'histogramme').series).toBe(
			'Série : 3 ; 4'
		);
		expect(
			sceneOf('classes: 0 ; 10\ndonnées: 3\nsérie: seule', 'frequences-cumulees').seriesOnly
		).toBe(true);
	});

	it('sans `série:` : rien de changé', () => {
		expect(sceneOf('données: 12 ; 8').series).toBeNull();
		expect(sceneOf('A = 3').series).toBeNull();
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('série — Typst', () => {
	it('le même texte qu’à l’écran, sous le titre, avant la figure', () => {
		const source = 'titre: Notes\ndonnées: 12 ; −3 ; 12,5\nsérie: affichée';
		const typst = typstOf(source);
		const series = sceneOf(source).series!;

		expect(typst).toContain(`"${series}"`);
		expect(typst.indexOf('Notes')).toBeLessThan(typst.indexOf(series));
		expect(typst.indexOf(series)).toBeLessThan(typst.indexOf('cetz.canvas'));
	});

	it('seule : titre et série, ni figure ni indicateurs', () => {
		const typst = typstOf('titre: Notes\ndonnées: 12 ; 8\nsérie: seule\nindicateurs: moyenne');

		expect(typst).toContain('"Série : 12 ; 8"');
		expect(typst).toContain('Notes');
		expect(typst).not.toContain('cetz');
		expect(typst).not.toContain('Moyenne');
	});

	it('document anglais', () => {
		expect(typstOf('données: 12,5\nsérie: seule', 'barres', 'en')).toContain('"Data: 12.5"');
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('série — erreurs situées', () => {
	it('sans `données:`', () => {
		expect(errorOf('A = 3\nsérie: affichée')).toBe('Ligne 2 : série : seulement avec données:');
	});

	it('valeur inconnue', () => {
		expect(errorOf('données: 1\nsérie: oui')).toBe('Ligne 2 : série : affichée, triée ou seule');
	});

	it('triée demande des nombres', () => {
		expect(errorOf('données: Bus ; Vélo\nsérie: triée')).toBe(
			'Ligne 2 : série : triée demande des nombres'
		);
	});

	it('refusée dans un tableau croisé, une loi, une simulation', () => {
		expect(errorOf('X = 1 ; 2\nP = 1/2 ; 1/2\nsérie: seule', 'loi')).toMatch(
			/l'option « série » ne s'applique pas aux lois/
		);
	});
});
