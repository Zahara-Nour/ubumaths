/**
 * Bloc ```courbe — vecteur à tracer (`tracer: vecteur (3 ; -2)`) : analyse et calcul pur
 *
 * Spécification validée par David le 2026-11-01 (`docs/archive/wip/points-repere-progress.md`
 * § 3, lot 3) et précisée le 2026-11-03 (§ 10) : nom facultatif, origine imposée
 * `depuis A` (A de `points:`), phrases de la correction, flèche juste depuis
 * l'origine de l'élève quand elle tient dans la fenêtre.
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { isCourbeAnswerCorrect } from '../../utils/courbe-tracer';
import {
	isTracedVectorCorrect,
	readVectorExpected,
	solutionVector,
	tracedVectorMistake,
	vectorExpected
} from '../../utils/courbe-vecteur';
import type { CourbeNode } from '../../types/courbe';

const WINDOW = ['x: -5 ; 5', 'y: -5 ; 5', 'grille: 1'];
const GRID = {
	window: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
	grid: { x: 1, y: 1 },
	size: 'moyenne' as const
};
const block = (...lines: string[]) => parseCourbeContent(lines.join('\n'));

function spec(node: CourbeNode) {
	expect(node.errors).toEqual([]);
	expect(node.spec).not.toBeNull();
	return node.spec!;
}

function errorsOf(node: CourbeNode): string {
	expect(node.spec).toBeNull();
	return node.errors.map((e) => e.message).join(' | ');
}

describe('tracer: vecteur — lecture du bloc', () => {
	it('origine libre, sans nom', () => {
		const s = spec(block(...WINDOW, 'tracer: vecteur (3 ; -2)'));
		expect(s.tracer).toBeUndefined();
		expect(s.vecteur).toEqual({ name: '', coords: { x: 3, y: -2 }, line: 4 });
	});

	it('nommé, espaces libres, virgule décimale', () => {
		const s = spec(block('x: -5 ; 5', 'y: -5 ; 5', 'grille: 0,5', 'tracer: vecteur u=(1,5;-2)'));
		expect(s.vecteur).toMatchObject({ name: 'u', coords: { x: 1.5, y: -2 } });
	});

	it('origine imposée : A pris dans points:, quel que soit l’ordre des lignes', () => {
		const s = spec(block(...WINDOW, 'tracer: vecteur (3 ; -2) depuis A', 'points: A(-1;2)'));
		expect(s.vecteur).toMatchObject({ from: 'A', origin: { x: -1, y: 2 } });
	});

	it('masqué : les coordonnées seules disparaissent, `depuis A` reste', () => {
		const s = spec(block(...WINDOW, 'points: A(-1;2)', 'tracer: vecteur u = ? depuis A'));
		expect(s.vecteur).toMatchObject({ name: 'u', coords: null, from: 'A' });
	});

	it('refusé : vecteur nul', () => {
		expect(errorsOf(block(...WINDOW, 'tracer: vecteur (0 ; 0)'))).toMatch(/vecteur nul/);
	});

	it('refusé : coordonnée hors de la grille', () => {
		expect(errorsOf(block(...WINDOW, 'tracer: vecteur (1,5 ; 2)'))).toMatch(/grille/);
	});

	it('refusé : trop grand pour la fenêtre', () => {
		expect(errorsOf(block(...WINDOW, 'tracer: vecteur (11 ; 0)'))).toMatch(/ne tient pas/);
	});

	it('refusé : écriture illisible (expression, nom en majuscule, sans parenthèses)', () => {
		expect(errorsOf(block(...WINDOW, 'tracer: vecteur (2*3 ; 1)'))).toMatch(/vecteur/);
		expect(errorsOf(block(...WINDOW, 'tracer: vecteur U = (3 ; 1)'))).toMatch(/vecteur/);
		expect(errorsOf(block(...WINDOW, 'tracer: vecteur 3 ; 1'))).toMatch(/vecteur/);
	});

	it('refusé : `depuis A` sans A dans points:', () => {
		expect(errorsOf(block(...WINDOW, 'tracer: vecteur (3 ; 1) depuis A'))).toMatch(/A.*points:/);
	});

	it('refusé : A hors d’un nœud, ou extrémité hors de la fenêtre', () => {
		expect(
			errorsOf(block(...WINDOW, 'points: A(0.5;2)', 'tracer: vecteur (3 ; 1) depuis A'))
		).toMatch(/nœud/);
		expect(
			errorsOf(block(...WINDOW, 'points: A(4;2)', 'tracer: vecteur (3 ; 1) depuis A'))
		).toMatch(/fenêtre/);
	});

	it('refusé : avec placer:', () => {
		expect(errorsOf(block(...WINDOW, 'placer: A=(1 ; 1)', 'tracer: vecteur (3 ; 1)'))).toMatch(
			/tracer: et placer: ne vont pas ensemble/
		);
	});

	it('case: accepté', () => {
		expect(spec(block('case: 0', ...WINDOW, 'tracer: vecteur (3 ; 1)')).vecteur).toBeDefined();
	});
});

describe('réponse attendue et juge', () => {
	it('réponse attendue écrite et relue', () => {
		expect(vectorExpected({ x: 3, y: -2 })).toBe('vecteur 3;-2');
		expect(vectorExpected({ x: 1.5, y: 2 }, { x: -1, y: 0 })).toBe('vecteur 1.5;2 depuis -1;0');
		expect(readVectorExpected('vecteur 1.5;2 depuis -1;0')).toEqual({
			u: { x: 1.5, y: 2 },
			origin: { x: -1, y: 0 }
		});
		expect(readVectorExpected('y = 2x')).toBeNull();
	});

	it('origine libre : juste où qu’il soit', () => {
		expect(isTracedVectorCorrect('0;0/3;-2', 'vecteur 3;-2')).toBe(true);
		expect(isTracedVectorCorrect('-4;3/-1;1', 'vecteur 3;-2')).toBe(true);
		expect(isTracedVectorCorrect('3;-2/0;0', 'vecteur 3;-2')).toBe(false);
		expect(isTracedVectorCorrect('0;0/', 'vecteur 3;-2')).toBe(false);
		expect(isTracedVectorCorrect('', 'vecteur 3;-2')).toBe(false);
	});

	it('origine imposée : il faut partir de A', () => {
		expect(isTracedVectorCorrect('-1;2/2;0', 'vecteur 3;-2 depuis -1;2')).toBe(true);
		expect(isTracedVectorCorrect('0;0/3;-2', 'vecteur 3;-2 depuis -1;2')).toBe(false);
	});

	it('isCourbeAnswerCorrect reconnaît le vecteur', () => {
		expect(isCourbeAnswerCorrect('1;1/4;-1', 'vecteur 3;-2')).toBe(true);
		expect(isCourbeAnswerCorrect('1;1/4;-2', 'vecteur 3;-2')).toBe(false);
		expect(isCourbeAnswerCorrect('2;3', '2;3')).toBe(true);
		expect(isCourbeAnswerCorrect('0;-1/1;1', 'y = 2x - 1')).toBe(true);
	});
});

describe('phrases de la correction', () => {
	const U = { u: { x: 3, y: -2 }, name: '' };

	it('juste : aucune', () => {
		expect(tracedVectorMistake('0;0/3;-2', U)).toBeNull();
	});

	it('points manquants', () => {
		expect(tracedVectorMistake('0;0/', U)).toEqual({
			text: 'Il faut placer l’origine et l’extrémité.'
		});
		expect(tracedVectorMistake('-1;2/', { ...U, origin: { x: -1, y: 2 } })).toEqual({
			text: 'Il faut placer l’extrémité.'
		});
	});

	it('points confondus', () => {
		expect(tracedVectorMistake('1;1/1;1', U)).toEqual({
			text: 'Ton origine et ton extrémité sont au même endroit.'
		});
	});

	it('sens inversé, puis échange des coordonnées', () => {
		expect(tracedVectorMistake('3;-2/0;0', U)).toEqual({
			text: 'Ta flèche va dans le mauvais sens : elle représente le vecteur (-3 ; 2).'
		});
		expect(tracedVectorMistake('0;0/-2;3', U)).toEqual({
			text: 'Ta flèche représente le vecteur (-2 ; 3) : tu as échangé l’abscisse et l’ordonnée.'
		});
	});

	it('autre erreur : sans nom, puis nommé (formule)', () => {
		expect(tracedVectorMistake('0;0/2;1', U)).toEqual({
			text: 'Ta flèche représente le vecteur (2 ; 1), pas (3 ; -2).'
		});
		expect(tracedVectorMistake('0;0/2;1', { ...U, name: 'u' })).toEqual({
			text: 'Ta flèche représente le vecteur (2 ; 1), pas',
			latex: '\\vec{u}\\,(3\\,;\\,-2)'
		});
	});

	it('origine imposée, bon vecteur mais autre origine : la phrase le dit', () => {
		expect(tracedVectorMistake('0;0/3;-2', { ...U, origin: { x: -1, y: 2 } })).toEqual({
			text: 'Ta flèche ne part pas de l’origine imposée.'
		});
	});

	it('décimaux en virgule', () => {
		expect(tracedVectorMistake('0;0/1;1', { u: { x: 1.5, y: 1 }, name: '' })?.text).toBe(
			'Ta flèche représente le vecteur (1 ; 1), pas (1,5 ; 1).'
		);
	});
});

describe('flèche de la correction', () => {
	const u = { x: 3, y: -2 };

	it('depuis l’origine de l’élève quand elle tient', () => {
		expect(solutionVector(GRID, u, { x: -4, y: 3 })).toEqual({
			from: { x: -4, y: 3 },
			to: { x: -1, y: 1 }
		});
	});

	it('sinon, ou sans origine : depuis le nœud le plus proche de l’origine du repère', () => {
		expect(solutionVector(GRID, u, { x: 4, y: 0 })).toEqual({
			from: { x: 0, y: 0 },
			to: { x: 3, y: -2 }
		});
		expect(solutionVector(GRID, u, null)).toEqual({ from: { x: 0, y: 0 }, to: { x: 3, y: -2 } });
		// (0 ; 0) ne convient pas : le plus proche qui tient, à égalité l’abscisse la plus petite
		expect(solutionVector(GRID, { x: 0, y: 8 }, null)).toEqual({
			from: { x: 0, y: -3 },
			to: { x: 0, y: 5 }
		});
	});

	it('origine imposée : depuis elle', () => {
		expect(solutionVector(GRID, u, { x: 0, y: 0 }, { x: -1, y: 2 })).toEqual({
			from: { x: -1, y: 2 },
			to: { x: 2, y: 0 }
		});
	});
});
