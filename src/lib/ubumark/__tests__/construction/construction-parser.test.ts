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
		).toContain('Ligne 2 : outil « compas » inconnu (droite, segment)');
	});

	it('vérification inconnue', () => {
		expect(
			messages(block('fenetre: 0 ; 10 ; 0 ; 6', 'verifier: cercle_par A ; B', '---'))
		).toContain('Ligne 2 : vérification « cercle_par » inconnue (droite_par, carre, rectangle)');
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

describe('carré et rectangle sur quadrillage (CP-060, § 7 et § 9)', () => {
	const messages = (markdown: string) => firstNode(markdown).errors.map((e) => e.message);

	it('`carre A ; B` avec l’outil segment', () => {
		const node = firstNode(
			block(
				'fenetre: 0 ; 10 ; 0 ; 7',
				'grille: 1',
				'outils: segment',
				'verifier: carre A ; B',
				'---',
				'A = point(2, 3, visible=faux)',
				'B = point(5, 3, visible=faux)',
				's = segment(A, B)'
			)
		);
		expect(node.errors).toEqual([]);
		expect(node.header.grid).toEqual({ x: 1, y: 1 });
		expect(node.construction).toEqual({
			tools: ['segment'],
			checks: [{ kind: 'carre', points: ['A', 'B'], line: 4 }]
		});
	});

	it('`rectangle A ; B ; C`', () => {
		const node = firstNode(
			block('fenetre: 0 ; 10 ; 0 ; 7', 'outils: segment', 'verifier: rectangle A ; B ; C', '---')
		);
		expect(node.construction?.checks).toEqual([
			{ kind: 'rectangle', points: ['A', 'B', 'C'], line: 3 }
		]);
	});

	it('`outils:` absent : l’outil de la vérification (segment pour un carré)', () => {
		const node = firstNode(block('fenetre: 0 ; 10 ; 0 ; 7', 'verifier: carre A ; B', '---'));
		expect(node.errors).toEqual([]);
		expect(node.construction?.tools).toEqual(['segment']);
	});

	it('carre attend deux points, rectangle trois, tous différents', () => {
		expect(messages(block('fenetre: 0 ; 10 ; 0 ; 7', 'verifier: carre A', '---'))).toContain(
			'Ligne 2 : carre attend deux points : « carre A ; B »'
		);
		expect(
			messages(block('fenetre: 0 ; 10 ; 0 ; 7', 'verifier: rectangle A ; B', '---'))
		).toContain('Ligne 2 : rectangle attend trois points : « rectangle A ; B ; C »');
		expect(
			messages(block('fenetre: 0 ; 10 ; 0 ; 7', 'verifier: rectangle A ; B ; A', '---'))
		).toContain('Ligne 2 : rectangle attend trois points différents');
	});

	it('un seul outil par bloc', () => {
		expect(
			messages(
				block('fenetre: 0 ; 10 ; 0 ; 7', 'outils: droite, segment', 'verifier: carre A ; B', '---')
			)
		).toContain('Ligne 2 : un seul outil par figure');
	});

	it('l’outil va avec la vérification', () => {
		expect(
			messages(block('fenetre: 0 ; 10 ; 0 ; 7', 'outils: droite', 'verifier: carre A ; B', '---'))
		).toContain('Ligne 3 : carre se trace avec l’outil segment (outils: segment)');
		expect(
			messages(
				block('fenetre: 0 ; 10 ; 0 ; 7', 'outils: segment', 'verifier: droite_par A ; B', '---')
			)
		).toContain('Ligne 3 : droite_par se trace avec l’outil droite (outils: droite)');
	});

	it('droites et polygones ne se mêlent pas', () => {
		expect(
			messages(
				block(
					'fenetre: 0 ; 10 ; 0 ; 7',
					'verifier: droite_par A ; B',
					'verifier: carre A ; B',
					'---'
				)
			)
		).toContain('Ligne 3 : carre se trace avec l’outil segment (outils: segment)');
	});

	it('un seul carré ou rectangle par figure', () => {
		expect(
			messages(
				block('fenetre: 0 ; 10 ; 0 ; 7', 'verifier: carre A ; B', 'verifier: carre C ; D', '---')
			)
		).toContain('Ligne 3 : un seul carré ou rectangle par figure');
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
