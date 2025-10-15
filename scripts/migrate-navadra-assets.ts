// Script to migrate Navadra assets to Supabase Storage
// Author: Claude Code
// Date: 2025-10-15

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Configuration
const NAVADRA_ROOT = path.join(process.cwd(), 'extern/navadra-jeu/webroot');
const ASSETS_DIR = path.join(NAVADRA_ROOT, 'img');
const SOUNDS_DIR = path.join(NAVADRA_ROOT, 'sons');

// Supabase client
const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Create the game-assets storage bucket
 */
async function createStorageBucket() {
	const { data, error } = await supabase.storage.createBucket('game-assets', {
		public: true,
		fileSizeLimit: 10 * 1024 * 1024, // 10MB per file
		allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/ogg']
	});

	if (error && !error.message.includes('already exists')) {
		console.error('Failed to create bucket:', error);
		throw error;
	} else if (error?.message.includes('already exists')) {
		console.log('✓ Storage bucket already exists');
	} else {
		console.log('✓ Storage bucket created');
	}
}

/**
 * Upload assets from a category
 */
async function uploadAssets(category: string, sourceDir: string) {
	if (!fs.existsSync(sourceDir)) {
		console.log(`⚠ Directory not found: ${sourceDir}`);
		return;
	}

	const files = await glob(`${sourceDir}/**/*.{png,jpg,jpeg,webp,mp3,ogg}`);

	console.log(`\nUploading ${files.length} files from ${category}...`);

	let successCount = 0;
	let errorCount = 0;
	let skippedCount = 0;

	for (const filePath of files) {
		const relativePath = path.relative(NAVADRA_ROOT, filePath);
		const targetPath = `${category}/${relativePath}`;

		// Check if file already exists
		const { data: existingFile } = await supabase.storage.from('game-assets').list(category, {
			search: path.basename(filePath)
		});

		if (existingFile && existingFile.length > 0) {
			skippedCount++;
			continue;
		}

		const fileContent = fs.readFileSync(filePath);

		const { error } = await supabase.storage.from('game-assets').upload(targetPath, fileContent, {
			contentType: getContentType(filePath),
			upsert: false
		});

		if (error) {
			console.error(`✗ Failed to upload ${targetPath}:`, error.message);
			errorCount++;
		} else {
			successCount++;
			process.stdout.write('.');
		}
	}

	console.log(
		`\n✓ Uploaded ${successCount} files, ${skippedCount} skipped, ${errorCount} errors`
	);
}

/**
 * Get MIME type from file extension
 */
function getContentType(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	const mimeTypes: Record<string, string> = {
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.webp': 'image/webp',
		'.mp3': 'audio/mpeg',
		'.ogg': 'audio/ogg'
	};
	return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Main migration function
 */
async function main() {
	console.log('='.repeat(60));
	console.log('Navadra Asset Migration to Supabase Storage');
	console.log('='.repeat(60));

	// Verify environment variables
	if (!process.env.PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
		console.error('❌ Missing environment variables!');
		console.error('Required: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
		process.exit(1);
	}

	// Verify source directories exist
	if (!fs.existsSync(NAVADRA_ROOT)) {
		console.error('❌ Navadra root directory not found!');
		console.error(`Expected: ${NAVADRA_ROOT}`);
		process.exit(1);
	}

	console.log(`\nSource: ${NAVADRA_ROOT}\n`);

	try {
		// Create bucket
		await createStorageBucket();

		// Upload assets by category
		await uploadAssets('monsters', path.join(ASSETS_DIR, 'monstres'));
		await uploadAssets('spells', path.join(ASSETS_DIR, 'spells'));
		await uploadAssets('characters', path.join(ASSETS_DIR, 'personnages'));
		await uploadAssets('ui', path.join(ASSETS_DIR, 'icones'));
		await uploadAssets('sounds', SOUNDS_DIR);

		console.log('\n' + '='.repeat(60));
		console.log('✅ Asset migration complete!');
		console.log('='.repeat(60));
	} catch (error) {
		console.error('\n❌ Migration failed:', error);
		process.exit(1);
	}
}

// Run migration
main().catch(console.error);
