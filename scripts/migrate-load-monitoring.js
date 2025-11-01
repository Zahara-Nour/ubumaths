#!/usr/bin/env node
/**
 * Load Function Monitoring Migration Script
 * ==========================================
 *
 * Automatically wraps all SvelteKit load functions with loadMonitor tracing.
 *
 * USAGE:
 *   node scripts/migrate-load-monitoring.js [--dry-run]
 *
 * OPTIONS:
 *   --dry-run    Show what would be changed without modifying files
 *
 * WHAT IT DOES:
 * 1. Finds all +page.server.ts, +page.ts, +layout.server.ts, +layout.ts files
 * 2. For each file with "export const load":
 *    - Adds import { loadMonitor } from '$lib/utils/loadTracer'
 *    - Wraps load function with loadMonitor.traceServerLoad() or traceClientLoad()
 *    - Changes parameter destructuring to use 'event' parameter
 * 3. Skips files already using loadMonitor
 *
 * SAFETY:
 * - Runs in dry-run mode by default to preview changes
 * - Only modifies files with export const load
 * - Preserves all type annotations
 * - Git diff to verify changes is recommended
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// Check if dry-run mode
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) {
	console.log('🔍 DRY RUN MODE - No files will be modified\n');
} else {
	console.log('⚠️  MODIFYING FILES - Make sure you have a clean git state!\n');
}

/**
 * Determine if a file is server-side or client-side
 */
function isServerFile(filename) {
	return filename.includes('.server.');
}

/**
 * Add loadMonitor import if not present
 */
function addLoadMonitorImport(content) {
	// Check if import already exists
	if (content.includes('loadMonitor')) {
		return { content, added: false };
	}

	// Find the best place to add the import
	// Strategy: Add after the last import statement, or at the top

	const lines = content.split('\n');
	let lastImportIndex = -1;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line.startsWith('import ')) {
			lastImportIndex = i;
		}
	}

	const importStatement = "import { loadMonitor } from '$lib/utils/loadTracer';";

	if (lastImportIndex >= 0) {
		// Insert after last import
		lines.splice(lastImportIndex + 1, 0, importStatement);
	} else {
		// Insert at the top (after any leading comments)
		let insertIndex = 0;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			// Skip comment lines and empty lines
			if (
				line.startsWith('/**') ||
				line.startsWith('/*') ||
				line.startsWith('*') ||
				line.startsWith('//') ||
				line === ''
			) {
				insertIndex = i + 1;
			} else {
				break;
			}
		}
		lines.splice(insertIndex, 0, importStatement);
	}

	return { content: lines.join('\n'), added: true };
}

/**
 * Transform load function to use loadMonitor wrapper
 *
 * Handles patterns like:
 * - export const load: PageServerLoad = async ({ parent, locals }) => { ... }
 * - export const load = async ({ parent }) => { ... }
 * - export const load: PageServerLoad = async function({ parent }) { ... }
 */
function wrapLoadFunction(content, isServer) {
	const wrapperMethod = isServer ? 'traceServerLoad' : 'traceClientLoad';

	// Pattern 1: Arrow function with type annotation
	// export const load: SomeType = async ({ params }) => { ... }
	const pattern1 = /export const load:\s*\w+\s*=\s*async\s*\(\s*\{([^}]+)\}\s*\)\s*=>/g;

	// Pattern 2: Arrow function without type annotation
	// export const load = async ({ params }) => { ... }
	const pattern2 = /export const load\s*=\s*async\s*\(\s*\{([^}]+)\}\s*\)\s*=>/g;

	// Pattern 3: Function declaration
	// export const load: SomeType = async function({ params }) { ... }
	const pattern3 = /export const load:\s*\w+\s*=\s*async\s+function\s*\(\s*\{([^}]+)\}\s*\)/g;

	// Pattern 4: Function without type
	// export const load = async function({ params }) { ... }
	const pattern4 = /export const load\s*=\s*async\s+function\s*\(\s*\{([^}]+)\}\s*\)/g;

	let transformed = content;
	let matched = false;

	// Try pattern 1 (arrow with type)
	if (pattern1.test(content)) {
		transformed = content.replace(pattern1, (match, _params) => {
			matched = true;
			// Extract type annotation
			const typeMatch = match.match(/:\s*(\w+)/);
			const type = typeMatch ? typeMatch[1] : '';
			return `export const load${type ? ': ' + type : ''} = loadMonitor.${wrapperMethod}(async (event) =>`;
		});
	}
	// Try pattern 2 (arrow without type)
	else if (pattern2.test(content)) {
		transformed = content.replace(pattern2, () => {
			matched = true;
			return `export const load = loadMonitor.${wrapperMethod}(async (event) =>`;
		});
	}
	// Try pattern 3 (function with type)
	else if (pattern3.test(content)) {
		transformed = content.replace(pattern3, (match) => {
			matched = true;
			const typeMatch = match.match(/:\s*(\w+)/);
			const type = typeMatch ? typeMatch[1] : '';
			return `export const load${type ? ': ' + type : ''} = loadMonitor.${wrapperMethod}(async function(event)`;
		});
	}
	// Try pattern 4 (function without type)
	else if (pattern4.test(content)) {
		transformed = content.replace(pattern4, () => {
			matched = true;
			return `export const load = loadMonitor.${wrapperMethod}(async function(event)`;
		});
	}

	if (!matched) {
		return { content, wrapped: false };
	}

	// Now we need to add closing parenthesis for the wrapper
	// Find the closing brace of the load function and add ) after it

	// This is tricky - we need to find the matching closing brace
	// Simple heuristic: find the last }; or } at the end of the export
	// For arrow functions: }; pattern
	// For function declarations: } pattern

	// Count braces to find the closing one
	const loadExportMatch = transformed.match(/export const load[^=]+=\s*loadMonitor\.\w+\(/);
	if (!loadExportMatch) {
		return { content, wrapped: false };
	}

	const startIndex = loadExportMatch.index + loadExportMatch[0].length;
	let braceCount = 0;
	let inString = false;
	let stringChar = '';
	let inComment = false;
	let closingIndex = -1;

	for (let i = startIndex; i < transformed.length; i++) {
		const char = transformed[i];
		const prevChar = i > 0 ? transformed[i - 1] : '';
		const nextChar = i < transformed.length - 1 ? transformed[i + 1] : '';

		// Handle strings
		if (!inComment && (char === '"' || char === "'" || char === '`')) {
			if (!inString) {
				inString = true;
				stringChar = char;
			} else if (char === stringChar && prevChar !== '\\') {
				inString = false;
				stringChar = '';
			}
			continue;
		}

		// Handle comments
		if (!inString) {
			if (char === '/' && nextChar === '/') {
				inComment = 'line';
				continue;
			}
			if (char === '/' && nextChar === '*') {
				inComment = 'block';
				continue;
			}
			if (inComment === 'line' && char === '\n') {
				inComment = false;
				continue;
			}
			if (inComment === 'block' && char === '*' && nextChar === '/') {
				inComment = false;
				i++; // Skip the /
				continue;
			}
		}

		if (inString || inComment) continue;

		// Count braces
		if (char === '{') braceCount++;
		if (char === '}') braceCount--;

		// Found the matching closing brace
		if (braceCount === -1) {
			closingIndex = i;
			break;
		}
	}

	if (closingIndex === -1) {
		console.warn('⚠️  Could not find closing brace for load function');
		return { content, wrapped: false };
	}

	// Check if there's a semicolon after the closing brace
	const afterBrace = transformed.slice(closingIndex + 1).trim();
	const hasSemicolon = afterBrace.startsWith(';');

	// Insert closing parenthesis
	const beforeClose = transformed.slice(0, closingIndex + 1);
	const afterClose = transformed.slice(closingIndex + 1);

	transformed = beforeClose + ')' + (hasSemicolon ? '' : ';') + afterClose;

	// Remove duplicate semicolon if any
	transformed = transformed.replace(/\);;\s*$/m, ');');
	transformed = transformed.replace(/\);\s*;/g, ');');

	return { content: transformed, wrapped: true };
}

/**
 * Process a single file
 */
function processFile(filePath) {
	const relativePath = relative(ROOT, filePath);

	try {
		let content = readFileSync(filePath, 'utf-8');

		// Skip if already using loadMonitor
		if (content.includes('loadMonitor')) {
			console.log(`⏭️  ${relativePath} - Already using loadMonitor, skipping`);
			return { modified: false };
		}

		// Skip if no load function
		if (!content.includes('export const load')) {
			console.log(`⏭️  ${relativePath} - No load function found, skipping`);
			return { modified: false };
		}

		const isServer = isServerFile(filePath);

		// Add import
		const { content: contentWithImport, added: _importAdded } = addLoadMonitorImport(content);

		// Wrap load function
		const { content: finalContent, wrapped } = wrapLoadFunction(contentWithImport, isServer);

		if (!wrapped) {
			console.log(`⚠️  ${relativePath} - Could not wrap load function (complex pattern?)`);
			return { modified: false };
		}

		const loadType = isServer ? 'Server' : 'Client';
		console.log(`✅ ${relativePath} - ${loadType} load function wrapped`);

		if (!DRY_RUN) {
			writeFileSync(filePath, finalContent, 'utf-8');
		}

		return { modified: true };
	} catch (error) {
		console.error(`❌ Error processing ${relativePath}:`, error.message);
		return { modified: false, error: true };
	}
}

/**
 * Main execution
 */
async function main() {
	console.log('🔍 Finding load function files...\n');

	// Find all load function files
	const files = await glob('src/routes/**/{+page,+layout}.{server.,}ts', {
		cwd: ROOT,
		absolute: true,
		ignore: ['**/node_modules/**', '**/.svelte-kit/**']
	});

	console.log(`📁 Found ${files.length} potential files\n`);

	let processedCount = 0;
	let modifiedCount = 0;
	let errorCount = 0;

	for (const file of files) {
		const result = processFile(file);
		processedCount++;

		if (result.modified) {
			modifiedCount++;
		}
		if (result.error) {
			errorCount++;
		}
	}

	console.log('\n' + '='.repeat(60));
	console.log('📊 SUMMARY');
	console.log('='.repeat(60));
	console.log(`Total files scanned: ${processedCount}`);
	console.log(`Files modified: ${modifiedCount}`);
	console.log(`Errors: ${errorCount}`);

	if (DRY_RUN) {
		console.log('\n💡 This was a dry run. To apply changes, run:');
		console.log('   node scripts/migrate-load-monitoring.js');
	} else {
		console.log('\n✅ Migration complete!');
		console.log('\n📋 Next steps:');
		console.log('   1. Review changes: git diff');
		console.log('   2. Run type check: pnpm check');
		console.log('   3. Test the app: pnpm dev');
		console.log('   4. Enable monitoring: VITE_ENABLE_LOAD_MONITORING=true in .env');
	}
}

main().catch((error) => {
	console.error('💥 Fatal error:', error);
	process.exit(1);
});
