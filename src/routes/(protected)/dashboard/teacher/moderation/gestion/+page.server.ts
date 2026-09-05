import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getTeacherClassesWithStudents } from '$lib/server/students';

/**
 * Load moderation data for teachers
 *
 * Loads:
 * - Active restrictions created by this teacher
 * - Moderation logs for this teacher's actions
 * - Message reports for moderation
 * - Students from teacher's classes (for new restriction dialog)
 *
 * Only accessible by teachers and admins
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Check authentication
	if (!user || !profile) {
		throw error(401, 'Not authenticated');
	}

	// Check teacher role
	if (!['teacher', 'admin'].includes(profile.role)) {
		throw error(403, 'Access denied');
	}

	// Fetch all data in parallel
	const [restrictionsResult, logsResult, reportsResult, pendingCountResult, classesWithStudents] =
		await Promise.all([
			// Active restrictions for this teacher's students
			supabase
				.from('user_restrictions')
				.select(
					`
				*,
				user:profiles!user_restrictions_user_id_fkey(id, firstname, lastname),
				restricted_by_profile:profiles!user_restrictions_restricted_by_fkey(firstname, lastname),
				conversation:conversations(name)
			`
				)
				.eq('restricted_by', user.id)
				.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
				.order('created_at', { ascending: false }),

			// Moderation logs for this teacher
			supabase
				.from('moderation_logs')
				.select(
					`
				*,
				moderator:profiles!moderation_logs_moderator_id_fkey(firstname, lastname)
			`
				)
				.eq('moderator_id', user.id)
				.order('created_at', { ascending: false })
				.limit(100),

			// Message reports via RPC
			supabase.rpc('get_reports_for_moderation', {
				// Paramètre `DEFAULT NULL` : l'omettre demande bien tous les signalements.
				p_status: undefined,
				p_limit: 100,
				p_offset: 0
			}),

			// Pending reports count via RPC
			supabase.rpc('get_pending_reports_count'),

			// Students from teacher's classes (for new restriction dialog)
			getTeacherClassesWithStudents(user.id, supabase)
		]);

	if (restrictionsResult.error) {
		console.error('Failed to fetch restrictions:', restrictionsResult.error);
		throw error(500, 'Failed to load restrictions');
	}

	if (logsResult.error) {
		console.error('Failed to fetch logs:', logsResult.error);
		throw error(500, 'Failed to load logs');
	}

	if (reportsResult.error) {
		console.error('Failed to fetch reports:', reportsResult.error);
		// Don't throw, just log - reports feature might not be set up
	}

	if (pendingCountResult.error) {
		console.error('Failed to fetch pending count:', pendingCountResult.error);
		// Don't throw, just log
	}

	// Flatten and deduplicate students from all classes
	const studentsMap = new Map<
		string,
		{ id: string; firstname: string; lastname: string | null; avatar_url: string | null }
	>();
	for (const cls of classesWithStudents) {
		for (const student of cls.students) {
			if (!studentsMap.has(student.id)) {
				studentsMap.set(student.id, {
					id: student.id,
					firstname: student.firstname,
					lastname: student.lastname,
					avatar_url: student.avatar_url
				});
			}
		}
	}
	const students = Array.from(studentsMap.values()).sort((a, b) => {
		const nameA = `${a.lastname || ''} ${a.firstname}`.toLowerCase();
		const nameB = `${b.lastname || ''} ${b.firstname}`.toLowerCase();
		return nameA.localeCompare(nameB, 'fr');
	});

	// Trois colonnes texte face à des unions fermées, et un jsonb face à un
	// enregistrement : rétrécies ici plutôt que dans chaque tableau d'affichage.
	// Un motif ou un type inconnu retombe sur la valeur la moins engageante —
	// « other » et « mute » — afin qu'une ligne écrite par une révision
	// antérieure reste lisible sans suggérer une sanction plus lourde.
	return {
		restrictions: (restrictionsResult.data ?? []).map((r) => ({
			...r,
			restriction_type:
				(['timeout', 'mute', 'ban'] as const).find((t) => t === r.restriction_type) ?? 'mute',
			// Une portée inconnue devient `conversation`, la plus restreinte : jamais
			// `global`, qui étendrait la sanction à toute la plateforme.
			scope_type:
				(['global', 'conversation'] as const).find((t) => t === r.scope_type) ?? 'conversation'
		})),
		logs: (logsResult.data ?? []).map((l) => ({
			...l,
			// L'embed du modérateur peut être absent (compte supprimé) et ses noms
			// sont nullables : le tableau attend `undefined` plutôt que `null`.
			moderator: l.moderator
				? {
						firstname: l.moderator.firstname ?? '',
						lastname: l.moderator.lastname ?? ''
					}
				: undefined,
			metadata:
				typeof l.metadata === 'object' && l.metadata !== null && !Array.isArray(l.metadata)
					? (l.metadata as Record<string, unknown>)
					: {}
		})),
		reports: (reportsResult.data ?? []).map((r) => ({
			...r,
			reason:
				(['spam', 'harassment', 'inappropriate', 'other'] as const).find((m) => m === r.reason) ??
				'other'
		})),
		pendingReportsCount: pendingCountResult.data ?? 0,
		students
	};
};
