/**
 * Supabase Connection Test Utility
 *
 * This file can be imported anywhere to test Supabase connectivity
 */

import { supabase } from '$lib/supabaseClient';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('supabase-test.ts');

export async function testSupabaseConnection() {
	logger.info('=== Supabase Connection Test ===');

	try {
		// Test 1: Basic connection
		logger.info('[Test 1] Testing basic connection...');
		const { error: healthError } = await supabase.from('profiles').select('count').limit(1);

		if (healthError) {
			logger.error('[Test 1] ❌ Connection failed:', healthError.message);
		} else {
			logger.info('[Test 1] ✅ Connection successful');
		}

		// Test 2: Auth state
		logger.info('[Test 2] Checking auth state...');
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (session) {
			logger.info('[Test 2] ✅ User logged in:', session.user.email);
		} else {
			logger.info('[Test 2] ℹ️ No active session');
		}

		// Test 3: Database access
		logger.info('[Test 3] Testing database read access...');
		const { data: topics, error: topicsError } = await supabase.from('topics').select('*').limit(5);

		if (topicsError) {
			logger.error('[Test 3] ❌ Database read failed:', topicsError.message);
		} else {
			logger.info('[Test 3] ✅ Database read successful, topics found:', topics?.length ?? 0);
		}

		logger.info('=== Test Complete ===');

		return {
			connectionOk: !healthError,
			authOk: !!session,
			databaseOk: !topicsError
		};
	} catch (err) {
		logger.error('=== Test Failed ===', err);
		return {
			connectionOk: false,
			authOk: false,
			databaseOk: false
		};
	}
}
