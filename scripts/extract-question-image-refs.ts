#!/usr/bin/env tsx
/**
 * Extract Question Image References
 * ==================================
 *
 * Scans the old questions.ts file and extracts all image references.
 * This helps understand which images need to be migrated.
 *
 * Usage:
 *   pnpm tsx scripts/extract-question-image-refs.ts
 *
 * Output:
 *   - scripts/question-images-list.json
 *   - Console report of all image references
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
	questionsFile: 'extern/new-tinymath/apps/ubumaths/src/lib/questions/questions.ts',
	outputFile: 'scripts/question-images-list.json'
};

// ============================================================================
// TYPES
// ============================================================================

interface ImageReference {
	path: string;
	type: 'images' | 'imagesCorrection';
	questionIndex?: number; // If we can determine it
	count: number; // How many times this image is referenced
}

interface ImageStats {
	totalReferences: number;
	uniqueImages: number;
	byDirectory: Record<string, number>;
	byExtension: Record<string, number>;
}

// ============================================================================
// EXTRACTION LOGIC
// ============================================================================

/**
 * Extract image references from questions.ts file
 */
async function extractImageReferences(): Promise<ImageReference[]> {
	const filePath = path.resolve(CONFIG.questionsFile);

	// Read file
	const content = await fs.readFile(filePath, 'utf-8');

	// Extract all image array declarations
	// Patterns to match:
	// 1. images: ['path/to/image.png']
	// 2. images: ['path1.png', 'path2.png']
	// 3. imagesCorrection: ['path.png']

	const imageRefs: Map<string, ImageReference> = new Map();

	// Regex to match image arrays
	// Match: images: [ ... ] or imagesCorrection: [ ... ]
	const arrayRegex = /(images|imagesCorrection):\s*\[([\s\S]*?)\]/g;

	let match;
	while ((match = arrayRegex.exec(content)) !== null) {
		const type = match[1] as 'images' | 'imagesCorrection';
		const arrayContent = match[2];

		// Extract string literals from array
		// Match: 'path/to/image.png' or "path/to/image.png"
		const stringRegex = /['"]([^'"]+\.(?:png|jpg|jpeg|gif|svg))['"]/gi;

		let stringMatch;
		while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
			const imagePath = stringMatch[1];

			// Add or update reference
			const existing = imageRefs.get(imagePath);
			if (existing) {
				existing.count++;
			} else {
				imageRefs.set(imagePath, {
					path: imagePath,
					type,
					count: 1
				});
			}
		}
	}

	return Array.from(imageRefs.values());
}

/**
 * Calculate statistics from image references
 */
function calculateStats(refs: ImageReference[]): ImageStats {
	const byDirectory: Record<string, number> = {};
	const byExtension: Record<string, number> = {};

	for (const ref of refs) {
		const dir = path.dirname(ref.path);
		const ext = path.extname(ref.path).toLowerCase();

		// Count by directory
		byDirectory[dir] = (byDirectory[dir] || 0) + 1;

		// Count by extension
		byExtension[ext] = (byExtension[ext] || 0) + 1;
	}

	return {
		totalReferences: refs.reduce((sum, ref) => sum + ref.count, 0),
		uniqueImages: refs.length,
		byDirectory,
		byExtension
	};
}

/**
 * Print report
 */
function printReport(refs: ImageReference[], stats: ImageStats): void {
	console.log('📊 Image Reference Analysis');
	console.log('='.repeat(70));
	console.log(`Total references:     ${stats.totalReferences}`);
	console.log(`Unique images:        ${stats.uniqueImages}`);
	console.log('');

	console.log('By file extension:');
	Object.entries(stats.byExtension)
		.sort((a, b) => b[1] - a[1])
		.forEach(([ext, count]) => {
			console.log(`  ${ext.padEnd(10)} ${count}`);
		});
	console.log('');

	console.log('By directory (top 10):');
	Object.entries(stats.byDirectory)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.forEach(([dir, count]) => {
			console.log(`  ${dir.padEnd(50)} ${count}`);
		});
	console.log('');

	console.log('Most referenced images:');
	refs
		.sort((a, b) => b.count - a.count)
		.slice(0, 10)
		.forEach((ref) => {
			console.log(`  ${ref.path.padEnd(60)} ${ref.count}x`);
		});
	console.log('');

	console.log('='.repeat(70));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	console.log('🚀 Extracting image references from questions.ts...\n');

	// Check if file exists
	try {
		await fs.access(CONFIG.questionsFile);
	} catch {
		console.error(`❌ Error: File not found: ${CONFIG.questionsFile}`);
		process.exit(1);
	}

	// Extract references
	const refs = await extractImageReferences();

	if (refs.length === 0) {
		console.log('✅ No image references found in questions.ts');
		return;
	}

	// Calculate stats
	const stats = calculateStats(refs);

	// Print report
	printReport(refs, stats);

	// Save to file
	const output = {
		generatedAt: new Date().toISOString(),
		sourceFile: CONFIG.questionsFile,
		stats,
		images: refs
	};

	await fs.writeFile(CONFIG.outputFile, JSON.stringify(output, null, 2), 'utf-8');

	console.log(`\n✅ Image list saved to: ${CONFIG.outputFile}\n`);
}

main().catch((error) => {
	console.error('❌ Fatal error:', error);
	process.exit(1);
});
