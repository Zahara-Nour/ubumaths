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

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/middleware/auth.ts';
import {
	MAX_IMAGE_SIZE_BYTES,
	validateFileSignature
} from '#lib/server/validation/image-upload.ts';
import { DISPLAY_SIGNED_URL_TTL } from '#lib/server/bug-report-screenshots.ts';
import { z } from 'zod';
import { createServerLogger } from '#lib/utils/logger.ts';
import { toBrowserAddress } from '#lib/utils/supabase-address.ts';

const logger = createServerLogger('api/bug-reports/[reportId]/screenshot/+server');

const reportIdSchema = z.string().uuid('ID de rapport invalide');

const BUCKET_NAME = 'bug-report-screenshots';

/** Types acceptés (pas de SVG pour une capture) et l'extension rangée pour chacun. */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];
const EXTENSION_BY_TYPE: Record<AllowedType, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp'
};

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
		throw error(403, 'Ajout de capture réservé à l’auteur du rapport');
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

		// Validate MIME type
		if (!ALLOWED_TYPES.includes(file.type as AllowedType)) {
			throw error(400, `Type de fichier non autorisé. Types acceptés: ${ALLOWED_TYPES.join(', ')}`);
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

		// Chemin de stockage : user_id/report_id/timestamp.ext. L'extension vient du
		// type vérifié, jamais du nom du fichier : un nom forgé (« x.a/b ») donnait un
		// chemin à quatre segments, que la base refuse (guard_bug_report_reecriture).
		const ext = EXTENSION_BY_TYPE[file.type as AllowedType];
		const timestamp = Date.now();
		const storagePath = `${user.id}/${params.reportId}/${timestamp}.${ext}`;

		// Upload new screenshot
		const { error: uploadError } = await locals.supabase.storage
			.from(BUCKET_NAME)
			.upload(storagePath, buffer, {
				contentType: file.type,
				upsert: true
			});

		if (uploadError) {
			logger.error('[API] Error uploading screenshot:', uploadError);
			throw error(500, "Erreur lors de l'upload de la capture d'écran");
		}

		// Bucket is private: there is no durable public URL. We store only the
		// storage path; signed URLs are generated on read (see bug-report-screenshots.ts).
		//
		// ⚠️ Une mise à jour refusée par la RLS touche zéro ligne sans erreur. Sans
		// les lignes rendues, on annonçait la capture enregistrée alors que le
		// rapport ne la référençait pas, et le fichier restait orphelin au bucket.
		const { data: updatedReports, error: updateError } = await locals.supabase
			.from('bug_reports')
			.update({
				screenshot_url: null,
				screenshot_path: storagePath
			})
			.eq('id', params.reportId)
			.select('id');

		if (updateError) {
			logger.error('[API] Error updating bug report with screenshot:', updateError);
			// Try to clean up the uploaded file
			await locals.supabase.storage.from(BUCKET_NAME).remove([storagePath]);
			throw error(500, 'Erreur lors de la mise à jour du rapport');
		}

		if (!updatedReports || updatedReports.length === 0) {
			logger.error('[API] Capture non rattachée au rapport', params.reportId);
			// Le fichier vient d'être envoyé : sans rapport qui le référence, il
			// resterait orphelin dans le bucket.
			await locals.supabase.storage.from(BUCKET_NAME).remove([storagePath]);
			throw error(403, 'Capture non enregistrée : rapport non modifiable');
		}

		// L'ancienne capture ne part qu'une fois la nouvelle rattachée au rapport :
		// retirée avant, un refus de la base laissait le rapport sans capture.
		if (report.screenshot_path && report.screenshot_path !== storagePath) {
			const { data: removed, error: removeError } = await locals.supabase.storage
				.from(BUCKET_NAME)
				.remove([report.screenshot_path]);
			if (removeError) {
				logger.warn('[API] Ancienne capture non effacée :', removeError.message);
			} else if (!removed || removed.length === 0) {
				// Un refus des règles du stockage ne rend pas d'erreur : il rend zéro
				// fichier, et l'ancienne capture resterait orpheline sans trace.
				logger.warn('[API] Ancienne capture non effacée (aucun fichier rendu) :', params.reportId);
			}
		}

		// Return a short-lived signed URL so the client can preview immediately.
		const { data: signed, error: signedError } = await locals.supabase.storage
			.from(BUCKET_NAME)
			.createSignedUrl(storagePath, DISPLAY_SIGNED_URL_TTL);

		if (signedError) {
			logger.error('Lecture impossible :', signedError);
			throw error(500, 'Impossible de charger les données');
		}

		return Response.json({
			success: true,
			data: {
				url: signed?.signedUrl ? toBrowserAddress(signed.signedUrl) : null,
				path: storagePath,
				size: file.size,
				mimeType: file.type
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		logger.error('[API] Unexpected error in POST /api/bug-reports/[reportId]/screenshot:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
