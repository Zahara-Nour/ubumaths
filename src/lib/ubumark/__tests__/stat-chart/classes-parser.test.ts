/**
 * Blocs ```histogramme et ```frequences-cumulees, option `indicateurs:` —
 * analyse du texte.
 *
 * Spécification validée par David le 2026-10-01
 * (`docs/wip/outils-statistiques-progress.md`, lot 3).
 */

import { describe, it, expect } from 'vitest';
import {
	findStatChartBlocks,
	isStatChartBlockStart,
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

function errorOf(kind: StatChartKind, source: string) {
	const node = parseStatChartContent(kind, source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0];
}

const TRAJETS = '[0 ; 10[ = 12\n[10 ; 20[ = 18\n[20 ; 40[ = 10';

// =============================================================================
// Détection
// =============================================================================

describe('repérer les nouveaux blocs', () => {
	it('reconnaît ```histogramme et ```frequences-cumulees', () => {
		expect(isStatChartBlockStart('```histogramme')).toBe('histogramme');
		expect(isStatChartBlockStart('```frequences-cumulees')).toBe('frequences-cumulees');
		expect(findStatChartBlocks(['```histogramme', TRAJETS, '```'])[0].kind).toBe('histogramme');
	});
});

// =============================================================================
// Classes
// =============================================================================

describe('classes [a ; b[', () => {
	it('lit les bornes et l’effectif, avec ou sans espaces', () => {
		const spec = specOf('histogramme', '[0;10[ = 12\n[10 ; 20[ = 18');

		expect(spec.data.map((d) => d.interval)).toEqual([
			{ lower: 0, upper: 10 },
			{ lower: 10, upper: 20 }
		]);
		expect(spec.data.map((d) => d.value)).toEqual([12, 18]);
		expect(spec.data[0].label).toBe('[0 ; 10[');
	});

	it('bornes décimales et négatives', () => {
		const spec = specOf('histogramme', '[-2,5 ; 0[ = 1\n[0 ; 2.5[ = 3');

		expect(spec.data[0].interval).toEqual({ lower: -2.5, upper: 0 });
		expect(spec.data[1].interval).toEqual({ lower: 0, upper: 2.5 });
	});

	it('refuse une autre écriture qu’une classe [a ; b[, avec un exemple', () => {
		expect(errorOf('histogramme', ']0 ; 10] = 3').message).toContain('[0 ; 10[');
		expect(errorOf('histogramme', '0-10 = 3').message).toMatch(/\[a ; b\[|\[0 ; 10\[/);
	});

	it('refuse une borne gauche qui n’est pas inférieure à la droite', () => {
		expect(errorOf('histogramme', '[10 ; 10[ = 3').line).toBe(1);
	});

	it('refuse des classes qui ne se suivent pas', () => {
		expect(errorOf('histogramme', '[0 ; 10[ = 3\n[12 ; 20[ = 2').message).toContain('[12 ; 20[');
	});

	it(`au plus ${STAT_CHART_LIMITS.classes} classes`, () => {
		const lines = (n: number) =>
			Array.from({ length: n }, (_, i) => `[${i} ; ${i + 1}[ = 1`).join('\n');

		expect(errorOf('histogramme', lines(STAT_CHART_LIMITS.classes + 1)).message).toMatch(/20/);
		expect(
			parseStatChartContent('histogramme', lines(STAT_CHART_LIMITS.classes)).spec
		).not.toBeNull();
	});
});

// =============================================================================
// Options
// =============================================================================

describe('options de l’histogramme et du polygone', () => {
	it('légende d’aire : valeur et mot', () => {
		expect(specOf('histogramme', `légende: 1 carreau = 2 élèves\n${TRAJETS}`).areaLegend).toEqual({
			value: 2,
			unit: 'élèves'
		});
		expect(specOf('histogramme', `legende: 1 carreau = 2,5\n${TRAJETS}`).areaLegend).toEqual({
			value: 2.5,
			unit: null
		});
		expect(specOf('histogramme', TRAJETS).areaLegend).toBeNull();
	});

	it('légende mal écrite ou valeur nulle', () => {
		expect(errorOf('histogramme', `légende: 2 élèves\n${TRAJETS}`).message).toMatch(/1 carreau/);
		expect(errorOf('histogramme', `légende: 1 carreau = 0\n${TRAJETS}`).line).toBe(1);
	});

	it('sens et lecture du polygone, avec leurs valeurs par défaut', () => {
		const byDefault = specOf('frequences-cumulees', TRAJETS);
		expect(byDefault.direction).toBe('croissantes');
		expect(byDefault.reading).toBe('aucune');

		const spec = specOf(
			'frequences-cumulees',
			`sens: décroissantes\nlecture: quartiles\n${TRAJETS}`
		);
		expect(spec.direction).toBe('décroissantes');
		expect(spec.reading).toBe('quartiles');
	});

	it('options réservées à leur bloc', () => {
		expect(errorOf('barres', 'légende: 1 carreau = 2\nA = 1').message).toMatch(/histogramme/);
		expect(errorOf('histogramme', `sens: croissantes\n${TRAJETS}`).message).toMatch(
			/fréquences cumulées/
		);
		expect(errorOf('histogramme', `lecture: médiane\n${TRAJETS}`).message).toMatch(
			/fréquences cumulées/
		);
		expect(errorOf('frequences-cumulees', `étiquettes: angles\n${TRAJETS}`).message).toMatch(
			/circulaire/
		);
	});
});

// =============================================================================
// Indicateurs
// =============================================================================

describe('indicateurs:', () => {
	it('lit une liste, avec ou sans accents, dans l’ordre écrit', () => {
		const spec = specOf(
			'barres',
			'indicateurs: moyenne ; Médiane ; quartiles ; ecart interquartile ; étendue ; écart type ; effectif\n0 = 5\n1 = 8'
		);

		expect(spec.indicators).toEqual([
			'moyenne',
			'mediane',
			'quartiles',
			'ecart-interquartile',
			'etendue',
			'ecart-type',
			'effectif'
		]);
	});

	it('classes : effectif, moyenne, classe médiane, médiane', () => {
		const spec = specOf(
			'histogramme',
			`indicateurs: effectif ; moyenne ; classe médiane ; médiane\n${TRAJETS}`
		);

		expect(spec.indicators).toEqual(['effectif', 'moyenne', 'classe-mediane', 'mediane']);
	});

	it('indicateur inconnu', () => {
		expect(errorOf('barres', 'indicateurs: mode\n0 = 1').message).toMatch(/mode/);
	});

	it('pas d’indicateurs sur un diagramme circulaire', () => {
		expect(errorOf('circulaire', 'indicateurs: moyenne\nA = 1').message).toMatch(/circulaire/);
	});

	it('barres : seulement si toutes les catégories sont des nombres', () => {
		expect(errorOf('barres', 'indicateurs: moyenne\nFoot = 1\nDanse = 2').message).toMatch(
			/nombre/
		);
		expect(specOf('barres', 'indicateurs: moyenne\n0 = 1\n2,5 = 2').indicators).toEqual([
			'moyenne'
		]);
	});

	it('classe médiane : réservée aux séries en classes', () => {
		expect(errorOf('barres', 'indicateurs: classe médiane\n0 = 1').message).toMatch(/classes/);
	});

	it('séries en classes : pas de quartiles, d’étendue ni d’écart type', () => {
		expect(errorOf('histogramme', `indicateurs: écart type\n${TRAJETS}`).message).toMatch(
			/classes/
		);
	});

	it('effectif total : impossible avec des pourcentages', () => {
		expect(errorOf('barres', 'indicateurs: effectif\n0 = 40 %\n1 = 60 %').message).toMatch(
			/pourcentage/
		);
	});
});

// Revue du lot 3 : le quadrillage n'avait aucun plafond (10^9 lignes → processus tué)
describe('quadrillage borné et pourcentages contrôlés', () => {
	it('amplitudes sans diviseur commun assez grand : refusé, avec la raison', () => {
		const error = errorOf('histogramme', '[0 ; 1[ = 1\n[1 ; 1000000000[ = 1');

		expect(error.message).toMatch(/carreaux/);
		expect(error.message).toMatch(/60/);
	});

	it('légende trop petite : trop de carreaux de haut, refusé', () => {
		expect(
			errorOf('histogramme', 'légende: 1 carreau = 0,01\n[0 ; 1[ = 1000\n[1 ; 3[ = 2').message
		).toMatch(/carreaux/);
	});

	it('cas ordinaire au plafond : accepté', () => {
		const lines = '[0 ; 1[ = 1\n[1 ; 60[ = 59';

		expect(parseStatChartContent('histogramme', lines).spec).not.toBeNull();
	});

	it('au plus 4 décimales dans une borne', () => {
		expect(errorOf('histogramme', '[0 ; 0,00001[ = 1\n[0,00001 ; 0,00003[ = 1').message).toMatch(
			/décimales/
		);
	});

	it('séries en classes en pourcentages : la somme doit faire 100', () => {
		expect(errorOf('frequences-cumulees', '[0 ; 10[ = 10 %\n[10 ; 20[ = 20 %').message).toMatch(
			/30/
		);
		expect(errorOf('histogramme', '[0 ; 10[ = 10 %\n[10 ; 20[ = 20 %').message).toMatch(/30/);
	});

	it('mot de la légende d’aire : au plus 40 caractères', () => {
		expect(
			errorOf('histogramme', `légende: 1 carreau = 2 ${'x'.repeat(41)}\n[0 ; 10[ = 1`).line
		).toBe(1);
	});
});
