/**
 * Public listing page for "Les presques évaluations".
 *
 * Anyone — even anonymous visitors — can view this page. The Storage bucket
 * is public, so the page resolves a public URL for each PDF and renders an
 * inline preview + download button.
 *
 * No auth gate; RLS allows SELECT for `to public` on the table.
 */

import type { PageServerLoad } from './$types';

const STORAGE_BUCKET = 'parody-evaluations';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: evaluations, error: loadError } = await locals.supabase
		.from('parody_evaluations')
		.select(
			`
			id,
			title,
			description,
			storage_path,
			file_name,
			file_size,
			grade_levels,
			tags,
			created_at,
			creator:created_by(firstname, lastname)
		`
		)
		.order('created_at', { ascending: false });

	if (loadError) {
		console.error('[presques-evaluations:public] Load error:', loadError);
	}

	type RawEvaluation = NonNullable<typeof evaluations>[number];

	// Resolve public URLs server-side so the client doesn't need to call Storage.
	// `publicUrl` serves the PDF inline (used by the iframe preview); `downloadUrl`
	// adds Supabase's `?download=<filename>` query param so the browser receives
	// Content-Disposition: attachment and triggers a real download (the HTML
	// `download` attribute alone is ignored cross-origin).
	const withUrls = (evaluations ?? []).map((evaluation: RawEvaluation) => {
		const { data: urlData } = locals.supabase.storage
			.from(STORAGE_BUCKET)
			.getPublicUrl(evaluation.storage_path);
		const { data: downloadData } = locals.supabase.storage
			.from(STORAGE_BUCKET)
			.getPublicUrl(evaluation.storage_path, {
				download: evaluation.file_name
			});
		return {
			...evaluation,
			publicUrl: urlData?.publicUrl ?? null,
			downloadUrl: downloadData?.publicUrl ?? null
		};
	});

	return {
		evaluations: withUrls
	};
};
