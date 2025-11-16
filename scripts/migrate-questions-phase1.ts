#!/usr/bin/env tsx

/**
 * Phase 1 Migration Script - Simple Arithmetic Questions
 * =======================================================
 *
 * Migrates ~560 simple arithmetic questions from the old TinyMath system
 * to the new UbuMaths v2 database.
 *
 * Phase 1 Criteria:
 * - No images
 * - No custom test answers
 * - No complex conditions
 * - Basic question types only
 * - No list-based random generation ($l{...})
 *
 * Usage:
 *   pnpm tsx scripts/migrate-questions-phase1.ts [options]
 *
 * Options:
 *   --dry-run    Test without database inserts
 *   --resume     Continue from last checkpoint
 *   --from N     Start from question index N
 *   --to N       End at question index N
 *   --batch B    Batch size (default: 50)
 *   --rollback   Undo Phase 1 migration
 *
 * @module scripts/migrate-questions-phase1
 */

import { createClient } from '@supabase/supabase-js';
import { MigrationStateManager } from '$lib/server/migration/state-manager';
import { transformQuestion, type TransformResult } from '$lib/migration/question-transformer';
import type { QuestionBase } from '$lib/migration/old-question-types';
import type { Database } from '$lib/types/database';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory (ESM compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
	BATCH_SIZE: 50,
	PHASE: 1 as const,
	OLD_QUESTIONS_PATH: path.resolve(
		__dirname,
		'../extern/new-tinymath/apps/ubumaths/src/lib/questions/questions.ts'
	),
	REPORT_PATH: path.resolve(__dirname, '../.claude/migration-phase1-report.md'),
	DRY_RUN: process.argv.includes('--dry-run'),
	RESUME: process.argv.includes('--resume'),
	ROLLBACK: process.argv.includes('--rollback'),
	FROM_INDEX: parseInt(process.argv.find((_, i) => process.argv[i - 1] === '--from') || '0'),
	TO_INDEX: parseInt(process.argv.find((_, i) => process.argv[i - 1] === '--to') || '999999'),
	CUSTOM_BATCH_SIZE: parseInt(
		process.argv.find((_, i) => process.argv[i - 1] === '--batch') || '50'
	)
};

// Override batch size if provided
if (CONFIG.CUSTOM_BATCH_SIZE) {
	CONFIG.BATCH_SIZE = CONFIG.CUSTOM_BATCH_SIZE;
}

// ============================================================================
// TYPES
// ============================================================================

interface MigrationResults {
	total: number;
	successful: number;
	failed: number;
	warnings: number;
	skipped: number;
	errors: Array<{
		index: number;
		description: string;
		error: string;
	}>;
	warningDetails: Array<{
		index: number;
		description: string;
		warnings: string[];
	}>;
	startTime: Date;
	endTime?: Date;
}

interface ProcessedQuestion {
	question: QuestionBase;
	index: number;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function createSupabaseClient() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		console.error('❌ Missing environment variables:');
		if (!url) console.error('  - PUBLIC_SUPABASE_URL');
		if (!key) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
		console.error('\nPlease set these in your .env file');
		process.exit(1);
	}

	return createClient<Database>(url, key);
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function main() {
	console.log('🚀 Starting Phase 1 Migration...\n');
	console.log('Configuration:');
	console.log(`  - Dry run: ${CONFIG.DRY_RUN ? 'YES' : 'NO'}`);
	console.log(`  - Resume: ${CONFIG.RESUME ? 'YES' : 'NO'}`);
	console.log(`  - Batch size: ${CONFIG.BATCH_SIZE}`);
	console.log(`  - From index: ${CONFIG.FROM_INDEX}`);
	console.log(`  - To index: ${CONFIG.TO_INDEX}`);
	console.log('');

	// Handle rollback if requested
	if (CONFIG.ROLLBACK) {
		await handleRollback();
		return;
	}

	// Initialize Supabase client and state manager
	const supabase = createSupabaseClient();
	const stateManager = new MigrationStateManager();
	await stateManager.init(supabase);

	// Initialize results tracking
	const results: MigrationResults = {
		total: 0,
		successful: 0,
		failed: 0,
		warnings: 0,
		skipped: 0,
		errors: [],
		warningDetails: [],
		startTime: new Date()
	};

	try {
		// 1. Load old questions
		const oldQuestions = await loadOldQuestions();
		console.log(`📊 Loaded ${oldQuestions.length} total questions\n`);

		// 2. Initialize migration tracking (if not resuming)
		if (!CONFIG.RESUME && !CONFIG.DRY_RUN) {
			await initializeMigrationTracking(oldQuestions, supabase);
		}

		// 3. Get resume point if needed
		let startIndex = CONFIG.FROM_INDEX;
		if (CONFIG.RESUME) {
			const resumePoint = await stateManager.getResumePoint(CONFIG.PHASE);
			startIndex = Math.max(resumePoint.lastProcessedIndex + 1, CONFIG.FROM_INDEX);
			console.log(`📍 Resuming from index ${startIndex}\n`);
		}

		// 4. Filter Phase 1 compatible questions
		const phase1Questions = filterPhase1Questions(oldQuestions, startIndex, CONFIG.TO_INDEX);
		results.total = phase1Questions.length;
		console.log(`✅ ${phase1Questions.length} questions eligible for Phase 1\n`);

		if (phase1Questions.length === 0) {
			console.log('ℹ️  No questions to process. Exiting.\n');
			return;
		}

		// 5. Process in batches
		await processBatches(phase1Questions, results, supabase, stateManager);

		// 6. Mark phase as complete if all questions processed
		if (!CONFIG.DRY_RUN && results.successful === results.total) {
			await stateManager.markPhaseComplete(CONFIG.PHASE, {
				questionsSuccessful: results.successful,
				questionsFailed: results.failed,
				successRate: (results.successful / results.total) * 100
			});
		}

		results.endTime = new Date();

		// 7. Generate final report
		await generateReport(results);

		console.log('\n✨ Phase 1 Migration Complete!');
		console.log(`   Successfully migrated: ${results.successful}/${results.total}`);
		console.log(`   Failed: ${results.failed}`);
		console.log(`   Warnings: ${results.warnings}`);
		console.log(
			`   Time taken: ${((results.endTime.getTime() - results.startTime.getTime()) / 1000).toFixed(1)}s`
		);
	} catch (error) {
		console.error('💥 Migration failed:', error);
		process.exit(1);
	}
}

// ============================================================================
// OLD QUESTIONS LOADER
// ============================================================================

async function loadOldQuestions(): Promise<QuestionBase[]> {
	try {
		// First, check if JSON file exists
		const jsonPath = path.resolve(__dirname, '../.claude/old-questions.json');

		try {
			await fs.access(jsonPath);
			console.log('📖 Loading questions from JSON cache:', jsonPath);
			const jsonContent = await fs.readFile(jsonPath, 'utf-8');
			const questions = JSON.parse(jsonContent) as QuestionBase[];
			console.log(`  ✓ Successfully loaded ${questions.length} questions from JSON`);
			return questions;
		} catch {
			// JSON file doesn't exist, need to generate it
			console.log('⚠️  JSON cache not found. Please run the loader first:');
			console.log('    pnpm tsx scripts/migrate-questions-loader.ts');
			console.log('\n   This will safely extract questions without using eval().');

			// Fallback: Try to read and parse safely without eval
			console.log('\n📖 Attempting safe extraction from:', CONFIG.OLD_QUESTIONS_PATH);

			const fileContent = await fs.readFile(CONFIG.OLD_QUESTIONS_PATH, 'utf-8');

			// Extract questions array using regex
			const questionsMatch = fileContent.match(
				/export\s+const\s+questions[^=]*=\s*(\[[\s\S]*?\])\s*(?:;|$)/
			);

			if (!questionsMatch) {
				throw new Error('Could not find questions array in file');
			}

			// Manual conversion approach (safer than eval)
			const questionsArrayString = questionsMatch[1];

			// Replace known constants
			let jsonString = questionsArrayString
				.replace(/\bCP\b/g, '"CP"')
				.replace(/\bCE1\b/g, '"CE1"')
				.replace(/\bCE2\b/g, '"CE2"')
				.replace(/\bCM1\b/g, '"CM1"')
				.replace(/\bCM2\b/g, '"CM2"')
				.replace(/\bSIXIEME\b/g, '"6"')
				.replace(/\bCINQUIEME\b/g, '"5"')
				.replace(/\bQUATRIEME\b/g, '"4"')
				.replace(/\bTROISIEME\b/g, '"3"')
				.replace(/\bSECONDE\b/g, '"2"')
				.replace(/\bPREMIERE_SPE_MATHS\b/g, '"SPE_1"')
				.replace(/\bTERMINALE_SPE_MATHS\b/g, '"SPE_T"')
				.replace(/\bcolor1\b/g, '"#FF0000"')
				.replace(/\bcolor2\b/g, '"#00FF00"')
				.replace(/\bcolor3\b/g, '"#0000FF"')
				.replace(/\bcorrect_color\b/g, '"#00FF00"')
				.replace(/\bincorrect_color\b/g, '"#FF0000"');

			// Convert to JSON format
			jsonString = jsonString
				.replace(/(\w+):/g, '"$1":') // Quote object keys
				.replace(/'/g, '"') // Replace single quotes
				.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas

			try {
				const questions = JSON.parse(jsonString) as QuestionBase[];

				// Save for future use
				await fs.mkdir(path.dirname(jsonPath), { recursive: true });
				await fs.writeFile(jsonPath, JSON.stringify(questions, null, 2), 'utf-8');
				console.log(`  ✓ Successfully parsed and cached ${questions.length} questions`);

				return questions;
			} catch (parseError) {
				console.error('❌ Failed to parse questions as JSON:', parseError);
				console.error(
					'\n⚠️  IMPORTANT: The questions file contains JavaScript syntax that cannot be automatically converted.'
				);
				console.error('   Please run: pnpm tsx scripts/migrate-questions-loader.ts');
				console.error(
					'   Then manually review and fix any conversion issues in the generated file.'
				);
				throw new Error(
					'Cannot safely parse questions without eval(). Please use the loader script.'
				);
			}
		}
	} catch (error) {
		console.error('❌ Failed to load old questions:', error);
		throw error;
	}
}

// ============================================================================
// MIGRATION TRACKING INITIALIZATION
// ============================================================================

async function initializeMigrationTracking(
	oldQuestions: QuestionBase[],
	supabase: ReturnType<typeof createSupabaseClient>
) {
	console.log('📝 Initializing migration tracking...\n');

	const batchSize = 100;
	for (let i = 0; i < oldQuestions.length; i += batchSize) {
		const batch = oldQuestions.slice(i, i + batchSize);
		const records = batch.map((question, batchIndex) => {
			const index = i + batchIndex;
			const hash = generateQuestionHash(question);
			const description = generateDescription(question);

			return {
				old_question_hash: hash,
				old_question_index: index,
				old_description: description,
				migration_status: 'pending' as const,
				phase: null,
				conversion_errors: []
			};
		});

		// Upsert in batches
		const { error } = await supabase
			.from('migration_tracking')
			.upsert(records, { onConflict: 'old_question_hash', ignoreDuplicates: true });

		if (error) {
			console.error(
				`  ❌ Failed to initialize tracking for batch ${Math.floor(i / batchSize) + 1}:`,
				error
			);
		} else {
			console.log(
				`  ✓ Initialized tracking for questions ${i}-${Math.min(i + batchSize - 1, oldQuestions.length - 1)}`
			);
		}
	}

	console.log('  ✓ Migration tracking initialized\n');
}

// ============================================================================
// PHASE 1 FILTER
// ============================================================================

function filterPhase1Questions(
	questions: QuestionBase[],
	fromIndex: number,
	toIndex: number
): ProcessedQuestion[] {
	console.log('🔍 Filtering Phase 1 compatible questions...');

	const filtered = questions
		.map((question, index) => ({ question, index }))
		.filter(({ index }) => index >= fromIndex && index <= toIndex)
		.filter(({ question }) => {
			// Phase 1 Criteria

			// No images
			if (question.images && question.images.length > 0) return false;

			// No custom test answers
			if (question.testAnswerss && question.testAnswerss.length > 0) return false;

			// No complex conditions
			if (question.conditions && question.conditions.length > 0) {
				// Check if conditions are simple (just grade-based)
				const hasComplexConditions = question.conditions.some(
					(cond) =>
						typeof cond !== 'string' ||
						!['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3'].includes(cond)
				);
				if (hasComplexConditions) return false;
			}

			// Check for $l{} pattern (list random) - save for Phase 2
			const hasListPattern = question.variabless?.some((vars) =>
				Object.values(vars).some((expr) => typeof expr === 'string' && expr.includes('$l{'))
			);
			if (hasListPattern) return false;

			// Check for complex variables (nested evaluations)
			const hasComplexVariables = question.variabless?.some((vars) =>
				Object.values(vars).some((expr) => {
					if (typeof expr !== 'string') return false;
					// Count nesting depth of brackets
					let depth = 0;
					let maxDepth = 0;
					for (const char of expr) {
						if (char === '[') depth++;
						if (char === ']') depth--;
						maxDepth = Math.max(maxDepth, depth);
					}
					return maxDepth > 2; // Allow up to 2 levels of nesting
				})
			);
			if (hasComplexVariables) return false;

			return true;
		});

	console.log(`  ✓ Found ${filtered.length} eligible questions\n`);
	return filtered;
}

// ============================================================================
// BATCH PROCESSOR
// ============================================================================

async function processBatches(
	questions: ProcessedQuestion[],
	results: MigrationResults,
	supabase: ReturnType<typeof createSupabaseClient>,
	stateManager: MigrationStateManager
): Promise<void> {
	const totalBatches = Math.ceil(questions.length / CONFIG.BATCH_SIZE);

	for (let i = 0; i < questions.length; i += CONFIG.BATCH_SIZE) {
		const batch = questions.slice(i, i + CONFIG.BATCH_SIZE);
		const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;

		console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} questions)...`);

		for (const { question, index } of batch) {
			try {
				await processQuestion(question, index, results, supabase, stateManager);
			} catch (error) {
				results.failed++;
				results.errors.push({
					index,
					description: generateDescription(question),
					error: error instanceof Error ? error.message : String(error)
				});
				console.error(`  ❌ Failed: ${generateDescription(question).substring(0, 60)}...`);

				// Record failure in database
				if (!CONFIG.DRY_RUN) {
					await stateManager.recordQuestionProcessed(
						index,
						'failed',
						CONFIG.PHASE,
						question as QuestionBase,
						{
							errors: [
								{
									code: 'MIGRATION_ERROR',
									message: error instanceof Error ? error.message : String(error),
									canRetry: false
								}
							]
						}
					);
				}
			}
		}

		// Save checkpoint after each batch
		if (!CONFIG.DRY_RUN) {
			await stateManager.saveCheckpoint(
				CONFIG.PHASE,
				results.successful,
				questions[Math.min(i + CONFIG.BATCH_SIZE - 1, questions.length - 1)].index
			);
		}

		const progress = (((results.successful + results.failed) / results.total) * 100).toFixed(1);
		console.log(
			`  ✅ Batch complete: ${results.successful}/${results.total} processed (${progress}%)`
		);
	}
}

// ============================================================================
// QUESTION PROCESSOR
// ============================================================================

async function processQuestion(
	question: QuestionBase,
	index: number,
	results: MigrationResults,
	supabase: ReturnType<typeof createSupabaseClient>,
	stateManager: MigrationStateManager
): Promise<void> {
	const description = generateDescription(question);

	// 1. Transform question
	const transformResult: TransformResult = transformQuestion(question, index);

	if (!transformResult.success || !transformResult.template) {
		throw new Error(transformResult.errors?.join(', ') || 'Unknown transformation error');
	}

	// 2. Track warnings
	if (transformResult.warnings && transformResult.warnings.length > 0) {
		results.warnings++;
		results.warningDetails.push({
			index,
			description,
			warnings: transformResult.warnings
		});
		console.log(
			`  ⚠️  ${description.substring(0, 50)}... (${transformResult.warnings.length} warnings)`
		);
	} else {
		console.log(`  ✓ ${description.substring(0, 60)}...`);
	}

	// 3. Skip database operations if dry run
	if (CONFIG.DRY_RUN) {
		results.successful++;
		return;
	}

	// 4. Ensure template has required fields
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const template = transformResult.template as any;

	// Set created_by to null for migration (admin will be set later)
	template.created_by = null;

	// 5. Insert into database
	const { data: inserted, error: insertError } = await supabase
		.from('question_templates')
		.insert(template)
		.select()
		.single();

	if (insertError) {
		throw new Error(`Database insert failed: ${insertError.message}`);
	}

	// 6. Update migration tracking
	await stateManager.recordQuestionProcessed(
		index,
		'imported',
		CONFIG.PHASE,
		question as QuestionBase,
		{
			newTemplateId: inserted.id,
			notes: transformResult.warnings?.join('\n')
		}
	);

	results.successful++;
}

// ============================================================================
// ROLLBACK HANDLER
// ============================================================================

async function handleRollback(): Promise<void> {
	console.log('🔄 Rolling back Phase 1 migration...\n');

	const supabase = createSupabaseClient();

	if (CONFIG.DRY_RUN) {
		console.log('ℹ️  Dry run mode - no actual rollback performed');
		return;
	}

	try {
		// Get all Phase 1 templates
		const { data: trackingRecords, error: fetchError } = await supabase
			.from('migration_tracking')
			.select('new_template_id')
			.eq('phase', CONFIG.PHASE)
			.not('new_template_id', 'is', null);

		if (fetchError) {
			throw new Error(`Failed to fetch tracking records: ${fetchError.message}`);
		}

		if (!trackingRecords || trackingRecords.length === 0) {
			console.log('ℹ️  No Phase 1 templates to rollback');
			return;
		}

		const templateIds = trackingRecords
			.map((r) => r.new_template_id)
			.filter((id): id is string => id !== null);

		console.log(`Found ${templateIds.length} templates to delete`);

		// Delete templates in batches
		const batchSize = 100;
		for (let i = 0; i < templateIds.length; i += batchSize) {
			const batch = templateIds.slice(i, i + batchSize);

			const { error: deleteError } = await supabase
				.from('question_templates')
				.delete()
				.in('id', batch);

			if (deleteError) {
				console.error(`  ❌ Failed to delete batch ${Math.floor(i / batchSize) + 1}:`, deleteError);
			} else {
				console.log(
					`  ✓ Deleted batch ${Math.floor(i / batchSize) + 1} (${batch.length} templates)`
				);
			}
		}

		// Reset migration tracking
		const { error: resetError } = await supabase
			.from('migration_tracking')
			.update({
				migration_status: 'pending',
				phase: null,
				new_template_id: null,
				converted_at: null,
				imported_at: null,
				validated_at: null,
				conversion_notes: null
			})
			.eq('phase', CONFIG.PHASE);

		if (resetError) {
			console.error('❌ Failed to reset tracking records:', resetError);
		} else {
			console.log('✓ Reset migration tracking records');
		}

		// Reset state file
		const stateManager = new MigrationStateManager();
		await stateManager.init(supabase);
		await stateManager.updateMigrationState({
			currentPhase: CONFIG.PHASE,
			phases: {
				'1': { status: 'pending', questionsProcessed: 0, startDate: null, endDate: null },
				'2': { status: 'pending', questionsProcessed: 0, startDate: null, endDate: null },
				'3': { status: 'pending', questionsProcessed: 0, startDate: null, endDate: null },
				'4': { status: 'pending', questionsProcessed: 0, startDate: null, endDate: null }
			}
		});

		console.log('\n✅ Phase 1 rollback complete');
	} catch (error) {
		console.error('💥 Rollback failed:', error);
		process.exit(1);
	}
}

// ============================================================================
// REPORT GENERATOR
// ============================================================================

async function generateReport(results: MigrationResults): Promise<void> {
	const duration = results.endTime
		? ((results.endTime.getTime() - results.startTime.getTime()) / 1000).toFixed(1)
		: 'N/A';

	const successRate =
		results.total > 0 ? ((results.successful / results.total) * 100).toFixed(1) : '0';

	const report = `# Phase 1 Migration Report

Generated: ${new Date().toISOString()}
Duration: ${duration} seconds

## Configuration
- Dry Run: ${CONFIG.DRY_RUN ? 'YES' : 'NO'}
- Batch Size: ${CONFIG.BATCH_SIZE}
- Index Range: ${CONFIG.FROM_INDEX} - ${CONFIG.TO_INDEX}

## Statistics
- Total questions processed: ${results.total}
- Successfully migrated: ${results.successful} (${successRate}%)
- Failed: ${results.failed}
- Warnings: ${results.warnings}
- Skipped: ${results.skipped}

## Errors
${
	results.errors.length === 0
		? 'No errors'
		: results.errors.map((e) => `- [${e.index}] ${e.description}\n  Error: ${e.error}`).join('\n')
}

## Warnings
${
	results.warningDetails.length === 0
		? 'No warnings'
		: results.warningDetails
				.map(
					(w) =>
						`- [${w.index}] ${w.description}\n  ${w.warnings.map((msg) => `  ⚠️ ${msg}`).join('\n')}`
				)
				.join('\n')
}

## Next Steps
${
	results.successful === results.total
		? '✅ All questions migrated successfully. Ready for Phase 1 validation testing.'
		: '⚠️ Some questions failed. Review errors above and:'
}
${
	results.failed > 0
		? `
1. Review failed questions for common patterns
2. Fix transformation logic if needed
3. Retry failed questions with: pnpm tsx scripts/migrate-questions-phase1.ts --resume
`
		: ''
}
${
	results.warnings > 0
		? `
Note: ${results.warnings} questions have warnings that may require manual review.
`
		: ''
}

## Command to Validate
\`\`\`bash
# Run validation tests for Phase 1 questions
pnpm tsx scripts/validate-phase1-questions.ts
\`\`\`

## Command to Rollback (if needed)
\`\`\`bash
# Undo Phase 1 migration
pnpm tsx scripts/migrate-questions-phase1.ts --rollback
\`\`\`
`;

	// Save report to file
	await fs.writeFile(CONFIG.REPORT_PATH, report, 'utf-8');

	console.log('\n📄 Report saved to:', CONFIG.REPORT_PATH);

	// Also output key parts to console
	if (results.errors.length > 0) {
		console.log('\n❌ Errors Summary:');
		results.errors.slice(0, 5).forEach((e) => {
			console.log(`  - [${e.index}] ${e.description.substring(0, 50)}...`);
			console.log(`    ${e.error.substring(0, 100)}...`);
		});
		if (results.errors.length > 5) {
			console.log(`  ... and ${results.errors.length - 5} more errors (see report)`);
		}
	}
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateQuestionHash(question: QuestionBase): string {
	// Create a stable hash based on key question properties
	const content = JSON.stringify({
		description: question.description,
		subdescription: question.subdescription,
		enounces: question.enounces,
		expressions: question.expressions,
		variabless: question.variabless,
		solutionss: question.solutionss
	});
	return crypto.createHash('sha256').update(content).digest('hex');
}

function generateDescription(question: QuestionBase): string {
	const parts: string[] = [];

	if (question.description) parts.push(question.description);
	if (question.subdescription) parts.push(question.subdescription);
	if (question.grade) parts.push(`[${question.grade}]`);

	// If no description available, use first enounce
	if (parts.length === 0 && question.enounces && question.enounces.length > 0) {
		parts.push(question.enounces[0].substring(0, 50));
	}

	return parts.join(' - ') || 'No description';
}

// ============================================================================
// RUN THE SCRIPT
// ============================================================================

// Check if running directly (not imported)
if (import.meta.url === `file://${__filename}`) {
	main().catch((error) => {
		console.error('💥 Fatal error:', error);
		process.exit(1);
	});
}

// Export for testing
export {
	loadOldQuestions,
	filterPhase1Questions,
	processQuestion,
	generateQuestionHash,
	generateDescription
};
