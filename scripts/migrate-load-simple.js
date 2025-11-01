#!/usr/bin/env node
/**
 * Simple Load Function Monitoring Migration Script
 * =================================================
 *
 * Automatically wraps all SvelteKit load functions with loadMonitor tracing.
 * Uses a simpler, more reliable approach based on the patterns observed in the codebase.
 *
 * USAGE:
 *   node scripts/migrate-load-simple.js [--dry-run]
 *
 * TRANSFORMATIONS:
 * ----------------
 * BEFORE:
 *   export const load: PageServerLoad = async ({ parent, locals }) => {
 *
 * AFTER:
 *   import { loadMonitor } from '$lib/utils/loadTracer';
 *   export const load: PageServerLoad = loadMonitor.traceServerLoad(async (event) => {
 *     const { parent } = event;
 *     const { locals } = event;
 *
 * HANDLES:
 * - Both server (.server.ts) and client (.ts) files
 * - Type annotations (PageServerLoad, PageLoad, etc.)
 * - Various parameter destructuring patterns
 * - Preserves comments and formatting
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) {
	console.log('🔍 DRY RUN MODE - No files will be modified\n');
} else {
	console.log('⚠️  MODIFYING FILES - Make sure you have a clean git state!\n');
}

function isServerFile(filename) {
	return filename.includes('.server.');
}

function processFile(filePath) {
	const relativePath = relative(ROOT, filePath);

	try {
		const content = readFileSync(filePath, 'utf-8');

		// Skip if already using loadMonitor
		if (content.includes('loadMonitor')) {
			console.log(`⏭️  ${relativePath} - Already using loadMonitor`);
			return { modified: false };
		}

		// Skip if no load function
		const loadMatch = content.match(
			/export\s+const\s+load(?::\s*\w+)?\s*=\s*async\s*\(\s*\{([^}]+)\}\s*\)/
		);
		if (!loadMatch) {
			console.log(`⏭️  ${relativePath} - No load function found`);
			return { modified: false };
		}

		const isServer = isServerFile(filePath);
		const wrapperMethod = isServer ? 'traceServerLoad' : 'traceClientLoad';
		const loadType = isServer ? 'Server' : 'Client';

		// Extract destructured parameters
		const destructuredParams = loadMatch[1]
			.split(',')
			.map((p) => p.trim())
			.filter((p) => p.length > 0);

		let newContent = content;

		// Step 1: Add import if not present
		if (!newContent.includes("from '$lib/utils/loadTracer'")) {
			// Find last import line
			const lines = newContent.split('\n');
			let lastImportIndex = -1;

			for (let i = 0; i < lines.length; i++) {
				if (lines[i].trim().startsWith('import ')) {
					lastImportIndex = i;
				}
			}

			const importLine = "import { loadMonitor } from '$lib/utils/loadTracer';";

			if (lastImportIndex >= 0) {
				lines.splice(lastImportIndex + 1, 0, importLine);
			} else {
				// No imports found, add at top after initial comments
				let insertIndex = 0;
				for (let i = 0; i < lines.length; i++) {
					const trimmed = lines[i].trim();
					if (
						trimmed.startsWith('/**') ||
						trimmed.startsWith('/*') ||
						trimmed.startsWith('*') ||
						trimmed.startsWith('//') ||
						trimmed === ''
					) {
						insertIndex = i + 1;
					} else {
						break;
					}
				}
				lines.splice(insertIndex, 0, importLine, '');
			}

			newContent = lines.join('\n');
		}

		// Step 2: Transform the load function signature
		// Pattern: export const load: Type = async ({ param1, param2 }) =>
		// Replace with: export const load: Type = loadMonitor.traceServerLoad(async (event) =>

		const loadPattern =
			/(export\s+const\s+load(?::\s*\w+)?\s*=\s*)async\s*\(\s*\{[^}]+\}\s*\)\s*=>/;

		newContent = newContent.replace(loadPattern, (match, prefix) => {
			return `${prefix}loadMonitor.${wrapperMethod}(async (event) =>`;
		});

		// Step 3: Add destructuring at the start of the function body
		// Find the opening { of the function body
		const functionStartPattern = new RegExp(
			`export\\s+const\\s+load[^=]+=\\s*loadMonitor\\.${wrapperMethod}\\(async\\s*\\(event\\)\\s*=>\\s*\\{`
		);

		const functionStartMatch = newContent.match(functionStartPattern);
		if (!functionStartMatch) {
			console.error(`⚠️  ${relativePath} - Could not find function body start`);
			return { modified: false };
		}

		const insertPoint = functionStartMatch.index + functionStartMatch[0].length;

		// Build destructuring statements
		const destructuringLines = [];

		for (const param of destructuredParams) {
			// Handle nested destructuring like "locals: { supabase }"
			if (param.includes(':')) {
				const [left, right] = param.split(':').map((s) => s.trim());
				destructuringLines.push(`\tconst { ${right} } = event.${left};`);
			} else {
				destructuringLines.push(`\tconst { ${param} } = event;`);
			}
		}

		const before = newContent.slice(0, insertPoint);
		const after = newContent.slice(insertPoint);

		newContent = before + '\n' + destructuringLines.join('\n') + '\n' + after;

		// Step 4: Add closing parenthesis at the end
		// Find the last }; of the load function
		const _loadEndPattern = /^};$/m;

		// Find all matches
		const lines = newContent.split('\n');
		let loadEndIndex = -1;
		let inLoadFunction = false;

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].includes(`loadMonitor.${wrapperMethod}`)) {
				inLoadFunction = true;
			}

			if (inLoadFunction && lines[i].trim() === '};') {
				loadEndIndex = i;
				inLoadFunction = false;
				break; // Take the first matching };
			}
		}

		if (loadEndIndex >= 0) {
			lines[loadEndIndex] = '});';
			newContent = lines.join('\n');
		} else {
			console.error(`⚠️  ${relativePath} - Could not find function end`);
			return { modified: false };
		}

		console.log(`✅ ${relativePath} - ${loadType} load function wrapped`);

		if (!DRY_RUN) {
			writeFileSync(filePath, newContent, 'utf-8');
		}

		return { modified: true };
	} catch (error) {
		console.error(`❌ Error processing ${relativePath}:`, error.message);
		return { modified: false, error: true };
	}
}

async function main() {
	console.log('🔍 Finding load function files...\n');

	const files = await glob('src/routes/**/{+page,+layout}.{server.,}ts', {
		cwd: ROOT,
		absolute: true,
		ignore: ['**/node_modules/**', '**/.svelte-kit/**']
	});

	// Filter out files we've already modified manually
	const alreadyModified = [
		'src/routes/(public)/games/+page.ts',
		'src/routes/(protected)/dashboard/teacher/classes/+page.server.ts'
	];

	const filesToProcess = files.filter((file) => {
		const rel = relative(ROOT, file);
		return !alreadyModified.includes(rel);
	});

	console.log(`📁 Found ${filesToProcess.length} files to process\n`);

	let processedCount = 0;
	let modifiedCount = 0;
	let errorCount = 0;

	for (const file of filesToProcess) {
		const result = processFile(file);
		processedCount++;

		if (result.modified) modifiedCount++;
		if (result.error) errorCount++;
	}

	console.log('\n' + '='.repeat(60));
	console.log('📊 SUMMARY');
	console.log('='.repeat(60));
	console.log(`Total files scanned: ${processedCount}`);
	console.log(`Files modified: ${modifiedCount}`);
	console.log(`Errors: ${errorCount}`);

	if (DRY_RUN) {
		console.log('\n💡 This was a dry run. To apply changes, run:');
		console.log('   node scripts/migrate-load-simple.js');
	} else {
		console.log('\n✅ Migration complete!');
		console.log('\n📋 Next steps:');
		console.log('   1. Review changes: git diff');
		console.log('   2. Run type check: pnpm check');
		console.log('   3. Fix any type errors manually');
		console.log('   4. Test the app: pnpm dev --port 5175');
	}
}

main().catch((error) => {
	console.error('💥 Fatal error:', error);
	process.exit(1);
});
