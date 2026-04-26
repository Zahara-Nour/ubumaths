import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import type { GeoComposition } from '../../types/elements';
import { serialize } from '../serializer';

describe('Similitude — syntactic sugar over compose(homothetie, rotation)', () => {
	it('similitude(centre=O, angle=45, rapport=2) creates a composition with sourceBuiltin', () => {
		const { figure, symbols } = runDsl(
			['O = point(2, 3)', 'sim = similitude(centre=O, angle=45, rapport=2)'].join('\n')
		);
		const entry = symbols.get('sim');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('transformation');
		const el = figure.getElementById(entry!.figureId!) as GeoComposition;
		expect(el.type).toBe('composition');
		expect(el.transformationIds).toHaveLength(2);
		expect(el.visible).toBe(false);
		// sourceBuiltin metadata
		expect(el.sourceBuiltin).toBeDefined();
		expect(el.sourceBuiltin!.name).toBe('similitude');
		expect(geoToNumber(el.sourceBuiltin!.params.angle)).toBeCloseTo((45 * Math.PI) / 180);
		expect(geoToNumber(el.sourceBuiltin!.params.rapport)).toBeCloseTo(2);
	});

	it('similitude(A, centre=O, angle=60, rapport=3) applies directly to a point', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = similitude(A, centre=O, angle=60, rapport=3)'
			].join('\n')
		);
		const entry = symbols.get('B');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('point');
		const pos = figure.getPosition(entry!.figureId!);
		expect(pos).toBeDefined();
		// Similitude centre O, angle 60°, rapport 3: (1,0) → 3*(cos60, sin60) = (1.5, 2.598...)
		expect(geoToNumber(pos!.x)).toBeCloseTo(1.5);
		expect(geoToNumber(pos!.y)).toBeCloseTo(3 * Math.sin(Math.PI / 3));
	});

	it('transforme(sim, A) applies the similitude object to a point', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'sim = similitude(centre=O, angle=90, rapport=2)',
				'B = transforme(sim, A)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(pos).toBeDefined();
		// Similitude centre O, angle 90°, rapport 2: (1,0) → 2*(cos90, sin90) = (0, 2)
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(2);
	});

	it('transforme(sim, segment) applies to a segment via composition', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 1)',
				's = segment(A, B)',
				'sim = similitude(centre=O, angle=90, rapport=2)',
				's2 = transforme(sim, s)'
			].join('\n')
		);
		expect(symbols.get('s2')).toBeDefined();
		expect(symbols.get('s2')!.type).toBe('segment');
	});

	it('transforme(sim, cercle) applies to a circle via composition', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'c = cercle(A, rayon=1)',
				'sim = similitude(centre=O, angle=45, rapport=2)',
				'c2 = transforme(sim, c)'
			].join('\n')
		);
		expect(symbols.get('c2')).toBeDefined();
		expect(symbols.get('c2')!.type).toBe('cercle');
	});

	it('serialization roundtrip produces similitude() not compose()', () => {
		const dsl = ['O = point(2, 3)', 'sim = similitude(angle=45, rapport=2, centre=O)'].join('\n');
		const { figure, symbols } = runDsl(dsl);
		const output = serialize(figure, symbols);
		expect(output).toContain('similitude(');
		expect(output).not.toContain('compose(');
		expect(output).toContain('sim =');
		expect(output).toContain('O =');
		// Roundtrip: parse the serialized output
		const { symbols: symbols2 } = runDsl(output);
		expect(symbols2.get('sim')).toBeDefined();
		expect(symbols2.get('sim')!.type).toBe('transformation');
	});

	it('compose(sim, translation) works', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(2, 0)',
				'sim = similitude(centre=O, angle=45, rapport=2)',
				't = translation(vecteur=(A, B))',
				'comp = compose(sim, t)'
			].join('\n')
		);
		expect(symbols.get('comp')).toBeDefined();
		expect(symbols.get('comp')!.type).toBe('transformation');
	});

	it('similitude with rapport=0 collapses to center', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(3, 4)',
				'A = point(1, 0)',
				'B = similitude(A, centre=O, angle=45, rapport=0)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(4);
	});

	it('similitude with angle=0 acts as pure homothety', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(3, 0)',
				'B = similitude(A, centre=O, angle=0, rapport=2)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(6);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('similitude with angle=90 produces exact result', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = transforme(similitude(centre=O, angle=90, rapport=1), A)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(pos).toBeDefined();
		// angle=90, rapport=1 → pure rotation 90°: (1,0) → (0, 1)
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1);
	});
});
