/**
 * Bug Report Screenshot Upload API
 * ==================================
 *
 * POST /api/bug-reports/[reportId]/screenshot - Upload screenshot for a bug report
 *
 * AUTH: Owner of the report only
 *
 * Accepts: multipart/form-data with 'image' field
 * Max size: 5MB
 * Allowed types: image/jpeg, image/png, image/gif, image/webp
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { MAX_IMAGE_SIZE_BYTES, validateFileSignature } from '$lib/server/validation/image-upload';
import { z } from 'zod';

const reportIdSchema = z.string().uuid('ID de rapport invalide');

const BUCKET_NAME = 'bug-report-screenshots';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { user } = await requireAuth(locals);

	// Validate report ID
	const idValidation = reportIdSchema.safeParse(params.reportId);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	// Verify ownership
	const { data: report, error: fetchError } = await locals.supabase
		.from('bug_reports')
		.select('id, user_id, screenshot_path')
		.eq('id', params.reportId)
		.single();

	if (fetchError || !report) {
		throw error(404, 'Rapport non trouvé');
	}

	if (report.user_id !== user.id) {
		throw error(403, 'Vous ne pouvez ajouter une capture que sur vos propres rapports');
	}

	// Check Content-Type
	const contentType = request.headers.get('content-type');
	if (!contentType?.includes('multipart/form-data')) {
		throw error(400, 'Content-Type doit être multipart/form-data');
	}

	try {
		const formData = await request.formData();
		const file = formData.get('image');

		if (!file || !(file instanceof File)) {
			throw error(400, 'Aucun fichier image fourni');
		}

		// Validate file size
		if (file.size === 0) {
			throw error(400, 'Le fichier est vide');
		}

		if (file.size > MAX_IMAGE_SIZE_BYTES) {
			throw error(400, `Le fichier ne doit pas dépasser ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} Mo`);
		}

		// Validate MIME type (excluding SVG for bug reports)
		const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
		if (!allowedTypes.includes(file.type as (typeof allowedTypes)[number])) {
			throw error(400, `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}`);
		}

		// Read file buffer for magic byte validation
		const arrayBuffer = await file.arrayBuffer();
		const buffer = new Uint8Array(arrayBuffer);

		// Validate file signature (magic bytes)
		const signatureValid = validateFileSignature(buffer, file.type);
		if (!signatureValid) {
			throw error(
				400,
				'Signature de fichier invalide - le fichier ne correspond pas au type déclaré'
			);
		}

		// Generate storage path: user_id/report_id/timestamp.ext
		const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
		const timestamp = Date.now();
		const storagePath = `${user.id}/${params.reportId}/${timestamp}.${ext}`;

		// Delete existing screenshot if any
		if (report.screenshot_path) {
			await locals.supabase.storage.from(BUCKET_NAME).remove([report.screenshot_path]);
		}

		// Upload new screenshot
		const { error: uploadError } = await locals.supabase.storage
			.from(BUCKET_NAME)
			.upload(storagePath, buffer, {
				contentType: file.type,
				upsert: true
			});

		if (uploadError) {
			console.error('[API] Error uploading screenshot:', uploadError);
			throw error(500, "Erreur lors de l'upload de la capture d'écran");
		}

		// Get public URL
		const {
			data: { publicUrl }
		} = locals.supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

		// Update bug report with screenshot info
		const { error: updateError } = await locals.supabase
			.from('bug_reports')
			.update({
				screenshot_url: publicUrl,
				screenshot_path: storagePath
			})
			.eq('id', params.reportId);

		if (updateError) {
			console.error('[API] Error updating bug report with screenshot:', updateError);
			// Try to clean up the uploaded file
			await locals.supabase.storage.from(BUCKET_NAME).remove([storagePath]);
			throw error(500, 'Erreur lors de la mise à jour du rapport');
		}

		return json({
			success: true,
			data: {
				url: publicUrl,
				path: storagePath,
				size: file.size,
				mimeType: file.type
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[API] Unexpected error in POST /api/bug-reports/[reportId]/screenshot:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
