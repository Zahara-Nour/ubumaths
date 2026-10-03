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

	it('le PDF masque les mêmes cases : une boîte vide à la place de chacune', () => {
		const source = `${ALL}\nmasquer: 12/effectifs ; fréquences`;
		const typst = generateStatChartTypst(parseStatChartContent('effectifs', source));
		const hidden = tableOf(source)
			.rows.flatMap((r) => r.hidden)
			.filter(Boolean).length;

		expect(typst.match(/#box\(width: 0\.8cm\)/g)).toHaveLength(hidden);
		expect(hidden).toBe(5);
	});

	it('vertical (plus de 12 valeurs) : scène et PDF masquent les mêmes cases', () => {
		const values = Array.from({ length: 14 }, (_, i) => i).join(' ; ');
		const source = `données: ${values}\nmasquer: 3/effectifs ; Total/effectifs`;
		const scene = tableOf(source);
		const typst = generateStatChartTypst(parseStatChartContent('effectifs', source));

		expect(scene.vertical).toBe(true);
		expect(holes(scene)).toEqual(['...x..........x']);
		expect(typst.match(/#box\(width: 0\.8cm\)/g)).toHaveLength(2);
	});

	it('une valeur écrite autrement, à la casse près', () => {
		expect(holes(tableOf(`${NOTES}\nmasquer: 12,0/effectifs`))).toEqual(['.x..']);
		expect(holes(tableOf('−3 = 1\n2 = 1\nmasquer: -3/effectifs'))).toEqual(['x..']);
		expect(holes(tableOf('Vélo = 3\nBus = 1\nmasquer: vélo/effectifs'))).toEqual(['x..']);
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

	it('une case mal écrite ; une classe sans « / »', () => {
		const message = 'Ligne 2 : masquer : écrire valeur/ligne, par exemple 12/effectifs';
		expect(errorOf(`${NOTES}\nmasquer: 12/`)).toBe(message);
		expect(errorOf('[0 ; 10[ = 4\n[10 ; 20[ = 6\nmasquer: [0 ; 10[')).toBe(
			'Ligne 3 : masquer : écrire valeur/ligne, par exemple 12/effectifs'
		);
	});

	it('`masquer:` vide : une erreur, pas une fiche sans case à compléter', () => {
		expect(errorOf(`${NOTES}\nmasquer:`)).toBe('Ligne 2 : masquer : aucune case donnée');
		expect(errorOf(`${NOTES}\nmasquer: ;`)).toBe('Ligne 2 : masquer : aucune case donnée');
	});

	it('une valeur nommée « Total » avec la colonne des totaux', () => {
		expect(errorOf('Total = 3\nBus = 1')).toBe(
			'Ligne 1 : « Total » est réservé à la colonne des totaux : renommer cette valeur'
		);
		expect(tableOf('Total = 3\nBus = 1\ntotaux: non').columns).toEqual(['Total', 'Bus']);
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
