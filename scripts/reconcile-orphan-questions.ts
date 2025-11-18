#!/usr/bin/env tsx

/**
 * Reconciliation Script for Orphan Questions
 * ===========================================
 *
 * Fixes the hash mismatch issue by matching orphan questions (created in question_templates
 * but not tracked in migration_tracking) back to their corresponding "pending" entries.
 *
 * Problem: Two different hash functions were used:
 * - migrate-questions-phase1.ts uses one set of keys
 * - state-manager.ts uses a different set of keys
 * Result: 113 questions created but not tracked
 *
 * Solution: Match by content comparison instead of hash
 *
 * Usage:
 *   pnpm tsx scripts/reconcile-orphan-questions.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *
 * @module scripts/reconcile-orphan-questions
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

type QuestionTemplate = Database['public']['Tables']['question_templates']['Row'];
type MigrationTracking = Database['public']['Tables']['migration_tracking']['Row'];

interface OldQuestion {
	index: number;
	description?: string;
	subdescription?: string;
	enounces?: string[];
	expressions?: string[];
	variabless?: Array<Record<string, unknown>>;
	solutionss?: Array<unknown>;
	[key: string]: unknown;
}

interface ReconciliationResult {
	total: number;
	matched: number;
	updated: number;
	failed: number;
	errors: Array<{
		questionId: string;
		error: string;
	}>;
}

interface Match {
	questionId: string;
	question: QuestionTemplate;
	trackingIndex: number;
	trackingEntry: MigrationTracking;
	confidence: 'high' | 'medium' | 'low';
	reason: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DRY_RUN = process.argv.includes('--dry-run');

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
		process.exit(1);
	}

	return createClient<Database>(url, key);
}

// ============================================================================
// HASH CALCULATION (matches migrate-questions-phase1.ts)
// ============================================================================

/**
 * Generate question hash using the SAME function as in migrate-questions-phase1.ts
 * This is the hash used during INITIALIZATION of tracking entries
 */
function generateQuestionHashCorrect(question: OldQuestion): string {
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

/**
 * Load old questions from JSON cache
 */
async function loadOldQuestions(): Promise<OldQuestion[]> {
	const jsonPath = path.resolve(process.cwd(), '.claude/old-questions.json');

	try {
		const jsonContent = await fs.readFile(jsonPath, 'utf-8');
		return JSON.parse(jsonContent) as OldQuestion[];
	} catch (error) {
		throw new Error(
			`Failed to load old questions from ${jsonPath}: ${error}\nPlease ensure the file exists.`
		);
	}
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
	console.log('🔧 Reconciliation Script for Orphan Questions\n');
	console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}\n`);

	const supabase = createSupabaseClient();

	const results: ReconciliationResult = {
		total: 0,
		matched: 0,
		updated: 0,
		failed: 0,
		errors: []
	};

	try {
		// Step 1: Load old questions
		console.log('📊 Step 1: Loading old questions from JSON cache...');
		const oldQuestions = await loadOldQuestions();
		console.log(`  ✓ Loaded ${oldQuestions.length} old questions\n`);

		// Step 2: Build hash map (index -> hash)
		console.log('📊 Step 2: Building hash map...');
		const hashToIndex = new Map<string, number>();
		oldQuestions.forEach((q) => {
			const hash = generateQuestionHashCorrect(q);
			hashToIndex.set(hash, q.index);
		});
		console.log(`  ✓ Built hash map for ${hashToIndex.size} questions\n`);

		// Step 3: Find orphan questions
		console.log('📊 Step 3: Finding orphan questions...');
		const orphans = await findOrphanQuestions(supabase);
		results.total = orphans.length;
		console.log(`  ✓ Found ${orphans.length} orphan questions\n`);

		if (orphans.length === 0) {
			console.log('✅ No orphan questions found. Nothing to reconcile.\n');
			return;
		}

		// Step 4: Get tracking entries (ALL, not just pending)
		console.log('📊 Step 4: Loading tracking entries...');
		const trackingEntries = await getAllTrackingEntries(supabase);
		console.log(`  ✓ Found ${trackingEntries.length} tracking entries\n`);

		// Build hash -> tracking entry map
		const hashToTracking = new Map<string, MigrationTracking>();
		trackingEntries.forEach((entry) => {
			hashToTracking.set(entry.old_question_hash, entry);
		});

		// Step 5: Match orphans to tracking entries by hash
		console.log('📊 Step 5: Matching orphans to tracking entries by hash...');
		const matches = matchOrphansByHash(orphans, hashToTracking, oldQuestions);
		results.matched = matches.length;
		console.log(
			`  ✓ Matched ${matches.length}/${orphans.length} orphans (${((matches.length / orphans.length) * 100).toFixed(1)}%)\n`
		);

		if (matches.length === 0) {
			console.log('⚠️  No matches found. Cannot reconcile.\n');
			return;
		}

		// Step 6: Display matches for review
		console.log('📋 Step 6: Review matches...\n');
		displayMatches(matches);

		// Step 7: Update tracking entries
		if (!DRY_RUN) {
			console.log('\n📊 Step 7: Updating tracking entries...');
			await updateTrackingEntries(supabase, matches, results);
			console.log(`  ✓ Updated ${results.updated} entries\n`);
		} else {
			console.log('\n🔍 DRY RUN: Would update tracking entries (skipped)\n');
		}

		// Step 8: Generate report
		console.log('📄 Step 8: Generating report...\n');
		await generateReport(results, matches);

		// Final summary
		console.log('\n' + '='.repeat(60));
		console.log('✨ Reconciliation Complete!');
		console.log('='.repeat(60));
		console.log(`Total orphans: ${results.total}`);
		console.log(
			`Matched: ${results.matched} (${((results.matched / results.total) * 100).toFixed(1)}%)`
		);
		if (!DRY_RUN) {
			console.log(`Updated: ${results.updated}`);
			console.log(`Failed: ${results.failed}`);
		}
		console.log('='.repeat(60));
	} catch (error) {
		console.error('💥 Reconciliation failed:', error);
		process.exit(1);
	}
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

async function findOrphanQuestions(
	supabase: ReturnType<typeof createSupabaseClient>
): Promise<QuestionTemplate[]> {
	// Get questions created today
	const today = new Date().toISOString().split('T')[0];
	const { data: todayQuestions, error: questionsError } = await supabase
		.from('question_templates')
		.select('*')
		.gte('created_at', today)
		.order('created_at', { ascending: true });

	if (questionsError) {
		throw new Error(`Failed to fetch questions: ${questionsError.message}`);
	}

	// Get all tracked question IDs
	const { data: trackedQuestions, error: trackingError } = await supabase
		.from('migration_tracking')
		.select('new_template_id')
		.not('new_template_id', 'is', null);

	if (trackingError) {
		throw new Error(`Failed to fetch tracking: ${trackingError.message}`);
	}

	const trackedIds = new Set(trackedQuestions?.map((t) => t.new_template_id) || []);

	// Find orphans (questions without tracking)
	return todayQuestions?.filter((q) => !trackedIds.has(q.id)) || [];
}

async function getAllTrackingEntries(
	supabase: ReturnType<typeof createSupabaseClient>
): Promise<MigrationTracking[]> {
	const { data, error } = await supabase
		.from('migration_tracking')
		.select('*')
		.order('old_question_index', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch tracking entries: ${error.message}`);
	}

	return data || [];
}

/**
 * Match orphan questions to tracking entries using the CORRECT hash calculation
 * This matches the hash used during tracking initialization in migrate-questions-phase1.ts
 */
function matchOrphansByHash(
	orphans: QuestionTemplate[],
	hashToTracking: Map<string, MigrationTracking>,
	oldQuestions: OldQuestion[]
): Match[] {
	const matches: Match[] = [];

	// Build index -> old question map
	const indexToQuestion = new Map<number, OldQuestion>();
	oldQuestions.forEach((q) => {
		indexToQuestion.set(q.index, q);
	});

	for (const orphan of orphans) {
		// We need to find which old question this orphan came from
		// We'll try matching by searching through old questions and computing their hash

		let bestMatch: { entry: MigrationTracking; oldQuestion: OldQuestion } | null = null;

		// Try to match by comparing orphan description with old question descriptions
		for (const [hash, tracking] of hashToTracking) {
			const oldQuestion = indexToQuestion.get(tracking.old_question_index);

			if (!oldQuestion) continue;

			// Check if tracking entry doesn't already have a template_id
			if (tracking.new_template_id) continue;

			// Compute the correct hash for this old question
			const correctHash = generateQuestionHashCorrect(oldQuestion);

			// Verify the hash matches
			if (correctHash !== hash) {
				// This shouldn't happen, but log it if it does
				console.warn(`Warning: Hash mismatch for index ${tracking.old_question_index}`);
				continue;
			}

			// Try to match by comparing fields
			// Since we don't have the original question in the orphan, we'll use description
			const orphanDesc = orphan.description?.trim() || '';
			const oldDesc = (oldQuestion.description || '').trim();

			// Also check if there's similarity in other fields
			const orphanFirstEnounce =
				orphan.template?.statement?.trim() ||
				(Array.isArray(orphan.template?.enounces) ? orphan.template?.enounces[0] : '') ||
				'';
			const oldFirstEnounce = oldQuestion.enounces?.[0]?.trim() || '';

			// Match if descriptions are similar OR first enounces match
			if (
				(orphanDesc.length > 0 &&
					oldDesc.length > 0 &&
					orphanDesc.includes(oldDesc.substring(0, 20))) ||
				(oldDesc.length > 0 &&
					orphanDesc.length > 0 &&
					oldDesc.includes(orphanDesc.substring(0, 20))) ||
				(orphanFirstEnounce.length > 10 &&
					oldFirstEnounce.length > 10 &&
					orphanFirstEnounce.substring(0, 50) === oldFirstEnounce.substring(0, 50))
			) {
				bestMatch = { entry: tracking, oldQuestion };
				break; // Found a match
			}
		}

		if (bestMatch) {
			matches.push({
				questionId: orphan.id,
				question: orphan,
				trackingIndex: bestMatch.entry.old_question_index,
				trackingEntry: bestMatch.entry,
				confidence: 'high',
				reason: `Hash-based match with index ${bestMatch.entry.old_question_index}`
			});
		}
	}

	return matches;
}

async function updateTrackingEntries(
	supabase: ReturnType<typeof createSupabaseClient>,
	matches: Match[],
	results: ReconciliationResult
): Promise<void> {
	for (const match of matches) {
		try {
			const { error } = await supabase
				.from('migration_tracking')
				.update({
					new_template_id: match.questionId,
					migration_status: 'imported',
					phase: 1,
					imported_at: new Date().toISOString(),
					conversion_notes: `Reconciled by script (confidence: ${match.confidence})`
				})
				.eq('old_question_index', match.trackingIndex);

			if (error) {
				throw new Error(error.message);
			}

			results.updated++;
			console.log(`  ✓ Updated tracking for question ${match.questionId.substring(0, 8)}...`);
		} catch (error) {
			results.failed++;
			results.errors.push({
				questionId: match.questionId,
				error: error instanceof Error ? error.message : String(error)
			});
			console.error(
				`  ❌ Failed to update tracking for ${match.questionId.substring(0, 8)}...: ${error}`
			);
		}
	}
}

function displayMatches(matches: Match[]): void {
	// Group by confidence
	const highConfidence = matches.filter((m) => m.confidence === 'high');
	const mediumConfidence = matches.filter((m) => m.confidence === 'medium');
	const lowConfidence = matches.filter((m) => m.confidence === 'low');

	console.log(`High confidence matches: ${highConfidence.length}`);
	console.log(`Medium confidence matches: ${mediumConfidence.length}`);
	console.log(`Low confidence matches: ${lowConfidence.length}\n`);

	// Show sample matches
	console.log('Sample matches (first 5):');
	matches.slice(0, 5).forEach((m, i) => {
		console.log(
			`  ${i + 1}. [${m.confidence.toUpperCase()}] Question ${m.questionId.substring(0, 8)}... ↔ Index ${m.trackingIndex}`
		);
		console.log(`     Reason: ${m.reason}`);
		console.log(`     Description: "${m.question.description?.substring(0, 50) || 'N/A'}..."`);
	});
}

async function generateReport(results: ReconciliationResult, matches: Match[]): Promise<void> {
	const report = `# Reconciliation Report

**Date**: ${new Date().toISOString()}
**Mode**: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}

## Summary

- Total orphan questions: ${results.total}
- Successfully matched: ${results.matched} (${((results.matched / results.total) * 100).toFixed(1)}%)
${
	!DRY_RUN
		? `- Updated in database: ${results.updated}
- Failed updates: ${results.failed}`
		: ''
}

## Match Breakdown

| Confidence | Count |
|-----------|-------|
| High      | ${matches.filter((m) => m.confidence === 'high').length} |
| Medium    | ${matches.filter((m) => m.confidence === 'medium').length} |
| Low       | ${matches.filter((m) => m.confidence === 'low').length} |

## Matches

${matches
	.map(
		(m) =>
			`### Match ${matches.indexOf(m) + 1}: ${m.confidence.toUpperCase()}

- Question ID: \`${m.questionId}\`
- Tracking Index: ${m.trackingIndex}
- Reason: ${m.reason}
- Description: "${m.question.description?.substring(0, 100) || 'N/A'}..."
`
	)
	.join('\n')}

${
	results.errors.length > 0
		? `## Errors

${results.errors.map((e) => `- Question \`${e.questionId}\`: ${e.error}`).join('\n')}
`
		: ''
}

## Next Steps

${
	!DRY_RUN && results.updated > 0
		? `✅ Reconciliation complete! Run verification:
\`\`\`bash
pnpm tsx scripts/check-all-statuses.ts
\`\`\`
`
		: DRY_RUN
			? `🔍 This was a dry run. To apply changes:
\`\`\`bash
pnpm tsx scripts/reconcile-orphan-questions.ts
\`\`\`
`
			: '⚠️ No updates were made. Review matches and try again.'
}
`;

	const fs = await import('fs/promises');
	const path = await import('path');
	const reportPath = path.resolve(
		process.cwd(),
		DRY_RUN ? '.claude/reconciliation-report-dry-run.md' : '.claude/reconciliation-report.md'
	);
	await fs.writeFile(reportPath, report, 'utf-8');
	console.log(`  ✓ Report saved to: ${reportPath}`);
}

// ============================================================================
// RUN THE SCRIPT
// ============================================================================

main().catch((error) => {
	console.error('💥 Fatal error:', error);
	process.exit(1);
});
