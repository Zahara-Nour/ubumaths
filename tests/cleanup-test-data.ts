// Cleanup test data after E2E tests
// Author: Claude Code
// Date: 2025-10-17
//
// This script removes test data from local Supabase after E2E testing
// Run after e2e tests: npx tsx tests/cleanup-test-data.ts

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-local-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test user IDs (must match seed script)
const TEST_USERS = {
	student: process.env.TEST_STUDENT_ID || 'test-student-id',
	teacher: process.env.TEST_TEACHER_ID || 'test-teacher-id'
};

async function cleanupCombats() {
	console.log('Cleaning up test combats...');

	const { error } = await supabase
		.from('game_combats')
		.delete()
		.eq('organizer_id', TEST_USERS.student);

	if (error) {
		console.error('Failed to cleanup combats:', error);
	} else {
		console.log('✓ Cleaned up test combats');
	}
}

async function cleanupChallengeAttempts() {
	console.log('Cleaning up test challenge attempts...');

	const { error } = await supabase
		.from('game_challenge_attempts')
		.delete()
		.eq('user_id', TEST_USERS.student);

	if (error) {
		console.error('Failed to cleanup challenge attempts:', error);
	} else {
		console.log('✓ Cleaned up test challenge attempts');
	}
}

async function resetPlayerProgress() {
	console.log('Resetting test player progress...');

	const { error } = await supabase
		.from('game_players')
		.update({
			level: 1,
			xp: 0,
			prestige: 0,
			total_combats: 0,
			combats_won: 0,
			combats_lost: 0
		})
		.eq('user_id', TEST_USERS.student);

	if (error) {
		console.error('Failed to reset player progress:', error);
	} else {
		console.log('✓ Reset test player progress');
	}
}

async function main() {
	console.log('Starting test data cleanup...\n');
	console.log(`Supabase URL: ${SUPABASE_URL}`);
	console.log(`Student ID: ${TEST_USERS.student}\n`);

	try {
		await cleanupCombats();
		await cleanupChallengeAttempts();
		await resetPlayerProgress();

		console.log('\n✓ Test data cleanup complete!');
		console.log('\nNote: Test monsters and challenges are preserved for reuse.');
	} catch (error) {
		console.error('\n✗ Test data cleanup failed:', error);
		process.exit(1);
	}
}

main();
