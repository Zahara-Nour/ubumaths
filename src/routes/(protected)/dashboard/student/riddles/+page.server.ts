import type { PageServerLoad } from './$types';
import type { DbRiddleAttempt, StudentRiddle } from '$lib/types/riddle';
import { RIDDLE_COLUMNS, toDbRiddle, toDbRiddleAttempt, toStudentRiddle } from '$lib/types/riddle';
import { error, redirect } from '@sveltejs/kit';
import { fetchRiddleSolutions } from '$lib/server/riddle-solutions';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/student/riddles/+page.server');

/** Ligne `riddles` telle que la lit cette page : sans réponse attendue ni correction. */
type RiddleRow = Parameters<typeof toDbRiddle>[0];

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
		logger.error('Error fetching riddle of the day:', riddleError);
	}

	let studentAttempt: DbRiddleAttempt | null = null;
	let riddleOfTheDayRow: RiddleRow | null = null;
	// Le RPC interroge CURRENT_DATE : la date affichée est donc celle du jour.
	let riddleOfTheDayDate: string | null = null;

	if (riddleOfTheDayId) {
		const { data: riddle, error: riddleError } = await supabase
			.from('riddles')
			.select(RIDDLE_COLUMNS)
			.eq('id', riddleOfTheDayId)
			.maybeSingle();

		// Élément de contexte : le repli d'affichage existe déjà, mais son absence ne
		// doit pas se confondre avec une donnée réellement vide.
		if (riddleError && riddleError.code !== 'PGRST116') {
			logger.error('Contexte illisible :', riddleError);
		}

		if (riddle) {
			riddleOfTheDayRow = riddle;
			riddleOfTheDayDate = new Date().toISOString().slice(0, 10);

			// Fetch student's latest attempt for this riddle
			const { data: attempts, error: attemptsError } = await supabase
				.from('riddle_attempts')
				.select('*')
				.eq('riddle_id', riddleOfTheDayId)
				.eq('student_id', user.id)
				.order('attempt_number', { ascending: false })
				.limit(1);

			if (attemptsError) {
				logger.error('Lecture impossible :', attemptsError);
				throw error(500, 'Impossible de charger les données');
			}

			if (attempts && attempts.length > 0) {
				studentAttempt = toDbRiddleAttempt(attempts[0]);
			}
		}
	}

	// Get assigned riddles for this student (optional for now)
	const classIds = profile?.class_ids || [];
	const { data: assignments, error: assignmentsError } = await supabase
		.from('riddle_assignments')
		.select(
			`
			*,
			riddle:riddles(${RIDDLE_COLUMNS})
		` as const
		)
		.or(`student_id.eq.${user.id},class_id.in.(${classIds.join(',')})`)
		.eq('riddles.status', 'published')
		.order('assigned_at', { ascending: false });

	if (assignmentsError) {
		logger.error('Lecture impossible :', assignmentsError);
		throw error(500, 'Impossible de charger les données');
	}

	// Le type de saisie et les choix d'un QCM sont rangés avec la réponse attendue, dans
	// `riddle_solutions`, que l'élève ne lit pas. Le client service la lit, mais SEULEMENT
	// pour les énigmes que les requêtes de l'élève ci-dessus ont rendues sous sa RLS ; et
	// `toStudentRiddle` n'en garde ni la valeur attendue ni la correction.
	const visibleRows = [
		...(riddleOfTheDayRow ? [riddleOfTheDayRow] : []),
		...(assignments || []).flatMap((a) => (a.riddle ? [a.riddle] : []))
	];
	const { solutions, error: solutionsError } = await fetchRiddleSolutions(
		createServiceRoleClient(),
		visibleRows.map((r) => r.id)
	);

	if (solutionsError) {
		logger.error('Lecture impossible :', solutionsError);
		throw error(500, 'Impossible de charger les données');
	}

	const toStudent = (row: RiddleRow): StudentRiddle =>
		toStudentRiddle(toDbRiddle(row, solutions.get(row.id) ?? null));

	return {
		riddleOfTheDay: riddleOfTheDayRow ? toStudent(riddleOfTheDayRow) : null,
		riddleOfTheDayDate,
		studentAttempt,
		// `difficulty` et `status` sont des colonnes permissives, `answer` du jsonb :
		// converties ici plutôt qu'affirmées dans la carte d'affichage. Réponse attendue
		// et correction ne partent pas au navigateur.
		assignments: (assignments || []).map((a) => ({
			...a,
			riddle: a.riddle ? toStudent(a.riddle) : null
		}))
	};
};
