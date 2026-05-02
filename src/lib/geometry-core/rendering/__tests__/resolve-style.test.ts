/**
 * Tests for resolveStyle's fillOpacity default behavior.
 */

import { describe, it, expect } from 'vitest';
import { resolveStyle } from '../svg-primitives';
import type { GeoElementBase } from '../../types/elements';

function el(style?: Partial<GeoElementBase['style']>): GeoElementBase {
	return { id: 'x', visible: true, style } as unknown as GeoElementBase;
}

describe('resolveStyle — fillOpacity default', () => {
	it('returns 0 when neither fillColor nor fillOpacity is set', () => {
		expect(resolveStyle(el()).fillOpacity).toBe(0);
	});

	it('returns 1 when fillColor is set but fillOpacity is not', () => {
		// Regression: previously defaulted to 0, making `remplissage=...`
		// without `opacite_fond=...` render invisibly.
		expect(resolveStyle(el({ fillColor: '#9333ea' })).fillOpacity).toBe(1);
	});

	it('returns the explicit fillOpacity when both fillColor and fillOpacity are set', () => {
		expect(resolveStyle(el({ fillColor: '#9333ea', fillOpacity: 0.4 })).fillOpacity).toBeCloseTo(
			0.4
		);
	});

	it('returns the explicit fillOpacity when only fillOpacity is set', () => {
		expect(resolveStyle(el({ fillOpacity: 0.5 })).fillOpacity).toBeCloseTo(0.5);
	});

	it('respects an explicit fillOpacity of 0 (no fallback)', () => {
		expect(resolveStyle(el({ fillColor: '#9333ea', fillOpacity: 0 })).fillOpacity).toBe(0);
	});
});
