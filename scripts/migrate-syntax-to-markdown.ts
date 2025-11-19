/**
 * Migrate Question Templates from Questions Syntax to Markdown Syntax
 * ====================================================================
 *
 * This script converts all existing question_templates in the database from
 * the old Questions syntax ({@:var}, {#:1-10}, {eval:expr}) to the new
 * Markdown syntax ({{var}}, {{random:1-10}}, {{eval:expr}}).
 *
 * IMPORTANT: Create a backup before running this script!
 * Run: ./scripts/backup-questions.sh
 *
 * Usage:
 *   1. Set SUPABASE_SERVICE_ROLE_KEY in your .env file
 *   2. (Optional) Backup database: ./scripts/backup-questions.sh
 *   3. Test run: npx tsx scripts/migrate-syntax-to-markdown.ts --dry-run
 *   4. Actual run: npx tsx scripts/migrate-syntax-to-markdown.ts
 *
 * What gets migrated:
 *   - Variable expressions in all variations
 *   - Text content in statement ContentFields
 *   - Text content in correction ContentFields
 *
 * @example
 * Before: { name: 'a', expression: '{#:1-10}' }
 * After:  { name: 'a', expression: '{{random:1-10}}' }
 *
 * Before: { type: 'text', content: 'Value is {@:a}' }
 * After:  { type: 'text', content: 'Value is {{a}}' }
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { Database } from '../src/lib/types/database';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check for --dry-run flag
const isDryRun = process.argv.includes('--dry-run');

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing required environment variables:');
	console.error('   - PUBLIC_SUPABASE_URL');
	console.error('   - SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

// ============================================================================
// TYPES
// ============================================================================

interface MigrationStats {
	total: number;
	migrated: number;
	skipped: number;
	errors: number;
}

interface Variable {
	name: string;
	expression: string;
}

interface ContentField {
	type: string;
	content: string;
}

interface Blank {
	position: number;
	expectedAnswer: string;
}

interface Choice {
	content: ContentField;
	isCorrect: boolean;
}

interface Variation {
	variables?: Variable[];
	statement: ContentField[];
	correction?: ContentField[];
	answer?: string | string[];
	blanks?: Blank[];
	// Choices can be either string[] (old format) or Choice[] (new format)
	choices?: (string | Choice)[];
	[key: string]: unknown;
}

interface QuestionTemplate {
	id: string;
	title: string;
	variations: Variation[];
	[key: string]: unknown;
}

// ============================================================================
// SYNTAX CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert Questions syntax to Markdown syntax
 *
 * FIXED VERSION: Handles mixed syntax correctly without creating triple braces.
 * This version checks if eval expressions are already in Markdown format ({{eval:})
 * and skips them to avoid double-conversion.
 *
 * Transforms:
 * - {@:varName} → {{varName}}
 * - {#:random-spec} → {{random:random-spec}}
 * - {eval:expression} → {{eval:expression}} (but NOT {{eval:...}} → {{{eval:...}}})
 */
function convertToMarkdownSyntax(text: string): string {
	if (!text) return text;

	let result = text;

	// Step 1: Convert variable references {@:var} → {{var}}
	result = result.replace(/\{@:(\w+)\}/g, '{{$1}}');

	// Step 2: Convert random expressions {#:spec} → {{random:spec}}
	let randomStart = result.indexOf('{#:');
	while (randomStart !== -1) {
		let braceCount = 1;
		let i = randomStart + 3; // Skip past '{#:'

		while (i < result.length && braceCount > 0) {
			if (result[i] === '{') braceCount++;
			else if (result[i] === '}') braceCount--;
			i++;
		}

		if (braceCount === 0) {
			const randomSpec = result.substring(randomStart + 3, i - 1);
			result =
				result.substring(0, randomStart) + '{{random:' + randomSpec + '}}' + result.substring(i);
			randomStart = result.indexOf('{#:', randomStart + randomSpec.length + 11);
		} else {
			randomStart = result.indexOf('{#:', randomStart + 1);
		}
	}

	// Step 3: Convert eval expressions {eval:...} → {{eval:...}}
	// FIXED: Skip if already {{eval:...}} to avoid triple braces
	let evalStart = result.indexOf('{eval:');
	while (evalStart !== -1) {
		// Check if this is already {{eval: (preceded by another {)
		if (evalStart > 0 && result[evalStart - 1] === '{') {
			// Already Markdown format, skip it
			evalStart = result.indexOf('{eval:', evalStart + 1);
			continue;
		}

		let braceCount = 1;
		let i = evalStart + 6; // Skip past '{eval:'

		while (i < result.length && braceCount > 0) {
			if (result[i] === '{') braceCount++;
			else if (result[i] === '}') braceCount--;
			i++;
		}

		if (braceCount === 0) {
			const evalContent = result.substring(evalStart + 6, i - 1);
			result =
				result.substring(0, evalStart) + '{{eval:' + evalContent + '}}' + result.substring(i);
			evalStart = result.indexOf('{eval:', evalStart + evalContent.length + 9);
		} else {
			evalStart = result.indexOf('{eval:', evalStart + 1);
		}
	}

	return result;
}

// ============================================================================
// SYNTAX DETECTION
// ============================================================================

/**
 * Detect the syntax used in a question template
 * Matches the logic from audit-question-syntax.ts for consistency
 */
function detectQuestionSyntax(template: QuestionTemplate): 'old' | 'new' | 'mixed' | 'none' {
	const variationsText = JSON.stringify(template.variations);

	// Check for old syntax patterns
	const hasOldSyntax = /{@:/.test(variationsText) || /{#:/.test(variationsText);

	// Check for new syntax patterns (but not triple braces which would be errors)
	const hasNewSyntax = /\{\{/.test(variationsText) && !/\{\{\{/.test(variationsText);

	if (hasOldSyntax && hasNewSyntax) return 'mixed';
	if (hasOldSyntax) return 'old';
	if (hasNewSyntax) return 'new';
	return 'none';
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Convert a single variable from Questions syntax to Markdown syntax
 */
function convertVariable(variable: Variable): { variable: Variable; changed: boolean } {
	const oldExpression = variable.expression;
	const newExpression = convertToMarkdownSyntax(oldExpression);

	return {
		variable: {
			...variable,
			expression: newExpression
		},
		changed: oldExpression !== newExpression
	};
}

/**
 * Convert ContentField text content from Questions syntax to Markdown syntax
 */
function convertContentField(field: ContentField): { field: ContentField; changed: boolean } {
	if (field.type !== 'text') {
		return { field, changed: false };
	}

	const oldContent = field.content;
	const newContent = convertToMarkdownSyntax(oldContent);

	return {
		field: {
			...field,
			content: newContent
		},
		changed: oldContent !== newContent
	};
}

/**
 * Convert a single variation from Questions syntax to Markdown syntax
 */
function convertVariation(variation: Variation): { variation: Variation; changes: string[] } {
	const changes: string[] = [];

	// Convert variables
	const updatedVariables = variation.variables?.map((v) => {
		const result = convertVariable(v);
		if (result.changed) {
			changes.push(`Variable "${v.name}": ${v.expression} → ${result.variable.expression}`);
		}
		return result.variable;
	});

	// Convert statement ContentFields
	const updatedStatement = variation.statement?.map((field) => {
		const result = convertContentField(field);
		if (result.changed) {
			changes.push(`Statement field: ${field.content} → ${result.field.content}`);
		}
		return result.field;
	});

	// Convert correction ContentFields
	const updatedCorrection = variation.correction?.map((field) => {
		const result = convertContentField(field);
		if (result.changed) {
			changes.push(`Correction field: ${field.content} → ${result.field.content}`);
		}
		return result.field;
	});

	// Convert answer field (string or array)
	let updatedAnswer = variation.answer;
	if (typeof variation.answer === 'string') {
		const oldAnswer = variation.answer;
		const newAnswer = convertToMarkdownSyntax(oldAnswer);
		if (oldAnswer !== newAnswer) {
			changes.push(`Answer: ${oldAnswer} → ${newAnswer}`);
			updatedAnswer = newAnswer;
		}
	} else if (Array.isArray(variation.answer)) {
		updatedAnswer = variation.answer.map((ans, idx) => {
			const oldAnswer = ans;
			const newAnswer = convertToMarkdownSyntax(oldAnswer);
			if (oldAnswer !== newAnswer) {
				changes.push(`Answer[${idx}]: ${oldAnswer} → ${newAnswer}`);
			}
			return newAnswer;
		});
	}

	// Convert blanks expectedAnswer
	const updatedBlanks = variation.blanks?.map((blank, idx) => {
		const oldAnswer = blank.expectedAnswer;
		const newAnswer = convertToMarkdownSyntax(oldAnswer);
		if (oldAnswer !== newAnswer) {
			changes.push(`Blank[${idx}] expectedAnswer: ${oldAnswer} → ${newAnswer}`);
		}
		return {
			...blank,
			expectedAnswer: newAnswer
		};
	});

	// Convert choices content
	// Handle both formats: array of strings OR array of {content, isCorrect} objects
	const updatedChoices = variation.choices?.map((choice, idx) => {
		// Format 1: String array (old format)
		if (typeof choice === 'string') {
			const oldChoice = choice;
			const newChoice = convertToMarkdownSyntax(oldChoice);
			if (oldChoice !== newChoice) {
				changes.push(`Choice[${idx}]: ${oldChoice} → ${newChoice}`);
			}
			return newChoice;
		}

		// Format 2: Object with {content, isCorrect}
		// Skip if choice.content is undefined
		if (!choice.content) {
			return choice;
		}

		const result = convertContentField(choice.content);
		if (result.changed) {
			changes.push(`Choice[${idx}] content: ${choice.content.content} → ${result.field.content}`);
		}
		return {
			...choice,
			content: result.field
		};
	});

	return {
		variation: {
			...variation,
			variables: updatedVariables,
			statement: updatedStatement,
			correction: updatedCorrection,
			answer: updatedAnswer,
			blanks: updatedBlanks,
			choices: updatedChoices
		},
		changes
	};
}

/**
 * Convert a question template from Questions syntax to Markdown syntax
 */
function convertTemplate(template: QuestionTemplate): {
	template: QuestionTemplate;
	needsMigration: boolean;
	changes: string[];
} {
	const allChanges: string[] = [];

	const updatedVariations = template.variations.map((variation, index) => {
		const result = convertVariation(variation);

		if (result.changes.length > 0) {
			allChanges.push(`  Variation ${index + 1}:`);
			result.changes.forEach((change) => {
				allChanges.push(`    - ${change}`);
			});
		}

		return result.variation;
	});

	return {
		template: {
			...template,
			variations: updatedVariations
		},
		needsMigration: allChanges.length > 0,
		changes: allChanges
	};
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function migrateSyntax() {
	console.log('🚀 Starting syntax migration...');
	console.log(
		`Mode: ${isDryRun ? '🧪 DRY RUN (no changes will be saved)' : '✍️  LIVE RUN (database will be updated)'}\n`
	);

	const stats: MigrationStats = {
		total: 0,
		migrated: 0,
		skipped: 0,
		errors: 0
	};

	// Create Supabase client with service role key (bypasses RLS)
	const supabase = createClient<Database>(supabaseUrl!, supabaseServiceKey!, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	// 1. Fetch all question templates
	console.log('📥 Fetching question templates from database...\n');

	const { data: templates, error } = await supabase
		.from('question_templates')
		.select('*')
		.order('created_at', { ascending: true });

	if (error) {
		console.error('❌ Error fetching templates:', error.message);
		process.exit(1);
	}

	stats.total = templates?.length || 0;
	console.log(`📊 Found ${stats.total} question template(s)\n`);
	console.log('='.repeat(70) + '\n');

	if (stats.total === 0) {
		console.log('✅ No templates to migrate.');
		return;
	}

	// 2. Migrate each template
	for (const template of templates || []) {
		try {
			console.log(`📝 Processing: ${template.id}`);
			console.log(`   Title: "${template.title}"`);

			// First, detect the syntax to avoid migrating already-Markdown questions
			const syntax = detectQuestionSyntax(template as unknown as QuestionTemplate);
			console.log(`   Syntax detected: ${syntax}`);

			// Only migrate if old or mixed syntax
			if (syntax !== 'old' && syntax !== 'mixed') {
				console.log('   ⏭️  Already using Markdown syntax or no variables');
				stats.skipped++;
				console.log(''); // Blank line between templates
				continue;
			}

			const result = convertTemplate(template as unknown as QuestionTemplate);

			if (result.needsMigration) {
				console.log('   Changes detected:');
				result.changes.forEach((change) => console.log(change));

				if (!isDryRun) {
					// Update template in database
					const { error: updateError } = await supabase
						.from('question_templates')
						.update({
							variations: result.template
								.variations as unknown as Database['public']['Tables']['question_templates']['Update']['variations']
						})
						.eq('id', template.id);

					if (updateError) {
						console.error(`   ❌ Error updating template:`, updateError.message);
						stats.errors++;
					} else {
						console.log('   ✅ Migrated successfully');
						stats.migrated++;
					}
				} else {
					console.log('   🧪 Would be migrated (dry run mode)');
					stats.migrated++;
				}
			} else {
				console.log('   ⏭️  No migration needed (already using Markdown syntax or no variables)');
				stats.skipped++;
			}

			console.log(''); // Blank line between templates
		} catch (error) {
			console.error(`   ❌ Error processing template:`, error);
			stats.errors++;
			console.log('');
		}
	}

	// 3. Print summary
	console.log('='.repeat(70));
	console.log('📊 Migration Summary');
	console.log('='.repeat(70));
	console.log(`Total templates:      ${stats.total}`);
	console.log(`✅ Migrated:          ${stats.migrated}`);
	console.log(`⏭️  Skipped:           ${stats.skipped}`);
	console.log(`❌ Errors:            ${stats.errors}`);
	console.log('='.repeat(70) + '\n');

	if (isDryRun) {
		console.log('🧪 DRY RUN COMPLETE - No changes were made to the database');
		console.log('💡 To apply these changes, run without --dry-run flag\n');
	} else {
		if (stats.errors > 0) {
			console.log('⚠️  Some templates failed to migrate. Please review errors above.');
			process.exit(1);
		} else {
			console.log('🎉 Migration completed successfully!');
			console.log('✅ All question templates now use Markdown syntax\n');
		}
	}
}

// ============================================================================
// RUN MIGRATION
// ============================================================================

migrateSyntax().catch((error) => {
	console.error('❌ Fatal error:', error);
	process.exit(1);
});
