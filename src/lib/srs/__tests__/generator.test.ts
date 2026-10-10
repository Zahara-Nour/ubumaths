/**
 * SRS Instance Generator Tests
 * =============================
 *
 * Tests for generating QuestionInstances for SRS flashcards.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	generateSRSInstance,
	generateSRSPreviewInstances,
	validateTemplateForSRS
} from '../generator';
import type { GenerationResult, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';
import { generateInstance } from '$lib/questions/generator/instance-generator';

const generateInstanceMock = vi.mocked(generateInstance);

/**
 * Le générateur réel est remplacé : ces tests visent `generateSRSInstance`
 * (graine, transmission, échec) et non la génération elle-même. Le faux rend
 * le VRAI type `GenerationResult`, imposé par l'annotation de retour.
 */
vi.mock('$lib/questions/generator/instance-generator', async () => {
	const { resolvedMarkdown } = await import('$lib/ubumark');
	return {
		generateInstance: vi.fn((template: QuestionTemplate, seed?: number): GenerationResult => {
			if (template.status !== 'published') {
				return { success: false, errors: ['Template must be published'] };
			}
			if (!template.variations || template.variations.length === 0) {
				return { success: false, errors: ['No variations available'] };
			}
			return {
				success: true,
				instance: {
					templateId: template.id,
					statement: resolvedMarkdown(`Question générée (graine ${seed})`),
					grades: template.grades,
					theme: template.theme,
					domain: template.domain,
					level: template.level,
					generatedAt: new Date().toISOString(),
					seed,
					selectedVariationIndex: 0
				}
			};
		})
	};
});

const createMockTemplate = (overrides: Partial<QuestionTemplate> = {}): QuestionTemplate => ({
	id: 'template-1',
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
			blanks: [{ expectedAnswer: '42' }],
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

	it('should reject template without variations', () => {
		const template = createMockTemplate({ variations: [] });
		const result = validateTemplateForSRS(template);

		expect(result.isValid).toBe(false);
		expect(result.errors.some((e) => e.includes('variation'))).toBe(true);
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
					blanks: [{ expectedAnswer: '1' }],
					correction: { steps: [templateMarkdown('S1')] }
				},
				{
					statement: templateMarkdown('Q2'),
					blanks: [{ expectedAnswer: '2' }],
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
					blanks: [{ expectedAnswer: '{eval:{{a}} + {{b}}}' }],
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

describe('generateSRSInstance : ce qui est transmis au générateur', () => {
	beforeEach(() => {
		generateInstanceMock.mockClear();
	});

	it('passes the same template and an integer seed in [0, 1000000)', () => {
		const template = createMockTemplate();
		generateSRSInstance(template);

		expect(generateInstanceMock).toHaveBeenCalledTimes(1);
		const [passedTemplate, passedSeed] = generateInstanceMock.mock.calls[0];
		expect(passedTemplate).toBe(template);
		expect(Number.isInteger(passedSeed)).toBe(true);
		expect(passedSeed).toBeGreaterThanOrEqual(0);
		expect(passedSeed).toBeLessThan(1000000);
	});

	it('derives the seed from Math.random', () => {
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
		try {
			generateSRSInstance(createMockTemplate());
		} finally {
			randomSpy.mockRestore();
		}
		expect(generateInstanceMock.mock.calls[0][1]).toBe(123456);
	});

	it('returns the generator result unchanged', () => {
		const result = generateSRSInstance(createMockTemplate());
		expect(result).toBe(generateInstanceMock.mock.results[0].value);
	});

	it('returns the generator failure unchanged', () => {
		const result = generateSRSInstance(createMockTemplate({ status: 'draft' }));
		expect(result).toEqual({ success: false, errors: ['Template must be published'] });
	});
});

describe('validateTemplateForSRS : échecs du générateur', () => {
	it('reports the generator errors of a published template', () => {
		generateInstanceMock.mockReturnValueOnce({
			success: false,
			errors: ['Variable a non résolue', 'Blanc vide']
		});
		const result = validateTemplateForSRS(createMockTemplate());

		expect(result).toEqual({
			isValid: false,
			errors: ['Instance generation failed: Variable a non résolue, Blanc vide']
		});
	});

	it('reports an exception thrown by the generator', () => {
		generateInstanceMock.mockImplementationOnce(() => {
			throw new Error('boum');
		});
		const result = validateTemplateForSRS(createMockTemplate());

		expect(result).toEqual({
			isValid: false,
			errors: ['Instance generation error: boum']
		});
	});
});
