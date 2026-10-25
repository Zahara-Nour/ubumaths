/**
 * Bloc ```figure-a-completer — lecture (phase 0 de CP-059 validée le 2026-10-25,
 * `docs/wip/geometrie-validation-progress.md` § 3 et § 4)
 *
 * Le bloc est une figure de départ (même en-tête, même langage que ```figure)
 * plus ses lignes à lui : `outils:`, `verifier:` et `case:` (posée par le
 * générateur de questions). Il rend un nœud `figure` qui porte `construction` :
 * partout où une figure s'affiche (écran, PDF, listes), il s'affiche.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser';
import type { FigureNode } from '../../types/figure';

const block = (...body: string[]) => ['```figure-a-completer', ...body, '```'].join('\n');

const CP059 = block(
	'fenetre: 0 ; 10 ; 0 ; 6',
	'outils: droite',
	'verifier: droite_par A ; B',
	'---',
	'A = point(1, 2)',
	'B = point(7, 2)',
	'C = point(4, 5)'
);

function firstNode(markdown: string): FigureNode {
	const node = parseMarkdown(markdown).children[0];
	if (node?.type !== 'figure') throw new Error(`nœud figure attendu, reçu ${node?.type}`);
	return node;
}

describe('construction — lecture du bloc', () => {
	it('rend une figure qui porte ses outils et ses vérifications', () => {
		const node = firstNode(CP059);
		expect(node.errors).toEqual([]);
		expect(node.header.window).toEqual({ xMin: 0, xMax: 10, yMin: 0, yMax: 6 });
		expect(node.script).toBe('A = point(1, 2)\nB = point(7, 2)\nC = point(4, 5)');
		expect(node.construction).toEqual({
			tools: ['droite'],
			checks: [{ kind: 'droite_par', points: ['A', 'B'], line: 3 }]
		});
	});

	it('garde le texte du bloc tel qu’écrit (éditeur riche, aller-retour)', () => {
		expect(firstNode(CP059).source).toContain('verifier: droite_par A ; B');
	});

	it('`outils:` absent : la droite, seul outil', () => {
		const node = firstNode(
			block('fenetre: 0 ; 10 ; 0 ; 6', 'verifier: droite_par A ; B', '---', 'A = point(1, 2)')
		);
		expect(node.errors).toEqual([]);
		expect(node.construction?.tools).toEqual(['droite']);
	});

	it('`vérifier:` accentué accepté', () => {
		const node = firstNode(
			block('fenetre: 0 ; 10 ; 0 ; 6', 'vérifier: droite_par A ; B', '---', 'A = point(1, 2)')
		);
		expect(node.errors).toEqual([]);
		expect(node.construction?.checks).toHaveLength(1);
	});

	it('plusieurs vérifications, une par ligne', () => {
		const node = firstNode(
			block(
				'fenetre: 0 ; 10 ; 0 ; 6',
				'verifier: droite_par A ; B',
				'verifier: droite_par C ; D',
				'---',
				'A = point(1, 2)'
			)
		);
		expect(node.construction?.checks.map((c) => c.points)).toEqual([
			['A', 'B'],
			['C', 'D']
		]);
	});

	it('`case: N` (posée par le générateur) : numéro de la case', () => {
		const node = firstNode(
			block(
				'case: 2',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'verifier: droite_par A ; B',
				'---',
				'A = point(1, 2)'
			)
		);
		expect(node.errors).toEqual([]);
		expect(node.construction?.caseIndex).toBe(2);
	});
});

describe('construction — erreurs situées', () => {
	const messages = (markdown: string) => firstNode(markdown).errors.map((e) => e.message);

	it('vérification manquante', () => {
		expect(messages(block('fenetre: 0 ; 10 ; 0 ; 6', '---', 'A = point(1, 2)'))).toContain(
			'Vérification manquante : ajouter « verifier: droite_par A ; B »'
		);
	});

	it('outil inconnu', () => {
		expect(
			messages(
				block('fenetre: 0 ; 10 ; 0 ; 6', 'outils: compas', 'verifier: droite_par A ; B', '---')
			)
		).toContain('Ligne 2 : outil « compas » inconnu (droite)');
	});

	it('vérification inconnue', () => {
		expect(
			messages(block('fenetre: 0 ; 10 ; 0 ; 6', 'verifier: cercle_par A ; B', '---'))
		).toContain('Ligne 2 : vérification « cercle_par » inconnue (droite_par)');
	});

	it('droite_par attend deux points', () => {
		expect(messages(block('fenetre: 0 ; 10 ; 0 ; 6', 'verifier: droite_par A', '---'))).toContain(
			'Ligne 2 : droite_par attend deux points : « droite_par A ; B »'
		);
	});

	it('droite_par : deux points distincts', () => {
		expect(
			messages(block('fenetre: 0 ; 10 ; 0 ; 6', 'verifier: droite_par A ; A', '---'))
		).toContain('Ligne 2 : droite_par attend deux points différents');
	});

	it('`case:` qui n’est pas un numéro', () => {
		expect(
			messages(block('case: x', 'fenetre: 0 ; 10 ; 0 ; 6', 'verifier: droite_par A ; B', '---'))
		).toContain('Ligne 1 : case: attend un numéro de case (0, 1, 2…)');
	});

	it('les erreurs de la figure restent celles de ```figure (fenêtre manquante)', () => {
		expect(messages(block('verifier: droite_par A ; B', '---', 'A = point(1, 2)'))).toContain(
			'Fenêtre manquante : ajouter « fenetre: xmin ; xmax ; ymin ; ymax »'
		);
	});
});

describe('```figure inchangé', () => {
	it('une ligne `verifier:` dans un bloc ```figure reste refusée', () => {
		const node = firstNode(
			['```figure', 'fenetre: 0 ; 10 ; 0 ; 6', 'verifier: droite_par A ; B', '---', '```'].join(
				'\n'
			)
		);
		expect(node.construction).toBeUndefined();
		expect(node.errors.map((e) => e.message).join(' ')).toContain('verifier: droite_par A ; B');
	});
});

describe('nom du bloc (décision de David du 2026-10-25)', () => {
	it('```construction n’ouvre pas le bloc (le mot désigne les constructions animées)', () => {
		const node = parseMarkdown(
			[
				'```construction',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'verifier: droite_par A ; B',
				'---',
				'```'
			].join('\n')
		).children[0];
		expect(node?.type).not.toBe('figure');
	});
});
