#!/usr/bin/env tsx
/**
 * Test Script: Validate Sanitization Migration Logic
 *
 * This script validates the core logic of the sanitization migration
 * without connecting to a database. Use this to verify the sanitization
 * function works correctly before running the full migration.
 *
 * Usage:
 *   pnpm tsx scripts/test-sanitize-migration.ts
 *
 * @author Claude Code
 * @date 2025-11-10
 */

import { sanitizeNotificationHtml } from '../src/lib/server/sanitization';

/**
 * Test cases for notification sanitization
 */
const testCases = [
	{
		name: 'Safe HTML - Should remain unchanged',
		input: '<p><strong>Important:</strong> Please <em>review</em> your homework.</p>',
		expectChanged: false
	},
	{
		name: 'XSS Attack - Script tag',
		input: '<p>Hello</p><script>alert("xss")</script>',
		expectChanged: true
	},
	{
		name: 'XSS Attack - Event handler',
		input: '<p onclick="malicious()">Click me</p>',
		expectChanged: true
	},
	{
		name: 'XSS Attack - JavaScript URL',
		input: '<a href="javascript:alert(\'xss\')">Click</a>',
		expectChanged: true
	},
	{
		name: 'XSS Attack - Iframe injection',
		input: '<iframe src="https://evil.com"></iframe>',
		expectChanged: true
	},
	{
		name: 'Safe HTML - Lists',
		input: '<ul><li>Item 1</li><li>Item 2</li></ul>',
		expectChanged: false
	},
	{
		name: 'Safe HTML - Blockquote',
		input: '<blockquote>This is a quote</blockquote>',
		expectChanged: false
	},
	{
		name: 'Plain text - No HTML',
		input: 'This is plain text without any HTML.',
		expectChanged: false
	},
	{
		name: 'Mixed - Safe and unsafe HTML',
		input: '<p><strong>Alert:</strong> <script>steal()</script> Please check your work.</p>',
		expectChanged: true
	},
	{
		name: 'Empty string',
		input: '',
		expectChanged: false
	},
	{
		name: 'XSS Attack - Data URL',
		input: '<a href="data:text/html,<script>alert(1)</script>">Link</a>',
		expectChanged: true
	},
	{
		name: 'Safe HTML - Horizontal rule',
		input: '<p>Section 1</p><hr><p>Section 2</p>',
		expectChanged: false
	}
];

/**
 * Run sanitization tests
 */
function runTests() {
	console.log('\n' + '='.repeat(70));
	console.log('Notification Sanitization Migration - Logic Validation');
	console.log('='.repeat(70));
	console.log(`\nRunning ${testCases.length} test cases...\n`);

	let passed = 0;
	let failed = 0;

	for (const testCase of testCases) {
		const sanitized = sanitizeNotificationHtml(testCase.input);
		const actuallyChanged = sanitized !== testCase.input;

		// Check if result matches expectation
		const testPassed = actuallyChanged === testCase.expectChanged;

		if (testPassed) {
			passed++;
			console.log(`✓ PASS: ${testCase.name}`);
		} else {
			failed++;
			console.log(`✗ FAIL: ${testCase.name}`);
			console.log(`  Expected changed: ${testCase.expectChanged}`);
			console.log(`  Actually changed: ${actuallyChanged}`);
		}

		// Show sanitization details for changed content
		if (actuallyChanged && testCase.expectChanged) {
			const originalLength = testCase.input.length;
			const sanitizedLength = sanitized.length;
			const removed = originalLength - sanitizedLength;
			console.log(
				`  → Removed ${removed} bytes (${Math.round((removed / originalLength) * 100)}%)`
			);
		}

		// Show unexpected output for debugging
		if (!testPassed) {
			console.log(`  Input:    ${testCase.input.substring(0, 100)}`);
			console.log(`  Sanitized: ${sanitized.substring(0, 100)}`);
		}
	}

	// Summary
	console.log('\n' + '='.repeat(70));
	console.log('Test Results');
	console.log('='.repeat(70));
	console.log(`\nTotal tests: ${testCases.length}`);
	console.log(`Passed: ${passed} ✓`);
	console.log(`Failed: ${failed} ${failed > 0 ? '✗' : ''}`);
	console.log(`Success rate: ${Math.round((passed / testCases.length) * 100)}%\n`);

	if (failed === 0) {
		console.log('🎉 All tests passed! Sanitization logic is working correctly.');
		console.log('\nYou can now safely run the migration script:');
		console.log('  pnpm migrate:sanitize\n');
		return 0;
	} else {
		console.log('⚠️  Some tests failed. Please review the sanitization logic.');
		console.log('Do NOT run the migration until all tests pass.\n');
		return 1;
	}
}

// Run tests and exit with appropriate code
const exitCode = runTests();
process.exit(exitCode);
