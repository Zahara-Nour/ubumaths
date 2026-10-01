/**
 * Bloc ```figure — analyse de l'en-tête (spécification validée le 2026-10-01)
 *
 * Le parseur reste LÉGER (aucun import de geometry-core) : il découpe le bloc
 * en en-tête + script brut. L'interprétation est faite par la scène.
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent, findFigureBlocks, parseFigure } from '../../parser/figure-parser';

const TRIANGLE = `fenetre: -1 ; 8 ; -1 ; 6
taille: petite
description: Triangle rectangle ABC.
---
A = point(0, 0)
B = point(5, 0)
C = point(0, 4)
p = polygone(A, B, C)`;

describe('figure — en-tête', () => {
	it('lit fenêtre, taille, description et garde le script brut', () => {
		const node = parseFigureContent(TRIANGLE);
		expect(node.type).toBe('figure');
		expect(node.errors).toEqual([]);
		expect(node.header.window).toEqual({ xMin: -1, xMax: 8, yMin: -1, yMax: 6 });
		expect(node.header.size).toBe('petite');
		expect(node.header.description).toBe('Triangle rectangle ABC.');
		expect(node.script).toBe(
			'A = point(0, 0)\nB = point(5, 0)\nC = point(0, 4)\np = polygone(A, B, C)'
		);
		// Ligne 1 du script = ligne 5 du bloc
		expect(node.scriptStartLine).toBe(5);
		expect(node.source).toBe(TRIANGLE);
	});

	it('taille par défaut : moyenne ; description absente : null', () => {
		const node = parseFigureContent('fenetre: 0 ; 4 ; 0 ; 3\n---\nA = point(1, 1)');
		expect(node.header.size).toBe('moyenne');
		expect(node.header.description).toBeNull();
	});

	it('bornes issues des variables de template : `-2`, `2{,}5`, `--1`', () => {
		const node = parseFigureContent('fenetre: --1 ; 2{,}5 ; -2 ; 3\n---\nA = point(0, 0)');
		expect(node.errors).toEqual([]);
		expect(node.header.window).toEqual({ xMin: 1, xMax: 2.5, yMin: -2, yMax: 3 });
	});

	it('accepte `fenêtre` accentué', () => {
		expect(parseFigureContent('fenêtre: 0 ; 4 ; 0 ; 3\n---\n').errors).toEqual([]);
	});
});

describe('figure — erreurs d’en-tête situées (Q48)', () => {
	it('fenêtre manquante', () => {
		const node = parseFigureContent('taille: petite\n---\nA = point(0, 0)');
		expect(node.errors[0].message).toMatch(/fen[eê]tre/i);
	});

	it('séparateur --- manquant', () => {
		const node = parseFigureContent('fenetre: 0 ; 4 ; 0 ; 3\nA = point(0, 0)');
		expect(node.errors.some((e) => /---/.test(e.message))).toBe(true);
	});

	it('fenêtre à 3 bornes, bornes inversées, illisibles → ligne 1', () => {
		for (const w of ['0 ; 4 ; 0', '4 ; 0 ; 0 ; 3', '0 ; abc ; 0 ; 3', '0 ; 10^400 ; 0 ; 1']) {
			const node = parseFigureContent(`fenetre: ${w}\n---\n`);
			expect(node.errors[0]?.line, w).toBe(1);
		}
	});

	it('fenêtre aplatie (rapport hauteur/largeur extrême) refusée', () => {
		const node = parseFigureContent('fenetre: 0 ; 1000 ; 0 ; 1\n---\n');
		expect(node.errors[0].line).toBe(1);
	});

	it('clé inconnue et taille inconnue → ligne située', () => {
		const node = parseFigureContent(
			'fenetre: 0 ; 4 ; 0 ; 3\ncouleur: rouge\ntaille: énorme\n---\n'
		);
		expect(node.errors.map((e) => e.line)).toEqual([2, 3]);
	});
});

describe('figure — repérage dans un document', () => {
	it('bloc fermé', () => {
		const lines = [
			'Texte',
			'```figure',
			'fenetre: 0 ; 4 ; 0 ; 3',
			'---',
			'A = point(1, 1)',
			'```',
			'Suite'
		];
		expect(findFigureBlocks(lines)).toEqual([{ startIndex: 1, endIndex: 5, closed: true }]);
		const node = parseFigure(lines, 1, 5);
		expect(node.errors).toEqual([]);
		expect(node.script).toBe('A = point(1, 1)');
	});

	it('bloc non fermé : erreur, la suite du document n’est pas avalée au-delà d’une autre clôture', () => {
		const lines = [
			'```figure',
			'fenetre: 0 ; 4 ; 0 ; 3',
			'---',
			'A = point(1, 1)',
			'```python',
			'x = 1',
			'```'
		];
		const [block] = findFigureBlocks(lines);
		expect(block.closed).toBe(false);
		expect(block.endIndex).toBeLessThan(4);
		const node = parseFigure(lines, block.startIndex, block.endIndex);
		expect(node.errors.some((e) => /non fermé/.test(e.message))).toBe(true);
	});
});
