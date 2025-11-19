/**
 * Question Template Syntax Audit
 * ===============================
 *
 * Analyzes question templates to determine syntax usage:
 * - Old Questions syntax: {@:var}, {#:random}
 * - New Markdown syntax: {{var}}, {{random:spec}}
 * - Mixed syntax (both in same template)
 *
 * Usage:
 *   pnpm tsx scripts/audit-question-syntax.ts
 *
 * Prerequisites:
 *   - Supabase local running: pnpm db:start
 *   - Or set DATABASE_URL environment variable for remote DB
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/database';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';

// Try SERVICE_ROLE_KEY first (bypasses RLS), then ANON_KEY, then local default
const SUPABASE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const KEY_TYPE = process.env.SUPABASE_SERVICE_ROLE_KEY
	? 'SERVICE_ROLE'
	: process.env.SUPABASE_ANON_KEY
		? 'ANON'
		: 'LOCAL_DEFAULT';

// ============================================================================
// Types
// ============================================================================

type QuestionTemplate = Database['public']['Tables']['question_templates']['Row'];

interface SyntaxStats {
	total: number;
	oldSyntax: number;
	newSyntax: number;
	mixedSyntax: number;
	noSyntax: number;
}

interface AuditResult {
	stats: SyntaxStats;
	oldSyntaxQuestions: QuestionTemplate[];
	newSyntaxQuestions: QuestionTemplate[];
	mixedSyntaxQuestions: QuestionTemplate[];
	recommendations: string[];
}

// ============================================================================
// Syntax Detection
// ============================================================================

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
// Main Audit Function
// ============================================================================

async function auditQuestionSyntax(): Promise<AuditResult> {
	console.log('🔍 Starting Question Template Syntax Audit...\n');

	// Display authentication info
	console.log(`🔑 Authentication: ${KEY_TYPE}`);
	console.log(`🌐 Database URL: ${SUPABASE_URL}\n`);

	// Warn if using ANON_KEY instead of SERVICE_ROLE_KEY
	if (KEY_TYPE === 'ANON') {
		console.log('⚠️  WARNING: Using ANON_KEY instead of SERVICE_ROLE_KEY');
		console.log('⚠️  RLS policies may block question visibility');
		console.log('⚠️  If you get 0 results, try with SUPABASE_SERVICE_ROLE_KEY\n');
	}

	// Create Supabase client
	const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

	// Fetch all question templates
	const { data: templates, error } = await supabase
		.from('question_templates')
		.select('*')
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('❌ Error fetching templates:', error);
		throw error;
	}

	if (!templates || templates.length === 0) {
		console.log('⚠️  No question templates found in database.');

		const recommendations: string[] = [];

		if (KEY_TYPE === 'ANON' || KEY_TYPE === 'LOCAL_DEFAULT') {
			recommendations.push('❌ 0 questions found - This may be an authentication issue');
			recommendations.push('💡 Try running with SUPABASE_SERVICE_ROLE_KEY:');
			recommendations.push(
				'   SUPABASE_URL="your-url" SUPABASE_ANON_KEY="<service-role-key>" pnpm tsx scripts/audit-question-syntax.ts'
			);
			recommendations.push('🔒 SERVICE_ROLE_KEY bypasses RLS policies and shows all data');
		} else {
			recommendations.push('Database is empty or inaccessible.');
		}

		return {
			stats: { total: 0, oldSyntax: 0, newSyntax: 0, mixedSyntax: 0, noSyntax: 0 },
			oldSyntaxQuestions: [],
			newSyntaxQuestions: [],
			mixedSyntaxQuestions: [],
			recommendations
		};
	}

	console.log(`📊 Found ${templates.length} question templates\n`);

	// Analyze each template
	const stats: SyntaxStats = {
		total: templates.length,
		oldSyntax: 0,
		newSyntax: 0,
		mixedSyntax: 0,
		noSyntax: 0
	};

	const oldSyntaxQuestions: QuestionTemplate[] = [];
	const newSyntaxQuestions: QuestionTemplate[] = [];
	const mixedSyntaxQuestions: QuestionTemplate[] = [];

	for (const template of templates) {
		const syntax = detectQuestionSyntax(template);

		switch (syntax) {
			case 'old':
				stats.oldSyntax++;
				oldSyntaxQuestions.push(template);
				break;
			case 'new':
				stats.newSyntax++;
				newSyntaxQuestions.push(template);
				break;
			case 'mixed':
				stats.mixedSyntax++;
				mixedSyntaxQuestions.push(template);
				break;
			case 'none':
				stats.noSyntax++;
				break;
		}
	}

	// Generate recommendations
	const recommendations: string[] = [];

	if (stats.oldSyntax === 0 && stats.mixedSyntax === 0) {
		recommendations.push('✅ All questions use new Markdown syntax!');
		recommendations.push('✅ Safe to remove syntax adapter (syntax-adapter.ts)');
		recommendations.push('✅ Can simplify codebase by removing conversion calls');
	} else if (stats.oldSyntax < 10) {
		recommendations.push('⚠️  Very few old syntax questions detected');
		recommendations.push('📝 Consider manual migration for these questions');
		recommendations.push('🔧 Review and convert using Admin UI');
	} else if (stats.oldSyntax < 50) {
		recommendations.push('⚠️  Moderate old syntax usage detected');
		recommendations.push('🔄 Batch migration script recommended');
		recommendations.push('📋 Review migration plan in docs/claude/syntax-migration-strategy.md');
	} else {
		recommendations.push('⚠️  Significant old syntax usage detected');
		recommendations.push('🐌 Gradual migration strategy recommended');
		recommendations.push('📖 Continue using dual-syntax support');
		recommendations.push('🔄 Migrate questions as they are edited');
	}

	if (stats.mixedSyntax > 0) {
		recommendations.push(
			`⚠️  ${stats.mixedSyntax} questions use MIXED syntax (requires attention)`
		);
		recommendations.push('🔧 Review mixed syntax questions and standardize');
	}

	return {
		stats,
		oldSyntaxQuestions,
		newSyntaxQuestions,
		mixedSyntaxQuestions,
		recommendations
	};
}

// ============================================================================
// Display Results
// ============================================================================

function displayResults(result: AuditResult): void {
	const { stats, oldSyntaxQuestions, newSyntaxQuestions, mixedSyntaxQuestions, recommendations } =
		result;

	console.log('═'.repeat(80));
	console.log('📊 SYNTAX STATISTICS');
	console.log('═'.repeat(80));
	console.log();

	console.log(`Total Questions:        ${stats.total}`);
	console.log(
		`├─ Old Syntax ({@:}):   ${stats.oldSyntax} (${percentage(stats.oldSyntax, stats.total)}%)`
	);
	console.log(
		`├─ New Syntax ({{}}):   ${stats.newSyntax} (${percentage(stats.newSyntax, stats.total)}%)`
	);
	console.log(
		`├─ Mixed Syntax:        ${stats.mixedSyntax} (${percentage(stats.mixedSyntax, stats.total)}%)`
	);
	console.log(
		`└─ No Variables:        ${stats.noSyntax} (${percentage(stats.noSyntax, stats.total)}%)`
	);
	console.log();

	console.log('═'.repeat(80));
	console.log('🎯 RECOMMENDATIONS');
	console.log('═'.repeat(80));
	console.log();

	recommendations.forEach((rec) => console.log(rec));
	console.log();

	// Show sample questions
	if (oldSyntaxQuestions.length > 0) {
		console.log('═'.repeat(80));
		console.log(`📝 OLD SYNTAX QUESTIONS (showing ${Math.min(5, oldSyntaxQuestions.length)})`);
		console.log('═'.repeat(80));
		console.log();

		oldSyntaxQuestions.slice(0, 5).forEach((q) => {
			console.log(`• ${q.title}`);
			console.log(`  Theme: ${q.theme} / ${q.domain}`);
			console.log(`  Status: ${q.status}`);
			console.log(`  Updated: ${new Date(q.updated_at).toLocaleDateString()}`);
			console.log();
		});
	}

	if (newSyntaxQuestions.length > 0) {
		console.log('═'.repeat(80));
		console.log(`✨ NEW SYNTAX QUESTIONS (showing ${Math.min(5, newSyntaxQuestions.length)})`);
		console.log('═'.repeat(80));
		console.log();

		newSyntaxQuestions.slice(0, 5).forEach((q) => {
			console.log(`• ${q.title}`);
			console.log(`  Theme: ${q.theme} / ${q.domain}`);
			console.log(`  Status: ${q.status}`);
			console.log(`  Updated: ${new Date(q.updated_at).toLocaleDateString()}`);
			console.log();
		});
	}

	if (mixedSyntaxQuestions.length > 0) {
		console.log('═'.repeat(80));
		console.log(`⚠️  MIXED SYNTAX QUESTIONS (${mixedSyntaxQuestions.length} total)`);
		console.log('═'.repeat(80));
		console.log();

		mixedSyntaxQuestions.forEach((q) => {
			console.log(`• ${q.title}`);
			console.log(`  Theme: ${q.theme} / ${q.domain}`);
			console.log(`  Status: ${q.status}`);
			console.log(`  ID: ${q.id}`);
			console.log();
		});
	}

	console.log('═'.repeat(80));
	console.log('✅ Audit Complete');
	console.log('═'.repeat(80));
	console.log();
	console.log('For detailed migration strategy, see:');
	console.log('  docs/claude/syntax-migration-strategy.md');
	console.log();
}

// ============================================================================
// Utilities
// ============================================================================

function percentage(value: number, total: number): string {
	if (total === 0) return '0.0';
	return ((value / total) * 100).toFixed(1);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
	try {
		const result = await auditQuestionSyntax();
		displayResults(result);
		process.exit(0);
	} catch (error) {
		console.error('\n❌ Audit failed:', error);
		console.error('\nTroubleshooting:');
		console.error('1. Check authentication:');
		console.error('   - For production: Use SUPABASE_SERVICE_ROLE_KEY');
		console.error('   - For local: Ensure Supabase is running (pnpm db:start)');
		console.error('2. Verify database URL is correct');
		console.error('3. Check network connectivity');
		console.error('4. Review RLS policies if using ANON_KEY');
		process.exit(1);
	}
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export { auditQuestionSyntax, detectQuestionSyntax };
