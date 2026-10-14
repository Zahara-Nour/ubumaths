/**
 * Champ de formule — géométrie des cadres imbriqués (spécification F2)
 * ====================================================================
 *
 * Les cadres sont calculés à partir des zones des caractères de chaque
 * sous-expression (mesurées par le composant) : une marge fine, puis à gauche et
 * à droite une bordure de plus que les cadres contenus (on attrape `2x` sur sa
 * bordure) ; jamais plus de 40 % du chemin vers une voisine (le signe qui les
 * sépare reste dehors), ni au-delà du fond du groupe, ni à travers la barre
 * d'une fraction.
 */
import { describe, expect, it } from 'vitest';
import {
	computeFrames,
	frameAt,
	fractionLimits,
	type Box,
	type FrameNode,
	type FrameOptions
} from '../frame-geometry';

// Constantes
const OPTIONS: FrameOptions = { padX: 2, padY: 2, band: 6, siblingShare: 0.4, groupPad: 10 };

// Fonctions
function box(left: number, top: number, right: number, bottom: number): Box {
	return { left, top, right, bottom };
}

/**
 * `2x + 1` : somme (0) de `2x` (1) et `1` (4) ; `2x` produit de `2` (2) et `x` (3).
 * Une ligne de caractères entre y = 0 et y = 20.
 */
const SUM_NODES: FrameNode[] = [
	{ id: 0, parent: null, children: [1, 4], role: null },
	{ id: 1, parent: 0, children: [2, 3], role: 'term' },
	{ id: 2, parent: 1, children: [], role: 'factor' },
	{ id: 3, parent: 1, children: [], role: 'factor' },
	{ id: 4, parent: 0, children: [], role: 'term' }
];
const SUM_RECTS = new Map<number, Box>([
	[0, box(0, 0, 60, 20)],
	[1, box(0, 0, 20, 20)],
	[2, box(0, 0, 10, 20)],
	[3, box(10, 0, 20, 20)],
	[4, box(50, 0, 60, 20)]
]);

describe('computeFrames : cadres imbriqués', () => {
	it('une partie sans partie dedans : ses caractères, plus la marge', () => {
		const frames = computeFrames(SUM_NODES, SUM_RECTS, OPTIONS);
		// À gauche, x touche 2 (facteurs juxtaposés) : pas de marge de ce côté
		expect(frames.get(3)).toEqual(box(10, -2, 22, 22));
	});

	it('2x dépasse d’une bordure les cadres de 2 et de x, à gauche et à droite seulement', () => {
		const frames = computeFrames(SUM_NODES, SUM_RECTS, OPTIONS);
		const twoX = frames.get(1);
		const two = frames.get(2);
		if (!twoX || !two) throw new Error('cadres absents');
		expect(twoX.left).toBe(two.left - OPTIONS.band);
		expect(twoX.top).toBe(-2);
		expect(twoX.bottom).toBe(22);
	});

	it('le signe voisin reste dehors : 40 % du chemin vers la partie suivante, au plus', () => {
		const frames = computeFrames(SUM_NODES, SUM_RECTS, OPTIONS);
		// 2x finit à 20, 1 commence à 50 : au plus 20 + 0,4 × 30 = 32
		expect(frames.get(1)?.right).toBeLessThanOrEqual(32);
		expect(frames.get(4)?.left).toBeGreaterThanOrEqual(50 - 0.4 * 30);
	});

	it('une partie reste dans le fond de son groupe', () => {
		const frames = computeFrames(SUM_NODES, SUM_RECTS, OPTIONS);
		// la somme va de 0 à 60 ; fond : 0,8 × 10 de marge
		expect(frames.get(1)?.left).toBeGreaterThanOrEqual(-8);
	});

	it('l’expression entière n’a pas de groupe : sa bordure n’est pas bornée', () => {
		const frames = computeFrames(SUM_NODES, SUM_RECTS, OPTIONS);
		const root = frames.get(0);
		const twoX = frames.get(1);
		if (!root || !twoX) throw new Error('cadres absents');
		expect(root.left).toBeLessThan(twoX.left);
	});
});

describe('frameAt : la sous-expression visée (A1, la plus profonde qui contient le point)', () => {
	const frames = computeFrames(SUM_NODES, SUM_RECTS, OPTIONS);

	it('sur x : x', () => {
		expect(frameAt(SUM_NODES, frames, 15, 10)).toBe(3);
	});

	it('sur la bordure de 2x, hors des cadres de 2 et de x : 2x', () => {
		const twoX = frames.get(1);
		const two = frames.get(2);
		if (!twoX || !two) throw new Error('cadres absents');
		expect(frameAt(SUM_NODES, frames, (twoX.left + two.left) / 2, 10)).toBe(1);
	});

	it('sur le « + » : la somme', () => {
		expect(frameAt(SUM_NODES, frames, 35, 10)).toBe(0);
	});

	it('loin de tout : rien', () => {
		expect(frameAt(SUM_NODES, frames, 500, 500)).toBeNull();
	});

	it('candidats restreints (nombres et lettres exclus) : sur x, le produit 2x', () => {
		expect(frameAt(SUM_NODES, frames, 15, 10, (id) => id !== 2 && id !== 3)).toBe(1);
	});
});

/**
 * Fraction (0) : numérateur (1) = `a + b` (termes 2 et 3), dénominateur (4).
 * Barre entre y = 30 (bas du numérateur) et y = 40 (haut du dénominateur).
 */
const FRACTION_NODES: FrameNode[] = [
	{ id: 0, parent: null, children: [1, 4], role: null },
	{ id: 1, parent: 0, children: [2, 3], role: 'numerator' },
	{ id: 2, parent: 1, children: [], role: 'term' },
	{ id: 3, parent: 1, children: [], role: 'term' },
	{ id: 4, parent: 0, children: [], role: 'denominator' }
];
const FRACTION_RECTS = new Map<number, Box>([
	[0, box(0, 0, 60, 70)],
	// La boîte de police d'un chiffre déborde sous son dessin : jusqu'à 36, sous la barre
	[1, box(0, 0, 60, 36)],
	[2, box(0, 0, 20, 36)],
	[3, box(40, 0, 60, 36)],
	[4, box(20, 40, 40, 70)]
]);

describe('barre de fraction (F2)', () => {
	it('fractionLimits : le numérateur s’arrête au-dessus de la barre, le dénominateur dessous', () => {
		const numerator = fractionLimits(FRACTION_NODES, FRACTION_RECTS, 2);
		const denominator = fractionLimits(FRACTION_NODES, FRACTION_RECTS, 4);
		expect(numerator.bottom).toBeLessThan(38);
		expect(denominator.top).toBeGreaterThan(38);
		expect(denominator.inDenominator).toBe(true);
		expect(numerator.inDenominator).toBe(false);
	});

	it('aucun cadre du numérateur ne descend sous la barre, même si la boîte de police déborde', () => {
		const frames = computeFrames(FRACTION_NODES, FRACTION_RECTS, OPTIONS);
		for (const id of [1, 2, 3]) expect(frames.get(id)?.bottom).toBeLessThan(38);
		expect(frames.get(4)?.top).toBeGreaterThan(38);
	});

	it('hors d’une fraction : aucune borne', () => {
		const limits = fractionLimits(SUM_NODES, SUM_RECTS, 3);
		expect(limits).toEqual({ top: -Infinity, bottom: Infinity, inDenominator: false });
	});
});
