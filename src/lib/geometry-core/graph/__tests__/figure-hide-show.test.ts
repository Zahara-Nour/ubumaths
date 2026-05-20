/**
 * Regression tests for `figure.hideElement` and `figure.showElement`.
 *
 * Locks the fix B3 from V1 code-review: `hideElement` no longer destroys
 * `el.label`. Hide/show round-trips preserve the element's identity.
 */

import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { numeric } from '../../types/geo-value';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

describe('figure.hideElement — preserves label (regression B3)', () => {
	it('hideElement does NOT destroy el.label', () => {
		const f = new Figure();
		const id = f.createFreePoint(pt(0, 0), { label: 'A' });
		expect(f.getElementById(id)?.label).toBe('A');

		f.hideElement(id);

		const hidden = f.getElementById(id);
		expect(hidden?.visible).toBe(false);
		// B3 regression: label must survive hideElement().
		expect(hidden?.label).toBe('A');
	});

	it('hide / show round-trip preserves label', () => {
		const f = new Figure();
		const id = f.createFreePoint(pt(1, 2), { label: 'M' });

		f.hideElement(id);
		f.showElement(id);

		const el = f.getElementById(id);
		expect(el?.visible).toBe(true);
		expect(el?.label).toBe('M');
	});

	it('hide / show with new label overrides the original', () => {
		const f = new Figure();
		const id = f.createFreePoint(pt(0, 0), { label: 'A' });

		f.hideElement(id);
		f.showElement(id, 'B');

		expect(f.getElementById(id)?.label).toBe('B');
	});

	it('hideElement is idempotent (calling twice does not throw)', () => {
		const f = new Figure();
		const id = f.createFreePoint(pt(0, 0), { label: 'A' });

		f.hideElement(id);
		f.hideElement(id);

		const el = f.getElementById(id);
		expect(el?.visible).toBe(false);
		expect(el?.label).toBe('A');
	});

	it('hideElement on missing id is a no-op (does not throw)', () => {
		const f = new Figure();
		expect(() => f.hideElement('non-existent-id')).not.toThrow();
	});

	it('hideElement preserves all non-visible fields (style, color, etc.)', () => {
		const f = new Figure();
		const id = f.createFreePoint(pt(0, 0), {
			label: 'P',
			color: '#ff0000'
		});

		const before = f.getElementById(id)!;
		f.hideElement(id);
		const after = f.getElementById(id)!;

		// Everything except `visible` should round-trip.
		expect(after.label).toBe(before.label);
		expect(after.color).toBe(before.color);
		expect(after.type).toBe(before.type);
		expect(after.id).toBe(before.id);
		expect(after.visible).toBe(false);
	});
});
