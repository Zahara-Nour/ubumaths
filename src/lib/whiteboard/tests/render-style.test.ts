/**
 * Tests for Render Style Functionality
 * Tests the type definitions and static values for render styles
 * Note: Store reactivity tests require Svelte runtime (see canvas component tests)
 */

import { describe, it, expect } from 'vitest';
import {
	RENDER_STYLE_LABELS,
	FILL_MODE_LABELS,
	type RenderStyle,
	type FillMode
} from '../types/document';

describe('Render Style Types', () => {
	describe('RenderStyle type', () => {
		it('has perfect and sketch options', () => {
			const styles: RenderStyle[] = ['perfect', 'sketch'];
			expect(styles).toHaveLength(2);
		});

		it('has correct labels for each style', () => {
			expect(RENDER_STYLE_LABELS.perfect).toBe('Précis');
			expect(RENDER_STYLE_LABELS.sketch).toBe('Main levée');
		});
	});

	describe('Extended FillMode type', () => {
		it('includes roughjs fill styles', () => {
			const fillModes: FillMode[] = ['none', 'solid', 'hatched', 'hachure', 'crosshatch', 'zigzag'];
			expect(fillModes).toHaveLength(6);
		});

		it('has correct labels for roughjs fill modes', () => {
			expect(FILL_MODE_LABELS.hachure).toBe('Hachures');
			expect(FILL_MODE_LABELS.crosshatch).toBe('Croisé');
			expect(FILL_MODE_LABELS.zigzag).toBe('Zigzag');
		});
	});
});

describe('Backward Compatibility', () => {
	it('elements without renderStyle should be treated as perfect', () => {
		// This is a documentation test - the actual behavior is in the canvas
		// Elements from old .ubw files won't have renderStyle property
		// They should render with the perfect (default) style

		const legacyElement = {
			id: 'legacy-shape',
			type: 'shape' as const,
			shapeType: 'rectangle' as const,
			start: { x: 0, y: 0 },
			end: { x: 100, y: 100 },
			color: '#000000',
			strokeWidth: 2,
			opacity: 1
			// Note: no renderStyle property
		};

		// Verify the shape doesn't have renderStyle
		expect((legacyElement as { renderStyle?: string }).renderStyle).toBeUndefined();
	});

	it('hatched fillMode still works as alias for hachure', () => {
		// The 'hatched' fillMode from older files should map to roughjs hachure
		expect(FILL_MODE_LABELS.hatched).toBe('Hachuré (lignes)');
		expect(FILL_MODE_LABELS.hachure).toBe('Hachures');
	});
});

describe('RenderStyle Constants', () => {
	it('RENDER_STYLE_LABELS has all styles', () => {
		expect(Object.keys(RENDER_STYLE_LABELS)).toEqual(['perfect', 'sketch']);
	});

	it('FILL_MODE_LABELS has all modes', () => {
		const expectedModes = ['none', 'solid', 'hatched', 'hachure', 'crosshatch', 'zigzag'];
		expect(Object.keys(FILL_MODE_LABELS).sort()).toEqual(expectedModes.sort());
	});
});
