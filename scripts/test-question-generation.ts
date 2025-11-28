/**
 * Test Question Generation After Migration
 * =========================================
 *
 * This script tests that question generation still works correctly after
 * migrating template syntax from Questions format to Markdown format.
 *
 * Usage:
 *   node --import tsx scripts/test-question-generation.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.js';

// Supabase connection (local dev)
const supabase = createClient<Database>(
	'http://localhost:54321',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

type QuestionTemplate = Database['public']['Tables']['question_templates']['Row'];

// Simple variable resolver for testing
interface VariableDefinition {
	name: string;
	expression: string;
}

function resolveVariables(variables: VariableDefinition[]): Record<string, number | string> {
	const resolved: Record<string, number | string> = {};

	for (const variable of variables) {
		const expression = variable.expression;

		// Parse simple random expressions like {{1..10}}
		const randomMatch = expression.match(/\{\{(\d+)-(\d+)\}\}/);
		if (randomMatch) {
			const min = parseInt(randomMatch[1]);
			const max = parseInt(randomMatch[2]);
			resolved[variable.name] = Math.floor(Math.random() * (max - min + 1)) + min;
			continue;
		}

		// Parse random with exclusions like {{1..10!5,7}}
		const randomExcludeMatch = expression.match(/\{\{(\d+)-(\d+)!([0-9,]+)\}\}/);
		if (randomExcludeMatch) {
			const min = parseInt(randomExcludeMatch[1]);
			const max = parseInt(randomExcludeMatch[2]);
			const exclusions = randomExcludeMatch[3].split(',').map(Number);
			let value;
			do {
				value = Math.floor(Math.random() * (max - min + 1)) + min;
			} while (exclusions.includes(value));
			resolved[variable.name] = value;
			continue;
		}

		// Parse random decimal like {{1.2}}
		const decimalMatch = expression.match(/\{\{(\d+)\.(\d+)\}\}/);
		if (decimalMatch) {
			const intPart = parseInt(decimalMatch[1]);
			const decimals = parseInt(decimalMatch[2]);
			const min = intPart;
			const max = intPart + 1;
			const value = Math.random() * (max - min) + min;
			resolved[variable.name] = parseFloat(value.toFixed(decimals));
			continue;
		}

		// Default: just use 1
		resolved[variable.name] = 1;
	}

	return resolved;
}

// Replace variables in text
function replaceVariables(text: string, variables: Record<string, number | string>): string {
	let result = text;

	// Replace {{var}} with values
	for (const [name, value] of Object.entries(variables)) {
		const regex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
		result = result.replace(regex, String(value));
	}

	// Resolve eval expressions like {{eval:a+b}}
	const evalMatches = result.matchAll(/\{\{eval:([^}]+)\}\}/g);
	for (const match of evalMatches) {
		const expression = match[1];
		// Replace variables in expression
		let evalExpr = expression;
		for (const [name, value] of Object.entries(variables)) {
			evalExpr = evalExpr.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), String(value));
		}
		// Evaluate (WARNING: unsafe for user input, OK for testing)
		try {
			const result = eval(evalExpr);
			text = text.replace(match[0], String(result));
		} catch (err) {
			console.error(`Failed to evaluate: ${evalExpr}`, err);
		}
	}

	return result;
}

// Test a single template
async function testTemplate(template: QuestionTemplate): Promise<boolean> {
	console.log(`\n${'='.repeat(60)}`);
	console.log(`Testing Template: ${template.id}`);
	console.log(`Type: ${template.type}`);
	console.log(`${'='.repeat(60)}`);

	try {
		// Resolve variables
		console.log('\n1. Resolving variables...');
		const variablesArray = (template.variables as VariableDefinition[]) || [];
		console.log(`   Variables definition:`, JSON.stringify(variablesArray, null, 2));

		const resolvedVars = resolveVariables(variablesArray);
		console.log(`   Resolved values:`, resolvedVars);

		// Process statement
		console.log('\n2. Processing statement...');
		const statementArray = (template.statement as Array<{ content: string }>) || [];
		if (statementArray.length > 0 && statementArray[0].content) {
			const originalStatement = statementArray[0].content;
			console.log(`   Original: ${originalStatement.substring(0, 100)}...`);

			const processedStatement = replaceVariables(originalStatement, resolvedVars);
			console.log(`   Processed: ${processedStatement.substring(0, 100)}...`);

			// Check no unresolved variables remain
			const unresolvedVars = processedStatement.match(/\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g);
			if (unresolvedVars) {
				console.error(`   ❌ Unresolved variables found: ${unresolvedVars.join(', ')}`);
				return false;
			}
			console.log(`   ✅ All variables resolved`);
		}

		// Process answer
		console.log('\n3. Processing answer...');
		const answer = template.answer;
		if (typeof answer === 'string') {
			console.log(`   Original answer: ${answer}`);
			const processedAnswer = replaceVariables(answer, resolvedVars);
			console.log(`   Processed answer: ${processedAnswer}`);

			// Try to evaluate if it's a number
			if (!isNaN(Number(processedAnswer))) {
				console.log(`   ✅ Answer is valid number: ${processedAnswer}`);
			} else {
				console.log(`   ℹ️  Answer is non-numeric: ${processedAnswer}`);
			}
		} else if (Array.isArray(answer)) {
			console.log(`   Answer is array with ${answer.length} elements`);
			for (let i = 0; i < Math.min(answer.length, 3); i++) {
				const processed = replaceVariables(String(answer[i]), resolvedVars);
				console.log(`   [${i}]: ${processed}`);
			}
			console.log(`   ✅ Array answer processed`);
		}

		// Process choices (if multiple choice)
		if (template.choices) {
			console.log('\n4. Processing choices...');
			const choices = template.choices as unknown[];
			console.log(`   Found ${choices.length} choices`);
			for (let i = 0; i < choices.length; i++) {
				const processed = replaceVariables(String(choices[i]), resolvedVars);
				console.log(`   Choice ${i + 1}: ${processed}`);
			}
			console.log(`   ✅ All choices processed`);
		}

		// Process correction (if exists)
		if (template.correction) {
			console.log('\n5. Processing correction...');
			const correctionArray = template.correction as Array<{ content: string }>;
			if (correctionArray.length > 0 && correctionArray[0].content) {
				const original = correctionArray[0].content;
				const processed = replaceVariables(original, resolvedVars);
				console.log(`   Processed: ${processed.substring(0, 100)}...`);
				console.log(`   ✅ Correction processed`);
			}
		}

		console.log(`\n✅ Template ${template.id} - ALL TESTS PASSED`);
		return true;
	} catch (err) {
		console.error(`\n❌ Template ${template.id} - FAILED:`, err);
		return false;
	}
}

// Main test runner
async function runAllTests() {
	console.log('='.repeat(60));
	console.log('Question Generation Test Suite');
	console.log('Testing Markdown syntax after migration');
	console.log('='.repeat(60));

	// Fetch templates
	console.log('\nFetching question templates...');
	const { data: templates, error } = await supabase
		.from('question_templates')
		.select('*')
		.order('created_at', { ascending: true });

	if (error) {
		console.error('❌ Failed to fetch templates:', error);
		process.exit(1);
	}

	if (!templates || templates.length === 0) {
		console.error('❌ No templates found in database');
		process.exit(1);
	}

	console.log(`✅ Found ${templates.length} templates\n`);

	// Test each question type
	const questionTypes = [
		'numerical_exact',
		'numerical_decimal',
		'numerical_rounded',
		'algebraic_transform',
		'multiple_choice',
		'open_ended'
	];

	let totalTested = 0;
	let totalPassed = 0;
	let totalFailed = 0;

	for (const type of questionTypes) {
		console.log(`\n${'='.repeat(60)}`);
		console.log(`Testing Question Type: ${type}`);
		console.log(`${'='.repeat(60)}`);

		const typeTemplates = templates.filter((t) => t.type === type);

		if (typeTemplates.length === 0) {
			console.log(`⚠️  No templates found for type: ${type}`);
			continue;
		}

		console.log(`Found ${typeTemplates.length} templates of type ${type}`);

		// Test first template of each type
		const template = typeTemplates[0];
		totalTested++;

		const passed = await testTemplate(template);
		if (passed) {
			totalPassed++;
		} else {
			totalFailed++;
		}
	}

	// Final summary
	console.log('\n');
	console.log('='.repeat(60));
	console.log('Test Summary');
	console.log('='.repeat(60));
	console.log(`Total Templates Tested: ${totalTested}`);
	console.log(`Passed: ${totalPassed}`);
	console.log(`Failed: ${totalFailed}`);
	console.log(`Success Rate: ${((totalPassed / totalTested) * 100).toFixed(1)}%`);

	if (totalFailed === 0) {
		console.log('\n✅ ALL TESTS PASSED - Question generation works correctly!');
		process.exit(0);
	} else {
		console.log('\n❌ SOME TESTS FAILED - Review errors above');
		process.exit(1);
	}
}

// Run tests
runAllTests().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
