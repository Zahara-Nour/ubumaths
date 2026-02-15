/**
 * Migrate VIP card images from static/ to Supabase Storage
 *
 * Reads templates from vip_card_templates, uploads .webp files from
 * static/images/vip-cards/ to the vip-card-images bucket, and updates
 * image_path in DB with the Supabase Storage public URL.
 *
 * Usage: npx tsx scripts/migrate-vip-images-to-storage.ts
 *
 * Uses PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env
 * Falls back to local Supabase if not set.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

config(); // Load .env

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

console.log(`Using Supabase at: ${SUPABASE_URL}\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STATIC_DIR = resolve(import.meta.dirname ?? '.', '..', 'static');
const BUCKET = 'vip-card-images';

async function migrate() {
	console.log('Migrating VIP card images to Supabase Storage...\n');

	// 1. Fetch all templates
	const { data: templates, error: fetchError } = await supabase
		.from('vip_card_templates')
		.select('id, name, image_path');

	if (fetchError) {
		console.error('❌ Error fetching templates:', fetchError.message);
		process.exit(1);
	}

	if (!templates || templates.length === 0) {
		console.log('No templates found.');
		return;
	}

	console.log(`Found ${templates.length} templates\n`);

	// 2. Filter templates with local image paths
	const toMigrate = templates.filter(
		(t) => t.image_path && t.image_path.startsWith('/images/vip-cards/')
	);

	const alreadyMigrated = templates.filter((t) => t.image_path && t.image_path.startsWith('http'));

	const noImage = templates.filter((t) => !t.image_path);

	console.log(`  To migrate:        ${toMigrate.length}`);
	console.log(`  Already migrated:  ${alreadyMigrated.length}`);
	console.log(`  No image:          ${noImage.length}\n`);

	if (toMigrate.length === 0) {
		console.log('Nothing to migrate.');
		return;
	}

	// 3. Migrate each template
	let success = 0;
	let failed = 0;

	for (const template of toMigrate) {
		const localPath = resolve(STATIC_DIR, template.image_path.slice(1)); // Remove leading /
		const storageKey = `${template.id}@0.5x.webp`;

		process.stdout.write(`  ${template.id} (${template.name})... `);

		// Read local file
		let fileBuffer: Buffer;
		try {
			fileBuffer = readFileSync(localPath);
		} catch {
			// Try .webp variant if the path doesn't have extension
			try {
				const webpPath = localPath.replace(/\.[^.]+$/, '.webp');
				fileBuffer = readFileSync(webpPath);
			} catch {
				console.log(`❌ File not found: ${localPath}`);
				failed++;
				continue;
			}
		}

		// Upload to storage
		const { error: uploadError } = await supabase.storage
			.from(BUCKET)
			.upload(storageKey, fileBuffer, {
				contentType: 'image/webp',
				upsert: true,
				cacheControl: '31536000'
			});

		if (uploadError) {
			console.log(`❌ Upload failed: ${uploadError.message}`);
			failed++;
			continue;
		}

		// Get public URL
		const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);

		if (!urlData?.publicUrl) {
			console.log('❌ Failed to get public URL');
			failed++;
			continue;
		}

		// Update image_path in DB
		const { error: updateError } = await supabase
			.from('vip_card_templates')
			.update({ image_path: urlData.publicUrl })
			.eq('id', template.id);

		if (updateError) {
			console.log(`❌ DB update failed: ${updateError.message}`);
			failed++;
			continue;
		}

		console.log(`✅ → ${urlData.publicUrl}`);
		success++;
	}

	// 4. Summary
	console.log(`\n--- Summary ---`);
	console.log(`  ✅ Migrated: ${success}`);
	console.log(`  ❌ Failed:   ${failed}`);
	console.log(`  Total:       ${toMigrate.length}`);
}

migrate();
