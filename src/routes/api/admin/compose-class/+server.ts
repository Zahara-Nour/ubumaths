/**
 * POST /api/admin/compose-class
 * =============================
 *
 * Le geste de masse de la bascule d'année : composer une classe en cochant des
 * élèves de l'année précédente.
 *
 * Ce n'est délibérément PAS une « promotion automatique ». Les groupes ne se
 * reconduisent jamais à l'identique — une 2nde se répartit entre deux 1SPE, une
 * Terminale part au bac, une 6ᵉ change de professeur. Automatiser produirait
 * des classes fausses à corriger ensuite. Le modèle est : on clôt, puis on
 * compose.
 *
 * L'ajout un par un existe déjà (`/api/admin/add-to-class`). Cette route
 * n'ajoute pas un mécanisme, elle ajoute le geste.
 *
 * AUTH : admin (connexion admin ou élévation).
 *
 * RÉPONSE : { added, ignored, refused } — `ignored` compte les élèves déjà
 * membres, qui ne sont pas dupliqués.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { composeClassSchema } from '$lib/server/validation/admin';
import { requireAdmin } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { supabase } = await requireAdmin(locals);

	const validation = composeClassSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { targetClassId, studentIds } = validation.data;

	// La destination d'abord : composer vers une classe close ou vers une année
	// terminée fabriquerait des adhésions que plus rien ne gouverne.
	const { data: cible, error: cibleError } = await supabase
		.from('classes')
		.select('id, name, is_active, school_id, school_year:school_years(id, name, end_date)')
		.eq('id', targetClassId)
		.single();

	// PGRST116 = la classe n'existe pas. Toute AUTRE panne prenait le même
	// visage et faisait conclure « introuvable » là où on n'avait pas su lire.
	if (cibleError && cibleError.code !== 'PGRST116') {
		console.error('Lecture de la classe de destination impossible :', cibleError);
		throw error(500, 'Impossible de vérifier la classe de destination');
	}

	if (!cible) {
		throw error(404, 'Classe de destination introuvable');
	}

	if (!cible.is_active) {
		throw error(409, 'Cette classe est archivée : on n’y compose plus.');
	}

	// PostgREST type une jointure « vers un » en tableau quand il ne peut pas
	// prouver l'unicité ; à l'exécution c'est un objet. L'idiome du dépôt.
	const annee = Array.isArray(cible.school_year) ? cible.school_year[0] : cible.school_year;
	if (!annee) {
		throw error(409, 'Cette classe n’est rattachée à aucune année scolaire.');
	}

	// Une année déjà terminée est close pour la composition. On compare des
	// dates civiles : `end_date` est un `date`, pas un instant.
	const aujourdHui = new Date().toISOString().slice(0, 10);
	if (annee.end_date < aujourdHui) {
		throw error(409, `L’année ${annee.name} est terminée : on n’y compose plus.`);
	}

	// Les élèves ensuite. Un identifiant qui ne désigne pas un compte d'élève
	// est refusé nommément plutôt qu'ignoré en silence : l'appelant doit savoir
	// que sa sélection ne s'est pas appliquée entière.
	const { data: eleves, error: elevesError } = await supabase
		.from('profiles')
		.select('id, role')
		.in('id', studentIds);

	if (elevesError) {
		console.error('Lecture des élèves impossible :', elevesError);
		throw error(500, 'Impossible de vérifier les élèves sélectionnés');
	}

	const eleveIds = new Set((eleves ?? []).filter((p) => p.role === 'student').map((p) => p.id));
	const refused = studentIds.filter((id) => !eleveIds.has(id));

	// Les adhésions déjà en place, tous statuts confondus : réinscrire un élève
	// déjà membre le dupliquerait, et réactiver une adhésion archivée n'est PAS
	// le geste demandé — c'est une décision du professeur, pas un effet de bord.
	const { data: dejaMembres, error: dejaError } = await supabase
		.from('class_members')
		.select('student_id')
		.eq('class_id', targetClassId)
		.in('student_id', [...eleveIds]);

	if (dejaError) {
		console.error('Lecture des adhésions existantes impossible :', dejaError);
		throw error(500, 'Impossible de vérifier les adhésions existantes');
	}

	const dejaIds = new Set((dejaMembres ?? []).map((m) => m.student_id));
	const aInserer = [...eleveIds].filter((id) => !dejaIds.has(id));

	if (aInserer.length > 0) {
		const { error: insertError } = await supabase.from('class_members').insert(
			aInserer.map((student_id) => ({
				student_id,
				class_id: targetClassId,
				status: 'active'
			}))
		);

		if (insertError) {
			console.error('Composition impossible :', insertError);
			throw error(500, 'Impossible d’inscrire les élèves sélectionnés');
		}
	}

	return json({
		added: aInserer.length,
		ignored: dejaIds.size,
		refused
	});
};
