/**
 * Tests de preuve du registre des écarts (docs/ecarts/registre.md), domaine pédagogie
 * (fiches, questions, blocs).
 *
 * Chaque test affirme le comportement ATTENDU d'un écart encore ouvert : il est
 * rouge tant que l'écart est vrai. Le nom de chaque `describe` porte l'identifiant
 * de l'écart, que le registre retient par `› V111`, `› L87`…
 *
 * Les tests nommés « témoin » sont verts aujourd'hui : ils montrent que le même
 * geste marche sur un cas voisin, donc que le rouge vient bien de l'écart.
 */

import { describe, expect, it } from 'vitest';

import { assignBlankIndices } from '#lib/questions/generator/assign-blank-indices.ts';
import { parseStatChartContent } from '#lib/ubumark/parser/stat-chart-parser.ts';
import { lineCoefficients } from '#lib/ubumark/utils/courbe-tracer.ts';
import { printedTitle, type TitleNotion } from '#lib/worksheets/worksheet-title.ts';

describe('V111 : fiche anglaise au titre composé, sans catégorie', () => {
	// Le titre en base est le titre composé, écrit en français par l'éditeur.
	const FRENCH_TITLE = 'Suites arithmétiques';
	const notion: TitleNotion = { name: 'suites arithmétiques', branch: 'Suites' };

	function mainTitle(locale: 'fr' | 'en', notions: TitleNotion[]): string {
		return printedTitle({
			type: 'worksheet',
			category: null,
			customTitle: false,
			title: FRENCH_TITLE,
			notions,
			locale
		}).main;
	}

	it('témoin : en français, le titre composé s’imprime', () => {
		expect(mainTitle('fr', [notion])).toBe(FRENCH_TITLE);
	});

	it('témoin : notion traduite, la version anglaise imprime son nom anglais', () => {
		expect(mainTitle('en', [{ ...notion, nameEn: 'arithmetic sequences' }])).toBe(
			'Arithmetic sequences'
		);
	});

	// Aujourd'hui : « Suites arithmétiques » en tête de la fiche anglaise.
	it('notion sans nom anglais : la version anglaise n’imprime pas le titre français', () => {
		const main = mainTitle('en', [notion]);
		// Un titre vide ne serait pas une correction
		expect(main).not.toBe('');
		expect(main).not.toMatch(/arithmétiques/i);
	});
});

describe('L87 : horloge à régler comme option d’un choix', () => {
	function choiceErrorsOf(option: string[]): string {
		const statement = ['````choix', ...option, '- non', '````'].join('\n');
		return (assignBlankIndices(statement).choiceErrors ?? []).join(' ');
	}

	it('témoin : un cercle trigonométrique à points à placer en option est refusé', () => {
		expect(choiceErrorsOf(['- ```trig', '  placer: M = pi/3', '  ```'])).toMatch(/premier niveau/);
	});

	it('témoin : une horloge qui affiche une heure reste permise en option', () => {
		expect(choiceErrorsOf(['- ```horloge', '  heure: 3:00', '  ```'])).toBe('');
	});

	// Aujourd'hui : aucun message, l'élève voit une horloge sans geste.
	// Décision de David (2026-11-24) : refuser à l'écriture, avec un message.
	it('une horloge à régler en option est refusée, avec un message', () => {
		expect(choiceErrorsOf(['- ```horloge', '  placer: 9 h 25', '  ```'])).toMatch(/horloge/i);
	});
});

describe('L88 : `\\frac` dans une droite à tracer', () => {
	it('témoin : `y = 1/2x` se lit −0,5x + y = 0', () => {
		expect(lineCoefficients('y = 1/2x')).toEqual({ a: -0.5, b: 1, c: 0 });
	});

	// Aujourd'hui : « équation illisible … (Invalid backslash sequence at position 0) ».
	it('`y = \\frac{1}{2}x` se lit comme `y = 1/2x`', () => {
		const line = lineCoefficients('y = \\frac{1}{2}x');
		// Un message de refus est une chaîne ; nombres comparés sans distinguer 0 de −0
		expect(typeof line).toBe('object');
		if (typeof line === 'string') return;
		expect(line.a).toBeCloseTo(-0.5, 9);
		expect(line.b).toBeCloseTo(1, 9);
		expect(line.c).toBeCloseTo(0, 9);
	});
});

describe('L90 : fraction dans les cinq valeurs d’une boîte à moustaches', () => {
	const KIND = 'boite-a-moustaches';

	function accepted(source: string): boolean {
		const node = parseStatChartContent(KIND, source);
		return node.errors.length === 0 && node.spec !== null;
	}

	it('témoin : sans fraction, les deux écritures sont acceptées', () => {
		expect(accepted('A = 0,5 ; 1 ; 2 ; 3 ; 4')).toBe(true);
		expect(accepted('données: 0,5 ; 1 ; 2 ; 3 ; 4')).toBe(true);
	});

	// Aujourd'hui : `données:` accepte 1/2, la ligne de boîte répond « « 1/2 » n'est
	// pas un nombre ». Les deux doivent répondre pareil (accepter, ou refuser).
	it('`1/2` reçoit la même réponse sur une ligne de boîte et dans `données:`', () => {
		expect(accepted('A = 1/2 ; 1 ; 2 ; 3 ; 4')).toBe(accepted('données: 1/2 ; 1 ; 2 ; 3 ; 4'));
	});
});
