// Seed test data for E2E tests
// Author: Claude Code
// Date: 2025-10-17
//
// This script seeds test data into local Supabase for E2E testing
// Run before e2e tests: npx tsx tests/seed-test-data.ts

import { createClient } from '@supabase/supabase-js';
import {
	TEST_MONSTERS,
	TEST_CHALLENGES,
	TEST_SPELLS,
	createTestPlayer
} from './fixtures/game-fixtures';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-local-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test user IDs (must match existing users in dev environment)
const TEST_USERS = {
	student: process.env.TEST_STUDENT_ID || 'test-student-id',
	teacher: process.env.TEST_TEACHER_ID || 'test-teacher-id'
};

async function seedMonsters() {
	console.log('Seeding test monsters...');

	const monsters = Object.values(TEST_MONSTERS);

	const { data, error } = await supabase.from('game_monsters').upsert(monsters, {
		onConflict: 'id',
		ignoreDuplicates: false
	});

	if (error) {
		console.error('Failed to seed monsters:', error);
		throw error;
	}

	console.log(`✓ Seeded ${monsters.length} test monsters`);
}

async function seedChallenges() {
	console.log('Seeding test challenges...');

	const challenges = Object.values(TEST_CHALLENGES);

	const { data, error } = await supabase.from('game_challenges').upsert(challenges, {
		onConflict: 'id',
		ignoreDuplicates: false
	});

	if (error) {
		console.error('Failed to seed challenges:', error);
		throw error;
	}

	console.log(`✓ Seeded ${challenges.length} test challenges`);
}

async function seedPlayerProfiles() {
	console.log('Seeding test player profiles...');

	const players = [
		createTestPlayer({
			id: 'test-player-1',
			user_id: TEST_USERS.student,
			level: 5,
			xp: 1000,
			prestige: 500,
			pyrs_fire: 100,
			pyrs_water: 100,
			pyrs_earth: 100,
			pyrs_wind: 100
		})
	];

	const { data, error } = await supabase.from('game_players').upsert(players, {
		onConflict: 'user_id',
		ignoreDuplicates: false
	});

	if (error) {
		console.error('Failed to seed player profiles:', error);
		throw error;
	}

	console.log(`✓ Seeded ${players.length} test player profiles`);
}

async function seedSpells() {
	console.log('Seeding test spells...');

	const spells = Object.values(TEST_SPELLS).map((spell) => ({
		...spell,
		user_id: TEST_USERS.student
	}));

	const { data, error } = await supabase.from('game_spells').upsert(spells, {
		onConflict: 'id',
		ignoreDuplicates: false
	});

	if (error) {
		console.error('Failed to seed spells:', error);
		throw error;
	}

	console.log(`✓ Seeded ${spells.length} test spells`);
}

async function seedSpellDecks() {
	console.log('Seeding test spell decks...');

	const deck = {
		id: 'test-deck-1',
		user_id: TEST_USERS.student,
		deck_name: 'Test Deck',
		spell_ids: Object.values(TEST_SPELLS)
			.slice(0, 10)
			.map((s) => s.id),
		is_active: true
	};

	const { data, error } = await supabase.from('game_spell_decks').upsert([deck], {
		onConflict: 'id',
		ignoreDuplicates: false
	});

	if (error) {
		console.error('Failed to seed spell decks:', error);
		throw error;
	}

	console.log('✓ Seeded 1 test spell deck');
}

async function cleanupOldCombats() {
	console.log('Cleaning up old test combats...');

	const { error } = await supabase
		.from('game_combats')
		.delete()
		.eq('organizer_id', TEST_USERS.student);

	if (error) {
		console.error('Failed to cleanup combats:', error);
		// Non-fatal, continue
	}

	console.log('✓ Cleaned up old combats');
}

async function main() {
	console.log('Starting test data seeding...\n');
	console.log(`Supabase URL: ${SUPABASE_URL}`);
	console.log(`Student ID: ${TEST_USERS.student}`);
	console.log(`Teacher ID: ${TEST_USERS.teacher}\n`);

	try {
		await cleanupOldCombats();
		await seedMonsters();
		await seedChallenges();
		await seedPlayerProfiles();
		await seedSpells();
		await seedSpellDecks();

		console.log('\n✓ Test data seeding complete!');
		console.log('\nYou can now run e2e tests with:');
		console.log('  pnpm test:e2e');
	} catch (error) {
		console.error('\n✗ Test data seeding failed:', error);
		process.exit(1);
	}
}

main();
