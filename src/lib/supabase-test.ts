/**
 * Supabase Connection Test Utility
 *
 * This file can be imported anywhere to test Supabase connectivity
 */

import { supabase } from '$lib/supabaseClient';

export async function testSupabaseConnection() {
	console.log('=== Supabase Connection Test ===');

	try {
		// Test 1: Basic connection
		console.log('[Test 1] Testing basic connection...');
		const { data: healthData, error: healthError } = await supabase
			.from('profiles')
			.select('count')
			.limit(1);

		if (healthError) {
			console.error('[Test 1] ❌ Connection failed:', healthError.message);
		} else {
			console.log('[Test 1] ✅ Connection successful');
		}

		// Test 2: Auth state
		console.log('[Test 2] Checking auth state...');
		const { data: { session } } = await supabase.auth.getSession();

		if (session) {
			console.log('[Test 2] ✅ User logged in:', session.user.email);
		} else {
			console.log('[Test 2] ℹ️ No active session');
		}

		// Test 3: Database access
		console.log('[Test 3] Testing database read access...');
		const { data: topics, error: topicsError } = await supabase
			.from('topics')
			.select('*')
			.limit(5);

		if (topicsError) {
			console.error('[Test 3] ❌ Database read failed:', topicsError.message);
		} else {
			console.log('[Test 3] ✅ Database read successful, topics found:', topics?.length ?? 0);
		}

		console.log('=== Test Complete ===');

		return {
			connectionOk: !healthError,
			authOk: !!session,
			databaseOk: !topicsError
		};
	} catch (err) {
		console.error('=== Test Failed ===', err);
		return {
			connectionOk: false,
			authOk: false,
			databaseOk: false
		};
	}
}
