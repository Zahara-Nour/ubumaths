/**
 * Bloc ```operation — la scène : calcul et grille (phase 0 :
 * `docs/wip/operations-posees-progress.md` § 4)
 *
 * Lecture des lignes (aide `line`) : `_` carreau vide, `¹` petite retenue
 * devant le chiffre (compensation), `~` chiffre barré (cassage), `,` virgule
 * après le chiffre des unités. Au-dessus (`above`) : `_` sans retenue, sinon
 * le texte ; entre crochets, une case à remplir avec son texte attendu.
 */

import { describe, expect, it } from 'vitest';
import { parseOperationContent } from '$lib/ubumark/parser/operation-parser';
import {
	buildOperationScene,
	operationResult,
	type OperationCell,
	type OperationMark,
	type OperationResultCell,
	type OperationScene
} from '$lib/ubumark/utils/operation-scene';

function scene(...lines: string[]): OperationScene {
	const node = parseOperationContent(lines.join('\n'));
	expect(node.errors).toEqual([]);
	return buildOperationScene(node.spec!);
}

const mark = (m: OperationMark | null) => (m === null ? '_' : m.blank ? `[${m.text}]` : m.text);

function line(cells: readonly (OperationCell | OperationResultCell)[]): string {
	return cells
		.map((c) => {
			const m = 'mark' in c && c.mark ? (c.mark.blank ? `[${c.mark.text}]` : '¹') : '';
			const struck = 'struck' in c && c.struck ? '~' : '';
			const digit = c.blank ? `[${c.digit}]` : c.digit === '' ? '_' : c.digit;
			return `${m}${struck}${digit}${c.comma ? ',' : ''}`;
		})
		.join('');
}

function grid(s: OperationScene) {
	return {
		above: s.above.map(mark).join(' '),
		terms: s.terms.map(line),
		result: line(s.result)
	};
}

const result = (...lines: string[]) =>
	operationResult(parseOperationContent(lines.join('\n')).spec!);

describe('addition résolue (cases: aucune)', () => {
	it('45 + 37 : retenue des dizaines, largeur juste (comportement 3)', () => {
		const s = scene('calcul: 45 + 37', 'cases: aucune');
		expect(s.operator).toBe('+');
		expect(s.columns).toBe(2);
		expect(s.decimals).toBe(0);
		expect(grid(s)).toEqual({ above: '1 _', terms: ['45', '37'], result: '82' });
	});

	it('99 + 1 : colonne ajoutée, retenue au-dessus (comportement 10)', () => {
		expect(grid(scene('calcul: 99 + 1', 'cases: aucune'))).toEqual({
			above: '1 1 _',
			terms: ['_99', '__1'],
			result: '100'
		});
	});

	it('9 + 9 + 9 : retenue 2 (comportement 2)', () => {
		expect(grid(scene('calcul: 9 + 9 + 9', 'cases: aucune'))).toEqual({
			above: '2 _',
			terms: ['_9', '_9', '_9'],
			result: '27'
		});
	});

	it('retenues: non : aucune retenue écrite', () => {
		expect(grid(scene('calcul: 45 + 37', 'cases: aucune', 'retenues: non')).above).toBe('_ _');
	});

	it('56,75 + 234 + 0,8 : virgules alignées, carreaux vides (comportement 4)', () => {
		const s = scene('calcul: 56,75 + 234 + 0,8', 'cases: aucune');
		expect(s.columns).toBe(5);
		expect(s.decimals).toBe(2);
		expect(grid(s)).toEqual({
			above: '_ 1 1 _ _',
			terms: ['_56,75', '234__', '__0,8_'],
			result: '291,55'
		});
	});

	it('2,5 + 1,5 → 4,0 ; 0,5 + 0,5 → 1,0 (comportements 4, 12)', () => {
		expect(grid(scene('calcul: 2,5 + 1,5', 'cases: aucune')).result).toBe('4,0');
		expect(grid(scene('calcul: 0,5 + 0,5', 'cases: aucune')).result).toBe('1,0');
	});
});

describe('addition à remplir (cases: résultat, défaut)', () => {
	it('45 + 37 : une case de plus que le plus long terme, retenues à remplir (comportement 1)', () => {
		const s = scene('calcul: 45 + 37');
		expect(s.columns).toBe(3);
		expect(grid(s)).toEqual({
			above: '[] [1] _',
			terms: ['_45', '_37'],
			result: '[][8][2]'
		});
	});

	it('99 + 1 : même largeur que 45 + 37 (rien ne trahit la retenue finale)', () => {
		expect(grid(scene('calcul: 99 + 1'))).toEqual({
			above: '[1] [1] _',
			terms: ['_99', '__1'],
			result: '[1][0][0]'
		});
	});

	it('retenues: non : pas de case de retenue', () => {
		expect(grid(scene('calcul: 45 + 37', 'retenues: non')).above).toBe('_ _ _');
	});

	it('décimaux : cases après la virgule, virgule déjà placée', () => {
		expect(grid(scene('calcul: 2,5 + 1,5')).result).toBe('[][4],[0]');
	});
});

describe('soustraction par compensation', () => {
	it('52 − 37 : 1 devant le 2, 1 contre le 3 (comportement 5)', () => {
		expect(grid(scene('calcul: 52 - 37', 'cases: aucune'))).toEqual({
			above: '_ _',
			terms: ['5¹2', '¹37'],
			result: '15'
		});
	});

	it('302 − 7 : retenues à travers le zéro, sur des carreaux vides du bas', () => {
		expect(grid(scene('calcul: 302 - 7', 'cases: aucune'))).toEqual({
			above: '_ _ _',
			terms: ['3¹0¹2', '¹_¹_7'],
			result: '295'
		});
	});

	it('34,5 − 2,58 : carreau vide du haut compté comme 0', () => {
		expect(grid(scene('calcul: 34,5 - 2,58', 'cases: aucune'))).toEqual({
			above: '_ _ _ _',
			terms: ['34,¹5¹_', '_¹2,¹58'],
			result: '31,92'
		});
	});

	it('1 000 − 998 : zéros de tête jamais écrits (comportement 11)', () => {
		expect(grid(scene('calcul: 1000 - 998', 'cases: aucune')).result).toBe('___2');
	});

	it('à remplir : une case de retenue par colonne, en haut (sauf 1re colonne) ; le 1 du bas suit (PR 1b, décision c)', () => {
		expect(grid(scene('calcul: 52 - 37'))).toEqual({
			above: '_ _',
			terms: ['5[1]2', '37'],
			result: '[1][5]'
		});
	});

	it('à remplir, 1 000 − 998 : autant de cases que le nombre du haut', () => {
		expect(grid(scene('calcul: 1000 - 998', 'retenues: non')).result).toBe('[][][][2]');
	});
});

describe('soustraction par cassage', () => {
	it('302 − 7 : chiffres barrés, nouvelles valeurs au-dessus (comportement 6)', () => {
		expect(grid(scene('calcul: 302 - 7', 'méthode: cassage', 'cases: aucune'))).toEqual({
			above: '2 9 12',
			terms: ['~3~0~2', '__7'],
			result: '295'
		});
	});

	it('413 − 159 : une colonne cassée puis complétée garde sa valeur finale', () => {
		expect(grid(scene('calcul: 413 - 159', 'méthode: cassage', 'cases: aucune'))).toEqual({
			above: '3 10 13',
			terms: ['~4~1~3', '159'],
			result: '254'
		});
	});

	it('sans emprunt : rien de barré', () => {
		expect(grid(scene('calcul: 58 - 23', 'méthode: cassage', 'cases: aucune'))).toEqual({
			above: '_ _',
			terms: ['58', '23'],
			result: '35'
		});
	});

	it('à remplir : une case au-dessus de chaque colonne', () => {
		expect(grid(scene('calcul: 52 - 37', 'méthode: cassage')).above).toBe('[4] [12]');
	});

	it('à remplir : rien de barré (la colonne à casser est la réponse)', () => {
		expect(grid(scene('calcul: 1000 - 1', 'méthode: cassage'))).toEqual({
			above: '[0] [9] [9] [10]',
			terms: ['1000', '___1'],
			result: '[][9][9][9]'
		});
	});
});

describe('operationResult : le résultat en écriture française', () => {
	it.each([
		[['calcul: 45 + 37'], '82'],
		[['calcul: 56,75 + 234 + 0,8'], '291,55'],
		[['calcul: 2,5 + 1,5'], '4,0'],
		[['calcul: 1000 - 998'], '2'],
		[['calcul: 34,5 - 2,58'], '31,92'],
		[['calcul: 5 - 5'], '0'],
		[['calcul: 0,75 - 0,5'], '0,25'],
		[['calcul: 9999999999 + 1'], '10000000000']
	])('%j → %s', (lines, expected) => {
		expect(result(...lines)).toBe(expected);
	});
});
