/**
 * Les formes ajoutées au DSL pour l'atelier (géométrie, lot 2, L2 b de
 * `docs/wip/atelier-geometrie-lot2-phase0.md`, validée le 2026-10-18) :
 * `cercle(O, r)` (rayon en second, positionnel), `parallele(P, d)` et
 * `perpendiculaire(P, d)` (d droite, segment ou demi-droite). Rien de ce qui
 * existait ne change de sens : `cercle(O, A)` avec un point reste refusé.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { DslRuntimeError } from '../errors';
import { geoToNumber } from '../../compute/to-number';
import type { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import type { SymbolTable } from '../symbol-table';

// =============================================================================
// Outils
// =============================================================================

function idOf(symbols: SymbolTable, name: string): string {
	const id = symbols.get(name)?.figureId;
	if (id === undefined) throw new Error(`pas de symbole ${name}`);
	return id;
}

/** Deux points de la droite `name` (droite construite par deux points). */
function directionOf(figure: Figure, symbols: SymbolTable, name: string): { x: number; y: number } {
	const el = figure.getElementById(idOf(symbols, name));
	if (el === undefined || el.type !== 'line') throw new Error(`${name} n'est pas une droite`);
	const p = figure.getPosition(el.point1Id);
	const q = figure.getPosition(el.point2Id);
	if (!p || !q) throw new Error('points introuvables');
	return { x: geoToNumber(q.x) - geoToNumber(p.x), y: geoToNumber(q.y) - geoToNumber(p.y) };
}

function radiusOf(figure: Figure, symbols: SymbolTable, name: string): number {
	const el = figure.getElementById(idOf(symbols, name));
	if (el === undefined || el.type !== 'circleByRadius') throw new Error(`${name} : ${el?.type}`);
	return figure.resolveParam(el.radius);
}

// =============================================================================
// cercle(O, r)
// =============================================================================

describe('L2 b : cercle(O, r), le rayon en second argument', () => {
	it('un nombre', () => {
		const { figure, symbols } = runDsl('O = point(0, 0)\nc = cercle(O, 3)');
		expect(symbols.get('c')?.type).toBe('cercle');
		expect(radiusOf(figure, symbols, 'c')).toBe(3);
	});

	it('une expression, une valeur nommée', () => {
		const { figure, symbols } = runDsl('O = point(0, 0)\nk = 2\nc = cercle(O, 2*k)');
		expect(radiusOf(figure, symbols, 'c')).toBe(4);
	});

	it('un curseur : le cercle le suit', () => {
		const { figure, symbols } = runDsl(
			'O = point(0, 0)\nr = slider(min=1, max=5, valeur=2)\nc = cercle(O, r)'
		);
		expect(radiusOf(figure, symbols, 'c')).toBe(2);
		figure.moveSlider(idOf(symbols, 'r'), 4);
		figure.recompute();
		expect(radiusOf(figure, symbols, 'c')).toBe(4);
	});

	it('un point en second reste refusé, avec l’aide de toujours', () => {
		expect(() => runDsl('O = point(0, 0)\nA = point(2, 0)\nc = cercle(O, A)')).toThrow(/passant=/);
	});

	it('une droite en second est refusée', () => {
		expect(() =>
			runDsl('O = point(0, 0)\nA = point(2, 0)\nd = droite(O, A)\nc = cercle(O, d)')
		).toThrow(/rayon/);
	});

	it('rayon= garde son sens', () => {
		const { figure, symbols } = runDsl('O = point(0, 0)\nc = cercle(O, rayon=5)');
		expect(radiusOf(figure, symbols, 'c')).toBe(5);
	});
});

// =============================================================================
// parallele(P, d), perpendiculaire(P, d)
// =============================================================================

describe('L2 b : parallele(P, d) et perpendiculaire(P, d)', () => {
	const base = 'A = point(0, 1)\nB = point(1, 3)\nP = point(2, 0)';

	for (const kind of ['droite', 'segment', 'demidroite']) {
		it(`parallèle à un(e) ${kind}`, () => {
			const { figure, symbols } = runDsl(`${base}\nd = ${kind}(A, B)\np = parallele(P, d)`);
			const u = directionOf(figure, symbols, 'p');
			// Colinéaire à (1 ; 2)
			expect(u.x * 2 - u.y * 1).toBeCloseTo(0, 10);
			const el = figure.getElementById(idOf(symbols, 'p'));
			const through = el?.type === 'line' ? figure.getPosition(el.point1Id) : undefined;
			expect(through && [geoToNumber(through.x), geoToNumber(through.y)]).toEqual([2, 0]);
		});

		it(`perpendiculaire à un(e) ${kind}`, () => {
			const { figure, symbols } = runDsl(`${base}\nd = ${kind}(A, B)\nq = perpendiculaire(P, d)`);
			const u = directionOf(figure, symbols, 'q');
			// Orthogonal à (1 ; 2)
			expect(u.x * 1 + u.y * 2).toBeCloseTo(0, 10);
		});
	}

	it('la parallèle suit la droite quand ses points bougent', () => {
		const { figure, symbols } = runDsl(`${base}\nd = droite(A, B)\np = parallele(P, d)`);
		figure.movePoint(idOf(symbols, 'B'), numeric(1), numeric(2));
		figure.recompute();
		const u = directionOf(figure, symbols, 'p');
		expect(u.x * 1 - u.y * 1).toBeCloseTo(0, 10);
	});

	it('un cercle en second est refusé', () => {
		expect(() => runDsl(`${base}\nc = cercle(A, rayon=2)\np = parallele(P, c)`)).toThrow(/droite/);
	});

	it('parallele(P, A, B) garde son sens', () => {
		const { figure, symbols } = runDsl(`${base}\np = parallele(P, A, B)`);
		const u = directionOf(figure, symbols, 'p');
		expect(u.x * 2 - u.y * 1).toBeCloseTo(0, 10);
	});
});

// =============================================================================
// Revue de la PR 1
// =============================================================================

describe('revue : les refus des formes ajoutées, en français', () => {
	const base = 'O = point(0, 0)\nA = point(2, 0)\nd = droite(O, A)';

	it('cercle(O, 2, passant=A), cercle(O, 2, rayon=5) : un argument nommé de trop', () => {
		expect(() => runDsl(`${base}\nc = cercle(O, 2, passant=A)`)).toThrow(/nommé/);
		expect(() => runDsl(`${base}\nc = cercle(O, 2, rayon=5)`)).toThrow(/nommé/);
	});

	it('cercle(d, 3) : le centre est un point', () => {
		expect(() => runDsl(`${base}\nc = cercle(d, 3)`)).toThrow(/centre/);
	});

	it('cercle(O, r) : un rayon nul ou négatif est refusé', () => {
		expect(() => runDsl(`${base}\nc = cercle(O, -2)`)).toThrow(/positif/);
		expect(() => runDsl(`${base}\nc = cercle(O, 0)`)).toThrow(/positif/);
	});

	it('parallele(d, d), perpendiculaire(d, d) : le premier argument est un point', () => {
		expect(() => runDsl(`${base}\np = parallele(d, d)`)).toThrow(/point/);
		expect(() => runDsl(`${base}\np = perpendiculaire(d, d)`)).toThrow(/point/);
		// Une erreur du DSL, en français, avec sa ligne — pas une erreur interne
		expect(() => runDsl(`${base}\np = parallele(d, d)`)).toThrow(DslRuntimeError);
		expect(() => runDsl(`${base}\np = parallele(d, d)`)).toThrow(/doit être un point/);
	});
});
