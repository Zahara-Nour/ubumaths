import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { numeric } from '../../types/geo-value';
import type { GeoText } from '../../types/elements';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

// =============================================================================
// A. createScalarArea
// =============================================================================

describe('createScalarArea', () => {
	it('computes area of a unit square', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const c = f.createFreePoint(pt(1, 1));
		const d = f.createFreePoint(pt(0, 1));
		const id = f.createScalarArea([a, b, c, d]);
		expect(f.getScalarValue(id)).toBeCloseTo(1, 10);
	});

	it('computes area of a triangle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const c = f.createFreePoint(pt(0, 3));
		const id = f.createScalarArea([a, b, c]);
		expect(f.getScalarValue(id)).toBeCloseTo(6, 10);
	});

	it('has type scalar and scalarKind area', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const c = f.createFreePoint(pt(1, 1));
		const id = f.createScalarArea([a, b, c]);
		const el = f.getElementById(id)!;
		expect(el.type).toBe('scalar');
		expect((el as { scalarKind: string }).scalarKind).toBe('area');
	});

	it('is composable in expressions', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(2, 0));
		const c = f.createFreePoint(pt(2, 2));
		const d = f.createFreePoint(pt(0, 2));
		const areaId = f.createScalarArea([a, b, c, d]);

		const doubleArea = f.createScalarExpression((sv) => (sv.get(areaId) ?? 0) * 2, [areaId]);
		expect(f.getScalarValue(doubleArea)).toBeCloseTo(8, 10);
	});

	it('updates reactively when points move', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const c = f.createFreePoint(pt(1, 1));
		const id = f.createScalarArea([a, b, c]);
		expect(f.getScalarValue(id)).toBeCloseTo(0.5, 10);

		f.beginTransaction();
		f.movePoint(c, numeric(1), numeric(2));
		f.recompute();
		f.commit();

		expect(f.getScalarValue(id)).toBeCloseTo(1, 10);
	});

	it('throws if fewer than 3 points', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		expect(() => f.createScalarArea([a, b])).toThrow();
	});

	it('throws if a target is not a point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createScalarArea([a, b, seg])).toThrow();
	});
});

// =============================================================================
// B. createText — free position
// =============================================================================

describe('createText: free position', () => {
	it('creates a text element with static content', () => {
		const f = new Figure();
		const id = f.createText('hello', [], { position: { x: 3, y: 5 } });
		const el = f.getElementById(id)! as GeoText;
		expect(el.type).toBe('text');
		expect(el.template).toBe('hello');
		expect(el.position).toEqual({ x: 3, y: 5 });
	});

	it('is visible by default', () => {
		const f = new Figure();
		const id = f.createText('hello', [], { position: { x: 0, y: 0 } });
		const el = f.getElementById(id)!;
		expect(el.visible).toBe(true);
	});

	it('resolves template with scalar value', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const d = f.createScalarDistance(a, b);

		const id = f.createText('AB = {' + d + '}', [d], { position: { x: 0, y: 0 } });
		const resolved = f.resolveTemplate(id);
		expect(resolved).toBe('AB = 5');
	});

	it('resolves template with format .2f', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		const d = f.createScalarDistance(a, b);

		const id = f.createText('{' + d + ':.2f}', [d], { position: { x: 0, y: 0 } });
		const resolved = f.resolveTemplate(id);
		expect(resolved).toBe('1.41');
	});

	it('resolves template with deg format', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const ang = f.createScalarAngle(a, v, b);

		const id = f.createText('{' + ang + ':deg}', [ang], { position: { x: 0, y: 0 } });
		const resolved = f.resolveTemplate(id);
		expect(resolved).toBe('90°');
	});

	it('resolves template with inline expression', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const d = f.createScalarDistance(a, b);

		const id = f.createText('{' + d + '*2}', [d], { position: { x: 0, y: 0 } });
		const resolved = f.resolveTemplate(id);
		expect(resolved).toBe('10');
	});

	it('mixed text with interpolation', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 0));
		const d = f.createScalarDistance(a, b);

		const id = f.createText('d = {' + d + ':.1f} cm', [d], { position: { x: 0, y: 0 } });
		const resolved = f.resolveTemplate(id);
		expect(resolved).toBe('d = 3.0 cm');
	});
});

// =============================================================================
// C. createText — anchored to point
// =============================================================================

describe('createText: anchored to point', () => {
	it('creates a text element anchored to a point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));
		const id = f.createText('label', [], {
			anchorId: a,
			anchorOffset: { dx: 1, dy: 0.5 }
		});
		const el = f.getElementById(id)! as GeoText;
		expect(el.anchorId).toBe(a);
		expect(el.anchorOffset).toEqual({ dx: 1, dy: 0.5 });
	});

	it('depends on the anchor point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const id = f.createText('hi', [], { anchorId: a });
		const el = f.getElementById(id)! as GeoText;
		expect(el.dependsOn).toContain(a);
	});

	it('throws if anchor is not a point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createText('hi', [], { anchorId: seg })).toThrow();
	});

	it('is cascade-deleted when anchor is removed', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const id = f.createText('hi', [], { anchorId: a });

		f.beginTransaction();
		f.remove(a);
		f.commit();

		expect(f.getElementById(id)).toBeUndefined();
	});
});

// =============================================================================
// D. createText — auto-positioned (for mesure() sugar)
// =============================================================================

describe('createText: auto-positioned', () => {
	it('creates a text with midpoint auto-positioning', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const d = f.createScalarDistance(a, b);

		const id = f.createText('{' + d + ':.2f}', [d], {
			autoPosition: 'midpoint',
			autoTargetIds: [a, b]
		});
		const el = f.getElementById(id)! as GeoText;
		expect(el.autoPosition).toBe('midpoint');
		expect(el.autoTargetIds).toEqual([a, b]);
	});

	it('creates a text with bisector auto-positioning', () => {
		const f = new Figure();
		const p1 = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const p2 = f.createFreePoint(pt(0, 1));
		const ang = f.createScalarAngle(p1, v, p2);

		const id = f.createText('{' + ang + ':deg}', [ang], {
			autoPosition: 'bisector',
			autoTargetIds: [p1, v, p2]
		});
		const el = f.getElementById(id)! as GeoText;
		expect(el.autoPosition).toBe('bisector');
	});

	it('creates a text with centroid auto-positioning', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(2, 0));
		const c = f.createFreePoint(pt(1, 2));
		const area = f.createScalarArea([a, b, c]);

		const id = f.createText('{' + area + ':.2f}', [area], {
			autoPosition: 'centroid',
			autoTargetIds: [a, b, c]
		});
		const el = f.getElementById(id)! as GeoText;
		expect(el.autoPosition).toBe('centroid');
	});

	it('depends on both scalar refs and auto target points', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const d = f.createScalarDistance(a, b);

		const id = f.createText('{' + d + '}', [d], {
			autoPosition: 'midpoint',
			autoTargetIds: [a, b]
		});
		const el = f.getElementById(id)! as GeoText;
		// Should depend on both scalar and its transitive deps (the points)
		expect(el.dependsOn).toContain(d);
		expect(el.dependsOn).toContain(a);
		expect(el.dependsOn).toContain(b);
	});
});

// =============================================================================
// E. resolveTemplate edge cases
// =============================================================================

describe('resolveTemplate', () => {
	it('returns undefined for non-text element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		expect(f.resolveTemplate(a)).toBeUndefined();
	});

	it('returns undefined for non-existent id', () => {
		const f = new Figure();
		expect(f.resolveTemplate('nope')).toBeUndefined();
	});

	it('shows ? for missing scalar reference', () => {
		const f = new Figure();
		const id = f.createText('{nonexistent}', [], { position: { x: 0, y: 0 } });
		const resolved = f.resolveTemplate(id);
		expect(resolved).toBe('?');
	});

	it('handles template with no placeholders', () => {
		const f = new Figure();
		const id = f.createText('just text', [], { position: { x: 0, y: 0 } });
		expect(f.resolveTemplate(id)).toBe('just text');
	});

	it('handles template with multiple placeholders', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 0));
		const c = f.createFreePoint(pt(0, 4));
		const d1 = f.createScalarDistance(a, b);
		const d2 = f.createScalarDistance(a, c);

		const id = f.createText('{' + d1 + '} x {' + d2 + '}', [d1, d2], { position: { x: 0, y: 0 } });
		const resolved = f.resolveTemplate(id);
		expect(resolved).toBe('3 x 4');
	});
});

// =============================================================================
// F. createMathText
// =============================================================================

describe('createMathText', () => {
	it('creates a mathText element', () => {
		const f = new Figure();
		const id = f.createMathText('x^2', [], { position: { x: 3, y: 5 } });
		const el = f.getElementById(id)!;
		expect(el.type).toBe('mathText');
		expect(el.visible).toBe(true);
	});

	it('resolves template with scalar interpolation', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const d = f.createScalarDistance(a, b);
		const id = f.createMathText('d = {' + d + ':.2f}', [d], { position: { x: 0, y: 0 } });
		expect(f.resolveTemplate(id)).toBe('d = 5.00');
	});

	it('is draggable via moveText', () => {
		const f = new Figure();
		const id = f.createMathText('x^2', [], { position: { x: 1, y: 2 } });
		f.beginTransaction();
		f.moveText(id, 5, 6);
		f.commit();
		const el = f.getElementById(id)! as { position: { x: number; y: number } };
		expect(el.position).toEqual({ x: 5, y: 6 });
	});
});

// =============================================================================
// G. createRichText
// =============================================================================

describe('createRichText', () => {
	it('creates a richText element', () => {
		const f = new Figure();
		const id = f.createRichText('**bold** $x^2$', [], { position: { x: 3, y: 5 } });
		const el = f.getElementById(id)!;
		expect(el.type).toBe('richText');
		expect(el.visible).toBe(true);
	});

	it('resolves template with scalar interpolation', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const d = f.createScalarDistance(a, b);
		const id = f.createRichText('**d** = $d = {' + d + ':.2f}$', [d], {
			position: { x: 0, y: 0 }
		});
		expect(f.resolveTemplate(id)).toBe('**d** = $d = 5.00$');
	});

	it('is draggable via moveText', () => {
		const f = new Figure();
		const id = f.createRichText('text', [], { position: { x: 1, y: 2 } });
		f.beginTransaction();
		f.moveText(id, 5, 6);
		f.commit();
		const el = f.getElementById(id)! as { position: { x: number; y: number } };
		expect(el.position).toEqual({ x: 5, y: 6 });
	});

	it('supports anchor positioning', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));
		const id = f.createRichText('label', [], { anchorId: a, anchorOffset: { dx: 1, dy: 0.5 } });
		const el = f.getElementById(id)!;
		expect(el.dependsOn).toContain(a);
	});
});
