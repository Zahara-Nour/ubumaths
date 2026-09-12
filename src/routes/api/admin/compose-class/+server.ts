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
 * RÉPONSE : { added, ignored, refused, moved } — `ignored` compte les élèves
 * déjà membres, qui ne sont pas dupliqués ; `moved` ceux dont le profil a
 * changé d'école.
 *
 * L'écriture passe par `admin_compose_class`, une fonction Postgres :
 * l'inscription et le déplacement d'école doivent tenir ou échouer ensemble,
 * sans quoi on fabrique un élève inscrit dans une école et rattaché à une
 * autre. Les contrôles ci-dessous font double emploi avec ceux de la fonction,
 * et c'est voulu : la fonction est le garde, la route est le message.
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

	const { targetClassId, studentIds, confirmSchoolChange } = validation.data;

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
		.select('id, role, school_id')
		.in('id', studentIds);

	if (elevesError) {
		console.error('Lecture des élèves impossible :', elevesError);
		throw error(500, 'Impossible de vérifier les élèves sélectionnés');
	}

	const elevesValides = (eleves ?? []).filter((p) => p.role === 'student');
	const eleveIds = new Set(elevesValides.map((p) => p.id));
	const refused = studentIds.filter((id) => !eleveIds.has(id));

	// Le déplacement d'école ne doit jamais surprendre : il change les
	// trimestres, le calendrier et le marché de l'élève. On refuse tant qu'il
	// n'a pas été consenti, en disant combien d'élèves sont concernés.
	const aDeplacer = elevesValides.filter((p) => p.school_id !== cible.school_id);
	if (aDeplacer.length > 0 && !confirmSchoolChange) {
		throw error(
			409,
			`${aDeplacer.length} élève${aDeplacer.length > 1 ? 's' : ''} changerai${
				aDeplacer.length > 1 ? 'ent' : 't'
			} d’école pour « ${cible.name} ». Confirmez pour continuer.`
		);
	}

	// La déduplication n'est plus faite ici : `admin_compose_class` insère avec
	// `on conflict do nothing` sur (class_id, student_id). Une adhésion déjà
	// présente — active ou archivée — n'est donc ni dupliquée ni réactivée, et
	// c'est la même transaction qui le garantit.
	if (eleveIds.size === 0) {
		return json({ added: 0, ignored: 0, moved: 0, refused });
	}

	// Une seule transaction : inscription et déplacement d'école ensemble.
	const { data: resultat, error: rpcError } = await supabase.rpc('admin_compose_class', {
		p_class_id: targetClassId,
		p_student_ids: [...eleveIds]
	});

	if (rpcError) {
		console.error('Composition impossible :', rpcError);
		throw error(500, 'Impossible d’inscrire les élèves sélectionnés');
	}

	const compte = resultat?.[0] ?? { enrolled: 0, moved: 0 };

	return json({
		added: compte.enrolled,
		// Les élèves éligibles que la fonction n'a pas inscrits : ils étaient
		// déjà membres, actifs ou archivés.
		ignored: eleveIds.size - compte.enrolled,
		moved: compte.moved,
		refused
	});
};
