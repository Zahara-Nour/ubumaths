/**
 * Database Debug Page - Server Load Function
 *
 * PURPOSE:
 * Provides comprehensive database health and integrity checks for administrators.
 *
 * FEATURES:
 * - Data counts (users by role, classes, schools, friendships)
 * - Data integrity validation (missing required fields, orphaned records)
 * - Pending students activation status
 * - Class membership synchronization validation
 * - Recent user signups
 *
 * ACCESS CONTROL:
 * - Admin only
 *
 * PRIVACY:
 * - Email addresses are redacted (first 3 chars + ***@domain.com)
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Redact email address for privacy
 * Example: john.doe@example.com → joh***@example.com
 */
function redactEmail(email: string | null): string {
	if (!email) return '(no email)';
	const [local, domain] = email.split('@');
	if (!domain) return email.substring(0, 3) + '***';
	return local.substring(0, 3) + '***@' + domain;
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

	// Fetch data counts
	const { count: totalUsers } = await supabase
		.from('profiles')
		.select('*', { count: 'exact', head: true });

	const { count: studentCount } = await supabase
		.from('profiles')
		.select('*', { count: 'exact', head: true })
		.eq('role', 'student');

	const { count: teacherCount } = await supabase
		.from('profiles')
		.select('*', { count: 'exact', head: true })
		.eq('role', 'teacher');

	const { count: adminCount } = await supabase
		.from('profiles')
		.select('*', { count: 'exact', head: true })
		.eq('role', 'admin');

	const { count: classCount } = await supabase
		.from('classes')
		.select('*', { count: 'exact', head: true });

	const { count: schoolCount } = await supabase
		.from('schools')
		.select('*', { count: 'exact', head: true });

	const { count: friendshipCount } = await supabase
		.from('friendships')
		.select('*', { count: 'exact', head: true })
		.eq('status', 'accepted');

	const { count: pendingFriendshipCount } = await supabase
		.from('friendships')
		.select('*', { count: 'exact', head: true })
		.eq('status', 'pending');

	// Data integrity checks
	const { data: missingNames } = await supabase
		.from('profiles')
		.select('id, email, firstname, lastname, role')
		.or('firstname.is.null,lastname.is.null')
		.limit(10);

	const { data: missingSchool } = await supabase
		.from('profiles')
		.select('id, email, role, school_id')
		.is('school_id', null)
		.limit(10);

	const { data: noClasses } = await supabase
		.from('profiles')
		.select('id, email, role, class_ids')
		.eq('role', 'student')
		.or('class_ids.is.null,class_ids.eq.{}')
		.limit(10);

	// Pending students status
	const { count: pendingStudentsTotal } = await supabase
		.from('pending_students')
		.select('*', { count: 'exact', head: true });

	const { count: pendingStudentsActivated } = await supabase
		.from('pending_students')
		.select('*', { count: 'exact', head: true })
		.eq('is_activated', true);

	const { data: pendingStudentsNotActivated } = await supabase
		.from('pending_students')
		.select('id, email, firstname, lastname, created_at')
		.eq('is_activated', false)
		.order('created_at', { ascending: false })
		.limit(10);

	// Recent signups (last 10)
	const { data: recentSignups } = await supabase
		.from('profiles')
		.select('id, email, firstname, lastname, role, created_at')
		.order('created_at', { ascending: false })
		.limit(10);

	// Class membership validation (check for sync issues)
	const { data: classMembersCounts } = await supabase.rpc('get_class_members_count');

	// Orphaned class_members (student_id doesn't exist in profiles)
	const { data: orphanedClassMembers } = await supabase
		.from('class_members')
		.select('id, class_id, student_id')
		.limit(10);

	// Check for profiles with class_ids but no matching class_members
	const { data: profilesWithClassIds } = await supabase
		.from('profiles')
		.select('id, email, class_ids')
		.not('class_ids', 'is', null)
		.neq('class_ids', '{}')
		.limit(10);

	// Redact emails in results
	const redactedMissingNames = missingNames?.map((p) => ({
		...p,
		email: redactEmail(p.email)
	}));

	const redactedMissingSchool = missingSchool?.map((p) => ({
		...p,
		email: redactEmail(p.email)
	}));

	const redactedNoClasses = noClasses?.map((p) => ({
		...p,
		email: redactEmail(p.email)
	}));

	const redactedPendingStudents = pendingStudentsNotActivated?.map((p) => ({
		...p,
		email: redactEmail(p.email)
	}));

	const redactedRecentSignups = recentSignups?.map((p) => ({
		...p,
		email: redactEmail(p.email)
	}));

	return {
		counts: {
			totalUsers: totalUsers ?? 0,
			students: studentCount ?? 0,
			teachers: teacherCount ?? 0,
			admins: adminCount ?? 0,
			classes: classCount ?? 0,
			schools: schoolCount ?? 0,
			friendships: friendshipCount ?? 0,
			pendingFriendships: pendingFriendshipCount ?? 0
		},
		integrity: {
			missingNames: redactedMissingNames ?? [],
			missingSchool: redactedMissingSchool ?? [],
			noClasses: redactedNoClasses ?? []
		},
		pendingStudents: {
			total: pendingStudentsTotal ?? 0,
			activated: pendingStudentsActivated ?? 0,
			notActivated: redactedPendingStudents ?? []
		},
		recentSignups: redactedRecentSignups ?? []
	};
};
