/**
 * SRS Instance Generator Tests
 * =============================
 *
 * Tests for generating QuestionInstances for SRS flashcards.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	generateSRSInstance,
	generateSRSPreviewInstances,
	validateTemplateForSRS
} from './generator';
import type { QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/shared/markdown';

// Mock the instance generator
vi.mock('$lib/questions/generator/instance-generator', () => ({
	generateInstance: vi.fn((template, seed) => {
		// Mock successful generation
		if (template.status !== 'published') {
			return {
				success: false,
				errors: ['Template must be published']
			};
		}

		if (!template.variations || template.variations.length === 0) {
			return {
				success: false,
				errors: ['No variations available']
			};
		}

		return {
			success: true,
			instance: {
				id: `instance-${seed}`,
				templateId: template.id,
				seed,
				variationIndex: 0,
				parameterValues: {},
				question: [{ type: 'text', content: 'Generated question' }],
				solutionDisplay: [{ type: 'text', content: 'Generated solution' }],
				solution: '42',
				points: 5
			}
		};
	})
}));

const createMockTemplate = (overrides: Partial<QuestionTemplate> = {}): QuestionTemplate => ({
	id: 'template-1',
	type: 'numerical_exact',
	title: 'Test Template',
	description: 'Test description',
	grades: ['6'],
	theme: 'Algèbre',
	domain: 'Calcul',
	level: 5,
	status: 'published',
	variations: [
		{
			statement: templateMarkdown('Question'),
			solution: '42',
			correction: {
				steps: [templateMarkdown('Solution')]
			}
		}
	],
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	created_by: 'teacher-1',
	...overrides
});

describe('generateSRSInstance', () => {
	it('should generate instance with random seed', () => {
		const template = createMockTemplate();
		const result = generateSRSInstance(template);

		expect(result.success).toBe(true);
		expect(result.success && result.instance).toBeDefined();
		expect(result.success ? result.instance.seed : undefined).toBeDefined();
	});

	it('should generate different instances on multiple calls', () => {
		const template = createMockTemplate();

		const result1 = generateSRSInstance(template);
		const result2 = generateSRSInstance(template);

		const seed1 = result1.success ? result1.instance.seed : undefined;
		const seed2 = result2.success ? result2.instance.seed : undefined;
		expect(seed1).not.toBe(seed2);
	});

	it('should generate seed within valid range (0-1000000)', () => {
		const template = createMockTemplate();

		// Test multiple times to ensure consistency
		for (let i = 0; i < 10; i++) {
			const result = generateSRSInstance(template);
			const seed = result.success ? result.instance.seed : undefined;

			expect(seed).toBeGreaterThanOrEqual(0);
			expect(seed).toBeLessThan(1000000);
		}
	});

	it('should handle template with valid variations', () => {
		const template = createMockTemplate();
		const result = generateSRSInstance(template);

		expect(result.success).toBe(true);
		expect(result.success && result.instance).toBeDefined();
	});

	it('should fail for unpublished template', () => {
		const template = createMockTemplate({ status: 'draft' });
		const result = generateSRSInstance(template);

		expect(result.success).toBe(false);
		expect(!result.success && result.errors).toBeDefined();
	});

	it('should fail for template without variations', () => {
		const template = createMockTemplate({ variations: [] });
		const result = generateSRSInstance(template);

		expect(result.success).toBe(false);
		expect(!result.success && result.errors).toBeDefined();
	});
});

describe('generateSRSPreviewInstances', () => {
	it('should generate multiple preview instances', () => {
		const template = createMockTemplate();
		const instances = generateSRSPreviewInstances(template, 5);

		expect(instances).toHaveLength(5);
	});

	it('should generate default number of instances (5)', () => {
		const template = createMockTemplate();
		const instances = generateSRSPreviewInstances(template);

		expect(instances).toHaveLength(5);
	});

	it('should filter out failed generations', () => {
		const template = createMockTemplate({ status: 'draft' }); // Will fail
		const instances = generateSRSPreviewInstances(template, 3);

		expect(instances).toHaveLength(0); // All failed
	});

	it('should generate instances with different seeds', () => {
		const template = createMockTemplate();
		const instances = generateSRSPreviewInstances(template, 3);

		const seeds = instances.map((instance) => instance.seed);
		const uniqueSeeds = new Set(seeds);

		expect(uniqueSeeds.size).toBe(3); // All seeds should be unique
	});

	it('should handle requesting zero instances', () => {
		const template = createMockTemplate();
		const instances = generateSRSPreviewInstances(template, 0);

		expect(instances).toHaveLength(0);
	});

	it('should handle requesting large number of instances', () => {
		const template = createMockTemplate();
		const instances = generateSRSPreviewInstances(template, 100);

		expect(instances).toHaveLength(100);
	});
});

describe('validateTemplateForSRS', () => {
	it('should validate published template with variations', () => {
		const template = createMockTemplate();
		const result = validateTemplateForSRS(template);

		expect(result.isValid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('should reject draft template', () => {
		const template = createMockTemplate({ status: 'draft' });
		const result = validateTemplateForSRS(template);

		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes('published'))).toBe(true);
	});

	it('should reject draft template (alternative test)', () => {
		const template = createMockTemplate({ status: 'draft' });
		const result = validateTemplateForSRS(template);

		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes('published'))).toBe(true);
	});

	it('should reject template without variations', () => {
		const template = createMockTemplate({ variations: [] });
		const result = validateTemplateForSRS(template);

		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes('variation'))).toBe(true);
	});

	it('should reject template with null variations', () => {
		const template = createMockTemplate({
			variations: null as unknown as QuestionTemplate['variations']
		});
		const result = validateTemplateForSRS(template);

		expect(result.isValid).toBe(false);
	});

	it('should accumulate multiple errors', () => {
		const template = createMockTemplate({
			status: 'draft',
			variations: []
		});
		const result = validateTemplateForSRS(template);

		expect(result.isValid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(1);
	});

	it('should validate that instance generation works', () => {
		const template = createMockTemplate();
		const result = validateTemplateForSRS(template);

		expect(result.isValid).toBe(true);
		// Validation should have tested instance generation
	});
});

describe('SRS Generator Edge Cases', () => {
	it('should handle template with multiple variations', () => {
		const template = createMockTemplate({
			variations: [
				{
					statement: templateMarkdown('Q1'),
					solution: '1',
					correction: { steps: [templateMarkdown('S1')] }
				},
				{
					statement: templateMarkdown('Q2'),
					solution: '2',
					correction: { steps: [templateMarkdown('S2')] }
				}
			]
		});

		const result = validateTemplateForSRS(template);
		expect(result.isValid).toBe(true);
	});

	it('should handle template with complex parameters', () => {
		const template = createMockTemplate({
			variations: [
				{
					statement: templateMarkdown('Solve {{a}} + {{b}}'),
					variables: [
						{ name: 'a', expression: '{#:1-10}' },
						{ name: 'b', expression: '{#:1-10}' }
					],
					solution: '{eval:{{a}} + {{b}}}',
					correction: { steps: [templateMarkdown('Solution')] }
				}
			]
		});

		const result = generateSRSInstance(template);
		expect(result.success).toBe(true);
	});

	it('should handle rapid successive generations', () => {
		const template = createMockTemplate();

		// Generate many instances quickly
		const instances = [];
		for (let i = 0; i < 50; i++) {
			const result = generateSRSInstance(template);
			if (result.success && result.instance) {
				instances.push(result.instance);
			}
		}

		expect(instances).toHaveLength(50);

		// Check that seeds are different
		const seeds = instances.map((inst) => inst.seed);
		const uniqueSeeds = new Set(seeds);
		expect(uniqueSeeds.size).toBeGreaterThan(40); // Should be mostly unique
	});
});

describe('Integration with Question System', () => {
	it('should generate valid question instance structure', () => {
		const template = createMockTemplate();
		const result = generateSRSInstance(template);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.instance).toMatchObject({
				id: expect.any(String),
				templateId: template.id,
				seed: expect.any(Number),
				variationIndex: expect.any(Number),
				question: expect.any(Array),
				solutionDisplay: expect.any(Array),
				solution: expect.any(String),
				points: expect.any(Number)
			});
		}
	});

	it('should preserve template metadata', () => {
		const template = createMockTemplate({});

		const result = generateSRSInstance(template);

		if (result.success) {
			expect(result.instance.templateId).toBe(template.id);
		}
	});

	it('should handle LaTeX in question content', () => {
		const template = createMockTemplate({
			variations: [
				{
					statement: templateMarkdown('Solve: $x^2 + 2x + 1 = 0$'),
					solution: '-1',
					correction: { steps: [templateMarkdown('$x = -1$')] }
				}
			]
		});

		const result = validateTemplateForSRS(template);
		expect(result.isValid).toBe(true);
	});
});
