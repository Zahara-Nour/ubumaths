#!/usr/bin/env node --import tsx --env-file=.env

/**
 * Import Questions to Database
 * ============================
 *
 * Imports approved questions from the exported JSON files to the database.
 * This is Phase 4 of the migration - only approved questions are imported.
 *
 * Features:
 * - Reads from data/migration-output/export-YYYY-MM-DD/by-category/
 * - Only imports questions with review_status = 'approved' (via --approved-only flag)
 * - Uses the existing question-transformer for transformation
 * - Inserts into question_templates table
 * - Updates migration_tracking table with status
 * - Supports filtering by theme/domain/subdomain
 *
 * Usage:
 *   pnpm tsx scripts/import-questions-to-db.ts --approved-only
 *   pnpm tsx scripts/import-questions-to-db.ts --theme Entiers --domain Apprivoiser --subdomain Ecriture
 *   pnpm tsx scripts/import-questions-to-db.ts --dry-run
 *
 * Options:
 *   --approved-only   Only import questions approved via review API
 *   --theme <name>    Filter by theme (e.g., "Entiers")
 *   --domain <name>   Filter by domain (e.g., "Apprivoiser")
 *   --subdomain <name> Filter by subdomain (e.g., "Ecriture")
 *   --dry-run         Preview without database changes
 *   --batch <size>    Batch size for inserts (default: 50)
 *   --source <path>   Override export directory path
 *
 * @module scripts/import-questions-to-db
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/database';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { glob } from 'glob';

// Get current directory (ESM compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
	BATCH_SIZE: parseInt(getArgValue('--batch') || '50'),
	DRY_RUN: process.argv.includes('--dry-run'),
	APPROVED_ONLY: process.argv.includes('--approved-only'),
	THEME: getArgValue('--theme'),
	DOMAIN: getArgValue('--domain'),
	SUBDOMAIN: getArgValue('--subdomain'),
	SOURCE_PATH:
		getArgValue('--source') || findLatestExportDir() || 'data/migration-output/export-2025-11-27'
};

/**
 * Get command line argument value
 */
function getArgValue(flag: string): string | undefined {
	const index = process.argv.indexOf(flag);
	if (index === -1 || index === process.argv.length - 1) return undefined;
	return process.argv[index + 1];
}

/**
 * Find the most recent export directory
 */
function findLatestExportDir(): string | undefined {
	try {
		const baseDir = path.resolve(__dirname, '../data/migration-output');
		const dirs = fs
			.readdirSync(baseDir)
			.filter((d: string) => d.startsWith('export-'))
			.sort()
			.reverse();
		return dirs.length > 0 ? path.join(baseDir, dirs[0]) : undefined;
	} catch {
		return undefined;
	}
}

// ============================================================================
// TYPES
// ============================================================================

interface ExportedQuestion {
	theme: string;
	domain: string;
	subdomain: string;
	level: number;
	globalIndex: number;
	question: Record<string, unknown>;
	transformed: QuestionTemplateInsert;
	warnings: string[];
	errors: string[];
	stats: {
		variations: number;
		variables: number;
		syntaxConversions: number;
		optionsMapped: number;
		correctionConversions: number;
		detectedType: string;
		hasImages: boolean;
		hasCustomValidation: boolean;
		imagesConverted: number;
		imagesMissing: number;
	};
}

interface QuestionTemplateInsert {
	type: string;
	title: string;
	description?: string;
	variations: unknown;
	exerciseInstruction?: string;
	options?: unknown;
	grades: string[];
	theme: string;
	domain: string;
	subdomain?: string;
	level: number;
	status: string;
	delay?: number;
	precision?: unknown;
	transformType?: string;
	multipleAnswers?: boolean;
}

interface ImportResults {
	total: number;
	imported: number;
	skipped: number;
	failed: number;
	errors: Array<{
		theme: string;
		domain: string;
		subdomain: string;
		level: number;
		error: string;
	}>;
	startTime: Date;
	endTime?: Date;
}

interface _MigrationTrackingRow {
	id: string;
	theme: string | null;
	domain: string | null;
	subdomain: string | null;
	level: number | null;
	review_status: string | null;
	new_template_id: string | null;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function createSupabaseClient(): SupabaseClient<Database> {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		console.error('Missing environment variables:');
		if (!url) console.error('  - PUBLIC_SUPABASE_URL');
		if (!key) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
		console.error('\nPlease set these in your .env file');
		process.exit(1);
	}

	return createClient<Database>(url, key);
}

// ============================================================================
// MAIN IMPORT FUNCTION
// ============================================================================

async function main() {
	console.log('Starting Question Import to Database...\n');
	console.log('Configuration:');
	console.log(`  - Dry run: ${CONFIG.DRY_RUN ? 'YES' : 'NO'}`);
	console.log(`  - Approved only: ${CONFIG.APPROVED_ONLY ? 'YES' : 'NO'}`);
	console.log(`  - Batch size: ${CONFIG.BATCH_SIZE}`);
	console.log(`  - Source path: ${CONFIG.SOURCE_PATH}`);
	if (CONFIG.THEME) console.log(`  - Theme filter: ${CONFIG.THEME}`);
	if (CONFIG.DOMAIN) console.log(`  - Domain filter: ${CONFIG.DOMAIN}`);
	if (CONFIG.SUBDOMAIN) console.log(`  - Subdomain filter: ${CONFIG.SUBDOMAIN}`);
	console.log('');

	// Initialize Supabase client
	const supabase = createSupabaseClient();

	// Initialize results tracking
	const results: ImportResults = {
		total: 0,
		imported: 0,
		skipped: 0,
		failed: 0,
		errors: [],
		startTime: new Date()
	};

	try {
		// 1. Find and load exported JSON files
		const exportedQuestions = await loadExportedQuestions();
		console.log(`Loaded ${exportedQuestions.length} questions from export files\n`);

		if (exportedQuestions.length === 0) {
			console.log('No questions found to import. Exiting.\n');
			return;
		}

		// 2. Filter by approval status if needed
		let questionsToImport = exportedQuestions;
		if (CONFIG.APPROVED_ONLY) {
			questionsToImport = await filterApprovedQuestions(exportedQuestions, supabase);
			console.log(`${questionsToImport.length} questions approved for import\n`);
		}

		results.total = questionsToImport.length;

		if (questionsToImport.length === 0) {
			console.log('No approved questions found to import. Exiting.\n');
			return;
		}

		// 3. Process in batches
		await processBatches(questionsToImport, results, supabase);

		results.endTime = new Date();

		// 4. Generate final report
		printReport(results);

		console.log('\nImport Complete!');
		console.log(`   Successfully imported: ${results.imported}/${results.total}`);
		console.log(`   Failed: ${results.failed}`);
		console.log(`   Skipped: ${results.skipped}`);
		console.log(
			`   Time taken: ${((results.endTime.getTime() - results.startTime.getTime()) / 1000).toFixed(1)}s`
		);
	} catch (error) {
		console.error('Import failed:', error);
		process.exit(1);
	}
}

// ============================================================================
// LOAD EXPORTED QUESTIONS
// ============================================================================

async function loadExportedQuestions(): Promise<ExportedQuestion[]> {
	const sourceDir = path.resolve(__dirname, '..', CONFIG.SOURCE_PATH);
	const byCategoryDir = path.join(sourceDir, 'by-category');

	console.log(`Loading questions from: ${byCategoryDir}\n`);

	// Build glob pattern based on filters
	let pattern = '**/*.json';
	if (CONFIG.THEME) {
		const themeLower = CONFIG.THEME.toLowerCase();
		if (CONFIG.DOMAIN) {
			const domainLower = CONFIG.DOMAIN.toLowerCase();
			if (CONFIG.SUBDOMAIN) {
				const subdomainLower = CONFIG.SUBDOMAIN.toLowerCase();
				pattern = `${themeLower}/${domainLower}/${subdomainLower}/*.json`;
			} else {
				pattern = `${themeLower}/${domainLower}/**/*.json`;
			}
		} else {
			pattern = `${themeLower}/**/*.json`;
		}
	}

	const files = await glob(pattern, { cwd: byCategoryDir });
	console.log(`Found ${files.length} JSON files matching pattern: ${pattern}\n`);

	const allQuestions: ExportedQuestion[] = [];

	for (const file of files) {
		try {
			const filePath = path.join(byCategoryDir, file);
			const content = await fs.readFile(filePath, 'utf-8');
			const questions: ExportedQuestion[] = JSON.parse(content);
			allQuestions.push(...questions);
		} catch (error) {
			console.error(`  Failed to load ${file}:`, error);
		}
	}

	return allQuestions;
}

// ============================================================================
// FILTER APPROVED QUESTIONS
// ============================================================================

async function filterApprovedQuestions(
	questions: ExportedQuestion[],
	supabase: SupabaseClient<Database>
): Promise<ExportedQuestion[]> {
	console.log('Filtering by approval status...\n');

	// Build a unique set of category combinations
	const categories = new Set(
		questions.map((q) => `${q.theme}|${q.domain}|${q.subdomain}|${q.level}`)
	);

	// Query migration_tracking for approved questions
	const { data: approvedRecords, error } = await supabase
		.from('migration_tracking')
		.select('theme, domain, subdomain, level, review_status')
		.eq('review_status', 'approved');

	// Handle case where review_status column doesn't exist yet
	if (error) {
		if (
			error.message.includes('column migration_tracking.review_status does not exist') ||
			error.message.includes('column migration_tracking.theme does not exist')
		) {
			console.warn('  WARNING: Review workflow columns not yet in database schema.');
			console.warn('  The --approved-only filter requires the migration to be applied first.');
			console.warn('  Run: pnpm db:migrate\n');
			console.warn('  Proceeding without approval filtering - all questions will be imported.\n');
			return questions;
		}
		console.error('Failed to query approval status:', error);
		throw error;
	}

	// Build set of approved category keys
	const approvedKeys = new Set(
		(approvedRecords || []).map(
			(r: {
				theme: string | null;
				domain: string | null;
				subdomain: string | null;
				level: number | null;
			}) => `${r.theme}|${r.domain}|${r.subdomain}|${r.level}`
		)
	);

	console.log(`  Found ${approvedKeys.size} approved question categories`);
	console.log(`  Total categories in export: ${categories.size}\n`);

	// Filter questions by approved status
	return questions.filter((q) => {
		const key = `${q.theme}|${q.domain}|${q.subdomain}|${q.level}`;
		return approvedKeys.has(key);
	});
}

// ============================================================================
// BATCH PROCESSOR
// ============================================================================

async function processBatches(
	questions: ExportedQuestion[],
	results: ImportResults,
	supabase: SupabaseClient<Database>
): Promise<void> {
	const totalBatches = Math.ceil(questions.length / CONFIG.BATCH_SIZE);

	for (let i = 0; i < questions.length; i += CONFIG.BATCH_SIZE) {
		const batch = questions.slice(i, i + CONFIG.BATCH_SIZE);
		const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;

		console.log(`\nProcessing batch ${batchNum}/${totalBatches} (${batch.length} questions)...`);

		for (const question of batch) {
			try {
				await importQuestion(question, results, supabase);
			} catch (error) {
				results.failed++;
				results.errors.push({
					theme: question.theme,
					domain: question.domain,
					subdomain: question.subdomain,
					level: question.level,
					error: error instanceof Error ? error.message : String(error)
				});
				console.error(
					`  Failed: ${question.theme}/${question.domain}/${question.subdomain} level ${question.level}`
				);
			}
		}

		const progress = (
			((results.imported + results.failed + results.skipped) / results.total) *
			100
		).toFixed(1);
		console.log(`  Batch complete: ${results.imported}/${results.total} imported (${progress}%)`);
	}
}

// ============================================================================
// IMPORT SINGLE QUESTION
// ============================================================================

async function importQuestion(
	exportedQuestion: ExportedQuestion,
	results: ImportResults,
	supabase: SupabaseClient<Database>
): Promise<void> {
	const { theme, domain, subdomain, level, transformed } = exportedQuestion;
	const categoryKey = `${theme}/${domain}/${subdomain} level ${level}`;

	// Check if already imported (has new_template_id)
	const { data: existing } = await supabase
		.from('migration_tracking')
		.select('id, new_template_id, migration_status')
		.eq('theme', theme)
		.eq('domain', domain)
		.eq('subdomain', subdomain)
		.eq('level', level)
		.maybeSingle();

	if (existing?.new_template_id) {
		console.log(`  - Skipping ${categoryKey} (already imported)`);
		results.skipped++;
		return;
	}

	// Skip dry run database operations
	if (CONFIG.DRY_RUN) {
		console.log(`  + Would import: ${categoryKey}`);
		results.imported++;
		return;
	}

	// Prepare template for insertion
	// Map transformed fields to database columns (snake_case)
	const template = {
		type: transformed.type,
		title: transformed.title,
		description: transformed.description || null,
		variations: transformed.variations,
		exercise_instruction: transformed.exerciseInstruction || null,
		options: transformed.options || null,
		grades: transformed.grades,
		theme: transformed.theme,
		domain: transformed.domain,
		subdomain: transformed.subdomain || null,
		level: transformed.level,
		status: transformed.status,
		delay: transformed.delay || null,
		precision: transformed.precision || null,
		transform_type: transformed.transformType || null,
		multiple_answers: transformed.multipleAnswers || null,
		created_by: null // Migration has no specific user
	};

	// Insert into question_templates
	const { data: inserted, error: insertError } = await supabase
		.from('question_templates')
		.insert(template)
		.select('id')
		.single();

	if (insertError) {
		throw new Error(`Database insert failed: ${insertError.message}`);
	}

	// Update migration_tracking with new_template_id
	if (existing?.id) {
		const { error: updateError } = await supabase
			.from('migration_tracking')
			.update({
				new_template_id: inserted.id,
				migration_status: 'imported',
				imported_at: new Date().toISOString()
			})
			.eq('id', existing.id);

		if (updateError) {
			console.warn(`  Warning: Failed to update tracking for ${categoryKey}:`, updateError.message);
		}
	}

	console.log(`  + Imported: ${categoryKey} -> ${inserted.id}`);
	results.imported++;
}

// ============================================================================
// REPORT GENERATOR
// ============================================================================

function printReport(results: ImportResults): void {
	const duration = results.endTime
		? ((results.endTime.getTime() - results.startTime.getTime()) / 1000).toFixed(1)
		: 'N/A';

	const successRate =
		results.total > 0 ? ((results.imported / results.total) * 100).toFixed(1) : '0';

	console.log('\n' + '='.repeat(60));
	console.log('IMPORT REPORT');
	console.log('='.repeat(60));
	console.log(`\nDuration: ${duration} seconds`);
	console.log(`\nStatistics:`);
	console.log(`  - Total processed: ${results.total}`);
	console.log(`  - Successfully imported: ${results.imported} (${successRate}%)`);
	console.log(`  - Skipped (already imported): ${results.skipped}`);
	console.log(`  - Failed: ${results.failed}`);

	if (results.errors.length > 0) {
		console.log(`\nErrors:`);
		results.errors.slice(0, 10).forEach((e) => {
			console.log(`  - ${e.theme}/${e.domain}/${e.subdomain} level ${e.level}`);
			console.log(`    Error: ${e.error.substring(0, 100)}`);
		});
		if (results.errors.length > 10) {
			console.log(`  ... and ${results.errors.length - 10} more errors`);
		}
	}

	console.log('\n' + '='.repeat(60));

	if (CONFIG.DRY_RUN) {
		console.log('\n[DRY RUN] No actual database changes were made.');
		console.log('Run without --dry-run to perform the actual import.');
	}
}

// ============================================================================
// RUN THE SCRIPT
// ============================================================================

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
