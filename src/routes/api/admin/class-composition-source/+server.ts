/**
 * GET /api/admin/class-composition-source?targetClassId=…
 * =======================================================
 *
 * Les candidats à la composition d'une classe : les élèves des classes des
 * AUTRES années scolaires de la même école, groupés par ancienne classe.
 *
 * La portée franchit les écoles, et c'est le cas d'usage principal : reprendre
 * d'anciens élèves d'un établissement quitté dans une école « Cours
 * particuliers ». Chaque élève porte donc `changes_school`, parce que
 * l'inscrire déplacera son profil — trois policies lisent `profiles.school_id`
 * (trimestres, années, marché), et l'y laisser le laisserait à moitié cassé.
 * L'écran doit le dire avant d'agir, jamais après.
 *
 * Un élève sans compte n'apparaît pas : l'import reste la voie des nouveaux.
 * Un élève déjà membre de la cible apparaît, marqué — le masquer laisserait
 * croire qu'on l'a oublié.
 *
 * AUTH : admin (connexion admin ou élévation).
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { classCompositionSourceSchema } from '$lib/server/validation/admin';
import { requireAdmin } from '$lib/server/middleware/auth';

interface CandidateStudent {
	id: string;
	firstname: string | null;
	lastname: string | null;
	email: string | null;
	/** Déjà membre de la classe de destination : à afficher, pas à proposer. */
	already_member: boolean;
	/** L'inscrire déplacera son profil vers l'école de la destination. */
	changes_school: boolean;
}

interface SourceClass {
	class_id: string;
	class_name: string;
	school_name: string | null;
	school_year_name: string;
	/** L'école de cette classe n'est pas celle de la destination. */
	other_school: boolean;
	students: CandidateStudent[];
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const { supabase } = await requireAdmin(locals);

	const validation = classCompositionSourceSchema.safeParse({
		targetClassId: url.searchParams.get('targetClassId')
	});
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { targetClassId } = validation.data;

	const { data: cible, error: cibleError } = await supabase
		.from('classes')
		.select('id, school_id, school_year_id')
		.eq('id', targetClassId)
		.single();

	if (cibleError && cibleError.code !== 'PGRST116') {
		console.error('Lecture de la classe de destination impossible :', cibleError);
		throw error(500, 'Impossible de lire la classe de destination');
	}

	if (!cible) {
		throw error(404, 'Classe de destination introuvable');
	}

	if (!cible.school_id) {
		throw error(409, 'Cette classe n’est rattachée à aucune école.');
	}

	// Les classes des AUTRES années, toutes écoles confondues. `school_year_id`
	// peut être nul sur une vieille classe : on l'exclut plutôt que de la ranger
	// sous une année arbitraire.
	let sourcesQuery = supabase
		.from('classes')
		.select(
			'id, name, school_id, school:schools(id, name), school_year:school_years!inner(id, name, start_date)'
		)
		.not('school_year_id', 'is', null)
		.neq('id', targetClassId);

	if (cible.school_year_id) {
		sourcesQuery = sourcesQuery.neq('school_year_id', cible.school_year_id);
	}

	const { data: sources, error: sourcesError } = await sourcesQuery;

	if (sourcesError) {
		console.error('Lecture des classes sources impossible :', sourcesError);
		throw error(500, 'Impossible de lire les classes des années précédentes');
	}

	if (!sources || sources.length === 0) {
		return json({ classes: [] satisfies SourceClass[] });
	}

	const sourceIds = sources.map((c) => c.id);

	// Toutes les adhésions de ces classes, quel que soit leur statut : après une
	// clôture d'année elles sont TOUTES archivées, et n'en montrer que d'actives
	// donnerait une liste vide au moment précis où l'écran doit servir.
	const { data: adhesions, error: adhesionsError } = await supabase
		.from('class_members')
		.select('class_id, student_id, profiles!inner(id, firstname, lastname, email, role, school_id)')
		.in('class_id', sourceIds);

	if (adhesionsError) {
		console.error('Lecture des adhésions sources impossible :', adhesionsError);
		throw error(500, 'Impossible de lire les élèves des années précédentes');
	}

	const { data: dejaMembres, error: dejaError } = await supabase
		.from('class_members')
		.select('student_id')
		.eq('class_id', targetClassId);

	if (dejaError) {
		console.error('Lecture des adhésions de destination impossible :', dejaError);
		throw error(500, 'Impossible de lire les élèves déjà inscrits');
	}

	const dejaIds = new Set((dejaMembres ?? []).map((m) => m.student_id));

	const parClasse = new Map<string, CandidateStudent[]>();
	for (const adhesion of adhesions ?? []) {
		// PostgREST type une jointure « vers un » en tableau quand il ne peut pas
		// prouver l'unicité ; à l'exécution c'est un objet. L'idiome du dépôt.
		const profil = Array.isArray(adhesion.profiles) ? adhesion.profiles[0] : adhesion.profiles;
		if (!profil || profil.role !== 'student') continue;

		const liste = parClasse.get(adhesion.class_id) ?? [];
		liste.push({
			id: profil.id,
			firstname: profil.firstname,
			lastname: profil.lastname,
			email: profil.email,
			already_member: dejaIds.has(profil.id),
			changes_school: profil.school_id !== cible.school_id
		});
		parClasse.set(adhesion.class_id, liste);
	}

	const classes: SourceClass[] = sources
		.map((c) => {
			const annee = Array.isArray(c.school_year) ? c.school_year[0] : c.school_year;
			const ecoleSource = Array.isArray(c.school) ? c.school[0] : c.school;
			return {
				class_id: c.id,
				class_name: c.name,
				school_name: ecoleSource?.name ?? null,
				other_school: c.school_id !== cible.school_id,
				school_year_name: annee?.name ?? '',
				students: (parClasse.get(c.id) ?? []).sort((a, b) =>
					`${a.lastname ?? ''} ${a.firstname ?? ''}`.localeCompare(
						`${b.lastname ?? ''} ${b.firstname ?? ''}`,
						'fr'
					)
				)
			};
		})
		.filter((c) => c.students.length > 0)
		.sort(
			(a, b) =>
				// L'école de la destination d'abord : c'est le cas ordinaire.
				Number(a.other_school) - Number(b.other_school) ||
				b.school_year_name.localeCompare(a.school_year_name) ||
				a.class_name.localeCompare(b.class_name, 'fr')
		);

	return json({ classes });
};
