#!/usr/bin/env tsx

/**
 * Migration Transformer Test Script
 * ==================================
 *
 * Tests the question-transformer to verify it produces correct
 * Markdown syntax ({{...}}) for the migration reset.
 *
 * Usage: pnpm tsx scripts/test-migration-transformer.ts
 */

import { readFile } from 'fs/promises';
import { transformQuestion } from '../src/lib/migration/question-transformer';
import type { QuestionBase } from '../src/lib/migration/old-question-types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OLD_QUESTIONS_PATH = '.claude/old-questions.json';

// Select diverse question indices for testing
const TEST_INDICES = [
	0, // numerical with variables
	2, // multiple choice
	5, // simple numerical
	10, // another type
	25, // mid range
	50, // different complexity
	100, // higher index
	200, // more complex
	300, // advanced
	400 // late index
];

// ============================================================================
// SYNTAX VALIDATION
// ============================================================================

// Old syntax patterns - MUST NOT be preceded by another {
// Uses negative lookbehind to avoid matching {{...}} as old syntax
const OLD_SYNTAX_PATTERNS = [
	{ pattern: /(?<!\{)\{@:[^}]+\}/g, name: 'Variable reference ({@:...})' },
	{ pattern: /(?<!\{)\{#:[^}]+\}/g, name: 'Random syntax ({#:...})' },
	{ pattern: /(?<!\{)\{eval:[^}]+\}/g, name: 'Eval syntax ({eval:...}) - single brace' }
];

// New syntax patterns - MUST have double braces
const NEW_SYNTAX_PATTERNS = [
	{ pattern: /\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g, name: 'Variable ({{var}})' },
	{ pattern: /\{\{random:[^}]+\}\}/g, name: 'Random ({{random:...}})' },
	{ pattern: /\{\{eval:[^}]+\}\}/g, name: 'Eval ({{eval:...}})' },
	{ pattern: /\{\{\d+-\d+[^}]*\}\}/g, name: 'Range ({{min-max}})' }
];

function checkSyntax(text: string): {
	hasOldSyntax: boolean;
	hasNewSyntax: boolean;
	details: string[];
} {
	const details: string[] = [];
	let hasOldSyntax = false;
	let hasNewSyntax = false;

	for (const { pattern, name } of OLD_SYNTAX_PATTERNS) {
		const matches = text.match(pattern);
		if (matches) {
			hasOldSyntax = true;
			details.push(`  OLD: ${name} found: ${matches.join(', ')}`);
		}
	}

	for (const { pattern, name } of NEW_SYNTAX_PATTERNS) {
		const matches = text.match(pattern);
		if (matches) {
			hasNewSyntax = true;
			details.push(
				`  NEW: ${name} found: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '...' : ''}`
			);
		}
	}

	return { hasOldSyntax, hasNewSyntax, details };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	console.log('='.repeat(70));
	console.log('Migration Transformer Test');
	console.log('='.repeat(70));
	console.log();

	// Load old questions
	console.log(`Loading questions from ${OLD_QUESTIONS_PATH}...`);
	const data = await readFile(OLD_QUESTIONS_PATH, 'utf-8');
	const oldQuestions: QuestionBase[] = JSON.parse(data);
	console.log(`Loaded ${oldQuestions.length} questions\n`);

	// Results tracking
	let successCount = 0;
	let failCount = 0;
	let oldSyntaxCount = 0;
	let newSyntaxCount = 0;

	// Process each test question
	for (const index of TEST_INDICES) {
		if (index >= oldQuestions.length) {
			console.log(`\n[${index}] SKIPPED - Index out of range\n`);
			continue;
		}

		const question = oldQuestions[index];
		console.log('-'.repeat(70));
		console.log(`[${index}] ${question.description || 'No description'}`);
		console.log('-'.repeat(70));

		const result = transformQuestion(question, index);

		if (!result.success || !result.template) {
			failCount++;
			console.log('  STATUS: FAILED');
			console.log(`  ERRORS: ${result.errors?.join(', ') || 'Unknown error'}`);
			console.log();
			continue;
		}

		successCount++;
		const template = result.template;

		console.log(`  TYPE: ${template.type}`);
		console.log(`  TITLE: ${template.title}`);
		console.log(`  VARIATIONS: ${template.variations?.length || 0}`);

		if (result.warnings && result.warnings.length > 0) {
			console.log(
				`  WARNINGS: ${result.warnings.slice(0, 2).join('; ')}${result.warnings.length > 2 ? '...' : ''}`
			);
		}

		// Check first variation for syntax
		if (template.variations && template.variations.length > 0) {
			const variation = template.variations[0];

			console.log('\n  --- First Variation ---');
			console.log(
				`  STATEMENT: ${(variation.statement as string).substring(0, 100)}${(variation.statement as string).length > 100 ? '...' : ''}`
			);

			// Check variables
			if (variation.variables && variation.variables.length > 0) {
				console.log(`  VARIABLES (${variation.variables.length}):`);
				for (const v of variation.variables.slice(0, 3)) {
					console.log(`    ${v.name} = ${v.expression}`);
				}
				if (variation.variables.length > 3) {
					console.log(`    ... and ${variation.variables.length - 3} more`);
				}
			}

			// Check answer
			const answerStr = Array.isArray(variation.answer)
				? variation.answer.join(', ')
				: String(variation.answer);
			console.log(`  ANSWER: ${answerStr.substring(0, 80)}${answerStr.length > 80 ? '...' : ''}`);

			// Syntax analysis
			const allText = [
				variation.statement,
				variation.correction || '',
				...(variation.variables?.map((v) => v.expression) || []),
				answerStr
			].join(' ');

			const syntaxCheck = checkSyntax(allText);

			console.log('\n  --- Syntax Check ---');
			if (syntaxCheck.hasOldSyntax) {
				oldSyntaxCount++;
				console.log('  OLD SYNTAX DETECTED (BAD):');
				syntaxCheck.details.filter((d) => d.includes('OLD')).forEach((d) => console.log(d));
			}
			if (syntaxCheck.hasNewSyntax) {
				newSyntaxCount++;
				console.log('  NEW SYNTAX FOUND (GOOD):');
				syntaxCheck.details.filter((d) => d.includes('NEW')).forEach((d) => console.log(d));
			}
			if (!syntaxCheck.hasOldSyntax && !syntaxCheck.hasNewSyntax) {
				console.log('  No parameterization syntax found (static content)');
			}
		}

		console.log();
	}

	// Summary
	console.log('='.repeat(70));
	console.log('SUMMARY');
	console.log('='.repeat(70));
	console.log(`  Questions tested: ${TEST_INDICES.length}`);
	console.log(`  Successful: ${successCount}`);
	console.log(`  Failed: ${failCount}`);
	console.log();
	console.log(`  With OLD syntax (BAD): ${oldSyntaxCount}`);
	console.log(`  With NEW syntax (GOOD): ${newSyntaxCount}`);
	console.log();

	if (oldSyntaxCount > 0) {
		console.log('RESULT: ISSUES FOUND - Old syntax detected in output');
		process.exit(1);
	} else if (successCount === 0) {
		console.log('RESULT: FAILURE - No questions transformed successfully');
		process.exit(1);
	} else {
		console.log('RESULT: PASS - Transformer produces correct syntax');
		process.exit(0);
	}
}

main().catch((error) => {
	console.error('Script failed:', error);
	process.exit(1);
});
