import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

describe('Direct application dispatch — point (regression)', () => {
	it('rotation(A, centre=O, angle=90) still creates a rotated point', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'A = point(1, 0)', 'B = rotation(A, centre=O, angle=90)'].join('\n')
		);
		expect(symbols.get('B')!.type).toBe('point');
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1);
	});

	it('symetrie(A, centre=O) still creates a reflected point', () => {
		const { figure, symbols } = runDsl(
			['O = point(2, 0)', 'A = point(1, 0)', 'B = symetrie(A, centre=O)'].join('\n')
		);
		expect(symbols.get('B')!.type).toBe('point');
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
	});

	it('symetrie(A, axe=d) works with line element', () => {
		const { figure, symbols } = runDsl(
			[
				'P1 = point(0, 0)',
				'P2 = point(4, 0)',
				'd = droite(P1, P2)',
				'A = point(2, 3)',
				'B = symetrie(A, axe=d)'
			].join('\n')
		);
		expect(symbols.get('B')!.type).toBe('point');
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
		expect(geoToNumber(pos!.y)).toBeCloseTo(-3);
	});

	it('translation(A, vecteur=v) still creates a translated point', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(3, 4)',
				'v = vecteur(A, B)',
				'C = point(1, 1)',
				'D = translation(C, vecteur=v)'
			].join('\n')
		);
		expect(symbols.get('D')!.type).toBe('point');
		const pos = figure.getPosition(symbols.get('D')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(5);
	});

	it('homothetie(A, centre=O, rapport=2) still creates a dilated point', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'A = point(2, 3)', 'B = homothetie(A, centre=O, rapport=2)'].join('\n')
		);
		expect(symbols.get('B')!.type).toBe('point');
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(6);
	});
});

describe('Direct application dispatch — non-point (dispatch active)', () => {
	it('rotation(segment, ...) creates a rotated segment', () => {
		const { symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(2, 0)',
				'O = point(0, 0)',
				's = segment(A, B)',
				's2 = rotation(s, centre=O, angle=90)'
			].join('\n')
		);
		expect(symbols.get('s2')!.type).toBe('segment');
	});
});
