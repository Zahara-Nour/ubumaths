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
import { convertSyntax } from '../src/lib/shared/parameterization';
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

interface Variation {
	variables?: Variable[];
	statement: ContentField[];
	correction?: ContentField[];
	[key: string]: unknown;
}

interface QuestionTemplate {
	id: string;
	title: string;
	variations: Variation[];
	[key: string]: unknown;
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Convert a single variable from Questions syntax to Markdown syntax
 */
function convertVariable(variable: Variable): { variable: Variable; changed: boolean } {
	const oldExpression = variable.expression;
	const newExpression = convertSyntax(oldExpression, 'questions', 'markdown');

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
	const newContent = convertSyntax(oldContent, 'questions', 'markdown');

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

	return {
		variation: {
			...variation,
			variables: updatedVariables,
			statement: updatedStatement,
			correction: updatedCorrection
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
