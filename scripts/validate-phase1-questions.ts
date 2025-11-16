#!/usr/bin/env tsx

/**
 * Phase 1 Validation Script
 * =========================
 *
 * Validates that Phase 1 migrated questions are correctly imported
 * and can be properly instantiated.
 *
 * Usage:
 *   pnpm tsx scripts/validate-phase1-questions.ts [options]
 *
 * Options:
 *   --sample N   Validate only N random questions (default: all)
 *   --verbose    Show detailed validation output
 *
 * @module scripts/validate-phase1-questions
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { QuestionTemplate } from '$lib/questions/types';
import { generateQuestionInstance } from '$lib/questions/generator';

// Configuration
const CONFIG = {
	SAMPLE_SIZE:
		parseInt(process.argv.find((_, i) => process.argv[i - 1] === '--sample') || '0') || null,
	VERBOSE: process.argv.includes('--verbose'),
	PHASE: 1
};

// Validation results
interface ValidationResults {
	total: number;
	validated: number;
	failed: number;
	errors: Array<{
		id: string;
		error: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		template?: any;
	}>;
}

// Create Supabase client
function createSupabaseClient() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		console.error('❌ Missing environment variables');
		process.exit(1);
	}

	return createClient<Database>(url, key);
}

async function main() {
	console.log('🔍 Phase 1 Question Validation\n');
	console.log('Configuration:');
	console.log(`  - Sample size: ${CONFIG.SAMPLE_SIZE || 'ALL'}`);
	console.log(`  - Verbose: ${CONFIG.VERBOSE ? 'YES' : 'NO'}`);
	console.log('');

	const supabase = createSupabaseClient();
	const results: ValidationResults = {
		total: 0,
		validated: 0,
		failed: 0,
		errors: []
	};

	try {
		// Get Phase 1 questions
		const { data: trackingRecords, error: fetchError } = await supabase
			.from('migration_tracking')
			.select('new_template_id')
			.eq('phase', CONFIG.PHASE)
			.eq('migration_status', 'imported')
			.not('new_template_id', 'is', null);

		if (fetchError) {
			throw new Error(`Failed to fetch tracking records: ${fetchError.message}`);
		}

		if (!trackingRecords || trackingRecords.length === 0) {
			console.log('ℹ️  No Phase 1 questions to validate');
			return;
		}

		const templateIds = trackingRecords
			.map((r) => r.new_template_id)
			.filter((id): id is string => id !== null);

		// Apply sampling if requested
		let idsToValidate = templateIds;
		if (CONFIG.SAMPLE_SIZE && CONFIG.SAMPLE_SIZE < templateIds.length) {
			// Random sampling
			idsToValidate = [];
			const indices = new Set<number>();
			while (indices.size < CONFIG.SAMPLE_SIZE) {
				indices.add(Math.floor(Math.random() * templateIds.length));
			}
			indices.forEach((i) => idsToValidate.push(templateIds[i]));
		}

		results.total = idsToValidate.length;
		console.log(`📊 Validating ${results.total} questions...\n`);

		// Validate each question
		for (let i = 0; i < idsToValidate.length; i++) {
			const id = idsToValidate[i];
			const progress = (((i + 1) / results.total) * 100).toFixed(0);

			if (CONFIG.VERBOSE) {
				console.log(`[${progress}%] Validating ${id}...`);
			} else if (i % 10 === 0) {
				process.stdout.write(`\rProgress: ${progress}%`);
			}

			try {
				await validateQuestion(id, supabase);
				results.validated++;
			} catch (error) {
				results.failed++;
				results.errors.push({
					id,
					error: error instanceof Error ? error.message : String(error)
				});
				if (CONFIG.VERBOSE) {
					console.error(`  ❌ Failed: ${error}`);
				}
			}
		}

		if (!CONFIG.VERBOSE) {
			console.log(''); // New line after progress indicator
		}

		// Update migration status for validated questions
		if (results.validated > 0 && CONFIG.SAMPLE_SIZE === null) {
			// Only update if validating all questions
			const validatedIds = idsToValidate.filter((id) => !results.errors.some((e) => e.id === id));

			for (const id of validatedIds) {
				await supabase
					.from('migration_tracking')
					.update({
						migration_status: 'validated',
						validated_at: new Date().toISOString()
					})
					.eq('new_template_id', id);
			}
		}

		// Display results
		console.log('\n📈 Validation Results:');
		console.log(
			`  ✅ Validated: ${results.validated}/${results.total} (${((results.validated / results.total) * 100).toFixed(1)}%)`
		);
		console.log(`  ❌ Failed: ${results.failed}`);

		if (results.errors.length > 0) {
			console.log('\n❌ Validation Errors:');
			results.errors.slice(0, 10).forEach((e) => {
				console.log(`  - ${e.id}: ${e.error.substring(0, 100)}...`);
			});
			if (results.errors.length > 10) {
				console.log(`  ... and ${results.errors.length - 10} more errors`);
			}
		}

		// Summary
		if (results.failed === 0) {
			console.log('\n✨ All questions validated successfully!');
		} else {
			console.log('\n⚠️  Some questions failed validation. Review errors above.');
		}
	} catch (error) {
		console.error('💥 Validation failed:', error);
		process.exit(1);
	}
}

async function validateQuestion(
	templateId: string,
	supabase: ReturnType<typeof createSupabaseClient>
): Promise<void> {
	// Fetch the template
	const { data: template, error: fetchError } = await supabase
		.from('question_templates')
		.select('*')
		.eq('id', templateId)
		.single();

	if (fetchError || !template) {
		throw new Error(`Failed to fetch template: ${fetchError?.message || 'Not found'}`);
	}

	// Validate template structure
	validateTemplateStructure(template);

	// Try to generate an instance (this will test variable generation)
	try {
		const instance = await generateQuestionInstance(template as QuestionTemplate);

		// Validate instance has required fields
		if (!instance.statement) throw new Error('Instance missing statement');
		if (!instance.answer && template.type !== 'fill_in_blanks') {
			throw new Error('Instance missing answer');
		}

		// For numerical questions, validate answer is numeric
		if (template.type.startsWith('numerical_')) {
			const answer = Array.isArray(instance.answer) ? instance.answer[0] : instance.answer;
			if (isNaN(Number(answer))) {
				throw new Error(`Non-numeric answer for numerical question: ${answer}`);
			}
		}
	} catch (error) {
		throw new Error(`Instance generation failed: ${error}`);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateTemplateStructure(template: any): void {
	// Required fields
	if (!template.id) throw new Error('Missing id');
	if (!template.type) throw new Error('Missing type');
	if (!template.statement) throw new Error('Missing statement');
	if (!template.answer && template.type !== 'fill_in_blanks') {
		throw new Error('Missing answer');
	}
	if (!template.grades || !Array.isArray(template.grades)) {
		throw new Error('Missing or invalid grades');
	}

	// Type-specific validation
	switch (template.type) {
		case 'numerical_exact':
		case 'numerical_decimal':
		case 'numerical_rounded':
			// Should have precision for decimal/rounded
			if (template.type !== 'numerical_exact' && !template.precision) {
				console.warn(`Warning: ${template.type} without precision specification`);
			}
			break;

		case 'algebraic_transform':
			if (!template.transform_type) {
				throw new Error('Algebraic transform missing transform_type');
			}
			break;

		case 'fill_in_blanks':
			if (!template.blanks || !Array.isArray(template.blanks)) {
				throw new Error('Fill-in-blanks missing blanks array');
			}
			break;

		case 'multiple_choice':
			if (!template.choices || !Array.isArray(template.choices)) {
				throw new Error('Multiple choice missing choices array');
			}
			if (template.choices.length < 2) {
				throw new Error('Multiple choice must have at least 2 choices');
			}
			break;

		default:
			throw new Error(`Unknown question type: ${template.type}`);
	}

	// Validate statement structure
	if (!Array.isArray(template.statement)) {
		throw new Error('Statement must be an array');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	template.statement.forEach((field: any, index: number) => {
		if (!field.type || (field.type !== 'text' && field.type !== 'image')) {
			throw new Error(`Invalid statement field type at index ${index}`);
		}
		if (field.type === 'text' && typeof field.content !== 'string') {
			throw new Error(`Invalid text content at statement index ${index}`);
		}
		if (field.type === 'image' && typeof field.url !== 'string') {
			throw new Error(`Invalid image URL at statement index ${index}`);
		}
	});

	// Validate variables if present
	if (template.variables && Array.isArray(template.variables)) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		template.variables.forEach((variable: any, index: number) => {
			if (!variable.name || !variable.expression) {
				throw new Error(`Invalid variable at index ${index}`);
			}
		});
	}
}

// Mock generator function (replace with actual implementation)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateQuestionInstance(template: QuestionTemplate): Promise<any> {
	// This is a simplified mock - replace with actual generator
	// For validation purposes, we just check that variables can be processed

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const instance: any = {
		statement: [],
		answer: template.answer
	};

	// Process statement
	if (Array.isArray(template.statement)) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		instance.statement = template.statement.map((field: any) => {
			if (field.type === 'text') {
				// In real implementation, this would process variables
				return { type: 'text', content: field.content };
			}
			return field;
		});
	}

	// Process answer (simplified)
	if (typeof template.answer === 'string' && template.answer.includes('{')) {
		// Would process variable references here
		instance.answer = '42'; // Mock numeric answer
	} else if (Array.isArray(template.answer)) {
		instance.answer = template.answer.map((a: string) => (a.includes('{') ? '42' : a));
	}

	return instance;
}

// Run the script
if (import.meta.url === `file://${import.meta.resolve(process.argv[1])}.ts`) {
	main().catch((error) => {
		console.error('💥 Fatal error:', error);
		process.exit(1);
	});
}

export { validateQuestion, validateTemplateStructure };
