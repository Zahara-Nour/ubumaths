/**
 * Admin VIP Card Template Image Upload API
 * =========================================
 *
 * Endpoint:
 * - POST: Upload/replace card image to Supabase Storage
 *
 * Security: Admin only
 */

import { error, json } from '@sveltejs/kit';
import sharp from 'sharp';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';
import type { UploadImageResponse } from '$lib/types/vip-card-admin';
import { validateSlugParam } from '$lib/server/validation/params';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/admin/vip-cards/templates/[id]/image/+server');

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/admin/vip-cards/templates/[id]/image
 *
 * Upload or replace VIP card image
 *
 * Request body: multipart/form-data with 'image' field (WebP file, max 2MB)
 *
 * Response: 200 with publicUrl and imagePath
 *
 * Errors:
 *   - 400: Validation error (wrong format, too large, etc.)
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 404: Template not found
 *   - 500: Server error
 */
export const POST: RequestHandler = async ({ request, locals, params }) => {
	// ✅ SECURITY: admin elevation OR real admin login. Privileged ops (storage
	// upload + image_path update) run via the returned admin-context client so RLS
	// + audit attribute them to the admin.
	const { supabase } = await requireAdmin(locals);
	const templateId = validateSlugParam(params.id, 'templateId');

	try {
		// 3. Check if template exists
		const { data: existing, error: checkError } = await supabase
			.from('vip_card_templates')
			.select('id')
			.eq('id', templateId)
			.maybeSingle();

		if (checkError) {
			logger.error('Error checking template existence:', checkError);
			throw error(500, 'Impossible de vérifier le modèle de carte VIP');
		}

		if (!existing) {
			throw error(404, `Modèle de carte VIP introuvable : ${templateId}`);
		}

		// 4. Parse multipart/form-data
		const formData = await request.formData();
		const imageFile = formData.get('image');

		if (!imageFile || !(imageFile instanceof File)) {
			throw error(400, 'Image requise');
		}

		// 5. Validate file type (accept JPG, PNG, WebP)
		if (!ACCEPTED_TYPES.includes(imageFile.type)) {
			throw error(400, 'Formats acceptés : JPG, PNG et WebP');
		}

		// 6. Validate file size (max 2MB)
		if (imageFile.size === 0) {
			throw error(400, 'Image vide');
		}

		if (imageFile.size > 2 * 1024 * 1024) {
			throw error(400, 'Image trop lourde (2 Mo au maximum)');
		}

		// 7. Convert to WebP and validate actual file format
		let imageBuffer: Buffer;
		const rawBuffer = Buffer.from(await imageFile.arrayBuffer());

		try {
			// Verify file is actually a valid image (defends against MIME spoofing)
			const metadata = await sharp(rawBuffer).metadata();

			if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
				throw error(400, 'Format d’image non reconnu');
			}

			if (metadata.format === 'webp') {
				imageBuffer = rawBuffer;
			} else {
				imageBuffer = await sharp(rawBuffer).webp({ quality: 80 }).toBuffer();
			}
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}
			throw error(400, 'Image illisible');
		}

		// 8. Generate storage key
		const storageKey = `${templateId}@0.5x.webp`;

		// 9. Upload to Supabase Storage (upsert mode - replaces existing)
		const { error: uploadError } = await supabase.storage
			.from('vip-card-images')
			.upload(storageKey, imageBuffer, {
				contentType: 'image/webp',
				upsert: true, // Replace if exists
				cacheControl: '31536000' // Cache for 1 year (immutable content)
			});

		if (uploadError) {
			logger.error('Error uploading image:', uploadError);
			throw error(500, `Impossible d’envoyer l’image : ${uploadError.message}`);
		}

		// 10. Get public URL
		const { data: publicUrlData } = supabase.storage
			.from('vip-card-images')
			.getPublicUrl(storageKey);

		if (!publicUrlData?.publicUrl) {
			throw error(500, 'Impossible d’obtenir l’adresse publique de l’image');
		}

		// 11. Update template image_path (use full Supabase Storage URL)
		const imagePath = publicUrlData.publicUrl;

		const { error: updateError } = await supabase
			.from('vip_card_templates')
			.update({ image_path: imagePath })
			.eq('id', templateId);

		if (updateError) {
			logger.error('Error updating template image_path:', updateError);
			throw error(500, 'Impossible d’enregistrer l’image du modèle de carte VIP');
		}

		// 12. Return success response
		const response: UploadImageResponse = {
			publicUrl: publicUrlData.publicUrl,
			imagePath
		};

		return json(response);
	} catch (err) {
		logger.error('Error in POST /api/admin/vip-cards/templates/[id]/image:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Une erreur inattendue s’est produite');
	}
};
