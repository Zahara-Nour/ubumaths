/**
 * Whiteboard Templates Validation Tests
 *
 * Tests for Zod schemas used in whiteboard template validation.
 */

import { describe, it, expect } from 'vitest';
import {
	templateFontSchema,
	backgroundStyleSchema,
	pageFormatSchema,
	createTemplateFromModalSchema,
	templateFavoriteSchema,
	templatePageDataSchema
} from './whiteboard-templates';

// =============================================================================
// templateFontSchema Tests
// =============================================================================

describe('templateFontSchema', () => {
	it('accepts valid font names', () => {
		expect(templateFontSchema.safeParse('Inter').success).toBe(true);
		expect(templateFontSchema.safeParse('Excalifont').success).toBe(true);
		expect(templateFontSchema.safeParse('Shantell Sans').success).toBe(true);
		expect(templateFontSchema.safeParse('Linux Libertine').success).toBe(true);
	});

	it('rejects invalid font names', () => {
		expect(templateFontSchema.safeParse('Arial').success).toBe(false);
		expect(templateFontSchema.safeParse('Comic Sans').success).toBe(false);
		expect(templateFontSchema.safeParse('').success).toBe(false);
		expect(templateFontSchema.safeParse(123).success).toBe(false);
	});
});

// =============================================================================
// backgroundStyleSchema Tests
// =============================================================================

describe('backgroundStyleSchema', () => {
	it('accepts valid background styles', () => {
		const validStyles = [
			'plain',
			'grid',
			'ruled',
			'dotted',
			'triangular',
			'triangular-dotted',
			'hexagonal',
			'hexagonal-dotted'
		];

		for (const style of validStyles) {
			expect(backgroundStyleSchema.safeParse(style).success).toBe(true);
		}
	});

	it('rejects invalid background styles', () => {
		expect(backgroundStyleSchema.safeParse('striped').success).toBe(false);
		expect(backgroundStyleSchema.safeParse('checkered').success).toBe(false);
		expect(backgroundStyleSchema.safeParse('').success).toBe(false);
	});
});

// =============================================================================
// pageFormatSchema Tests
// =============================================================================

describe('pageFormatSchema', () => {
	it('accepts valid page formats', () => {
		const validFormats = [
			'A4',
			'A4_LANDSCAPE',
			'A3',
			'A3_LANDSCAPE',
			'WIDESCREEN_16_9',
			'STANDARD_4_3'
		];

		for (const format of validFormats) {
			expect(pageFormatSchema.safeParse(format).success).toBe(true);
		}
	});

	it('rejects invalid page formats', () => {
		expect(pageFormatSchema.safeParse('A5').success).toBe(false);
		expect(pageFormatSchema.safeParse('LETTER').success).toBe(false);
		expect(pageFormatSchema.safeParse('').success).toBe(false);
	});
});

// =============================================================================
// createTemplateFromModalSchema Tests
// =============================================================================

describe('createTemplateFromModalSchema', () => {
	const validInput = {
		name: 'Test Template',
		category: 'grids',
		format: 'A4',
		backgroundColor: '#ffffff',
		backgroundStyle: 'grid'
	};

	it('accepts valid input with required fields', () => {
		const result = createTemplateFromModalSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it('accepts valid input with all optional fields', () => {
		const input = {
			...validInput,
			description: 'A test template',
			gridSpacing: 20,
			font: 'Inter'
		};
		const result = createTemplateFromModalSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('trims whitespace from name', () => {
		const input = {
			...validInput,
			name: '  Test Template  '
		};
		const result = createTemplateFromModalSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe('Test Template');
		}
	});

	it('rejects empty name', () => {
		const input = { ...validInput, name: '' };
		const result = createTemplateFromModalSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('rejects name longer than 100 characters', () => {
		const input = { ...validInput, name: 'a'.repeat(101) };
		const result = createTemplateFromModalSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('rejects description longer than 500 characters', () => {
		const input = { ...validInput, description: 'a'.repeat(501) };
		const result = createTemplateFromModalSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('rejects invalid background color format', () => {
		const invalidColors = ['white', 'rgb(255,255,255)', '#fff', '#GGGGGG', ''];

		for (const color of invalidColors) {
			const input = { ...validInput, backgroundColor: color };
			const result = createTemplateFromModalSchema.safeParse(input);
			expect(result.success).toBe(false);
		}
	});

	it('accepts valid hex colors (case insensitive)', () => {
		const validColors = ['#ffffff', '#FFFFFF', '#000000', '#ff0000', '#00FF00'];

		for (const color of validColors) {
			const input = { ...validInput, backgroundColor: color };
			const result = createTemplateFromModalSchema.safeParse(input);
			expect(result.success).toBe(true);
		}
	});

	it('rejects grid spacing outside range', () => {
		expect(createTemplateFromModalSchema.safeParse({ ...validInput, gridSpacing: 4 }).success).toBe(
			false
		);
		expect(
			createTemplateFromModalSchema.safeParse({ ...validInput, gridSpacing: 101 }).success
		).toBe(false);
	});

	it('accepts grid spacing within range', () => {
		expect(createTemplateFromModalSchema.safeParse({ ...validInput, gridSpacing: 5 }).success).toBe(
			true
		);
		expect(
			createTemplateFromModalSchema.safeParse({ ...validInput, gridSpacing: 100 }).success
		).toBe(true);
		expect(
			createTemplateFromModalSchema.safeParse({ ...validInput, gridSpacing: 50 }).success
		).toBe(true);
	});
});

// =============================================================================
// templateFavoriteSchema Tests
// =============================================================================

describe('templateFavoriteSchema', () => {
	it('accepts valid UUID', () => {
		const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
		const result = templateFavoriteSchema.safeParse({ templateId: validUuid });
		expect(result.success).toBe(true);
	});

	it('rejects invalid UUID format', () => {
		const invalidUuids = ['not-a-uuid', '123', '', 'f47ac10b-58cc-4372-a567'];

		for (const uuid of invalidUuids) {
			const result = templateFavoriteSchema.safeParse({ templateId: uuid });
			expect(result.success).toBe(false);
		}
	});

	it('rejects missing templateId', () => {
		const result = templateFavoriteSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// templatePageDataSchema Tests
// =============================================================================

describe('templatePageDataSchema', () => {
	const validPageData = {
		elements: [],
		background: {
			type: 'plain',
			style: 'grid',
			color: '#ffffff'
		},
		width: 794,
		height: 1123
	};

	it('accepts valid page data', () => {
		const result = templatePageDataSchema.safeParse(validPageData);
		expect(result.success).toBe(true);
	});

	it('accepts page data with font', () => {
		const input = {
			...validPageData,
			font: 'Shantell Sans'
		};
		const result = templatePageDataSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('rejects page data with invalid font', () => {
		const input = {
			...validPageData,
			font: 'Comic Sans'
		};
		const result = templatePageDataSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('rejects dimensions exceeding maximum', () => {
		const tooWide = { ...validPageData, width: 10001 };
		const tooTall = { ...validPageData, height: 10001 };

		expect(templatePageDataSchema.safeParse(tooWide).success).toBe(false);
		expect(templatePageDataSchema.safeParse(tooTall).success).toBe(false);
	});

	it('rejects too many elements', () => {
		const tooMany = {
			...validPageData,
			elements: Array(1001).fill({
				id: 'test',
				type: 'stroke',
				toolType: 'pen',
				points: [],
				color: '#000000',
				width: 2,
				opacity: 1
			})
		};
		const result = templatePageDataSchema.safeParse(tooMany);
		expect(result.success).toBe(false);
	});
});
