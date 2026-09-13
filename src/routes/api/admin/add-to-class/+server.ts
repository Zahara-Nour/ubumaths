import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addToClassSchema } from '$lib/server/validation/admin';
import { requireAdmin } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	// ✅ SECURITY: admin elevation OR real admin login. Privileged ops run via the
	// returned admin-context client so RLS attributes them to the admin.
	const { supabase } = await requireAdmin(locals);

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = addToClassSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { userId, classId } = validation.data;

	// Check if already in class
	const { data: existing, error: existingError } = await supabase
		.from('class_members')
		.select('id, status')
		.eq('student_id', userId)
		.eq('class_id', classId)
		.single();

	// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
	// panne prenait le même visage et faisait conclure « rien ici », donc créer
	// par-dessus ce qu'on n'avait simplement pas su lire.
	if (existingError && existingError.code !== 'PGRST116') {
		console.error('Lecture impossible :', existingError);
		throw error(500, 'Impossible de vérifier l’état actuel');
	}

	// Un ancien élève garde sa ligne, archivée : le ré-ajouter le RÉACTIVE.
	//
	// Sans ça, la contrainte d'unicité (class_id, student_id) ferait échouer
	// l'insertion, et le professeur lirait « déjà dans cette classe » à propos
	// d'un élève qui n'y est plus. Le trigger efface au passage sa date de
	// départ, sans quoi il resterait borné à son ancien départ et ne recevrait
	// plus rien.
	if (existing?.status === 'archived') {
		const { error: reactivationError } = await supabase
			.from('class_members')
			.update({ status: 'active' })
			.eq('id', existing.id);

		if (reactivationError) {
			console.error('Réactivation impossible :', reactivationError);
			return json({ error: reactivationError.message }, { status: 400 });
		}
	} else if (existing) {
		return json({ error: 'User is already in this class' }, { status: 400 });
	}

	// Add to class_members table
	const { error: insertError } = existing
		? { error: null }
		: await supabase.from('class_members').insert({ student_id: userId, class_id: classId });

	if (insertError) {
		console.error('Insert error:', insertError);
		return json({ error: insertError.message }, { status: 400 });
	}

	// Fetch the updated profile with all classes
	const { data: updatedProfile, error: fetchError } = await supabase
		.from('profiles')
		.select('*, schools(name), class_members(class_id)')
		.eq('id', userId)
		.single();

	if (fetchError) {
		console.error('Fetch error:', fetchError);
		return json({ error: fetchError.message }, { status: 400 });
	}

	// Transform class_members array to class_ids array
	const profileWithClasses = {
		...updatedProfile,
		class_ids: updatedProfile.class_members?.map((cm: { class_id: string }) => cm.class_id) || []
	};

	return json({ success: true, profile: profileWithClasses });
};
