/**
 * Juge d'une case « figure » : compléter un carré / un rectangle sur
 * quadrillage (CP-060) — phase 0 validée par David le 2026-10-26
 * (`docs/wip/geometrie-validation-progress.md` § 7 et § 9). On juge le
 * RÉSULTAT : un côté en morceaux ou un trait repassé sur le côté donné ne
 * changent rien ; le carré peut être construit d'un côté ou de l'autre.
 */
import { describe, it, expect } from 'vitest';
import {
	ConstructionAuthorError,
	EXTRA_SEGMENT_FEEDBACK,
	NOT_A_SQUARE_FEEDBACK,
	NOT_CLOSED_FEEDBACK,
	NOT_ON_GRID_LINES_FEEDBACK,
	OVERSHOOT_FEEDBACK,
	PROLONGED_SIDE_FEEDBACK,
	judgeConstruction
} from '../judge';
import { parseConstructionAnswer } from '../answer';
import type { ConstructionCheck } from '$lib/ubumark/types/construction';

// Carré : côté donné [AB], horizontal ; les deux carrés possibles tiennent dans la fenêtre
const SQUARE_POINTS = new Map([
	['A', { x: 2, y: 3 }],
	['B', { x: 5, y: 3 }]
]);
const SQUARE: ConstructionCheck[] = [{ kind: 'carre', points: ['A', 'B'], line: 4 }];
const square = (answer: string) => judgeConstruction(SQUARE, SQUARE_POINTS, answer);

const ABOVE = 'segment(5;3;5;6)|segment(5;6;2;6)|segment(2;6;2;3)';
const BELOW = 'segment(5;3;5;0)|segment(5;0;2;0)|segment(2;0;2;3)';

// Rectangle : côtés donnés [AB] et [BC] ; D = (6 ; 5)
const RECTANGLE_POINTS = new Map([
	['A', { x: 2, y: 5 }],
	['B', { x: 2, y: 2 }],
	['C', { x: 6, y: 2 }]
]);
const RECTANGLE: ConstructionCheck[] = [{ kind: 'rectangle', points: ['A', 'B', 'C'], line: 4 }];
const rectangle = (answer: string) => judgeConstruction(RECTANGLE, RECTANGLE_POINTS, answer);

describe('réponse de l’élève : segments', () => {
	it('lit des segments, et des droites et segments mêlés', () => {
		expect(parseConstructionAnswer('segment(5;3;5;6)')).toEqual([
			{ kind: 'segment', x1: 5, y1: 3, x2: 5, y2: 6 }
		]);
		expect(parseConstructionAnswer('segment(5;3;5;6)|droite(1;2;7;2)')).toHaveLength(2);
	});

	it('refuse un segment dégénéré ou démesuré', () => {
		expect(parseConstructionAnswer('segment(5;3;5;3)')).toBeNull();
		expect(parseConstructionAnswer('segment(5;3;5;1e9)')).toBeNull();
	});
});

describe('carre A ; B — tableau de la phase 0', () => {
	it('les trois côtés au-dessus : juste', () => {
		expect(square(ABOVE)).toEqual({ status: 'correct' });
	});

	it('les trois côtés au-dessous : juste aussi (deux bonnes réponses)', () => {
		expect(square(BELOW)).toEqual({ status: 'correct' });
	});

	it('côtés tracés dans n’importe quel sens et n’importe quel ordre : juste', () => {
		expect(square('segment(2;3;2;6)|segment(5;6;5;3)|segment(2;6;5;6)')).toEqual({
			status: 'correct'
		});
	});

	it('un côté en morceaux (2 + 1 carreaux) : juste', () => {
		expect(square('segment(5;3;5;5)|segment(5;5;5;6)|segment(5;6;2;6)|segment(2;6;2;3)')).toEqual({
			status: 'correct'
		});
	});

	it('morceaux qui se chevauchent : juste', () => {
		expect(square('segment(5;3;5;5)|segment(5;4;5;6)|segment(5;6;2;6)|segment(2;6;2;3)')).toEqual({
			status: 'correct'
		});
	});

	it('un trait repassé sur le côté donné, en entier ou en partie : ignoré', () => {
		expect(square(`${ABOVE}|segment(2;3;5;3)`)).toEqual({ status: 'correct' });
		expect(square(`${ABOVE}|segment(3;3;4;3)`)).toEqual({ status: 'correct' });
	});

	it('un trait oblique : faux, suivre les lignes du quadrillage', () => {
		expect(square('segment(5;3;2;6)|segment(2;6;2;3)')).toEqual({
			status: 'incorrect',
			feedback: NOT_ON_GRID_LINES_FEEDBACK
		});
	});

	it('figure ouverte (un côté manque) : faux', () => {
		expect(square('segment(5;3;5;6)|segment(5;6;2;6)')).toEqual({
			status: 'incorrect',
			feedback: NOT_CLOSED_FEEDBACK
		});
	});

	it('figure ouverte (un côté trop court) : faux', () => {
		expect(square('segment(5;3;5;6)|segment(5;6;3;6)|segment(2;6;2;3)')).toEqual({
			status: 'incorrect',
			feedback: NOT_CLOSED_FEEDBACK
		});
	});

	it('fermée mais rectangle au lieu de carré : faux', () => {
		expect(square('segment(5;3;5;5)|segment(5;5;2;5)|segment(2;5;2;3)')).toEqual({
			status: 'incorrect',
			feedback: NOT_A_SQUARE_FEEDBACK
		});
	});

	it('le bon carré + un trait ailleurs : faux, trait de trop', () => {
		expect(square(`${ABOVE}|segment(7;1;8;1)`)).toEqual({
			status: 'incorrect',
			feedback: EXTRA_SEGMENT_FEEDBACK
		});
	});

	it('un trait aligné avec un côté, sans le toucher : faux, trait de trop (revue #CP-060)', () => {
		for (const extra of ['segment(7;3;8;3)', 'segment(8;6;9;6)', 'segment(5;0;5;1)']) {
			expect(square(`${ABOVE}|${extra}`)).toEqual({
				status: 'incorrect',
				feedback: EXTRA_SEGMENT_FEEDBACK
			});
		}
		// Commencé au-dessus, fini en dessous, sans tout effacer
		expect(square(`${BELOW}|segment(2;5;2;6)`)).toEqual({
			status: 'incorrect',
			feedback: EXTRA_SEGMENT_FEEDBACK
		});
		expect(rectangle('segment(6;2;6;5)|segment(6;5;2;5)|segment(8;5;9;5)')).toEqual({
			status: 'incorrect',
			feedback: EXTRA_SEGMENT_FEEDBACK
		});
	});

	it('les deux carrés : faux, traits de trop', () => {
		expect(square(`${ABOVE}|${BELOW}`)).toEqual({
			status: 'incorrect',
			feedback: EXTRA_SEGMENT_FEEDBACK
		});
	});

	it('un côté qui dépasse de la figure : faux', () => {
		expect(square('segment(5;3;5;7)|segment(5;6;2;6)|segment(2;6;2;3)')).toEqual({
			status: 'incorrect',
			feedback: OVERSHOOT_FEEDBACK
		});
	});

	it('le côté donné prolongé : faux, il dépasse', () => {
		expect(square(`${ABOVE}|segment(5;3;7;3)`)).toEqual({
			status: 'incorrect',
			feedback: OVERSHOOT_FEEDBACK
		});
	});

	it('fermée sur le côté donné prolongé : faux, il ne fallait pas le prolonger (essai de David)', () => {
		// Rectangle 5 × 3 dont la base prolonge [AB] de 2 carreaux
		expect(square('segment(5;3;7;3)|segment(7;3;7;6)|segment(7;6;2;6)|segment(2;6;2;3)')).toEqual({
			status: 'incorrect',
			feedback: PROLONGED_SIDE_FEEDBACK
		});
		// Un vrai carré 5 × 5, mais bâti sur le côté prolongé : « pas un carré » serait faux
		expect(square('segment(5;3;7;3)|segment(7;3;7;8)|segment(7;8;2;8)|segment(2;8;2;3)')).toEqual({
			status: 'incorrect',
			feedback: PROLONGED_SIDE_FEEDBACK
		});
		// Prolongé de l'autre côté de A, figure au-dessous
		expect(square('segment(2;3;0;3)|segment(0;3;0;0)|segment(0;0;5;0)|segment(5;0;5;3)')).toEqual({
			status: 'incorrect',
			feedback: PROLONGED_SIDE_FEEDBACK
		});
	});

	it('côté donné prolongé mais figure ouverte : faux, pas fermée', () => {
		expect(square('segment(5;3;7;3)|segment(7;3;7;6)')).toEqual({
			status: 'incorrect',
			feedback: NOT_CLOSED_FEEDBACK
		});
	});

	it('rien : vide', () => {
		expect(square('')).toEqual({ status: 'empty' });
	});

	it('une droite au lieu de segments : faux', () => {
		expect(square(`${ABOVE}|droite(0;0;1;1)`).status).toBe('incorrect');
	});

	it('réponse illisible : faux, sans message', () => {
		expect(square('segment(1;2)')).toEqual({ status: 'incorrect' });
	});

	it('côté donné oblique : les côtés suivent le carré, pas les lignes', () => {
		const points = new Map([
			['A', { x: 2, y: 2 }],
			['B', { x: 4, y: 3 }]
		]);
		expect(
			judgeConstruction(SQUARE, points, 'segment(4;3;3;5)|segment(3;5;1;4)|segment(1;4;2;2)')
		).toEqual({ status: 'correct' });
	});
});

describe('rectangle A ; B ; C — tableau de la phase 0', () => {
	it('les deux côtés qui manquent : juste', () => {
		expect(rectangle('segment(6;2;6;5)|segment(6;5;2;5)')).toEqual({ status: 'correct' });
	});

	it('en morceaux et repassé sur un côté donné : juste', () => {
		expect(
			rectangle('segment(6;2;6;4)|segment(6;4;6;5)|segment(2;5;6;5)|segment(2;2;2;5)')
		).toEqual({ status: 'correct' });
	});

	it('un trait oblique : faux', () => {
		expect(rectangle('segment(6;2;2;5)')).toEqual({
			status: 'incorrect',
			feedback: NOT_ON_GRID_LINES_FEEDBACK
		});
	});

	it('figure ouverte : faux', () => {
		expect(rectangle('segment(6;2;6;5)')).toEqual({
			status: 'incorrect',
			feedback: NOT_CLOSED_FEEDBACK
		});
	});

	it('le bon rectangle + un trait ailleurs : faux', () => {
		expect(rectangle('segment(6;2;6;5)|segment(6;5;2;5)|segment(8;1;8;2)')).toEqual({
			status: 'incorrect',
			feedback: EXTRA_SEGMENT_FEEDBACK
		});
	});

	it('un côté qui dépasse : faux', () => {
		expect(rectangle('segment(6;2;6;6)|segment(6;5;2;5)')).toEqual({
			status: 'incorrect',
			feedback: OVERSHOOT_FEEDBACK
		});
	});
});

describe('erreurs de l’auteur (jamais un verdict pour l’élève)', () => {
	it('point inconnu', () => {
		expect(() => judgeConstruction(SQUARE, new Map([['A', { x: 0, y: 0 }]]), ABOVE)).toThrow(
			ConstructionAuthorError
		);
	});

	it('carré ou rectangle aplati : deux sommets au même endroit', () => {
		const flat = new Map([
			['A', { x: 2, y: 3 }],
			['B', { x: 2, y: 3 }]
		]);
		expect(() => judgeConstruction(SQUARE, flat, ABOVE)).toThrow('au même endroit');
		const flatRectangle = new Map([
			['A', { x: 2, y: 5 }],
			['B', { x: 2, y: 2 }],
			['C', { x: 2, y: 2 }]
		]);
		expect(() => judgeConstruction(RECTANGLE, flatRectangle, 'segment(6;2;6;5)')).toThrow(
			'au même endroit'
		);
	});

	it('rectangle : A, B, C sans angle droit en B', () => {
		const points = new Map([
			['A', { x: 2, y: 5 }],
			['B', { x: 2, y: 2 }],
			['C', { x: 6, y: 3 }]
		]);
		expect(() => judgeConstruction(RECTANGLE, points, 'segment(6;3;6;6)')).toThrow(
			'pas d’angle droit en B'
		);
	});
});
