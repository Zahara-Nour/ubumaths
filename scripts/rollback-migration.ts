#!/usr/bin/env node --import tsx --env-file=.env

/**
 * Rollback Migration Script
 * =========================
 *
 * Rollback imported questions from the database. This script provides
 * safe rollback capabilities with dry-run mode and confirmation prompts.
 *
 * CRITICAL: Rollback must work correctly - this is the safety net for the migration.
 *
 * Features:
 * - Rollback by category (theme/domain/subdomain)
 * - Rollback all imported questions
 * - Dry-run mode for previewing what would be deleted
 * - Confirmation prompt before destructive operations
 * - Resets migration_tracking status
 *
 * Usage:
 *   pnpm tsx scripts/rollback-migration.ts --theme Entiers --domain Apprivoiser --subdomain Ecriture
 *   pnpm tsx scripts/rollback-migration.ts --all
 *   pnpm tsx scripts/rollback-migration.ts --dry-run
 *
 * Options:
 *   --theme <name>      Filter by theme (e.g., "Entiers")
 *   --domain <name>     Filter by domain (e.g., "Apprivoiser")
 *   --subdomain <name>  Filter by subdomain (e.g., "Ecriture")
 *   --all               Rollback all imported migration questions
 *   --dry-run           Preview what would be deleted without making changes
 *   --force             Skip confirmation prompt (use with caution!)
 *   --batch <size>      Batch size for deletes (default: 100)
 *
 * @module scripts/rollback-migration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/database';
import * as readline from 'readline';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
	BATCH_SIZE: parseInt(getArgValue('--batch') || '100'),
	DRY_RUN: process.argv.includes('--dry-run'),
	FORCE: process.argv.includes('--force'),
	ALL: process.argv.includes('--all'),
	THEME: getArgValue('--theme'),
	DOMAIN: getArgValue('--domain'),
	SUBDOMAIN: getArgValue('--subdomain')
};

/**
 * Get command line argument value
 */
function getArgValue(flag: string): string | undefined {
	const index = process.argv.indexOf(flag);
	if (index === -1 || index === process.argv.length - 1) return undefined;
	return process.argv[index + 1];
}

// ============================================================================
// TYPES
// ============================================================================

interface MigrationTrackingRecord {
	id: string;
	theme: string | null;
	domain: string | null;
	subdomain: string | null;
	level: number | null;
	new_template_id: string | null;
	migration_status: string;
}

interface RollbackResults {
	total: number;
	deleted: number;
	failed: number;
	errors: Array<{
		trackingId: string;
		templateId: string;
		error: string;
	}>;
	startTime: Date;
	endTime?: Date;
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
// CONFIRMATION PROMPT
// ============================================================================

async function confirmAction(message: string): Promise<boolean> {
	if (CONFIG.FORCE) {
		console.log('--force flag detected, skipping confirmation\n');
		return true;
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	return new Promise((resolve) => {
		rl.question(`${message} (yes/no): `, (answer) => {
			rl.close();
			resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
		});
	});
}

// ============================================================================
// MAIN ROLLBACK FUNCTION
// ============================================================================

async function main() {
	console.log('Migration Rollback Script\n');
	console.log('='.repeat(60));
	console.log('Configuration:');
	console.log(`  - Dry run: ${CONFIG.DRY_RUN ? 'YES' : 'NO'}`);
	console.log(`  - Force (skip confirmation): ${CONFIG.FORCE ? 'YES' : 'NO'}`);
	console.log(`  - Rollback all: ${CONFIG.ALL ? 'YES' : 'NO'}`);
	console.log(`  - Batch size: ${CONFIG.BATCH_SIZE}`);
	if (CONFIG.THEME) console.log(`  - Theme filter: ${CONFIG.THEME}`);
	if (CONFIG.DOMAIN) console.log(`  - Domain filter: ${CONFIG.DOMAIN}`);
	if (CONFIG.SUBDOMAIN) console.log(`  - Subdomain filter: ${CONFIG.SUBDOMAIN}`);
	console.log('='.repeat(60));
	console.log('');

	// Validate arguments
	if (!CONFIG.ALL && !CONFIG.THEME && !CONFIG.DOMAIN && !CONFIG.SUBDOMAIN) {
		console.error(
			'ERROR: You must specify either --all or at least one filter (--theme, --domain, --subdomain)'
		);
		console.error('\nUsage examples:');
		console.error('  pnpm tsx scripts/rollback-migration.ts --all --dry-run');
		console.error('  pnpm tsx scripts/rollback-migration.ts --theme Entiers --dry-run');
		console.error(
			'  pnpm tsx scripts/rollback-migration.ts --theme Entiers --domain Apprivoiser --subdomain Ecriture'
		);
		process.exit(1);
	}

	// Initialize Supabase client
	const supabase = createSupabaseClient();

	// Initialize results tracking
	const results: RollbackResults = {
		total: 0,
		deleted: 0,
		failed: 0,
		errors: [],
		startTime: new Date()
	};

	try {
		// 1. Find records to rollback
		const recordsToRollback = await findRecordsToRollback(supabase);
		results.total = recordsToRollback.length;

		if (recordsToRollback.length === 0) {
			console.log('No imported questions found matching the criteria. Nothing to rollback.\n');
			return;
		}

		// 2. Show preview
		console.log(`\nFound ${recordsToRollback.length} imported questions to rollback:\n`);
		showPreview(recordsToRollback);

		// 3. Confirm action (unless dry-run or force)
		if (!CONFIG.DRY_RUN) {
			const confirmed = await confirmAction(
				`\nWARNING: This will DELETE ${recordsToRollback.length} question templates from the database.\nAre you sure you want to proceed?`
			);

			if (!confirmed) {
				console.log('\nRollback cancelled by user.');
				process.exit(0);
			}
		}

		// 4. Perform rollback
		await performRollback(recordsToRollback, results, supabase);

		results.endTime = new Date();

		// 5. Print final report
		printReport(results);

		console.log('\nRollback Complete!');
		console.log(`   Templates deleted: ${results.deleted}/${results.total}`);
		console.log(`   Failed: ${results.failed}`);
		console.log(
			`   Time taken: ${((results.endTime.getTime() - results.startTime.getTime()) / 1000).toFixed(1)}s`
		);
	} catch (error) {
		console.error('Rollback failed:', error);
		process.exit(1);
	}
}

// ============================================================================
// FIND RECORDS TO ROLLBACK
// ============================================================================

async function findRecordsToRollback(
	supabase: SupabaseClient<Database>
): Promise<MigrationTrackingRecord[]> {
	console.log('Finding imported questions to rollback...\n');

	// First, check if the new columns exist by trying a query with them
	// If they don't exist, fall back to the basic query
	let _hasNewColumns = true;

	// Try with new columns first
	let query = supabase
		.from('migration_tracking')
		.select('id, theme, domain, subdomain, level, new_template_id, migration_status')
		.not('new_template_id', 'is', null);

	// Apply filters (only if filtering by category is requested)
	if (CONFIG.THEME) {
		query = query.eq('theme', CONFIG.THEME);
	}
	if (CONFIG.DOMAIN) {
		query = query.eq('domain', CONFIG.DOMAIN);
	}
	if (CONFIG.SUBDOMAIN) {
		query = query.eq('subdomain', CONFIG.SUBDOMAIN);
	}

	let { data, error } = await query;

	// If the query fails because columns don't exist, try without them
	if (error && error.message.includes('column migration_tracking.theme does not exist')) {
		console.log('  Note: New category columns not yet in database schema.');
		console.log('  Using basic query (new_template_id only).\n');

		_hasNewColumns = false;

		// Check if filters were requested but can't be applied
		if (CONFIG.THEME || CONFIG.DOMAIN || CONFIG.SUBDOMAIN) {
			console.warn(
				'  WARNING: Category filters (--theme, --domain, --subdomain) are not available'
			);
			console.warn('  until the migration_tracking schema is updated.');
			console.warn('  You can still use --all to rollback all imported questions.\n');

			if (!CONFIG.ALL) {
				throw new Error(
					'Category filtering not available. Use --all to rollback all, or run db:migrate first.'
				);
			}
		}

		// Basic query without new columns
		const basicResult = await supabase
			.from('migration_tracking')
			.select('id, new_template_id, migration_status')
			.not('new_template_id', 'is', null);

		data = basicResult.data;
		error = basicResult.error;

		if (error) {
			throw new Error(`Failed to query migration_tracking: ${error.message}`);
		}

		// Map to expected structure with null values for missing columns
		return (data || []).map((r) => ({
			id: r.id,
			theme: null,
			domain: null,
			subdomain: null,
			level: null,
			new_template_id: r.new_template_id,
			migration_status: r.migration_status
		})) as MigrationTrackingRecord[];
	}

	if (error) {
		throw new Error(`Failed to query migration_tracking: ${error.message}`);
	}

	return (data || []) as MigrationTrackingRecord[];
}

// ============================================================================
// SHOW PREVIEW
// ============================================================================

function showPreview(records: MigrationTrackingRecord[]): void {
	// Group by theme/domain/subdomain
	const grouped = new Map<string, number>();

	for (const record of records) {
		const key = `${record.theme || '(none)'}/${record.domain || '(none)'}/${record.subdomain || '(none)'}`;
		grouped.set(key, (grouped.get(key) || 0) + 1);
	}

	console.log('Categories to be rolled back:');
	for (const [category, count] of grouped) {
		console.log(`  - ${category}: ${count} questions`);
	}

	// Show first few template IDs
	console.log('\nSample template IDs to be deleted:');
	records.slice(0, 5).forEach((r) => {
		console.log(
			`  - ${r.new_template_id} (${r.theme}/${r.domain}/${r.subdomain} level ${r.level})`
		);
	});
	if (records.length > 5) {
		console.log(`  ... and ${records.length - 5} more`);
	}
}

// ============================================================================
// PERFORM ROLLBACK
// ============================================================================

async function performRollback(
	records: MigrationTrackingRecord[],
	results: RollbackResults,
	supabase: SupabaseClient<Database>
): Promise<void> {
	if (CONFIG.DRY_RUN) {
		console.log('\n[DRY RUN] Would delete the following question templates:');
		records.slice(0, 10).forEach((r) => {
			console.log(`  - ${r.new_template_id}`);
		});
		if (records.length > 10) {
			console.log(`  ... and ${records.length - 10} more`);
		}
		results.deleted = records.length;
		return;
	}

	console.log('\nPerforming rollback...\n');

	// Process in batches for safety
	const totalBatches = Math.ceil(records.length / CONFIG.BATCH_SIZE);

	for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
		const batch = records.slice(i, i + CONFIG.BATCH_SIZE);
		const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;

		console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);

		// Get template IDs for this batch
		const templateIds = batch
			.map((r) => r.new_template_id)
			.filter((id): id is string => id !== null);

		const trackingIds = batch.map((r) => r.id);

		if (templateIds.length === 0) {
			console.log('  No template IDs in this batch, skipping...');
			continue;
		}

		try {
			// Step 1: Delete from question_templates
			// The foreign key constraint (ON DELETE SET NULL) will automatically
			// set new_template_id to null in migration_tracking
			const { error: deleteError } = await supabase
				.from('question_templates')
				.delete()
				.in('id', templateIds);

			if (deleteError) {
				throw new Error(`Failed to delete templates: ${deleteError.message}`);
			}

			// Step 2: Reset migration_tracking status
			const { error: updateError } = await supabase
				.from('migration_tracking')
				.update({
					migration_status: 'rolled_back',
					new_template_id: null,
					imported_at: null
				})
				.in('id', trackingIds);

			if (updateError) {
				console.warn(`  Warning: Failed to update tracking records: ${updateError.message}`);
			}

			results.deleted += batch.length;
			console.log(`  Deleted ${batch.length} templates and reset tracking records`);
		} catch (error) {
			// Record individual failures
			for (const record of batch) {
				results.failed++;
				results.errors.push({
					trackingId: record.id,
					templateId: record.new_template_id || 'unknown',
					error: error instanceof Error ? error.message : String(error)
				});
			}
			console.error(`  Batch ${batchNum} failed:`, error);
		}
	}
}

// ============================================================================
// REPORT GENERATOR
// ============================================================================

function printReport(results: RollbackResults): void {
	const duration = results.endTime
		? ((results.endTime.getTime() - results.startTime.getTime()) / 1000).toFixed(1)
		: 'N/A';

	const successRate =
		results.total > 0 ? ((results.deleted / results.total) * 100).toFixed(1) : '0';

	console.log('\n' + '='.repeat(60));
	console.log('ROLLBACK REPORT');
	console.log('='.repeat(60));
	console.log(`\nDuration: ${duration} seconds`);
	console.log(`\nStatistics:`);
	console.log(`  - Total found: ${results.total}`);
	console.log(`  - Successfully deleted: ${results.deleted} (${successRate}%)`);
	console.log(`  - Failed: ${results.failed}`);

	if (results.errors.length > 0) {
		console.log(`\nErrors:`);
		results.errors.slice(0, 10).forEach((e) => {
			console.log(`  - Template ${e.templateId}: ${e.error.substring(0, 100)}`);
		});
		if (results.errors.length > 10) {
			console.log(`  ... and ${results.errors.length - 10} more errors`);
		}
	}

	console.log('\n' + '='.repeat(60));

	if (CONFIG.DRY_RUN) {
		console.log('\n[DRY RUN] No actual database changes were made.');
		console.log('Run without --dry-run to perform the actual rollback.');
	}
}

// ============================================================================
// RUN THE SCRIPT
// ============================================================================

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
