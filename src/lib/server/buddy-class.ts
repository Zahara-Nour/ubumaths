/**
 * Palotins d'une classe, vus par le professeur
 * =============================================
 *
 * Élèves actifs d'une classe, leur nom et leur Palotin (`student_buddies`), lus au client du
 * PROF (RLS : `class_members` et `profiles` de ses élèves, `student_buddies` de ses élèves).
 * Un élève sans Palotin a `student_buddies` nul.
 *
 * Utilisé par la page Gamification › Palotins. Prouvé contre PostgREST :
 * `tests/integration/palotins-vue-prof.test.ts`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';

type SB = SupabaseClient<Database>;

/** Palotin d'un élève, tel que la page du prof le lit. */
export interface ClassMemberBuddy {
	palotin_type: string;
	xp: number;
	level: number;
	current_streak: number;
	longest_streak: number;
	last_activity_date: string | null;
	constance_week_start: string | null;
	constance_days_this_week: number;
}

export interface ClassMemberWithBuddy {
	student_id: string;
	profiles: { full_name: string | null; firstname: string | null; lastname: string | null } | null;
	student_buddies: ClassMemberBuddy | null;
}

/**
 * Élèves actifs de la classe et leur Palotin.
 * @throws si la lecture échoue : une panne ne doit pas se lire « aucun Palotin ».
 */
export async function fetchClassMembersWithBuddies(
	supabase: SB,
	classId: string
): Promise<ClassMemberWithBuddy[]> {
	// Le Palotin se lit À TRAVERS le profil : `class_members` n'a pas de lien direct vers
	// `student_buddies`, et `student_buddies:student_id` depuis `class_members` désigne le lien vers
	// `profiles` (alias trompeur, `column profiles_1.palotin_type does not exist`).
	const { data, error } = await supabase
		.from('class_members')
		.select(
			`
			student_id,
			profiles:student_id (
				full_name,
				firstname,
				lastname,
				student_buddies (
					palotin_type,
					xp,
					level,
					current_streak,
					longest_streak,
					last_activity_date,
					constance_week_start,
					constance_days_this_week
				)
			)
		`
		)
		.eq('class_id', classId)
		.eq('status', 'active');
	if (error) throw new Error(`Palotins de la classe illisibles : ${error.message}`);
	return (data ?? []).map((m) => {
		const profil = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
		const palotin = profil
			? Array.isArray(profil.student_buddies)
				? profil.student_buddies[0]
				: profil.student_buddies
			: null;
		return {
			student_id: m.student_id,
			profiles: profil
				? { full_name: profil.full_name, firstname: profil.firstname, lastname: profil.lastname }
				: null,
			student_buddies: palotin ?? null
		};
	});
}
