import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import { isVector } from '../../types/elements';

describe('DSL vector support', () => {
	describe('vecteur() builtin', () => {
		it('creates a bound vector from two points', () => {
			const { figure, symbols } = runDsl(`
A = point(0, 0)
B = point(3, 4)
v = vecteur(A, B)
`);
			const vEntry = symbols.get('v');
			expect(vEntry).toBeDefined();
			expect(vEntry!.type).toBe('vecteur');

			const el = figure.getElementById(vEntry!.figureId!);
			expect(el).toBeDefined();
			expect(el!.type).toBe('vectorByPoints');
		});

		it('creates a free vector from two numbers', () => {
			const { figure, symbols } = runDsl(`
v = vecteur(3, 4)
`);
			const vEntry = symbols.get('v');
			expect(vEntry).toBeDefined();
			expect(vEntry!.type).toBe('vecteur');

			const el = figure.getElementById(vEntry!.figureId!);
			expect(el).toBeDefined();
			expect(el!.type).toBe('freeVector');
			if (el!.type === 'freeVector') {
				expect(geoToNumber(el.dx)).toBe(3);
				expect(geoToNumber(el.dy)).toBe(4);
			}
		});

		it('throws with wrong number of arguments', () => {
			expect(() => runDsl('v = vecteur(1)')).toThrow();
			expect(() => runDsl('v = vecteur(1, 2, 3)')).toThrow();
		});
	});

	describe('translation with vector', () => {
		it('translates using vecteur=(A,B) tuple syntax', () => {
			const { figure, symbols } = runDsl(`
A = point(0, 0)
B = point(3, 0)
P = point(1, 1)
Q = translation(P, vecteur=(A, B))
`);
			const pos = figure.getPosition(symbols.get('Q')!.figureId!);
			expect(pos).not.toBeNull();
			expect(geoToNumber(pos!.x)).toBeCloseTo(4);
			expect(geoToNumber(pos!.y)).toBeCloseTo(1);
		});

		it('translates using a bound vector element', () => {
			const { figure, symbols } = runDsl(`
A = point(0, 0)
B = point(3, 0)
v = vecteur(A, B)
P = point(1, 1)
Q = translation(P, vecteur=v)
`);
			const pos = figure.getPosition(symbols.get('Q')!.figureId!);
			expect(pos).not.toBeNull();
			expect(geoToNumber(pos!.x)).toBeCloseTo(4);
			expect(geoToNumber(pos!.y)).toBeCloseTo(1);
		});

		it('translates using a free vector element', () => {
			const { figure, symbols } = runDsl(`
v = vecteur(2, 3)
P = point(1, 1)
Q = translation(P, vecteur=v)
`);
			const pos = figure.getPosition(symbols.get('Q')!.figureId!);
			expect(pos).not.toBeNull();
			expect(geoToNumber(pos!.x)).toBeCloseTo(3);
			expect(geoToNumber(pos!.y)).toBeCloseTo(4);
		});
	});

	describe('serialization round-trip', () => {
		it('round-trips a bound vector', () => {
			const script = `A = point(0, 0)
B = point(3, 4)
v = vecteur(A, B)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('vecteur(A, B)');

			// Re-parse
			const { figure: fig2 } = runDsl(serialized);
			const vectors = fig2.getAllElements().filter((el) => isVector(el));
			expect(vectors.length).toBe(1);
			expect(vectors[0].type).toBe('vectorByPoints');
		});

		it('round-trips a free vector', () => {
			const script = `v = vecteur(3, 4)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('vecteur(3, 4)');

			// Re-parse
			const { figure: fig2 } = runDsl(serialized);
			const vectors = fig2.getAllElements().filter((el) => isVector(el));
			expect(vectors.length).toBe(1);
			expect(vectors[0].type).toBe('freeVector');
		});
	});
});

// =============================================================================
// Edge case tests
// =============================================================================

describe('DSL vector edge cases', () => {
	// ─── Negative and float components ──────────────────────────────

	describe('vecteur with negative numbers', () => {
		it('creates a free vector with negative dx', () => {
			const { figure, symbols } = runDsl('v = vecteur(-3, 4)');
			const el = figure.getElementById(symbols.get('v')!.figureId!);
			expect(el).toBeDefined();
			expect(el!.type).toBe('freeVector');
			if (el!.type === 'freeVector') {
				expect(geoToNumber(el.dx)).toBe(-3);
				expect(geoToNumber(el.dy)).toBe(4);
			}
		});

		it('creates a free vector with both negative components', () => {
			const { figure, symbols } = runDsl('v = vecteur(-1, -2)');
			const el = figure.getElementById(symbols.get('v')!.figureId!);
			if (el!.type === 'freeVector') {
				expect(geoToNumber(el.dx)).toBe(-1);
				expect(geoToNumber(el.dy)).toBe(-2);
			}
		});
	});

	describe('vecteur with float numbers', () => {
		it('creates a free vector with decimal components', () => {
			const { figure, symbols } = runDsl('v = vecteur(1.5, 2.7)');
			const el = figure.getElementById(symbols.get('v')!.figureId!);
			expect(el).toBeDefined();
			expect(el!.type).toBe('freeVector');
			if (el!.type === 'freeVector') {
				expect(geoToNumber(el.dx)).toBeCloseTo(1.5);
				expect(geoToNumber(el.dy)).toBeCloseTo(2.7);
			}
		});
	});

	// ─── Style arguments ────────────────────────────────────────────

	describe('vecteur with style args', () => {
		it('creates a bound vector with couleur="rouge"', () => {
			const { figure, symbols } = runDsl(`
A = point(0, 0)
B = point(3, 4)
v = vecteur(A, B, couleur="rouge")
`);
			const el = figure.getElementById(symbols.get('v')!.figureId!);
			expect(el).toBeDefined();
			expect(el!.type).toBe('vectorByPoints');
			// Color should be resolved to a red hex value
			expect(el!.color).toBeTruthy();
			expect(el!.color).not.toBe('#000000'); // Should be non-default
		});

		it('creates a free vector with couleur="bleu"', () => {
			const { figure, symbols } = runDsl('v = vecteur(2, 3, couleur="bleu")');
			const el = figure.getElementById(symbols.get('v')!.figureId!);
			expect(el).toBeDefined();
			expect(el!.color).toBeTruthy();
		});
	});

	// ─── Translation with negative free vector ──────────────────────

	describe('translation with free vector with negative components', () => {
		it('translates in the negative direction', () => {
			const { figure, symbols } = runDsl(`
v = vecteur(-3, -4)
P = point(5, 5)
Q = translation(P, vecteur=v)
`);
			const pos = figure.getPosition(symbols.get('Q')!.figureId!);
			expect(pos).not.toBeNull();
			expect(geoToNumber(pos!.x)).toBeCloseTo(2);
			expect(geoToNumber(pos!.y)).toBeCloseTo(1);
		});
	});

	// ─── Error cases ────────────────────────────────────────────────

	describe('error: translation without vecteur= arg', () => {
		it('throws when vecteur= is missing', () => {
			expect(() =>
				runDsl(`
P = point(0, 0)
Q = translation(P)
`)
			).toThrow(/vecteur/i);
		});
	});

	describe('error: vecteur with mixed point and number args', () => {
		it('throws when first arg is a point and second is a number', () => {
			expect(() =>
				runDsl(`
A = point(0, 0)
v = vecteur(A, 3)
`)
			).toThrow();
		});

		it('throws when first arg is a number and second is a point', () => {
			expect(() =>
				runDsl(`
A = point(0, 0)
v = vecteur(3, A)
`)
			).toThrow();
		});
	});

	// ─── Multiple vectors in same script ────────────────────────────

	describe('multiple vectors in same script', () => {
		it('creates multiple distinct vectors', () => {
			const { figure, symbols } = runDsl(`
A = point(0, 0)
B = point(1, 0)
C = point(0, 1)
u = vecteur(A, B)
v = vecteur(A, C)
w = vecteur(2, 3)
`);
			expect(symbols.get('u')).toBeDefined();
			expect(symbols.get('v')).toBeDefined();
			expect(symbols.get('w')).toBeDefined();

			const vectors = figure.getAllElements().filter((el) => isVector(el));
			expect(vectors.length).toBe(3);
		});
	});

	// ─── Round-trip with translation ────────────────────────────────

	describe('vector used in translation preserves after serialization round-trip', () => {
		it('round-trips a script with translation using a bound vector', () => {
			const script = `A = point(0, 0)
B = point(3, 0)
v = vecteur(A, B)
P = point(1, 1)
Q = translation(P, vecteur=v)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);

			// Re-parse and verify the translated point
			const { figure: fig2, symbols: sym2 } = runDsl(serialized);
			const qPos = fig2.getPosition(sym2.get('Q')!.figureId!);
			expect(qPos).not.toBeNull();
			expect(geoToNumber(qPos!.x)).toBeCloseTo(4);
			expect(geoToNumber(qPos!.y)).toBeCloseTo(1);
		});

		it('serializes a script with translation using a free vector', () => {
			const script = `v = vecteur(2, 3)
P = point(1, 1)
Q = translation(P, vecteur=v)`;
			const { figure, symbols } = runDsl(script);

			// Verify the figure has the correct translated position before serialization
			const qPos = figure.getPosition(symbols.get('Q')!.figureId!);
			expect(qPos).not.toBeNull();
			expect(geoToNumber(qPos!.x)).toBeCloseTo(3);
			expect(geoToNumber(qPos!.y)).toBeCloseTo(4);

			// Serialization should produce output containing both the vector and the translation
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('vecteur(2, 3)');
			expect(serialized).toContain('translation');
		});
	});

	// ─── Anchor serialization ───────────────────────────────────────

	describe('freeVector anchor round-trip', () => {
		it('serializes anchor when non-default', () => {
			const script = `v = vecteur(3, 4, ancre=(1, 2))`;
			const { figure, symbols } = runDsl(script);
			const el = figure.getElementById(symbols.get('v')!.figureId!)!;
			expect(el.type).toBe('freeVector');
			if (el.type === 'freeVector') {
				expect(geoToNumber(el.anchorX)).toBeCloseTo(1);
				expect(geoToNumber(el.anchorY)).toBeCloseTo(2);
			}

			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('ancre=(1, 2)');
		});

		it('omits anchor when at origin', () => {
			const script = `v = vecteur(3, 4)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).not.toContain('ancre');
		});

		it('round-trips a free vector with anchor', () => {
			const script = `v = vecteur(5, -2, ancre=(3, 7))`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);

			const { figure: fig2, symbols: sym2 } = runDsl(serialized);
			const el = fig2.getElementById(sym2.get('v')!.figureId!)!;
			expect(el.type).toBe('freeVector');
			if (el.type === 'freeVector') {
				expect(geoToNumber(el.dx)).toBeCloseTo(5);
				expect(geoToNumber(el.dy)).toBeCloseTo(-2);
				expect(geoToNumber(el.anchorX)).toBeCloseTo(3);
				expect(geoToNumber(el.anchorY)).toBeCloseTo(7);
			}
		});
	});
});
