/**
 * Export Questions for Review
 * ============================
 *
 * This script exports questions from .claude/old-questions.json to a structured
 * file system for manual review. Each question is transformed using the
 * question-transformer and organized by category (theme/domain/subdomain/level).
 *
 * Input:
 *   - .claude/old-questions.json (633 questions with _migration metadata)
 *
 * Output structure:
 *   data/migration-output/export-YYYY-MM-DD/
 *   ├── manifest.json           # Index of all exported files
 *   ├── summary.md              # Human-readable summary
 *   ├── by-category/
 *   │   └── {theme}/{domain}/{subdomain}/
 *   │       └── level-{n}.json  # One file per level
 *   └── reports/
 *       ├── success.md          # Successfully processed questions
 *       ├── warnings.md         # Questions with potential issues
 *       └── errors.md           # Questions that failed processing
 *
 * Usage:
 *   pnpm tsx scripts/export-questions-for-review.ts
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { QuestionWithMigration } from '../src/lib/migration/old-question-types';
import { transformQuestion } from '../src/lib/migration/question-transformer';
import type { TransformResult, ImageUrlMapping } from '../src/lib/migration/question-transformer';
import type { QuestionTemplate } from '../src/lib/questions/types';

// ============================================================================
// TYPES
// ============================================================================

interface ExportedQuestion {
	theme: string;
	domain: string;
	subdomain: string;
	level: number;
	globalIndex: number;
	question: QuestionWithMigration;
	transformed: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'> | null;
	warnings: string[];
	errors: string[];
	stats?: TransformResult['stats'];
}

interface CategoryStructure {
	themes: Record<
		string,
		{
			domains: Record<
				string,
				{
					subdomains: Record<
						string,
						{
							levels: Set<number>;
							path: string;
						}
					>;
				}
			>;
		}
	>;
}

interface Manifest {
	exportDate: string;
	totalQuestions: number;
	totalThemes: number;
	totalDomains: number;
	totalSubdomains: number;
	successCount: number;
	warningCount: number;
	errorCount: number;
	structure: Record<string, unknown>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const INPUT_FILE = '.claude/old-questions.json';
const IMAGE_MAPPING_FILE = 'scripts/image-url-mapping.json';
const OUTPUT_BASE = 'data/migration-output';
const TIMESTAMP = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const EXPORT_DIR = join(OUTPUT_BASE, `export-${TIMESTAMP}`);
const CATEGORY_DIR = join(EXPORT_DIR, 'by-category');
const REPORTS_DIR = join(EXPORT_DIR, 'reports');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize filename by replacing spaces and special characters
 */
function sanitizeFilename(name: string): string {
	return name
		.replace(/\s+/g, '_')
		.replace(/[^a-zA-Z0-9_\-àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/g, '')
		.toLowerCase();
}

/**
 * Ensure directory exists (create recursively if needed)
 */
async function ensureDir(dirPath: string): Promise<void> {
	await mkdir(dirPath, { recursive: true });
}

/**
 * Write JSON file with pretty formatting
 */
async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
	await ensureDir(dirname(filePath));
	await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Write text file
 */
async function writeTextFile(filePath: string, content: string): Promise<void> {
	await ensureDir(dirname(filePath));
	await writeFile(filePath, content, 'utf-8');
}

// ============================================================================
// EXPORT LOGIC
// ============================================================================

/**
 * Load questions from JSON file
 */
async function loadQuestions(): Promise<QuestionWithMigration[]> {
	console.log(`📖 Reading questions from: ${INPUT_FILE}`);
	const content = await readFile(INPUT_FILE, 'utf-8');
	const questions = JSON.parse(content) as QuestionWithMigration[];
	console.log(`✓ Loaded ${questions.length} questions`);
	return questions;
}

/**
 * Load image URL mapping from JSON file
 */
async function loadImageMapping(): Promise<ImageUrlMapping> {
	console.log(`🖼️  Reading image mapping from: ${IMAGE_MAPPING_FILE}`);
	try {
		const content = await readFile(IMAGE_MAPPING_FILE, 'utf-8');
		const mapping = JSON.parse(content) as ImageUrlMapping;
		const uniqueUrls = new Set(Object.values(mapping));
		console.log(
			`✓ Loaded ${Object.keys(mapping).length} mappings for ${uniqueUrls.size} unique images`
		);
		return mapping;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			console.warn(`⚠️  Image mapping file not found, proceeding without image conversion`);
			return {};
		}
		throw err;
	}
}

/**
 * Transform all questions and organize by category
 */
async function transformQuestions(
	questions: QuestionWithMigration[],
	imageMapping: ImageUrlMapping
): Promise<{
	exportedQuestions: ExportedQuestion[];
	structure: CategoryStructure;
	stats: {
		success: number;
		warnings: number;
		errors: number;
		imagesConverted: number;
		imagesMissing: number;
	};
}> {
	console.log('\n🔄 Transforming questions...');

	const exportedQuestions: ExportedQuestion[] = [];
	const structure: CategoryStructure = { themes: {} };
	const stats = {
		success: 0,
		warnings: 0,
		errors: 0,
		imagesConverted: 0,
		imagesMissing: 0
	};

	for (let i = 0; i < questions.length; i++) {
		const question = questions[i];
		const { theme, domain, subdomain, level, globalIndex } = question._migration;

		// Log progress every 50 questions
		if ((i + 1) % 50 === 0 || i === 0) {
			console.log(`  Processing question ${i + 1}/${questions.length}...`);
		}

		// Transform using question-transformer with image mapping
		const result = transformQuestion(question, globalIndex, {
			imageUrlMapping: imageMapping
		});

		// Create exported question entry
		const exported: ExportedQuestion = {
			theme,
			domain,
			subdomain,
			level,
			globalIndex,
			question,
			transformed: result.success ? result.template || null : null,
			warnings: result.warnings || [],
			errors: result.errors || [],
			stats: result.stats
		};

		exportedQuestions.push(exported);

		// Update structure tracking
		if (!structure.themes[theme]) {
			structure.themes[theme] = { domains: {} };
		}
		if (!structure.themes[theme].domains[domain]) {
			structure.themes[theme].domains[domain] = { subdomains: {} };
		}
		if (!structure.themes[theme].domains[domain].subdomains[subdomain]) {
			structure.themes[theme].domains[domain].subdomains[subdomain] = {
				levels: new Set(),
				path: join(
					CATEGORY_DIR,
					sanitizeFilename(theme),
					sanitizeFilename(domain),
					sanitizeFilename(subdomain)
				)
			};
		}
		structure.themes[theme].domains[domain].subdomains[subdomain].levels.add(level);

		// Update stats
		if (result.success) {
			stats.success++;
			if (result.warnings && result.warnings.length > 0) {
				stats.warnings++;
			}
			// Track image conversion stats
			if (result.stats) {
				stats.imagesConverted += result.stats.imagesConverted;
				stats.imagesMissing += result.stats.imagesMissing;
			}
		} else {
			stats.errors++;
		}
	}

	console.log(`✓ Transformed ${questions.length} questions`);
	console.log(`  Success: ${stats.success}`);
	console.log(`  Warnings: ${stats.warnings}`);
	console.log(`  Errors: ${stats.errors}`);
	console.log(`  Images converted: ${stats.imagesConverted}`);
	console.log(`  Images missing: ${stats.imagesMissing}`);

	return { exportedQuestions, structure, stats };
}

/**
 * Write questions organized by category
 */
async function writeByCategory(
	exportedQuestions: ExportedQuestion[],
	_structure: CategoryStructure
): Promise<void> {
	console.log('\n📁 Writing questions by category...');

	// Group questions by theme/domain/subdomain/level
	const grouped = new Map<string, ExportedQuestion[]>();

	for (const question of exportedQuestions) {
		const { theme, domain, subdomain, level } = question;
		const key = `${theme}|${domain}|${subdomain}|${level}`;

		if (!grouped.has(key)) {
			grouped.set(key, []);
		}
		grouped.get(key)!.push(question);
	}

	// Write each group to a file
	let fileCount = 0;
	for (const [key, questions] of grouped.entries()) {
		const [theme, domain, subdomain, level] = key.split('|');
		const dirPath = join(
			CATEGORY_DIR,
			sanitizeFilename(theme),
			sanitizeFilename(domain),
			sanitizeFilename(subdomain)
		);
		const fileName = `level-${level}.json`;
		const filePath = join(dirPath, fileName);

		await writeJsonFile(filePath, questions);
		fileCount++;
	}

	console.log(`✓ Wrote ${fileCount} category files`);
}

/**
 * Generate manifest.json
 */
async function writeManifest(
	exportedQuestions: ExportedQuestion[],
	structure: CategoryStructure,
	stats: { success: number; warnings: number; errors: number }
): Promise<void> {
	console.log('\n📋 Generating manifest...');

	// Build structure object for manifest
	const manifestStructure: Record<string, unknown> = {};

	for (const [themeName, themeData] of Object.entries(structure.themes)) {
		manifestStructure[themeName] = {};

		for (const [domainName, domainData] of Object.entries(themeData.domains)) {
			(manifestStructure[themeName] as Record<string, unknown>)[domainName] = {};

			for (const [subdomainName, subdomainData] of Object.entries(domainData.subdomains)) {
				(
					(manifestStructure[themeName] as Record<string, unknown>)[domainName] as Record<
						string,
						unknown
					>
				)[subdomainName] = {
					levels: Array.from(subdomainData.levels).sort((a, b) => a - b),
					path: subdomainData.path.replace(EXPORT_DIR + '/', '')
				};
			}
		}
	}

	const manifest: Manifest = {
		exportDate: new Date().toISOString(),
		totalQuestions: exportedQuestions.length,
		totalThemes: Object.keys(structure.themes).length,
		totalDomains: Object.values(structure.themes).reduce(
			(sum, theme) => sum + Object.keys(theme.domains).length,
			0
		),
		totalSubdomains: Object.values(structure.themes).reduce(
			(sum, theme) =>
				sum +
				Object.values(theme.domains).reduce(
					(domainSum, domain) => domainSum + Object.keys(domain.subdomains).length,
					0
				),
			0
		),
		successCount: stats.success,
		warningCount: stats.warnings,
		errorCount: stats.errors,
		structure: manifestStructure
	};

	const manifestPath = join(EXPORT_DIR, 'manifest.json');
	await writeJsonFile(manifestPath, manifest);

	console.log(`✓ Wrote manifest to: ${manifestPath}`);
}

/**
 * Generate summary.md
 */
async function writeSummary(
	exportedQuestions: ExportedQuestion[],
	structure: CategoryStructure,
	stats: { success: number; warnings: number; errors: number }
): Promise<void> {
	console.log('\n📄 Generating summary...');

	const lines: string[] = [];

	lines.push('# Question Export Summary');
	lines.push('');
	lines.push(`**Export Date:** ${new Date().toISOString()}`);
	lines.push(`**Total Questions:** ${exportedQuestions.length}`);
	lines.push('');

	lines.push('## Statistics');
	lines.push('');
	lines.push('| Metric | Count |');
	lines.push('|--------|-------|');
	lines.push(`| Total Questions | ${exportedQuestions.length} |`);
	lines.push(`| Successfully Transformed | ${stats.success} |`);
	lines.push(`| With Warnings | ${stats.warnings} |`);
	lines.push(`| Failed | ${stats.errors} |`);
	lines.push(
		`| Success Rate | ${((stats.success / exportedQuestions.length) * 100).toFixed(1)}% |`
	);
	lines.push('');

	lines.push('## Structure');
	lines.push('');
	lines.push('| Theme | Domains | Subdomains | Questions |');
	lines.push('|-------|---------|------------|-----------|');

	for (const [themeName, themeData] of Object.entries(structure.themes)) {
		const domainCount = Object.keys(themeData.domains).length;
		const subdomainCount = Object.values(themeData.domains).reduce(
			(sum, domain) => sum + Object.keys(domain.subdomains).length,
			0
		);
		const questionCount = exportedQuestions.filter((q) => q.theme === themeName).length;

		lines.push(`| ${themeName} | ${domainCount} | ${subdomainCount} | ${questionCount} |`);
	}

	lines.push('');
	lines.push('## Output Structure');
	lines.push('');
	lines.push('```');
	lines.push(`${EXPORT_DIR}/`);
	lines.push('├── manifest.json           # Index of all exported files');
	lines.push('├── summary.md              # This file');
	lines.push('├── by-category/');
	lines.push('│   └── {theme}/{domain}/{subdomain}/');
	lines.push('│       └── level-{n}.json  # One file per level');
	lines.push('└── reports/');
	lines.push('    ├── success.md          # Successfully processed questions');
	lines.push('    ├── warnings.md         # Questions with potential issues');
	lines.push('    └── errors.md           # Questions that failed processing');
	lines.push('```');

	const summaryPath = join(EXPORT_DIR, 'summary.md');
	await writeTextFile(summaryPath, lines.join('\n'));

	console.log(`✓ Wrote summary to: ${summaryPath}`);
}

/**
 * Generate reports (success/warnings/errors)
 */
async function writeReports(exportedQuestions: ExportedQuestion[]): Promise<void> {
	console.log('\n📊 Generating reports...');

	// Success report
	const successQuestions = exportedQuestions.filter(
		(q) => q.errors.length === 0 && q.warnings.length === 0
	);
	const successLines: string[] = [];
	successLines.push('# Successfully Processed Questions');
	successLines.push('');
	successLines.push(
		`Total: ${successQuestions.length} questions processed without warnings or errors.`
	);
	successLines.push('');

	if (successQuestions.length > 0) {
		successLines.push('| Index | Theme | Domain | Subdomain | Level | Title |');
		successLines.push('|-------|-------|--------|-----------|-------|-------|');

		for (const q of successQuestions) {
			const title = q.question.description.substring(0, 50);
			successLines.push(
				`| ${q.globalIndex} | ${q.theme} | ${q.domain} | ${q.subdomain} | ${q.level} | ${title}... |`
			);
		}
	}

	await writeTextFile(join(REPORTS_DIR, 'success.md'), successLines.join('\n'));

	// Warnings report
	const warningQuestions = exportedQuestions.filter(
		(q) => q.errors.length === 0 && q.warnings.length > 0
	);
	const warningLines: string[] = [];
	warningLines.push('# Questions with Warnings');
	warningLines.push('');
	warningLines.push(
		`Total: ${warningQuestions.length} questions processed with warnings (but no errors).`
	);
	warningLines.push('');

	for (const q of warningQuestions) {
		warningLines.push(`## Question ${q.globalIndex}: ${q.question.description}`);
		warningLines.push('');
		warningLines.push(`**Category:** ${q.theme} > ${q.domain} > ${q.subdomain} (Level ${q.level})`);
		warningLines.push('');
		warningLines.push('**Warnings:**');
		for (const warning of q.warnings) {
			warningLines.push(`- ${warning}`);
		}
		warningLines.push('');
	}

	await writeTextFile(join(REPORTS_DIR, 'warnings.md'), warningLines.join('\n'));

	// Errors report
	const errorQuestions = exportedQuestions.filter((q) => q.errors.length > 0);
	const errorLines: string[] = [];
	errorLines.push('# Questions with Errors');
	errorLines.push('');
	errorLines.push(`Total: ${errorQuestions.length} questions that failed processing.`);
	errorLines.push('');

	for (const q of errorQuestions) {
		errorLines.push(`## Question ${q.globalIndex}: ${q.question.description}`);
		errorLines.push('');
		errorLines.push(`**Category:** ${q.theme} > ${q.domain} > ${q.subdomain} (Level ${q.level})`);
		errorLines.push('');
		errorLines.push('**Errors:**');
		for (const error of q.errors) {
			errorLines.push(`- ${error}`);
		}
		errorLines.push('');
		if (q.warnings.length > 0) {
			errorLines.push('**Warnings:**');
			for (const warning of q.warnings) {
				errorLines.push(`- ${warning}`);
			}
			errorLines.push('');
		}
	}

	await writeTextFile(join(REPORTS_DIR, 'errors.md'), errorLines.join('\n'));

	console.log(`✓ Wrote 3 report files to: ${REPORTS_DIR}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
	console.log('╔══════════════════════════════════════════════════════════╗');
	console.log('║       Export Questions for Review                        ║');
	console.log('╚══════════════════════════════════════════════════════════╝');
	console.log('');

	try {
		// Load questions
		const questions = await loadQuestions();

		// Load image URL mapping
		const imageMapping = await loadImageMapping();

		// Transform questions with image mapping
		const { exportedQuestions, structure, stats } = await transformQuestions(
			questions,
			imageMapping
		);

		// Write organized files
		await writeByCategory(exportedQuestions, structure);

		// Write manifest
		await writeManifest(exportedQuestions, structure, stats);

		// Write summary
		await writeSummary(exportedQuestions, structure, stats);

		// Write reports
		await writeReports(exportedQuestions);

		// Final summary
		console.log('');
		console.log('╔══════════════════════════════════════════════════════════╗');
		console.log('║                   Export Complete                        ║');
		console.log('╚══════════════════════════════════════════════════════════╝');
		console.log('');
		console.log(`📦 Export directory: ${EXPORT_DIR}`);
		console.log(`📋 Manifest: ${join(EXPORT_DIR, 'manifest.json')}`);
		console.log(`📄 Summary: ${join(EXPORT_DIR, 'summary.md')}`);
		console.log(`📊 Reports: ${REPORTS_DIR}`);
		console.log('');
		console.log('Next steps:');
		console.log('1. Review the summary.md file for an overview');
		console.log('2. Check reports/warnings.md for questions needing attention');
		console.log('3. Check reports/errors.md for failed transformations');
		console.log('4. Review individual question files in by-category/');
	} catch (error) {
		console.error('');
		console.error('❌ Error during export:');
		console.error(error instanceof Error ? error.message : String(error));
		console.error('');
		if (error instanceof Error && error.stack) {
			console.error('Stack trace:');
			console.error(error.stack);
		}
		process.exit(1);
	}
}

// Run the script
main();
