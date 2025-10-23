/**
 * SRS Instance Generator
 * ======================
 *
 * Generates QuestionInstances for template-based SRS cards.
 *
 * For SRS, we generate a NEW instance with a random seed at each review.
 * This provides variety and prevents memorization of specific values.
 *
 * Workflow:
 * 1. User reviews a card (template-based)
 * 2. Generate new instance with random seed
 * 3. Display FlashCard with new instance
 * 4. User grades the card
 * 5. FSRS updates stats (same template, different instance)
 *
 * This is different from the Test system where instances are pre-generated
 * with a fixed seed for reproducibility.
 */

import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate, QuestionInstance } from '$lib/questions/types';

/**
 * Generate instance for SRS review
 *
 * Uses a random seed to create variety at each review.
 *
 * @param template - Question template
 * @returns Instance generation result
 */
export function generateSRSInstance(template: QuestionTemplate) {
	// Generate random seed (0 to 1,000,000)
	const randomSeed = Math.floor(Math.random() * 1000000);

	// Use existing instance generator
	return generateInstance(template, randomSeed);
}

/**
 * Generate multiple instances for preview/testing
 *
 * Useful for previewing how a template will look in SRS.
 *
 * @param template - Question template
 * @param count - Number of instances to generate (default: 5)
 * @returns Array of instances
 */
export function generateSRSPreviewInstances(
	template: QuestionTemplate,
	count: number = 5
): QuestionInstance[] {
	const instances: QuestionInstance[] = [];

	for (let i = 0; i < count; i++) {
		const result = generateSRSInstance(template);

		if (result.success && result.instance) {
			instances.push(result.instance);
		}
	}

	return instances;
}

/**
 * Validate template for SRS use
 *
 * Checks if a template is suitable for spaced repetition:
 * - Must be published
 * - Must have valid variations
 * - Must generate instances successfully
 *
 * @param template - Question template
 * @returns Validation result
 */
export function validateTemplateForSRS(template: QuestionTemplate): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Must be published
	if (template.status !== 'published') {
		errors.push('Template must be published for SRS use');
	}

	// Must have variations
	if (!template.variations || template.variations.length === 0) {
		errors.push('Template must have at least one variation');
	}

	// Try generating an instance
	try {
		const result = generateSRSInstance(template);

		if (!result.success) {
			errors.push(`Instance generation failed: ${result.errors?.join(', ')}`);
		}
	} catch (error) {
		errors.push(
			`Instance generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}
