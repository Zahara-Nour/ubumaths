/**
 * Numérotation de la case d'un bloc ```figure-a-completer (comme ```operation) :
 * le bloc compte pour UNE case, son numéro posé dans le bloc (`case: N`).
 */
import { describe, it, expect } from 'vitest';
import { assignBlankIndices } from '../assign-blank-indices';

const body = ['fenetre: 0 ; 10 ; 0 ; 6', 'verifier: droite_par A ; B', '---', 'A = point(1, 2)'];
const block = ['```figure-a-completer', ...body, '```'].join('\n');

describe('assignBlankIndices — bloc ```figure-a-completer', () => {
	it('une case, `case: 0` en tête du bloc, texte du bloc gardé pour le générateur', () => {
		const result = assignBlankIndices(`Trace la droite.\n\n${block}`);
		expect(result.totalBlanks).toBe(1);
		expect(result.statement).toContain('```figure-a-completer\ncase: 0\nfenetre: 0 ; 10 ; 0 ; 6');
		expect(result.constructionBlanks).toEqual({ 0: body.join('\n') });
	});

	it('numérotée à son rang parmi les autres cases', () => {
		const result = assignBlankIndices(`Mot : [_]\n\n${block}\n\n$? + 1 = 2$`);
		expect(result.totalBlanks).toBe(3);
		expect(result.statement).toContain('case: 1');
		expect(Object.keys(result.constructionBlanks ?? {})).toEqual(['1']);
	});

	it('un `?` ou un `[_]` dans le bloc ne crée pas de case', () => {
		const result = assignBlankIndices(
			[
				'```figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'description: Trouve [_] et $?$',
				'verifier: droite_par A ; B',
				'---',
				'```'
			].join('\n')
		);
		expect(result.totalBlanks).toBe(1);
	});

	it('dans une liste ou une citation : refusé, message pour l’auteur', () => {
		const result = assignBlankIndices(`- item\n\n  ${block.split('\n').join('\n  ')}`);
		expect(result.constructionErrors).toEqual([
			'Un bloc figure-a-completer doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});

	it('bloc non fermé : s’arrête comme le parseur, la suite garde ses cases', () => {
		const statement = [
			'```figure-a-completer',
			...body,
			'',
			'Complète : $x = ?$',
			'',
			'```operation',
			'calcul: 45 + 37',
			'```'
		].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(3);
		expect(Object.keys(result.constructionBlanks ?? {})).toEqual(['0']);
		expect(result.statement).toContain('\\placeholder[1]{}');
	});
});
