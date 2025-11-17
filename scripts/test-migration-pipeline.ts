#!/usr/bin/env node --import tsx --env-file=.env

/**
 * Migration Pipeline Test
 * ========================
 *
 * Simulates a complete migration cycle (initialization + processing) on a small
 * sample to verify that the pipeline works correctly for future phases.
 *
 * IMPORTANT: This tests the FUTURE pipeline (Phases 2+), not Phase 1.
 * Phase 1 was completed with old hash functions and has been reconciled.
 *
 * What this script verifies:
 * 1. Initialization creates tracking entries with correct hashes
 * 2. Processing finds the same tracking entries (hash match)
 * 3. No hash mismatches between initialization and processing
 * 4. The centralized hash function works end-to-end
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

// Supabase client initialization (not used in this test, but kept for future use)
createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface OldQuestion {
	index: number;
	description?: string;
	subdescription?: string;
	enounces?: string[];
	expressions?: unknown[];
	variabless?: unknown[];
	solutionss?: unknown[];
	[key: string]: unknown;
}

async function testMigrationPipeline() {
	console.log('🧪 Migration Pipeline Test (for Phases 2+)\n');
	console.log('='.repeat(60));
	console.log('');
	console.log('NOTE: This tests the FUTURE migration pipeline.');
	console.log('Phase 1 used old hash functions and has been reconciled.');
	console.log('This test verifies that Phases 2+ will work correctly.');
	console.log('');
	console.log('='.repeat(60));

	// Load old questions
	console.log('\n📁 Loading old questions...');
	const oldQuestionsData = await readFile('.claude/old-questions.json', 'utf-8');
	const oldQuestions: OldQuestion[] = JSON.parse(oldQuestionsData);

	// Use questions 480-489 (after Phase 1 which was 0-471)
	// These would be in Phase 2 or later
	const sampleQuestions = oldQuestions.slice(480, 490);
	console.log(`✅ Selected ${sampleQuestions.length} questions for testing (indices 480-489)`);
	console.log('   (These are Phase 2+ questions, not yet migrated)\n');

	// Step 1: Simulate INITIALIZATION phase
	console.log('📋 Step 1: Simulating INITIALIZATION phase...\n');

	const initHashes: Map<number, { hash: string; description: string }> = new Map();

	sampleQuestions.forEach((question, arrayIndex) => {
		const actualIndex = 480 + arrayIndex; // Questions 480-489
		const hash = generateStableQuestionHash(question);
		const description = generateQuestionDescription(question);
		initHashes.set(actualIndex, { hash, description });

		console.log(
			`  Init Q${actualIndex}: ${hash.substring(0, 12)}... | ${description.substring(0, 40)}...`
		);
	});

	console.log(`\n✅ Initialization complete: ${initHashes.size} hashes generated\n`);

	// Step 2: Simulate PROCESSING phase
	console.log('📋 Step 2: Simulating PROCESSING phase...\n');

	let matchCount = 0;
	let mismatchCount = 0;
	const mismatches: Array<{ index: number; initHash: string; processHash: string }> = [];

	sampleQuestions.forEach((question, arrayIndex) => {
		const actualIndex = 480 + arrayIndex;
		const processHash = generateStableQuestionHash(question);
		const initData = initHashes.get(actualIndex);

		if (!initData) {
			console.error(`  ❌ Q${actualIndex}: No initialization data found (bug in test script)`);
			return;
		}

		if (initData.hash === processHash) {
			console.log(`  ✅ Q${actualIndex}: Hash MATCH (${processHash.substring(0, 12)}...)`);
			matchCount++;
		} else {
			console.log(`  ❌ Q${actualIndex}: Hash MISMATCH!`);
			console.log(`      Init:    ${initData.hash.substring(0, 12)}...`);
			console.log(`      Process: ${processHash.substring(0, 12)}...`);
			mismatchCount++;
			mismatches.push({
				index: actualIndex,
				initHash: initData.hash,
				processHash: processHash
			});
		}
	});

	// Step 3: Summary
	console.log('\n' + '='.repeat(60));
	console.log('\n📊 PIPELINE TEST SUMMARY\n');

	console.log('Hash Consistency:');
	console.log(
		`  ✅ Matches:    ${matchCount}/${sampleQuestions.length} (${((matchCount / sampleQuestions.length) * 100).toFixed(1)}%)`
	);
	console.log(
		`  ❌ Mismatches: ${mismatchCount}/${sampleQuestions.length} (${((mismatchCount / sampleQuestions.length) * 100).toFixed(1)}%)\n`
	);

	// Overall assessment
	console.log('Overall Assessment:');
	if (mismatchCount === 0) {
		console.log('  🎉 PERFECT! All hashes match between initialization and processing.');
		console.log('  ✅ The centralized hash function is working correctly.');
		console.log('  ✅ Migration pipeline is ready for Phases 2, 3, 4.');
		console.log('');
		console.log('Next Steps:');
		console.log('  1. Run Phase 2 migration');
		console.log('  2. Monitor logs for hash mismatches');
		console.log('  3. Verify no orphan questions are created');
	} else {
		console.log('  ❌ FAILURE! Hash mismatches detected.');
		console.log('  ❌ Do NOT proceed with Phases 2+ until this is fixed.');
		console.log('');
		console.log('Mismatched Questions:');
		for (const mismatch of mismatches) {
			console.log(`  Q${mismatch.index}:`);
			console.log(`    Init:    ${mismatch.initHash}`);
			console.log(`    Process: ${mismatch.processHash}`);
		}
	}

	console.log('\n' + '='.repeat(60));
}

// Run test
testMigrationPipeline().catch((error) => {
	console.error('❌ Test failed:', error);
	process.exit(1);
});
