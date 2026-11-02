/**
 * Juge d'une case « figure » : symétrique sur quadrillage (`verifier: symetrique par d`,
 * chantier `controles-figure`, phase 0 du lot 1 validée par David le 2026-11-02,
 * `docs/wip/controles-figure-progress.md` § 3).
 *
 * L'élève trace (outil segment) l'image de tout ce qui est tracé dans la figure sauf
 * l'axe ; `par O` (un point) : symétrie centrale. On juge le RÉSULTAT : image en
 * morceaux, trait repassé sur la figure de départ ou sur l'axe : sans effet.
 * Figures écrites comme le prof les écrit, positions par le vrai registre.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionPositions, constructionShapes } from '../positions';
import {
	ConstructionAuthorError,
	OVERSHOOT_FEEDBACK,
	assertConstructionChecks,
	judgeConstruction
} from '../judge';
import {
	SYMMETRY_MISSING_FEEDBACK,
	SYMMETRY_NOT_IN_PLACE_FEEDBACK,
	SYMMETRY_OBLIQUE_FEEDBACK,
	SYMMETRY_SLID_CENTRAL_FEEDBACK,
	SYMMETRY_SLID_FEEDBACK
} from '../symmetry';
import { solutionLines } from '../drawing';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';

function checksOf(source: string) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return spec.checks;
}

function judge(source: string, answer: string) {
	return judgeConstruction(
		checksOf(source),
		constructionPositions(source),
		answer,
		constructionShapes(source)
	);
}

function assertChecks(source: string) {
	assertConstructionChecks(
		checksOf(source),
		constructionPositions(source),
		constructionShapes(source)
	);
}

const seg = (x1: number, y1: number, x2: number, y2: number) => `segment(${x1};${y1};${x2};${y2})`;

// Triangle ABC, axe vertical x = 6 : image A'(10 ; 2), B'(8 ; 2), C'(8 ; 6)
const VERTICAL = [
	'fenetre: 0 ; 12 ; 0 ; 8',
	'grille: 1',
	'verifier: symetrique par d',
	'---',
	'P = point(6, 0)',
	'Q = point(6, 8)',
	'd = droite(P, Q)',
	'A = point(2, 2)',
	'B = point(4, 2)',
	'C = point(4, 6)',
	'polygone(A, B, C)'
].join('\n');
const IMAGE = [seg(10, 2, 8, 2), seg(8, 2, 8, 6), seg(8, 6, 10, 2)].join('|');

describe('symétrique axial — nominal et limites (juste)', () => {
	it('l’image complète', () => {
		expect(judge(VERTICAL, IMAGE)).toEqual({ status: 'correct' });
	});

	it('tracée dans un autre ordre, bouts inversés', () => {
		const answer = [seg(10, 2, 8, 6), seg(8, 2, 10, 2), seg(8, 6, 8, 2)].join('|');
		expect(judge(VERTICAL, answer)).toEqual({ status: 'correct' });
	});

	it('un côté en deux morceaux', () => {
		const answer = [seg(10, 2, 9, 2), seg(9, 2, 8, 2), seg(8, 2, 8, 6), seg(8, 6, 10, 2)].join('|');
		expect(judge(VERTICAL, answer)).toEqual({ status: 'correct' });
	});

	it('un trait repassé sur la figure de départ ou sur l’axe : sans effet', () => {
		const answer = [IMAGE, seg(2, 2, 4, 2), seg(6, 1, 6, 5)].join('|');
		expect(judge(VERTICAL, answer)).toEqual({ status: 'correct' });
	});

	it('rien tracé → vide', () => {
		expect(judge(VERTICAL, '')).toEqual({ status: 'empty' });
	});
});

describe('symétrique axial — erreurs', () => {
	it('un côté manque', () => {
		const answer = [seg(10, 2, 8, 2), seg(8, 2, 8, 6)].join('|');
		expect(judge(VERTICAL, answer)).toEqual({
			status: 'incorrect',
			feedback: SYMMETRY_MISSING_FEEDBACK
		});
	});

	it('un trait hors de l’image', () => {
		const answer = [seg(10, 2, 8, 2), seg(8, 2, 8, 6), seg(8, 6, 11, 7)].join('|');
		expect(judge(VERTICAL, answer)).toEqual({
			status: 'incorrect',
			feedback: SYMMETRY_NOT_IN_PLACE_FEEDBACK
		});
	});

	it('un trait sur la droite d’un côté, mais à côté de la figure : pas à sa place', () => {
		// [BB'] : sur la droite y = 2 (celle de [AB] et de [A'B']), entre les deux figures
		expect(judge(VERTICAL, [IMAGE, seg(4, 2, 8, 2)].join('|'))).toEqual({
			status: 'incorrect',
			feedback: SYMMETRY_NOT_IN_PLACE_FEEDBACK
		});
	});

	it('un côté prolongé : il dépasse', () => {
		const answer = [seg(11, 2, 8, 2), seg(8, 2, 8, 6), seg(8, 6, 10, 2)].join('|');
		expect(judge(VERTICAL, answer)).toEqual({ status: 'incorrect', feedback: OVERSHOOT_FEEDBACK });
	});

	it('la figure glissée (translation) au lieu d’être retournée', () => {
		// A(2;2) B(4;2) C(4;6) décalés de 6 carreaux vers la droite
		const answer = [seg(8, 2, 10, 2), seg(10, 2, 10, 6), seg(10, 6, 8, 2)].join('|');
		expect(judge(VERTICAL, answer)).toEqual({
			status: 'incorrect',
			feedback: SYMMETRY_SLID_FEEDBACK
		});
	});

	it('glissée en partie seulement (un côté juste) : message général, pas « glissé »', () => {
		// [B'C'] juste ; les deux autres traits sont ceux de la figure glissée
		const answer = [seg(8, 2, 8, 6), seg(10, 2, 10, 6), seg(10, 6, 8, 2)].join('|');
		expect(judge(VERTICAL, answer)).toEqual({
			status: 'incorrect',
			feedback: SYMMETRY_NOT_IN_PLACE_FEEDBACK
		});
	});

	it('des droites au lieu de segments → faux', () => {
		expect(judge(VERTICAL, 'droite(10;2;8;2)')).toEqual({ status: 'incorrect' });
	});
});

describe('compléter une figure pour la rendre symétrique (CE2-073, CM1-107)', () => {
	// La moitié gauche d'un rectangle qui touche l'axe x = 6
	const HALF = [
		'fenetre: 0 ; 12 ; 0 ; 8',
		'grille: 1',
		'verifier: symetrique par d',
		'---',
		'P = point(6, 0)',
		'Q = point(6, 8)',
		'd = droite(P, Q)',
		'A = point(6, 6)',
		'B = point(3, 6)',
		'C = point(3, 2)',
		'D = point(6, 2)',
		'segment(A, B)',
		'segment(B, C)',
		'segment(C, D)'
	].join('\n');

	it('l’autre moitié', () => {
		const answer = [seg(6, 6, 9, 6), seg(9, 6, 9, 2), seg(9, 2, 6, 2)].join('|');
		expect(judge(HALF, answer)).toEqual({ status: 'correct' });
	});

	it('un côté tracé d’un bord à l’autre, par-dessus la moitié donnée', () => {
		const answer = [seg(3, 6, 9, 6), seg(9, 6, 9, 2), seg(9, 2, 6, 2)].join('|');
		expect(judge(HALF, answer)).toEqual({ status: 'correct' });
	});

	it('la bonne figure de la correction : l’autre moitié seulement', () => {
		const source = HALF;
		const lines = solutionLines(
			checksOf(source),
			constructionPositions(source),
			[],
			constructionShapes(source)
		);
		expect(lines).toHaveLength(3);
		expect(lines.every((l) => l.kind === 'segment' && Math.min(l.x1, l.x2) >= 6)).toBe(true);
	});
});

describe('axe sur une diagonale du quadrillage (CM2-097)', () => {
	const DIAGONAL = [
		'fenetre: 0 ; 8 ; 0 ; 8',
		'grille: 1',
		'verifier: symetrique par d',
		'---',
		'P = point(0, 0)',
		'Q = point(8, 8)',
		'd = droite(P, Q)',
		'A = point(1, 3)',
		'B = point(1, 6)',
		'C = point(2, 6)',
		'segment(A, B)',
		'segment(B, C)'
	].join('\n');

	it('l’image par la diagonale', () => {
		expect(judge(DIAGONAL, [seg(3, 1, 6, 1), seg(6, 1, 6, 2)].join('|'))).toEqual({
			status: 'correct'
		});
	});

	it('retourné comme si l’axe était vertical → message de l’axe oblique', () => {
		// Retourné par la verticale x = 2,5 (un « L » retourné : pas une translation)
		expect(judge(DIAGONAL, [seg(4, 3, 4, 6), seg(4, 6, 3, 6)].join('|'))).toEqual({
			status: 'incorrect',
			feedback: SYMMETRY_OBLIQUE_FEEDBACK
		});
	});
});

describe('symétrie centrale (5e, `par O`)', () => {
	const CENTRAL = [
		'fenetre: 0 ; 12 ; 0 ; 8',
		'grille: 1',
		'verifier: symetrique par O',
		'---',
		'O = point(6, 4)',
		'A = point(2, 2)',
		'B = point(4, 2)',
		'C = point(4, 3)',
		'segment(A, B)',
		'segment(B, C)'
	].join('\n');

	it('l’image par le demi-tour', () => {
		expect(judge(CENTRAL, [seg(10, 6, 8, 6), seg(8, 6, 8, 5)].join('|'))).toEqual({
			status: 'correct'
		});
	});

	it('glissée au lieu de faire un demi-tour', () => {
		const answer = [seg(8, 4, 10, 4), seg(10, 4, 10, 5)].join('|');
		expect(judge(CENTRAL, answer)).toEqual({
			status: 'incorrect',
			feedback: SYMMETRY_SLID_CENTRAL_FEEDBACK
		});
	});

	it('retournée par un axe au lieu du point : pas à sa place', () => {
		// Image par l'axe vertical x = 6
		const answer = [seg(10, 2, 8, 2), seg(8, 2, 8, 3)].join('|');
		expect(judge(CENTRAL, answer)).toEqual({
			status: 'incorrect',
			feedback: SYMMETRY_NOT_IN_PLACE_FEEDBACK
		});
	});
});

describe('forme `symetrique A ; B ; C par d` : ces traits-là seulement', () => {
	const LISTED = [
		'fenetre: 0 ; 12 ; 0 ; 8',
		'grille: 1',
		'verifier: symetrique A ; B ; C par d',
		'---',
		'P = point(6, 0)',
		'Q = point(6, 8)',
		'd = droite(P, Q)',
		'A = point(2, 2)',
		'B = point(4, 2)',
		'C = point(4, 6)',
		'polygone(A, B, C)',
		'E = point(1, 7)',
		'F = point(3, 7)',
		'segment(E, F)'
	].join('\n');

	it('l’image du triangle seul suffit', () => {
		expect(judge(LISTED, IMAGE)).toEqual({ status: 'correct' });
	});

	it('l’image de [EF] en plus est un trait de trop', () => {
		expect(judge(LISTED, [IMAGE, seg(11, 7, 9, 7)].join('|'))).toEqual({
			status: 'incorrect',
			feedback: SYMMETRY_NOT_IN_PLACE_FEEDBACK
		});
	});
});

describe('erreurs de l’auteur (refus à la publication)', () => {
	const figure = (check: string, ...body: string[]) =>
		['fenetre: 0 ; 12 ; 0 ; 8', 'grille: 1', `verifier: ${check}`, '---', ...body].join('\n');
	const AXIS = ['P = point(6, 0)', 'Q = point(6, 8)', 'd = droite(P, Q)'];

	it('figure juste : aucune erreur', () => {
		expect(() => assertChecks(VERTICAL)).not.toThrow();
	});

	it('axe ou centre inconnu', () => {
		const source = figure('symetrique par e', ...AXIS, 'A = point(2, 2)', 'B = point(4, 2)');
		expect(() => assertChecks(source)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(source)).toThrow(/e/);
	});

	it('rien à transformer (l’axe seul)', () => {
		expect(() => assertChecks(figure('symetrique par d', ...AXIS))).toThrow(/rien à transformer/);
	});

	it('image hors de la fenêtre', () => {
		const source = figure(
			'symetrique par d',
			...AXIS,
			'A = point(0, 2)',
			'B = point(-1, 2)',
			'segment(A, B)'
		);
		expect(() => assertChecks(source)).toThrow(/fenêtre/);
	});

	it('un sommet de l’image hors des nœuds du quadrillage', () => {
		const source = figure(
			'symetrique par d',
			...AXIS,
			'A = point(2.5, 2)',
			'B = point(4, 2)',
			'segment(A, B)'
		);
		expect(() => assertChecks(source)).toThrow(/nœud/);
	});

	it('forme à points : un point inconnu', () => {
		const source = figure('symetrique A ; Z par d', ...AXIS, 'A = point(2, 2)');
		expect(() => assertChecks(source)).toThrow(/Z/);
	});
});
