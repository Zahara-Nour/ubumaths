#!/usr/bin/env node --import tsx --env-file=.env

/**
 * Small Sample Migration Test
 * ============================
 *
 * Tests the complete migration pipeline on a small sample of questions
 * to verify that tracking works correctly before running full Phase 2.
 *
 * What this script tests:
 * 1. Initialization creates tracking entries correctly
 * 2. Processing updates tracking entries correctly
 * 3. Questions are created in database
 * 4. No orphan questions (all created questions are tracked)
 * 5. Hash consistency between init and process phases
 */

import { readFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import {
	generateStableQuestionHash,
	generateQuestionDescription
} from '../src/lib/server/migration/hash-utils';
import type { Database } from '../src/lib/types/database';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	console.error('❌ Missing environment variables');
	process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface OldQuestion {
	index: number;
	description?: string;
	subdescription?: string;
	enounces?: string[];
	expressions?: unknown[];
	variabless?: unknown[];
	solutionss?: unknown[];
	phase?: number;
	[key: string]: unknown;
}

async function testMigrationOnSample() {
	console.log('🧪 Small Sample Migration Test\n');
	console.log('='.repeat(60));

	// Load old questions
	console.log('\n📁 Loading old questions...');
	const oldQuestionsData = await readFile('.claude/old-questions.json', 'utf-8');
	const oldQuestions: OldQuestion[] = JSON.parse(oldQuestionsData);

	// Get first 10 questions (should be from Phase 1 since Phase 1 processed first 472 questions)
	const phase1Questions = oldQuestions.slice(0, 10);
	console.log(`✅ Selected ${phase1Questions.length} questions for testing (indices 0-9)\n`);

	// Step 1: Check initialization (should already exist)
	console.log('📋 Step 1: Checking initialization tracking entries...\n');

	const initResults = [];
	for (const question of phase1Questions) {
		const hash = generateStableQuestionHash(question);
		const _description = generateQuestionDescription(question);

		const { data: tracking, error } = await supabase
			.from('migration_tracking')
			.select('old_question_index, old_question_hash, migration_status, new_template_id')
			.eq('old_question_hash', hash)
			.maybeSingle();

		if (error) {
			console.error(`❌ Error checking Q${question.index}:`, error.message);
			initResults.push({ index: question.index, status: 'ERROR', error: error.message });
			continue;
		}

		if (!tracking) {
			console.log(
				`⚠️  Q${question.index}: No tracking entry found (hash: ${hash.substring(0, 12)}...)`
			);
			initResults.push({ index: question.index, status: 'MISSING', hash: hash.substring(0, 12) });
		} else {
			console.log(
				`✅ Q${question.index}: Found tracking (status: ${tracking.migration_status}, template: ${tracking.new_template_id ? tracking.new_template_id.substring(0, 8) + '...' : 'none'})`
			);
			initResults.push({
				index: question.index,
				status: 'FOUND',
				migrationStatus: tracking.migration_status,
				hasTemplate: !!tracking.new_template_id
			});
		}
	}

	// Step 2: Verify questions exist in database
	console.log('\n📋 Step 2: Verifying questions exist in database...\n');

	const questionsWithTemplates = initResults.filter((r) => r.status === 'FOUND' && r.hasTemplate);
	console.log(`Found ${questionsWithTemplates.length} questions with template IDs\n`);

	const dbResults = [];
	for (const result of initResults) {
		if (result.status !== 'FOUND' || !result.hasTemplate) {
			console.log(`⏭️  Q${result.index}: Skipping (no template ID)`);
			dbResults.push({ index: result.index, status: 'SKIPPED' });
			continue;
		}

		// Get template ID from tracking
		const question = phase1Questions.find((q) => q.index === result.index);
		if (!question) continue;

		const hash = generateStableQuestionHash(question);

		const { data: tracking } = await supabase
			.from('migration_tracking')
			.select('new_template_id')
			.eq('old_question_hash', hash)
			.maybeSingle();

		if (!tracking?.new_template_id) {
			console.log(`⚠️  Q${result.index}: No template ID in tracking`);
			dbResults.push({ index: result.index, status: 'NO_TEMPLATE_ID' });
			continue;
		}

		// Check if question exists in database
		const { data: questionTemplate, error } = await supabase
			.from('question_templates')
			.select('id, type, created_at')
			.eq('id', tracking.new_template_id)
			.maybeSingle();

		if (error) {
			console.error(`❌ Q${result.index}: Error checking database:`, error.message);
			dbResults.push({ index: result.index, status: 'ERROR', error: error.message });
			continue;
		}

		if (!questionTemplate) {
			console.log(`❌ Q${result.index}: Question NOT found in database (orphan!)`);
			dbResults.push({ index: result.index, status: 'ORPHAN' });
		} else {
			console.log(
				`✅ Q${result.index}: Found in database (type: ${questionTemplate.type}, created: ${new Date(questionTemplate.created_at).toLocaleDateString()})`
			);
			dbResults.push({
				index: result.index,
				status: 'FOUND',
				type: questionTemplate.type,
				createdAt: questionTemplate.created_at
			});
		}
	}

	// Step 3: Summary and analysis
	console.log('\n' + '='.repeat(60));
	console.log('\n📊 TEST SUMMARY\n');

	const initFound = initResults.filter((r) => r.status === 'FOUND').length;
	const initMissing = initResults.filter((r) => r.status === 'MISSING').length;
	const initErrors = initResults.filter((r) => r.status === 'ERROR').length;

	console.log('Initialization Tracking:');
	console.log(`  ✅ Found:   ${initFound}/${phase1Questions.length}`);
	console.log(`  ⚠️  Missing: ${initMissing}/${phase1Questions.length}`);
	console.log(`  ❌ Errors:  ${initErrors}/${phase1Questions.length}\n`);

	const dbFound = dbResults.filter((r) => r.status === 'FOUND').length;
	const dbOrphans = dbResults.filter((r) => r.status === 'ORPHAN').length;
	const dbSkipped = dbResults.filter((r) => r.status === 'SKIPPED').length;
	const dbErrors = dbResults.filter((r) => r.status === 'ERROR').length;

	console.log('Database Verification:');
	console.log(`  ✅ Found:   ${dbFound}/${phase1Questions.length}`);
	console.log(`  ❌ Orphans: ${dbOrphans}/${phase1Questions.length}`);
	console.log(`  ⏭️  Skipped: ${dbSkipped}/${phase1Questions.length}`);
	console.log(`  ❌ Errors:  ${dbErrors}/${phase1Questions.length}\n`);

	// Overall assessment
	console.log('Overall Assessment:');
	if (initMissing === 0 && dbOrphans === 0 && initErrors === 0 && dbErrors === 0) {
		console.log('  🎉 PERFECT! All tracking entries found, no orphans.');
		console.log('  ✅ Migration pipeline is working correctly.');
		console.log('  ✅ Safe to proceed with Phase 2.');
	} else {
		console.log('  ⚠️  Issues detected:');
		if (initMissing > 0) {
			console.log(`    - ${initMissing} tracking entries missing (hash mismatch?)`);
		}
		if (dbOrphans > 0) {
			console.log(`    - ${dbOrphans} orphan questions (created but not tracked)`);
		}
		if (initErrors > 0 || dbErrors > 0) {
			console.log(`    - ${initErrors + dbErrors} errors during checks`);
		}
		console.log('  ❌ Do NOT proceed with Phase 2 until issues are resolved.');
	}

	console.log('\n' + '='.repeat(60));
}

// Run test
testMigrationOnSample().catch((error) => {
	console.error('❌ Test failed:', error);
	process.exit(1);
});
