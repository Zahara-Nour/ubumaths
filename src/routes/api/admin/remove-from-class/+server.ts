import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeFromClassSchema } from '$lib/server/validation/admin';
import { requireAdmin } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	// ✅ SECURITY: admin elevation OR real admin login. Privileged ops run via the
	// returned admin-context client so RLS attributes them to the admin.
	const { supabase } = await requireAdmin(locals);

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = removeFromClassSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { userId, classId } = validation.data;

	// ARCHIVER, et non supprimer. Décision de David du 2026-09-13 : « je veux
	// garder la trace du passage ».
	//
	// Un DELETE effaçait la ligne, et avec elle la jointure dont dépend la
	// relecture rétroactive : l'ancien élève perdait les énoncés de TOUT ce
	// qu'on lui avait donné. Il gardait ses résultats et perdait son classeur.
	//
	// Archiver conserve cette lecture pour la période où il était inscrit, et
	// le trigger `trg_class_members_left_at` horodate son départ — ce qui
	// l'empêche de recevoir ce qui sera distribué ensuite.
	const { error: archiveError } = await supabase
		.from('class_members')
		.update({ status: 'archived' })
		.eq('student_id', userId)
		.eq('class_id', classId);

	if (archiveError) {
		console.error('Archive error:', archiveError);
		return json({ error: archiveError.message }, { status: 400 });
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
