/**
 * Teacher admin page for "Les presques évaluations".
 *
 * Lists ALL parody evaluations (so teachers can browse the collection) but
 * Edit/Delete buttons in the UI only appear on rows owned by the current user.
 * Server-side actions enforce ownership too via RLS + explicit check.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { fetchTagNamesForResources, syncResourceTags } from '$lib/server/resource-tags';
import {
	uploadEvaluationMetadataSchema,
	updateEvaluationSchema,
	deleteEvaluationSchema,
	parseJsonArrayField,
	MAX_FILE_SIZE_BYTES,
	ALLOWED_MIME_TYPE
} from '$lib/server/validation/parody-evaluations';

const STORAGE_BUCKET = 'parody-evaluations';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireRole(locals, 'teacher');

	const [{ data: evaluations }, { data: allTags }] = await Promise.all([
		locals.supabase
			.from('parody_evaluations')
			.select(
				`
				id,
				title,
				description,
				storage_path,
				file_name,
				mime_type,
				file_size,
				grade_levels,
				created_by,
				created_at,
				updated_at,
				creator:created_by(firstname, lastname)
			`
			)
			.order('created_at', { ascending: false }),
		locals.supabase.from('tags').select('name').order('name', { ascending: true })
	]);

	type RawEvaluation = NonNullable<typeof evaluations>[number];

	// Resolve the public URL once on the server. Used by the "Aperçu" button
	// which opens the PDF inline in a new tab.
	// Les tags viennent de `resource_tags`, plus de la colonne. Lecture GROUPÉE :
	// une requête par ligne serait un N+1 sur une page qui liste tout.
	const tagsByEvaluation = await fetchTagNamesForResources(
		locals.supabase,
		'parody_evaluation',
		(evaluations ?? []).map((evaluation: RawEvaluation) => evaluation.id)
	);

	const withUrls = (evaluations ?? []).map((evaluation: RawEvaluation) => {
		const { data: urlData } = locals.supabase.storage
			.from(STORAGE_BUCKET)
			.getPublicUrl(evaluation.storage_path);
		return {
			...evaluation,
			tags: tagsByEvaluation.get(evaluation.id) ?? [],
			publicUrl: urlData?.publicUrl ?? null
		};
	});

	return {
		currentUserId: user.id,
		evaluations: withUrls,
		allTagNames: (allTags ?? []).map((t) => t.name)
	};
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const file = formData.get('file');
		const title = formData.get('title');
		const description = formData.get('description');
		const gradeLevels = parseJsonArrayField(formData.get('gradeLevels'));
		const tags = parseJsonArrayField(formData.get('tags'));

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { action: 'upload', error: 'Fichier PDF requis' });
		}

		if (file.type !== ALLOWED_MIME_TYPE) {
			return fail(400, { action: 'upload', error: 'Seuls les fichiers PDF sont acceptés' });
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			return fail(400, {
				action: 'upload',
				error: `Fichier trop volumineux (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} Mo)`
			});
		}

		const metadataValidation = uploadEvaluationMetadataSchema.safeParse({
			title,
			description,
			gradeLevels,
			tags
		});

		if (!metadataValidation.success) {
			return fail(400, {
				action: 'upload',
				error: metadataValidation.error.issues[0].message
			});
		}

		const metadata = metadataValidation.data;

		const timestamp = Date.now();
		const randomSuffix = Math.random().toString(36).slice(2, 10);
		const storagePath = `${timestamp}-${randomSuffix}.pdf`;

		const arrayBuffer = await file.arrayBuffer();
		const buffer = new Uint8Array(arrayBuffer);

		const { error: uploadError } = await locals.supabase.storage
			.from(STORAGE_BUCKET)
			.upload(storagePath, buffer, {
				contentType: ALLOWED_MIME_TYPE,
				upsert: false,
				cacheControl: '3600'
			});

		if (uploadError) {
			console.error('[parody-evaluations:upload] Storage error:', uploadError);
			return fail(500, { action: 'upload', error: "Erreur lors de l'upload du fichier" });
		}

		const { data: inserted, error: insertError } = await locals.supabase
			.from('parody_evaluations')
			.insert({
				title: metadata.title,
				description: metadata.description,
				storage_path: storagePath,
				file_name: file.name,
				mime_type: ALLOWED_MIME_TYPE,
				file_size: file.size,
				grade_levels: metadata.gradeLevels,
				created_by: user.id
			})
			.select('id')
			.single();

		if (insertError || !inserted) {
			// Rollback: remove the orphan storage object
			await locals.supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
			console.error('[parody-evaluations:upload] DB insert error:', insertError);
			return fail(500, { action: 'upload', error: "Erreur lors de l'enregistrement" });
		}

		// Les tags vivent désormais dans `resource_tags`, plus dans la colonne.
		// L'ancien code faisait un `upsert ... onConflict: 'name'` qui échouait en
		// 42P10 — il n'existe aucune contrainte unique sur `tags.name`, l'unicité
		// porte sur le slug. L'échec était avalé par un `console.warn` : les tags
		// n'étaient jamais enregistrés dans le catalogue partagé.
		await syncResourceTags(locals.supabase, 'parody_evaluation', inserted.id, metadata.tags);

		return { action: 'upload', success: true };
	},

	update: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const id = formData.get('id');
		const title = formData.get('title');
		const description = formData.get('description');
		const gradeLevels = parseJsonArrayField(formData.get('gradeLevels'));
		const tags = parseJsonArrayField(formData.get('tags'));

		const validation = updateEvaluationSchema.safeParse({
			id,
			title,
			description,
			gradeLevels,
			tags
		});

		if (!validation.success) {
			return fail(400, {
				action: 'update',
				error: validation.error.issues[0].message
			});
		}

		const input = validation.data;

		// Ownership check (RLS will also block, but explicit 403 is friendlier).
		const { data: existing, error: fetchError } = await locals.supabase
			.from('parody_evaluations')
			.select('created_by')
			.eq('id', input.id)
			.single();

		if (fetchError || !existing) {
			return fail(404, { action: 'update', error: 'Évaluation introuvable' });
		}

		if (existing.created_by !== user.id) {
			return fail(403, {
				action: 'update',
				error: 'Vous ne pouvez modifier que vos propres uploads'
			});
		}

		const { error: updateError } = await locals.supabase
			.from('parody_evaluations')
			.update({
				title: input.title,
				description: input.description,
				grade_levels: input.gradeLevels
			})
			.eq('id', input.id);

		if (updateError) {
			console.error('[parody-evaluations:update] DB error:', updateError);
			return fail(500, { action: 'update', error: 'Erreur lors de la modification' });
		}

		await syncResourceTags(locals.supabase, 'parody_evaluation', input.id, input.tags);

		return { action: 'update', success: true };
	},

	delete: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const id = formData.get('id');

		const validation = deleteEvaluationSchema.safeParse({ id });
		if (!validation.success) {
			return fail(400, {
				action: 'delete',
				error: validation.error.issues[0].message
			});
		}

		const { data: existing, error: fetchError } = await locals.supabase
			.from('parody_evaluations')
			.select('storage_path, created_by')
			.eq('id', validation.data.id)
			.single();

		if (fetchError || !existing) {
			return fail(404, { action: 'delete', error: 'Évaluation introuvable' });
		}

		if (existing.created_by !== user.id) {
			return fail(403, {
				action: 'delete',
				error: 'Vous ne pouvez supprimer que vos propres uploads'
			});
		}

		const { error: deleteDbError } = await locals.supabase
			.from('parody_evaluations')
			.delete()
			.eq('id', validation.data.id);

		if (deleteDbError) {
			console.error('[parody-evaluations:delete] DB error:', deleteDbError);
			return fail(500, { action: 'delete', error: 'Erreur lors de la suppression' });
		}

		// Best-effort storage cleanup. Orphan file is tolerable (public bucket).
		const { error: storageError } = await locals.supabase.storage
			.from(STORAGE_BUCKET)
			.remove([existing.storage_path]);

		if (storageError) {
			console.warn('[parody-evaluations:delete] Storage cleanup warning:', storageError);
		}

		return { action: 'delete', success: true };
	}
};
