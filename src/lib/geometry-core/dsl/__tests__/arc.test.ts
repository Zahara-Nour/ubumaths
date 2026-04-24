import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';

describe('DSL — arc builtin', () => {
	describe('arc by angles (1 positional + named args)', () => {
		it('parses arc(O, rayon=3, debut=0, fin=90)', () => {
			const script = `O = point(0, 0)\na = arc(O, rayon=3, debut=0, fin=90)`;
			const { figure, symbols } = runDsl(script);
			const arcEntry = symbols.get('a');
			expect(arcEntry).toBeDefined();
			expect(arcEntry!.type).toBe('arc');
			const el = figure.getElementById(arcEntry!.figureId!);
			expect(el).toBeDefined();
			expect(el!.type).toBe('arcByAngles');
		});

		it('converts degrees to radians', () => {
			const script = `O = point(0, 0)\na = arc(O, rayon=3, debut=0, fin=90)`;
			const { figure, symbols } = runDsl(script);
			const el = figure.getElementById(symbols.get('a')!.figureId!);
			if (el!.type === 'arcByAngles') {
				// 90° = PI/2 radians
				expect(el!.endAngle).toEqual({ kind: 'numeric', value: Math.PI / 2 });
			}
		});

		it('defaults debut=0, fin=360 when omitted', () => {
			const script = `O = point(0, 0)\na = arc(O, rayon=2)`;
			const { figure, symbols } = runDsl(script);
			const el = figure.getElementById(symbols.get('a')!.figureId!);
			if (el!.type === 'arcByAngles') {
				expect(el!.startAngle).toEqual({ kind: 'numeric', value: 0 });
				expect(el!.endAngle).toEqual({ kind: 'numeric', value: 2 * Math.PI });
			}
		});
	});

	describe('arc by 3 points', () => {
		it('parses arc(A, O, B)', () => {
			const script = `A = point(3, 0)\nO = point(0, 0)\nB = point(0, 3)\na = arc(A, O, B)`;
			const { figure, symbols } = runDsl(script);
			const arcEntry = symbols.get('a');
			expect(arcEntry).toBeDefined();
			expect(arcEntry!.type).toBe('arc');
			const el = figure.getElementById(arcEntry!.figureId!);
			expect(el).toBeDefined();
			expect(el!.type).toBe('arcByPoints');
			if (el!.type === 'arcByPoints') {
				expect(el!.startId).toBe(symbols.get('A')!.figureId);
				expect(el!.centerId).toBe(symbols.get('O')!.figureId);
				expect(el!.endId).toBe(symbols.get('B')!.figureId);
			}
		});
	});

	describe('arc errors', () => {
		it('throws on 2 positional args', () => {
			const script = `A = point(0, 0)\nB = point(1, 1)\narc(A, B)`;
			expect(() => runDsl(script)).toThrow();
		});

		it('throws on 1 arg without rayon', () => {
			const script = `O = point(0, 0)\narc(O)`;
			expect(() => runDsl(script)).toThrow(/rayon/);
		});
	});

	describe('serialization round-trip', () => {
		it('round-trips arcByAngles', () => {
			const script = `O = point(0, 0)\na = arc(O, rayon=3, debut=0, fin=90)`;
			const { figure: fig1, symbols: sym1 } = runDsl(script);
			const serialized = serializeDsl(fig1, sym1);
			expect(serialized).toContain('arc(');
			expect(serialized).toContain('rayon=');
			expect(serialized).toContain('debut=');
			expect(serialized).toContain('fin=');

			// Re-parse
			const { figure: fig2 } = runDsl(serialized);
			expect(fig2.getAllElements().length).toBe(fig1.getAllElements().length);
		});

		it('round-trips arcByPoints', () => {
			const script = `A = point(3, 0)\nO = point(0, 0)\nB = point(0, 3)\na = arc(A, O, B)`;
			const { figure: fig1, symbols: sym1 } = runDsl(script);
			const serialized = serializeDsl(fig1, sym1);
			expect(serialized).toContain('arc(A, O, B)');

			const { figure: fig2 } = runDsl(serialized);
			expect(fig2.getAllElements().length).toBe(fig1.getAllElements().length);
		});
	});

	describe('style on arc', () => {
		it('applies style to arc element', () => {
			const script = `O = point(0, 0)\na = arc(O, rayon=3, debut=0, fin=90)\nstyle(a, couleur="rouge")`;
			const { figure, symbols } = runDsl(script);
			const el = figure.getElementById(symbols.get('a')!.figureId!);
			expect(el!.style?.color).toBe('#dc2626');
		});
	});
});
