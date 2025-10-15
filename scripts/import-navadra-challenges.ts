// Script to import Navadra challenges from JSON files
// Author: Claude Code
// Date: 2025-10-15

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Load environment variables from .env file
config();

// Configuration
const CHALLENGES_DIR = path.join(process.cwd(), 'extern/navadra-jeu/generators/challenges');

// Supabase client
const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ChallengeJSON {
	timer: number;
	type: number;
	question: string;
	view?: any;
	var?: any;
	answer: any;
	hint?: string;
	showAnswer?: any;
}

/**
 * Parse challenge metadata from file path
 * e.g., challenges/water/tables/1/water_tables_1_1.json
 */
function parseMetadataFromPath(filePath: string): {
	element: string;
	category: string;
	difficulty: number;
	slug: string;
} {
	const relativePath = path.relative(CHALLENGES_DIR, filePath);
	const pathParts = relativePath.split(path.sep);

	const element = pathParts[0]; // 'water', 'fire', 'earth', 'wind', 'base'
	const category = pathParts[1] || 'general'; // 'tables', 'fractions', etc.
	const difficulty = parseInt(pathParts[2]) || 1; // '1', '2', etc.
	const filename = path.basename(filePath, '.json');

	return {
		element,
		category,
		difficulty,
		slug: filename
	};
}

/**
 * Import all challenges from JSON files
 */
async function importChallenges() {
	if (!fs.existsSync(CHALLENGES_DIR)) {
		console.error('❌ Challenges directory not found!');
		console.error(`Expected: ${CHALLENGES_DIR}`);
		process.exit(1);
	}

	const files = await glob(`${CHALLENGES_DIR}/**/*.json`);

	console.log(`\nFound ${files.length} challenge files`);

	const challenges = [];
	let parseErrors = 0;

	for (const filePath of files) {
		try {
			const content = fs.readFileSync(filePath, 'utf-8');
			const challenge: ChallengeJSON = JSON.parse(content);

			// Parse metadata from path
			const metadata = parseMetadataFromPath(filePath);

			challenges.push({
				slug: metadata.slug,
				element: metadata.element,
				category: metadata.category,
				difficulty: metadata.difficulty,
				timer: challenge.timer,
				challenge_type: challenge.type,
				question: challenge.question,
				view_config: challenge.view || {},
				variables: challenge.var || {},
				answer: challenge.answer,
				hint: challenge.hint || null,
				show_answer: challenge.showAnswer || null,
				is_active: true
			});

			process.stdout.write('.');
		} catch (error) {
			console.error(`\n✗ Failed to parse ${filePath}:`, error);
			parseErrors++;
		}
	}

	console.log(`\n\nParsed ${challenges.length} challenges (${parseErrors} errors)`);

	// Group by element
	const byElement = challenges.reduce(
		(acc, c) => {
			acc[c.element] = (acc[c.element] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	console.log('\nChallenges by element:');
	for (const [element, count] of Object.entries(byElement)) {
		console.log(`  ${element}: ${count}`);
	}

	// Insert into database (batch insert)
	console.log('\nInserting into database...');

	const BATCH_SIZE = 100;
	let inserted = 0;

	for (let i = 0; i < challenges.length; i += BATCH_SIZE) {
		const batch = challenges.slice(i, i + BATCH_SIZE);

		const { error } = await supabase.from('game_challenges').insert(batch);

		if (error) {
			console.error(`\n✗ Failed to insert batch starting at ${i}:`, error);
		} else {
			inserted += batch.length;
			process.stdout.write('+');
		}
	}

	console.log(`\n\n✓ Successfully imported ${inserted} challenges`);

	return { total: challenges.length, inserted, errors: parseErrors };
}

/**
 * Main import function
 */
async function main() {
	console.log('='.repeat(60));
	console.log('Navadra Challenge Import');
	console.log('='.repeat(60));

	// Verify environment variables
	if (!process.env.PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
		console.error('❌ Missing environment variables!');
		console.error('Required: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
		process.exit(1);
	}

	console.log(`\nSource: ${CHALLENGES_DIR}\n`);

	try {
		const result = await importChallenges();

		console.log('\n' + '='.repeat(60));
		console.log('✅ Challenge import complete!');
		console.log(`   Total: ${result.total}`);
		console.log(`   Imported: ${result.inserted}`);
		console.log(`   Errors: ${result.errors}`);
		console.log('='.repeat(60));
	} catch (error) {
		console.error('\n❌ Import failed:', error);
		process.exit(1);
	}
}

// Run import
main().catch(console.error);
