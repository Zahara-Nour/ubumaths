/**
 * Juge d'une case « figure » (bloc ```construction) — comportements de la
 * phase 0 de CP-059 (`docs/wip/geometrie-validation-progress.md` § 3) :
 * on juge le RÉSULTAT par des positions, en tout-ou-rien, avec le message de
 * la première vérification ratée.
 */
import { describe, it, expect } from 'vitest';
import { judgeConstruction } from '../judge';
import { parseConstructionAnswer, serializeConstructionAnswer } from '../answer';
import type { ConstructionCheck } from '$lib/ubumark/types/construction';

const POINTS = new Map([
	['A', { x: 1, y: 2 }],
	['B', { x: 7, y: 2 }],
	['C', { x: 4, y: 5 }]
]);

const AB: ConstructionCheck[] = [{ kind: 'droite_par', points: ['A', 'B'], line: 3 }];

const judge = (answer: string) => judgeConstruction(AB, POINTS, answer);

describe('réponse de l’élève : lecture', () => {
	it('lit une ou plusieurs droites', () => {
		expect(parseConstructionAnswer('droite(1;2;7;2)')).toEqual([
			{ kind: 'droite', x1: 1, y1: 2, x2: 7, y2: 2 }
		]);
		expect(parseConstructionAnswer('droite(1;2;7;2)|droite(0;0;1.5;-2)')).toHaveLength(2);
		expect(parseConstructionAnswer('')).toEqual([]);
	});

	it('aller-retour avec l’écriture', () => {
		const lines = [{ kind: 'droite' as const, x1: 1, y1: 2, x2: 7.25, y2: -2 }];
		expect(parseConstructionAnswer(serializeConstructionAnswer(lines))).toEqual(lines);
	});

	it('refuse une réponse illisible, démesurée ou dégénérée', () => {
		expect(parseConstructionAnswer('cercle(1;2;3)')).toBeNull();
		expect(parseConstructionAnswer('droite(1;2;7)')).toBeNull();
		expect(parseConstructionAnswer('droite(1;2;1;2)')).toBeNull(); // deux fois le même point
		expect(parseConstructionAnswer('droite(1e9;2;7;2)')).toBeNull();
		expect(parseConstructionAnswer('droite(NaN;2;7;2)')).toBeNull();
		expect(parseConstructionAnswer(Array(21).fill('droite(1;2;7;2)').join('|'))).toBeNull();
		expect(parseConstructionAnswer('droite(1;2;7;2)'.padEnd(2000, ' '))).toBeNull();
	});
});

describe('droite_par A ; B — tableau de la phase 0', () => {
	it('droite par A et B : juste', () => {
		expect(judge('droite(1;2;7;2)')).toEqual({ status: 'correct' });
	});

	it('droite par B et A : juste aussi', () => {
		expect(judge('droite(7;2;1;2)')).toEqual({ status: 'correct' });
	});

	it('droite qui passe par A et B, tracée depuis d’autres points : juste (on juge la droite)', () => {
		expect(judge('droite(3;2;5;2)')).toEqual({ status: 'correct' });
	});

	it('droite par A et B + une autre : faux, une droite de trop', () => {
		expect(judge('droite(1;2;7;2)|droite(1;2;4;5)')).toEqual({
			status: 'incorrect',
			feedback: 'Tu as tracé une droite de trop.'
		});
	});

	it('droite par A et C (le point piège) : faux', () => {
		expect(judge('droite(1;2;4;5)')).toEqual({
			status: 'incorrect',
			feedback: 'Ta droite passe par A et C, pas par B.'
		});
	});

	it('droite par A et un point proche de B : faux', () => {
		expect(judge('droite(1;2;7;2.3)')).toEqual({
			status: 'incorrect',
			feedback: 'Ta droite ne passe pas par le point B.'
		});
	});

	it('droite par B seulement : nomme A', () => {
		expect(judge('droite(7;2;7;0)')).toEqual({
			status: 'incorrect',
			feedback: 'Ta droite ne passe pas par le point A.'
		});
	});

	it('droite qui ne passe ni par A ni par B', () => {
		expect(judge('droite(0;0;1;1)')).toEqual({
			status: 'incorrect',
			feedback: 'Ta droite ne passe ni par le point A, ni par le point B.'
		});
	});

	it('tolérance fixée par la figure, pas par les points tracés (réponse forgée)', () => {
		// Pente 1e-4 depuis (1e6 ; 101.9999) : passe à 6e-4 de B
		expect(judge('droite(1000000;101.9999;1;2)').status).toBe('incorrect');
	});

	it('rien tracé : vide (le bouton Valider est grisé, la réponse ne compte pas)', () => {
		expect(judge('')).toEqual({ status: 'empty' });
	});

	it('réponse illisible : faux, sans message', () => {
		expect(judge('n’importe quoi')).toEqual({ status: 'incorrect' });
	});

	it('point de la vérification absent de la figure : erreur de l’auteur, pas un verdict', () => {
		expect(() =>
			judgeConstruction(
				[{ kind: 'droite_par', points: ['A', 'Z'], line: 3 }],
				POINTS,
				'droite(1;2;7;2)'
			)
		).toThrow('verifier: le point Z n’existe pas dans la figure');
	});
});

describe('plusieurs vérifications', () => {
	const TWO: ConstructionCheck[] = [
		{ kind: 'droite_par', points: ['A', 'B'], line: 3 },
		{ kind: 'droite_par', points: ['A', 'C'], line: 4 }
	];

	it('chaque vérification prend sa droite, dans n’importe quel ordre', () => {
		expect(judgeConstruction(TWO, POINTS, 'droite(1;2;4;5)|droite(1;2;7;2)')).toEqual({
			status: 'correct'
		});
	});

	it('le message vise une droite libre, pas celle d’une autre vérification', () => {
		// AC juste ; la seconde droite passe par B seulement
		expect(judgeConstruction(TWO, POINTS, 'droite(1;2;4;5)|droite(7;2;7;0)')).toEqual({
			status: 'incorrect',
			feedback: 'Ta droite ne passe pas par le point A.'
		});
	});

	it('une seule droite pour deux vérifications : message de la seconde', () => {
		expect(judgeConstruction(TWO, POINTS, 'droite(1;2;7;2)')).toEqual({
			status: 'incorrect',
			feedback: 'Il manque la droite qui passe par A et C.'
		});
	});
});
