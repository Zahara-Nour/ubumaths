#!/usr/bin/env tsx
/**
 * Download images from old Supabase project via public URLs
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const OLD_SUPABASE_URL = 'https://vlqgmctfhesdhaifmyab.supabase.co';
const BUCKET = 'mental';
const OUTPUT_DIR = 'static/images/questions';

// Load image list from extracted references
async function loadImageList(): Promise<string[]> {
	const listPath = 'scripts/question-images-list.json';
	const content = await fs.readFile(listPath, 'utf-8');
	const data = JSON.parse(content);
	return data.images.map((img: { path: string }) => img.path);
}

async function downloadImage(imagePath: string): Promise<boolean> {
	const url = `${OLD_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${imagePath}`;
	const outputPath = path.join(OUTPUT_DIR, imagePath);
	const outputDir = path.dirname(outputPath);

	try {
		// Create directory
		await fs.mkdir(outputDir, { recursive: true });

		// Download
		const response = await fetch(url);

		if (!response.ok) {
			return false;
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		await fs.writeFile(outputPath, buffer);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	console.log('📥 Downloading images from old Supabase project...\n');

	const images = await loadImageList();
	console.log(`Found ${images.length} images to download\n`);

	let downloaded = 0;
	let failed = 0;
	const failedImages: string[] = [];

	for (let i = 0; i < images.length; i++) {
		const imagePath = images[i];
		const success = await downloadImage(imagePath);

		if (success) {
			downloaded++;
		} else {
			failed++;
			failedImages.push(imagePath);
		}

		process.stdout.write(
			`\r  Progress: ${i + 1}/${images.length} (${downloaded} ok, ${failed} failed)`
		);
	}

	console.log('\n');
	console.log('✅ Download complete!');
	console.log(`   Downloaded: ${downloaded}`);
	console.log(`   Failed: ${failed}`);
	console.log(`   Output: ${OUTPUT_DIR}/`);

	if (failedImages.length > 0) {
		console.log('\n❌ Failed images:');
		failedImages.forEach((img) => console.log(`   - ${img}`));
	}

	console.log('\n📋 Next step: pnpm tsx scripts/migrate-question-images.ts --dry-run');
}

main().catch(console.error);
