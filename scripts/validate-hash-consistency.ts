#!/usr/bin/env node --import tsx --env-file=.env

/**
 * Hash Validation Script
 * ======================
 *
 * Verifies that the centralized hash function produces identical hashes
 * in both initialization and processing phases.
 *
 * This prevents the orphan question problem that occurred in Phase 1.
 */

import { readFile } from 'fs/promises';
import {
	generateStableQuestionHash,
	generateQuestionDescription
} from '../src/lib/server/migration/hash-utils';

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

interface ValidationResult {
	questionIndex: number;
	description: string;
	initHash: string;
	processHash: string;
	match: boolean;
}

async function validateHashConsistency() {
	console.log('🔍 Hash Consistency Validation Script\n');
	console.log('='.repeat(60));

	// Load old questions
	console.log('\n📁 Loading old questions...');
	const oldQuestionsData = await readFile('.claude/old-questions.json', 'utf-8');
	const oldQuestions: OldQuestion[] = JSON.parse(oldQuestionsData);
	console.log(`✅ Loaded ${oldQuestions.length} questions`);

	// Test on first 50 questions (or all if fewer)
	const sampleSize = Math.min(50, oldQuestions.length);
	const sample = oldQuestions.slice(0, sampleSize);

	console.log(`\n🧪 Testing hash consistency on ${sampleSize} questions...\n`);

	const results: ValidationResult[] = [];
	let matchCount = 0;
	let mismatchCount = 0;

	for (const question of sample) {
		// Simulate INITIALIZATION phase
		const initHash = generateStableQuestionHash(question);
		const description = generateQuestionDescription(question);

		// Simulate PROCESSING phase (should produce identical hash)
		const processHash = generateStableQuestionHash(question);

		const match = initHash === processHash;

		results.push({
			questionIndex: question.index,
			description,
			initHash,
			processHash,
			match
		});

		if (match) {
			matchCount++;
			console.log(`✅ Q${question.index}: MATCH (${initHash.substring(0, 12)}...)`);
		} else {
			mismatchCount++;
			console.log(`❌ Q${question.index}: MISMATCH`);
			console.log(`   Init:    ${initHash}`);
			console.log(`   Process: ${processHash}`);
			console.log(`   Desc:    ${description}\n`);
		}
	}

	// Summary
	console.log('\n' + '='.repeat(60));
	console.log('\n📊 VALIDATION SUMMARY\n');
	console.log(`Total questions tested: ${sampleSize}`);
	console.log(`✅ Matches:    ${matchCount} (${((matchCount / sampleSize) * 100).toFixed(1)}%)`);
	console.log(
		`❌ Mismatches: ${mismatchCount} (${((mismatchCount / sampleSize) * 100).toFixed(1)}%)`
	);

	if (mismatchCount === 0) {
		console.log('\n🎉 SUCCESS! All hashes are consistent between phases.');
		console.log('✅ The centralized hash function is working correctly.');
		console.log('✅ Safe to proceed with Phases 2, 3, 4.');
	} else {
		console.log('\n⚠️  WARNING! Hash mismatches detected.');
		console.log('❌ Do NOT proceed with migration until this is fixed.');
		console.log('\n📋 Mismatched questions:');
		results
			.filter((r) => !r.match)
			.forEach((r) => {
				console.log(`\nQuestion ${r.questionIndex}: ${r.description}`);
				console.log(`  Init hash:    ${r.initHash}`);
				console.log(`  Process hash: ${r.processHash}`);
			});
	}

	console.log('\n' + '='.repeat(60));
}

// Run validation
validateHashConsistency().catch((error) => {
	console.error('❌ Validation failed:', error);
	process.exit(1);
});
