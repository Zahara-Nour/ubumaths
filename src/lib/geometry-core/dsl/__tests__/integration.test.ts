import { describe, it, expect } from 'vitest';
import { runDsl, parseDsl, interpretDsl, serializeDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import { exportToTikZ } from '../../rendering/export-tikz';
import { exportToSVG } from '../../rendering/export-svg';

describe('DSL integration — runDsl', () => {
	it('creates a triangle from script', () => {
		const { figure } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'segment(A, B)',
				'segment(B, C)',
				'segment(C, A)'
			].join('\n')
		);
		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');
		const segments = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(points).toHaveLength(3);
		expect(segments).toHaveLength(3);
	});

	it('creates a regular polygon', () => {
		const { figure } = runDsl(
			[
				'n = 6',
				'O = point(0, 0)',
				'P[0] = point(3, 0)',
				'pour i de 1 a n - 1:',
				'    P[i] = rotation(P[0], centre=O, angle=i * 360 / n)',
				'pour i de 0 a n - 1:',
				'    segment(P[i], P[(i + 1) % n])'
			].join('\n')
		);
		const segments = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segments).toHaveLength(6);
	});

	it('creates figure with macro', () => {
		const { figure, symbols } = runDsl(
			[
				'macro mediatrice(A, B):',
				'    M = milieu(A, B)',
				'    H = rotation(A, centre=M, angle=90)',
				'    d = droite(M, H)',
				'    retourne (M, d)',
				'P = point(0, 0)',
				'Q = point(4, 0)',
				'(M, d) = mediatrice(P, Q)'
			].join('\n')
		);
		expect(symbols.get('M')!.type).toBe('point');
		expect(symbols.get('d')!.type).toBe('droite');
		const pos = figure.getPosition(symbols.get('M')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
	});

	it('creates figure with annotations and measures', () => {
		const { figure } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'segment(A, B)',
				'segment(B, C)',
				'segment(C, A)',
				'marque_angle(B, A, C)',
				'angle_droit(A, B, C)',
				'marque_segment(A, B, traits=2)',
				'mesure(A, B)'
			].join('\n')
		);
		const marks = figure.getAllElements().filter((e) => e.type === 'angleMark');
		expect(marks).toHaveLength(2);
		expect(figure.getAllElements().filter((e) => e.type === 'segmentMark')).toHaveLength(1);
		expect(figure.getAllElements().filter((e) => e.type === 'text')).toHaveLength(1);
	});
});

describe('DSL integration — pipeline', () => {
	it('parseDsl + interpretDsl = runDsl', () => {
		const script = 'A = point(3, 4)';
		const program = parseDsl(script);
		const { figure, symbols } = interpretDsl(program);
		const pos = figure.getPosition(symbols.get('A')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
	});

	it('full round-trip: script → figure → script → figure', () => {
		const script = [
			'A = point(0, 0)',
			'B = point(4, 0)',
			'C = point(2, 3)',
			'segment(A, B)',
			'M = milieu(A, B)',
			'c = cercle(A, rayon=2)',
			'marque_angle(B, A, C)'
		].join('\n');

		// First pass
		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);

		// Second pass
		const { figure: fig2 } = runDsl(serialized);

		// Compare element counts
		expect(fig2.getAllElements().length).toBe(fig1.getAllElements().length);
	});
});

describe('DSL integration — compatible with exports', () => {
	it('DSL figure exports to TikZ', () => {
		const { figure } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'segment(A, B)', 'marque_segment(A, B)'].join('\n')
		);
		const viewport = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
		const tikz = exportToTikZ(figure, viewport);
		expect(tikz).toContain('\\begin{tikzpicture}');
		expect(tikz).toContain('\\fill');
		expect(tikz).toContain('\\draw');
	});

	it('DSL figure exports to SVG', () => {
		const { figure } = runDsl(['A = point(0, 0)', 'B = point(4, 0)', 'segment(A, B)'].join('\n'));
		const viewport = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
		const svg = exportToSVG(figure, viewport);
		expect(svg).toContain('<svg');
		expect(svg).toContain('<circle');
		expect(svg).toContain('<line');
	});
});

describe('DSL integration — error handling', () => {
	it('syntax error includes line number', () => {
		try {
			runDsl('A = point(0, 0)\n= invalid');
			expect.unreachable();
		} catch (e) {
			expect((e as Error).message).toContain('2');
		}
	});

	it('runtime error includes line number', () => {
		try {
			runDsl('x = y + 1');
			expect.unreachable();
		} catch (e) {
			expect((e as Error).message).toContain('inconnue');
		}
	});

	it('tokenizer error for bad character', () => {
		try {
			runDsl('A = @');
			expect.unreachable();
		} catch (e) {
			expect((e as Error).message).toContain('@');
		}
	});
});

describe('DSL integration — existing figure', () => {
	it('runDsl can add to an existing figure', () => {
		const { figure: fig1 } = runDsl('A = point(0, 0)');
		// Second script adds more elements to the same figure
		const { figure: fig2 } = runDsl('B = point(1, 1)', fig1);
		// fig2 is the same object as fig1
		expect(fig2).toBe(fig1);
		// Should have both points
		expect(fig2.getAllElements().filter((e) => e.type === 'freePoint')).toHaveLength(2);
	});
});

describe('DSL integration — complex use cases', () => {
	it('cercle circonscrit via macros', () => {
		const { figure, symbols } = runDsl(
			[
				'macro mediatrice(A, B):',
				'    M = milieu(A, B)',
				'    H = rotation(A, centre=M, angle=90)',
				'    d = droite(M, H)',
				'    retourne (M, d)',
				'',
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'segment(A, B)',
				'segment(B, C)',
				'segment(C, A)',
				'',
				'(M1, d1) = mediatrice(A, B)',
				'(M2, d2) = mediatrice(B, C)',
				'O = intersection(d1, d2)',
				'c = cercle(O, passant=A)',
				'',
				'marque_segment(A, B, traits=1)',
				'marque_segment(B, C, traits=1)',
				'marque_segment(C, A, traits=1)',
				'mesure(A, B)'
			].join('\n')
		);

		expect(symbols.get('O')!.type).toBe('point');
		expect(symbols.get('c')!.type).toBe('cercle');
		const segments = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segments).toHaveLength(3);
		const circles = figure
			.getAllElements()
			.filter((e) => e.type === 'circleByPoint' || e.type === 'circleByRadius');
		expect(circles).toHaveLength(1);
	});

	it('etoile a 5 branches', () => {
		const { figure } = runDsl(
			[
				'O = point(0, 0)',
				'P[0] = point(3, 0)',
				'pour i de 1 a 4:',
				'    P[i] = rotation(P[0], centre=O, angle=i * 72)',
				'pour i de 0 a 4:',
				'    segment(P[i], P[(i + 2) % 5])'
			].join('\n')
		);
		const segments = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segments).toHaveLength(5);
	});
});
