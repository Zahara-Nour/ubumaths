/**
 * Migrate Missing Images
 * =======================
 *
 * Downloads missing images from the old Supabase bucket and adds them to the mapping.
 * These are the tableau-de-signe images that were missed in the first migration.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-missing-images.ts
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OLD_BUCKET_BASE = 'https://vlqgmctfhesdhaifmyab.supabase.co/storage/v1/object/public/mental';
const NEW_SUPABASE_URL =
	process.env.PUBLIC_SUPABASE_URL || 'https://aqtijumsgfufoztohdua.supabase.co';
const NEW_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const NEW_BUCKET = 'question-images';
const MAPPING_FILE = 'scripts/image-url-mapping.json';
const LOCAL_CACHE_DIR = 'static/images/questions';

// Missing images from tableau-de-signe
const MISSING_IMAGES = [
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-0-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-1-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-2-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-3-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-4-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-5-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-6-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-7-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-8-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-9-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-10-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-11-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-12-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-13-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-14-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-15-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-16-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-17-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-18-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-19-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-0-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-1-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-2-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-3-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-4-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-5-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-6-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-7-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-8-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-9-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-10-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-11-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-12-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-13-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-14-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-15-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-16-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-17-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-18-600.png',
	'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-19-600.png'
];

// ============================================================================
// UTILITIES
// ============================================================================

async function ensureDir(dirPath: string): Promise<void> {
	await mkdir(dirPath, { recursive: true });
}

async function downloadImage(url: string): Promise<Buffer> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to download ${url}: ${response.status}`);
	}
	return Buffer.from(await response.arrayBuffer());
}

async function convertToWebp(pngBuffer: Buffer): Promise<Buffer> {
	return sharp(pngBuffer).webp({ quality: 85, effort: 6 }).toBuffer();
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
	console.log('╔══════════════════════════════════════════════════════════╗');
	console.log('║       Migrate Missing Images (tableau-de-signe)          ║');
	console.log('╚══════════════════════════════════════════════════════════╝');
	console.log('');

	// Check for Supabase key
	if (!NEW_SUPABASE_KEY) {
		console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not set.');
		console.log('   Will download and convert images locally, but NOT upload to Supabase.');
		console.log('   Set the env variable and re-run to upload.');
		console.log('');
	}

	// Load existing mapping
	console.log('📖 Loading existing image mapping...');
	const mappingContent = await readFile(MAPPING_FILE, 'utf-8');
	const mapping = JSON.parse(mappingContent) as Record<string, string>;
	const initialCount = Object.keys(mapping).length;
	console.log(`   Found ${initialCount} existing mappings`);

	// Initialize Supabase client if key available
	let supabase: ReturnType<typeof createClient> | null = null;
	if (NEW_SUPABASE_KEY) {
		supabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);
	}

	// Process each missing image
	console.log(`\n🔄 Processing ${MISSING_IMAGES.length} missing images...`);
	let downloaded = 0;
	let uploaded = 0;
	let errors = 0;

	for (const imagePath of MISSING_IMAGES) {
		const oldUrl = `${OLD_BUCKET_BASE}/${imagePath}`;
		const webpPath = imagePath.replace('.png', '.webp');
		const newUrl = `${NEW_SUPABASE_URL}/storage/v1/object/public/${NEW_BUCKET}/${webpPath}`;

		process.stdout.write(`   ${imagePath}... `);

		try {
			// Download PNG from old bucket
			const pngBuffer = await downloadImage(oldUrl);
			downloaded++;

			// Convert to WebP
			const webpBuffer = await convertToWebp(pngBuffer);

			// Save locally
			const localPath = join(LOCAL_CACHE_DIR, imagePath);
			await ensureDir(dirname(localPath));
			await writeFile(localPath, pngBuffer);

			// Upload to new bucket if Supabase available
			if (supabase) {
				const { error } = await supabase.storage.from(NEW_BUCKET).upload(webpPath, webpBuffer, {
					contentType: 'image/webp',
					upsert: true
				});

				if (error) {
					throw new Error(`Upload failed: ${error.message}`);
				}
				uploaded++;
			}

			// Add to mapping (multiple path formats)
			const fullLocalPath = join(process.cwd(), LOCAL_CACHE_DIR, imagePath);
			mapping[fullLocalPath] = newUrl;
			mapping[imagePath] = newUrl;
			mapping[`/${imagePath}`] = newUrl;
			mapping[`/images/${imagePath}`] = newUrl;

			console.log('✓');
		} catch (err) {
			errors++;
			console.log(`✗ ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	// Save updated mapping
	console.log('\n💾 Saving updated mapping...');
	await writeFile(MAPPING_FILE, JSON.stringify(mapping, null, '\t'), 'utf-8');
	const finalCount = Object.keys(mapping).length;
	console.log(`   Added ${finalCount - initialCount} new mappings (total: ${finalCount})`);

	// Summary
	console.log('');
	console.log('╔══════════════════════════════════════════════════════════╗');
	console.log('║                   Migration Complete                     ║');
	console.log('╚══════════════════════════════════════════════════════════╝');
	console.log('');
	console.log(`📥 Downloaded: ${downloaded}/${MISSING_IMAGES.length}`);
	if (supabase) {
		console.log(`📤 Uploaded: ${uploaded}/${MISSING_IMAGES.length}`);
	}
	console.log(`❌ Errors: ${errors}`);
	console.log('');

	if (!supabase) {
		console.log('⚠️  Images were downloaded but NOT uploaded to Supabase.');
		console.log('   Run with SUPABASE_SERVICE_ROLE_KEY to upload.');
	} else {
		console.log('✅ All images migrated and mapping updated!');
		console.log('   Re-run the export script to verify:');
		console.log('   pnpm tsx scripts/export-questions-for-review.ts');
	}
}

main().catch(console.error);
