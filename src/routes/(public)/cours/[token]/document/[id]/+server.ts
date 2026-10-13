/**
 * Un document du cours, ouvert depuis le lien du cours (ADR 0025).
 *
 * Accessible SANS COMPTE. Le chemin de stockage ne doit jamais atteindre le
 * navigateur : le serveur le demande à une fonction SQL RÉSERVÉE au service
 * role (qui vérifie le jeton et la publication), puis renvoie vers une URL
 * signée de 60 secondes. La table `chapter_documents` n'est jamais lue ici.
 *
 * Jeton invalide, document inexistant, non publié, d'une autre classe : le
 * MÊME 404.
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import {
	courseShareTokenSchema,
	INVALID_COURSE_LINK,
	resolveCourseDocumentByShareToken,
	safeExternalUrl
} from '$lib/server/course-share-tokens';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(public)/cours/[token]/document/[id]/+server');

/** Durée de validité de l'URL signée : le temps d'ouvrir, pas de la faire circuler. */
const SIGNED_URL_SECONDS = 60;

/**
 * Types affichables dans le navigateur ; tout le reste est téléchargé.
 * Même liste que `api/documents/[id]` (finding M6 : `mime_type` n'est pas
 * vérifié à l'envoi).
 */
const INLINE_SAFE_MIMES = new Set([
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/gif',
	'image/webp'
]);

/** Redirection sans trace : ni indexée, ni mise en cache (l'URL signée expire). */
function redirectTo(location: string): Response {
	return new Response(null, {
		status: 303,
		headers: {
			Location: location,
			'X-Robots-Tag': 'noindex, nofollow',
			'Cache-Control': 'no-store'
		}
	});
}

export const GET: RequestHandler = async ({ params, url }) => {
	const token = courseShareTokenSchema.safeParse(params.token);
	const documentId = z.string().uuid().safeParse(params.id);
	if (!token.success || !documentId.success) {
		throw error(404, INVALID_COURSE_LINK);
	}

	const serviceClient = createServiceRoleClient();
	const document = await resolveCourseDocumentByShareToken(
		serviceClient,
		token.data,
		documentId.data
	);
	if (!document) {
		throw error(404, INVALID_COURSE_LINK);
	}

	if (document.source_type === 'google_drive') {
		const driveUrl = safeExternalUrl(document.google_drive_url);
		if (!driveUrl) throw error(404, INVALID_COURSE_LINK);
		return redirectTo(driveUrl);
	}

	if (!document.storage_path) {
		throw error(404, INVALID_COURSE_LINK);
	}

	const forceDownload =
		url.searchParams.has('download') || !INLINE_SAFE_MIMES.has(document.mime_type ?? '');
	const { data, error: signError } = await serviceClient.storage
		.from('chapter-documents')
		.createSignedUrl(
			document.storage_path,
			SIGNED_URL_SECONDS,
			forceDownload ? { download: document.file_name ?? true } : undefined
		);

	if (signError || !data?.signedUrl) {
		logger.error('[course-share] URL signée impossible:', signError?.message);
		throw error(500, 'Document indisponible pour le moment');
	}

	return redirectTo(data.signedUrl);
};
