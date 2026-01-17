/**
 * Tests for binding Zod schemas
 *
 * TDD Phase 1: Validation schemas for binding types
 */

import { describe, it, expect } from 'vitest';
import { bindingAnchorSchema } from './file-format';

describe('bindingAnchorSchema', () => {
	it('validates a correct binding anchor', () => {
		const validAnchor = {
			elementId: '550e8400-e29b-41d4-a716-446655440000',
			normalizedPosition: { x: 0.5, y: 0.5 },
			perimeterPoint: { x: 1, y: 0.5 },
			gap: 4
		};

		const result = bindingAnchorSchema.safeParse(validAnchor);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.elementId).toBe('550e8400-e29b-41d4-a716-446655440000');
			expect(result.data.normalizedPosition.x).toBe(0.5);
			expect(result.data.gap).toBe(4);
		}
	});

	it('rejects invalid UUID for elementId', () => {
		const invalidAnchor = {
			elementId: 'not-a-uuid',
			normalizedPosition: { x: 0.5, y: 0.5 },
			perimeterPoint: { x: 1, y: 0.5 },
			gap: 4
		};

		const result = bindingAnchorSchema.safeParse(invalidAnchor);

		expect(result.success).toBe(false);
	});

	it('rejects negative gap values', () => {
		const invalidAnchor = {
			elementId: '550e8400-e29b-41d4-a716-446655440000',
			normalizedPosition: { x: 0.5, y: 0.5 },
			perimeterPoint: { x: 1, y: 0.5 },
			gap: -5
		};

		const result = bindingAnchorSchema.safeParse(invalidAnchor);

		expect(result.success).toBe(false);
	});

	it('rejects gap values exceeding maximum (50)', () => {
		const invalidAnchor = {
			elementId: '550e8400-e29b-41d4-a716-446655440000',
			normalizedPosition: { x: 0.5, y: 0.5 },
			perimeterPoint: { x: 1, y: 0.5 },
			gap: 100
		};

		const result = bindingAnchorSchema.safeParse(invalidAnchor);

		expect(result.success).toBe(false);
	});

	it('accepts normalized positions outside 0-1 range (for external points)', () => {
		const validAnchor = {
			elementId: '550e8400-e29b-41d4-a716-446655440000',
			normalizedPosition: { x: -0.5, y: 1.5 },
			perimeterPoint: { x: 1, y: 0.5 },
			gap: 4
		};

		const result = bindingAnchorSchema.safeParse(validAnchor);

		expect(result.success).toBe(true);
	});

	it('rejects non-finite coordinate values', () => {
		const invalidAnchor = {
			elementId: '550e8400-e29b-41d4-a716-446655440000',
			normalizedPosition: { x: Infinity, y: 0.5 },
			perimeterPoint: { x: 1, y: 0.5 },
			gap: 4
		};

		const result = bindingAnchorSchema.safeParse(invalidAnchor);

		expect(result.success).toBe(false);
	});

	it('rejects NaN coordinate values', () => {
		const invalidAnchor = {
			elementId: '550e8400-e29b-41d4-a716-446655440000',
			normalizedPosition: { x: NaN, y: 0.5 },
			perimeterPoint: { x: 1, y: 0.5 },
			gap: 4
		};

		const result = bindingAnchorSchema.safeParse(invalidAnchor);

		expect(result.success).toBe(false);
	});

	it('defaults gap to 4 when not provided', () => {
		const anchorWithoutGap = {
			elementId: '550e8400-e29b-41d4-a716-446655440000',
			normalizedPosition: { x: 0.5, y: 0.5 },
			perimeterPoint: { x: 1, y: 0.5 }
		};

		const result = bindingAnchorSchema.safeParse(anchorWithoutGap);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.gap).toBe(4);
		}
	});

	it('requires all mandatory fields', () => {
		const incompleteAnchor = {
			elementId: '550e8400-e29b-41d4-a716-446655440000'
			// Missing normalizedPosition and perimeterPoint
		};

		const result = bindingAnchorSchema.safeParse(incompleteAnchor);

		expect(result.success).toBe(false);
	});
});

describe('shapeElementSchema with bindings', () => {
	it('accepts arrow shape with valid bindings', async () => {
		// Import dynamically to avoid circular dependency issues in tests
		const { validateDocument } = await import('./file-format');

		const documentWithArrow = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			version: 1,
			title: 'Test',
			createdAt: '2025-01-17T10:00:00.000Z',
			updatedAt: '2025-01-17T10:00:00.000Z',
			pages: [
				{
					id: '550e8400-e29b-41d4-a716-446655440001',
					width: 794,
					height: 1123,
					background: { type: 'plain', style: 'plain', color: '#ffffff' },
					elements: [
						{
							id: '550e8400-e29b-41d4-a716-446655440002',
							type: 'shape',
							shapeType: 'rectangle',
							start: { x: 100, y: 100 },
							end: { x: 200, y: 200 },
							color: '#000000',
							strokeWidth: 2,
							opacity: 1
						},
						{
							id: '550e8400-e29b-41d4-a716-446655440003',
							type: 'shape',
							shapeType: 'arrow',
							start: { x: 200, y: 150 },
							end: { x: 300, y: 150 },
							color: '#000000',
							strokeWidth: 2,
							opacity: 1,
							startBinding: {
								elementId: '550e8400-e29b-41d4-a716-446655440002',
								normalizedPosition: { x: 1, y: 0.5 },
								perimeterPoint: { x: 1, y: 0.5 },
								gap: 4
							},
							endBinding: null
						}
					]
				}
			],
			currentPageIndex: 0,
			instruments: {
				ruler: { type: 'ruler', visible: false, x: 100, y: 300, rotation: 0 },
				protractor: { type: 'protractor', visible: false, x: 300, y: 300, rotation: 0 },
				setSquare: { type: 'setSquare', visible: false, x: 200, y: 200, rotation: 0 }
			}
		};

		const result = validateDocument(documentWithArrow);

		expect(result.success).toBe(true);
	});

	it('accepts arrow shape without bindings (backward compatibility)', async () => {
		const { validateDocument } = await import('./file-format');

		const documentWithArrowNoBinding = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			version: 1,
			title: 'Test',
			createdAt: '2025-01-17T10:00:00.000Z',
			updatedAt: '2025-01-17T10:00:00.000Z',
			pages: [
				{
					id: '550e8400-e29b-41d4-a716-446655440001',
					width: 794,
					height: 1123,
					background: { type: 'plain', style: 'plain', color: '#ffffff' },
					elements: [
						{
							id: '550e8400-e29b-41d4-a716-446655440003',
							type: 'shape',
							shapeType: 'arrow',
							start: { x: 200, y: 150 },
							end: { x: 300, y: 150 },
							color: '#000000',
							strokeWidth: 2,
							opacity: 1
							// No binding fields - backward compatible
						}
					]
				}
			],
			currentPageIndex: 0,
			instruments: {
				ruler: { type: 'ruler', visible: false, x: 100, y: 300, rotation: 0 },
				protractor: { type: 'protractor', visible: false, x: 300, y: 300, rotation: 0 },
				setSquare: { type: 'setSquare', visible: false, x: 200, y: 200, rotation: 0 }
			}
		};

		const result = validateDocument(documentWithArrowNoBinding);

		expect(result.success).toBe(true);
	});
});
