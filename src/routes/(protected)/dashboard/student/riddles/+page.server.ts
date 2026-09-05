import type { PageServerLoad } from './$types';
import type { DbRiddle, DbRiddleAttempt } from '$lib/types/riddle';
import { redirect } from '@sveltejs/kit';

/**
 * Load riddle of the day for student
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	if (!user) {
		throw redirect(303, '/auth/login');
	}

	// `get_riddle_of_the_day` renvoie un UUID scalaire, pas une ligne : c'est un
	// simple `SELECT riddle_id FROM riddle_of_the_day WHERE date = p_date`, en
	// SECURITY DEFINER — d'où son intérêt, il traverse la RLS de cette table.
	//
	// Le code le traitait comme un tableau de lignes (`.length`, `[0]`,
	// `.assignment_date`) : sur une chaîne de 36 caractères, `.length > 0` était
	// toujours vrai, `[0]` valait la première lettre de l'UUID et la date était
	// `undefined`. La carte ne s'affichait donc jamais (le gabarit exige
	// `riddleOfTheDayDate`), et la requête des tentatives filtrait sur
	// `riddle_id = undefined`.
	const { data: riddleOfTheDayId, error: riddleError } =
		await supabase.rpc('get_riddle_of_the_day');

	if (riddleError) {
		console.error('Error fetching riddle of the day:', riddleError);
	}

	let studentAttempt: DbRiddleAttempt | null = null;
	let riddleOfTheDay: DbRiddle | null = null;
	// Le RPC interroge CURRENT_DATE : la date affichée est donc celle du jour.
	let riddleOfTheDayDate: string | null = null;

	if (riddleOfTheDayId) {
		const { data: riddle } = await supabase
			.from('riddles')
			.select('*')
			.eq('id', riddleOfTheDayId)
			.maybeSingle();

		if (riddle) {
			riddleOfTheDay = riddle;
			riddleOfTheDayDate = new Date().toISOString().slice(0, 10);

			// Fetch student's latest attempt for this riddle
			const { data: attempts } = await supabase
				.from('riddle_attempts')
				.select('*')
				.eq('riddle_id', riddleOfTheDayId)
				.eq('student_id', user.id)
				.order('attempt_number', { ascending: false })
				.limit(1);

			if (attempts && attempts.length > 0) {
				studentAttempt = attempts[0];
			}
		}
	}

	// Get assigned riddles for this student (optional for now)
	const classIds = profile?.class_ids || [];
	const { data: assignments } = await supabase
		.from('riddle_assignments')
		.select(
			`
			*,
			riddle:riddles(*)
		`
		)
		.or(`student_id.eq.${user.id},class_id.in.(${classIds.join(',')})`)
		.eq('riddles.status', 'published')
		.order('assigned_at', { ascending: false });

	return {
		riddleOfTheDay,
		riddleOfTheDayDate,
		studentAttempt,
		assignments: (assignments || []).map((a) => ({
			...a,
			riddle: a.riddle
		}))
	};
};
