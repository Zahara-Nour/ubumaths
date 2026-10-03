/**
 * Bloc ```effectifs, PR (b) : `masquer:` (cases à compléter, Q130) et
 * `indicateurs:` (Q131). Spécification validée par David le 2026-10-03.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type FrequencyTableScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { describeList } from '$lib/statistics/describe';
import { formatApproxValue } from '$lib/statistics/format';

// =============================================================================
// Helpers
// =============================================================================

const NOTES = 'données: 12 ; 15 ; 12 ; 8 ; 15 ; 12';
const ALL = `${NOTES}\nlignes: effectifs ; fréquences ; effectifs cumulés`;

function errorOf(source: string) {
	const node = parseStatChartContent('effectifs', source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0].message;
}

function tableOf(source: string, locale: 'fr' | 'en' = 'fr') {
	const node = parseStatChartContent('effectifs', source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return buildStatChartScene(node.spec, { locale }) as FrequencyTableScene;
}

/** Les cases masquées, ligne par ligne (`x` masquée, `.` visible) */
const holes = (scene: FrequencyTableScene) =>
	scene.rows.map((row) => row.hidden.map((h) => (h ? 'x' : '.')).join(''));

// =============================================================================
// masquer:
// =============================================================================

describe('masquer — cases à compléter', () => {
	it('une ligne entière, Total compris', () => {
		expect(holes(tableOf(`${ALL}\nmasquer: fréquences`))).toEqual(['....', 'xxxx', '....']);
	});

	it('des cases : valeur/ligne, Total/ligne', () => {
		expect(holes(tableOf(`${ALL}\nmasquer: 12/effectifs ; Total/fréquences`))).toEqual([
			'.x..',
			'...x',
			'....'
		]);
	});

	it('une classe (avec son « ; »), ligne et cases ensemble', () => {
		const scene = tableOf(
			'[0 ; 10[ = 4\n[10 ; 20[ = 6\nlignes: effectifs ; effectifs cumulés\nmasquer: [0 ; 10[/effectifs ; effectifs cumulés'
		);
		// Le Total d'un cumul reste « sans objet » : rien à compléter
		expect(holes(scene)).toEqual(['x..', 'xx.']);
	});

	it('une case masquée est vide, annoncée « case à compléter » (anglais : blank cell)', () => {
		const scene = tableOf(`${ALL}\nmasquer: 12/effectifs`);
		expect(scene.rows[0].cells[1]).toBe('');
		expect(scene.hiddenLabel).toBe('case à compléter');
		expect(tableOf(`${ALL}\nmasquer: 12/effectifs`, 'en').hiddenLabel).toBe('blank cell');
	});

	it('le PDF masque les mêmes cases : une boîte vide à la place', () => {
		const typst = generateStatChartTypst(
			parseStatChartContent('effectifs', `${ALL}\nmasquer: 12/effectifs`)
		);
		expect(typst).toContain('#box(width: 0.8cm)');
		expect(typst).not.toContain('[#"3"]');
	});
});

describe('masquer — erreurs', () => {
	it('une ligne absente du tableau', () => {
		expect(errorOf(`${NOTES}\nmasquer: fréquences`)).toBe(
			'Ligne 2 : masquer : la ligne « fréquences » n’est pas dans le tableau'
		);
	});

	it('une valeur inconnue', () => {
		expect(errorOf(`${NOTES}\nmasquer: 13/effectifs`)).toBe(
			'Ligne 2 : masquer : la valeur « 13 » n’est pas dans le tableau'
		);
	});

	it('le total d’un cumul ; le Total sans colonne', () => {
		expect(errorOf(`${ALL}\nmasquer: Total/effectifs cumulés`)).toBe(
			'Ligne 3 : masquer : pas de total pour un cumul'
		);
		expect(errorOf(`${NOTES}\ntotaux: non\nmasquer: Total/effectifs`)).toBe(
			'Ligne 3 : masquer : pas de colonne Total (« totaux: non »)'
		);
	});

	it('une case mal écrite', () => {
		expect(errorOf(`${NOTES}\nmasquer: 12/`)).toBe(
			'Ligne 2 : masquer : écrire valeur/ligne, par exemple 12/effectifs'
		);
	});
});

// =============================================================================
// indicateurs:
// =============================================================================

describe('indicateurs — la ligne sous le tableau', () => {
	it('des valeurs : ceux du module statistique', () => {
		const scene = tableOf(`${NOTES}\nindicateurs: moyenne ; médiane`);
		const s = describeList([12, 15, 12, 8, 15, 12])!;
		expect(scene.indicators).toEqual([
			`Moyenne ${formatApproxValue(s.mean, 'fr')}`,
			`Médiane ${formatApproxValue(s.median, 'fr')}`
		]);
	});

	it('des classes : classe médiane ; moyenne exacte avec `données:`', () => {
		const scene = tableOf(
			'classes: 0 ; 10 ; 20\ndonnées: 3 ; 12 ; 15\nindicateurs: moyenne ; classe médiane'
		);
		expect(scene.indicators).toEqual(['Moyenne = 10', 'Classe médiane : [10 ; 20[']);
	});

	it('en anglais', () => {
		expect(tableOf(`${NOTES}\nindicateurs: effectif`, 'en').indicators).toEqual([
			'Total frequency: 6'
		]);
	});

	it('des mots : le message habituel', () => {
		expect(errorOf('Bus = 3\nVélo = 1\nindicateurs: moyenne')).toMatch(
			/toutes les catégories doivent être des nombres/
		);
	});
});
