import type { PageServerLoad } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import { error } from '@sveltejs/kit';
import { getTeacherClassesWithStudents } from '#lib/server/students.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('(protected)/dashboard/teacher/moderation/gestion/+page.server');

/** Nombre de messages marqués affichés, les plus récents d'abord. */
const FLAGGED_MESSAGES_LIMIT = 100;

// ============================================================================
// TYPES
// ============================================================================

/** Qui a supprimé le message marqué, quand il l'est. */
type FlaggedDeletion = 'moderation' | 'author' | null;

interface FlaggedMessageRow {
	id: string;
	conversationId: string | null;
	text: string;
	reason: string | null;
	createdAt: string | null;
	senderName: string | null;
	conversationName: string | null;
	isGroup: boolean | null;
	deletedBy: FlaggedDeletion;
}

// ============================================================================
// FUNCTIONS
// ============================================================================

function fullName(firstname: string | null, lastname: string | null): string | null {
	return `${firstname ?? ''} ${lastname ?? ''}`.trim() || null;
}

/**
 * Messages marqués automatiquement, les plus récents d'abord (écart T21).
 *
 * - Prof : fonction `get_flagged_messages_for_teacher` (décision de David,
 *   2026-11-25). Elle rend aussi les messages marqués des conversations à deux
 *   entre élèves (ce message et son auteur, rien d'autre de la conversation) et
 *   les messages marqués supprimés, que la RLS de `messages` ne lui rend pas.
 * - Admin : ses accès ne changent pas. Lecture avec son client, bornée par la RLS
 *   de `messages` (conversations qu'il peut ouvrir, messages non supprimés).
 *   Jointures non `!inner` : un auteur ou une conversation masqués laissent la
 *   ligne, sans nom.
 */
async function loadFlaggedMessages(
	supabase: SupabaseClient<Database>,
	role: string
): Promise<{ messages: FlaggedMessageRow[]; failed: boolean }> {
	if (role === 'teacher') {
		const { data, error: rpcError } = await supabase.rpc('get_flagged_messages_for_teacher', {
			p_limit: FLAGGED_MESSAGES_LIMIT
		});
		if (rpcError) {
			logger.error('Failed to fetch flagged messages:', rpcError);
			return { messages: [], failed: true };
		}
		// Les types générés annoncent des colonnes non nulles ; la fonction en rend
		// de nulles (auteur supprimé, conversation sans nom, message non supprimé).
		const rows: {
			id: string;
			conversation_id: string | null;
			plain_text: string | null;
			flag_reason: string | null;
			created_at: string | null;
			deleted_at: string | null;
			deleted_by_moderation: boolean | null;
			sender_firstname: string | null;
			sender_lastname: string | null;
			conversation_name: string | null;
			is_group: boolean | null;
		}[] = data ?? [];
		return {
			failed: false,
			messages: rows.map((m) => ({
				id: m.id,
				conversationId: m.conversation_id,
				text: m.plain_text ?? '',
				reason: m.flag_reason,
				createdAt: m.created_at,
				senderName: fullName(m.sender_firstname, m.sender_lastname),
				conversationName: m.conversation_name,
				isGroup: m.is_group,
				deletedBy: m.deleted_at ? (m.deleted_by_moderation ? 'moderation' : 'author') : null
			}))
		};
	}

	const { data, error: readError } = await supabase
		.from('messages')
		.select(
			`
			id,
			conversation_id,
			plain_text,
			flag_reason,
			created_at,
			sender:profiles!messages_sender_id_fkey(firstname, lastname),
			conversation:conversations!messages_conversation_id_fkey(name, is_group)
		`
		)
		.eq('is_flagged', true)
		.order('created_at', { ascending: false })
		.limit(FLAGGED_MESSAGES_LIMIT);
	if (readError) {
		logger.error('Failed to fetch flagged messages:', readError);
		return { messages: [], failed: true };
	}
	return {
		failed: false,
		messages: (data ?? []).map((m) => ({
			id: m.id,
			conversationId: m.conversation_id,
			text: m.plain_text ?? '',
			reason: m.flag_reason,
			createdAt: m.created_at,
			senderName: m.sender ? fullName(m.sender.firstname, m.sender.lastname) : null,
			conversationName: m.conversation?.name ?? null,
			isGroup: m.conversation?.is_group ?? null,
			deletedBy: null
		}))
	};
}

/**
 * Load moderation data for teachers
 *
 * Loads:
 * - Active restrictions created by this teacher
 * - Moderation logs for this teacher's actions
 * - Message reports for moderation
 * - Messages flagged automatically (teacher: RPC `get_flagged_messages_for_teacher`,
 *   deleted ones and student 1-on-1 chats included; admin: RLS read, unchanged)
 * - Students from teacher's classes (for new restriction dialog)
 *
 * Only accessible by teachers and admins
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Check authentication
	if (!user || !profile) {
		throw error(401, 'Connexion requise');
	}

	// Check teacher role
	if (!['teacher', 'admin'].includes(profile.role)) {
		throw error(403, 'Accès refusé');
	}

	// Fetch all data in parallel
	const [
		restrictionsResult,
		logsResult,
		reportsResult,
		pendingCountResult,
		flaggedResult,
		classesWithStudents
	] = await Promise.all([
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

		// ⚠️ Écart T21 : messages marqués automatiquement (`is_flagged`).
		loadFlaggedMessages(supabase, profile.role),

		// Students from teacher's classes (for new restriction dialog)
		getTeacherClassesWithStudents(user.id, supabase)
	]);

	if (restrictionsResult.error) {
		logger.error('Failed to fetch restrictions:', restrictionsResult.error);
		throw error(500, 'Failed to load restrictions');
	}

	if (logsResult.error) {
		logger.error('Failed to fetch logs:', logsResult.error);
		throw error(500, 'Failed to load logs');
	}

	// ⚠️ Écart T20 : un échec de lecture des signalements ne doit pas ressembler à
	// « aucun signalement ». Le reste de la page (restrictions, historique) reste
	// utilisable : on ne lève pas, on le dit à la page, qui affiche une alerte.
	if (reportsResult.error) {
		logger.error('Failed to fetch reports:', reportsResult.error);
	}

	// Compteur illisible : `null` (inconnu), jamais 0.
	if (pendingCountResult.error) {
		logger.error('Failed to fetch pending count:', pendingCountResult.error);
	}

	// Même règle que les signalements (T20) : un échec de lecture se dit, il ne
	// ressemble pas à « aucun message marqué ».

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
				(['global', 'conversation'] as const).find((t) => t === r.scope_type) ?? 'conversation',
			// Les jointures facultatives valent `null` côté PostgREST et `undefined`
			// côté composant : un compte supprimé ou une conversation effacée doit
			// rester une ligne lisible, pas une ligne manquante.
			user: r.user ?? undefined,
			conversation: r.conversation ?? undefined
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
		reportsLoadFailed: reportsResult.error !== null,
		pendingReportsCount: pendingCountResult.error ? null : (pendingCountResult.data ?? 0),
		flaggedMessages: flaggedResult.messages,
		flaggedMessagesLoadFailed: flaggedResult.failed,
		flaggedMessagesLimit: FLAGGED_MESSAGES_LIMIT,
		// Vrai pour le prof : conversations à deux entre élèves et messages supprimés compris.
		flaggedMessagesExtended: profile.role === 'teacher',
		students
	};
};
