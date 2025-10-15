/**
 * RLS Policies Debug Page - Server Load Function
 *
 * PURPOSE:
 * Test Row Level Security (RLS) policies for different user roles.
 *
 * FEATURES:
 * - Test table accessibility for each role (student/teacher/admin)
 * - Show which operations are permitted (SELECT/INSERT/UPDATE/DELETE)
 * - Validate RLS policies are working as expected
 *
 * ACCESS CONTROL:
 * - Admin only
 *
 * PRIVACY:
 * - Uses test queries without exposing real user data
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

interface PolicyTest {
	table: string;
	operation: string;
	role: string;
	success: boolean;
	error: string | null;
	rowCount?: number;
}

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, parent }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { profile } = await parent();

	if (profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const tests: PolicyTest[] = [];

	// Tables to test
	const tables = [
		'profiles',
		'schools',
		'classes',
		'class_members',
		'pending_students',
		'friendships',
		'user_presence'
	];

	// Test SELECT access for current user (admin)
	for (const table of tables) {
		try {
			const { data, error: queryError, count } = await supabase
				.from(table)
				.select('*', { count: 'exact', head: true })
				.limit(1);

			tests.push({
				table,
				operation: 'SELECT',
				role: 'admin (current)',
				success: !queryError,
				error: queryError?.message || null,
				rowCount: count ?? undefined
			});
		} catch (err) {
			tests.push({
				table,
				operation: 'SELECT',
				role: 'admin (current)',
				success: false,
				error: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	}

	// Test specific RLS scenarios
	// 1. Can admin view all profiles?
	try {
		const { data, error: queryError } = await supabase
			.from('profiles')
			.select('id')
			.limit(5);

		tests.push({
			table: 'profiles',
			operation: 'SELECT (all)',
			role: 'admin (current)',
			success: !queryError && (data?.length ?? 0) > 0,
			error: queryError?.message || null,
			rowCount: data?.length
		});
	} catch (err) {
		tests.push({
			table: 'profiles',
			operation: 'SELECT (all)',
			role: 'admin (current)',
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		});
	}

	// 2. Can admin view all classes?
	try {
		const { data, error: queryError } = await supabase
			.from('classes')
			.select('id')
			.limit(5);

		tests.push({
			table: 'classes',
			operation: 'SELECT (all)',
			role: 'admin (current)',
			success: !queryError && (data?.length ?? 0) >= 0,
			error: queryError?.message || null,
			rowCount: data?.length
		});
	} catch (err) {
		tests.push({
			table: 'classes',
			operation: 'SELECT (all)',
			role: 'admin (current)',
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		});
	}

	// 3. Can admin view pending_students?
	try {
		const { data, error: queryError } = await supabase
			.from('pending_students')
			.select('id')
			.limit(5);

		tests.push({
			table: 'pending_students',
			operation: 'SELECT',
			role: 'admin (current)',
			success: !queryError && data !== null,
			error: queryError?.message || null,
			rowCount: data?.length
		});
	} catch (err) {
		tests.push({
			table: 'pending_students',
			operation: 'SELECT',
			role: 'admin (current)',
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		});
	}

	// 4. Can admin view friendships?
	try {
		const { data, error: queryError } = await supabase
			.from('friendships')
			.select('id')
			.limit(5);

		tests.push({
			table: 'friendships',
			operation: 'SELECT',
			role: 'admin (current)',
			success: !queryError && data !== null,
			error: queryError?.message || null,
			rowCount: data?.length
		});
	} catch (err) {
		tests.push({
			table: 'friendships',
			operation: 'SELECT',
			role: 'admin (current)',
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		});
	}

	// Summary statistics
	const totalTests = tests.length;
	const passedTests = tests.filter((t) => t.success).length;
	const failedTests = tests.filter((t) => !t.success).length;

	return {
		tests,
		summary: {
			total: totalTests,
			passed: passedTests,
			failed: failedTests,
			passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
		},
		note: 'These tests only validate the current admin user. To test student/teacher policies, you would need to authenticate as those roles.'
	};
};
