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
import type { RequestHandler } from './$types';
import type { UploadImageResponse } from '$lib/types/vip-card-admin';

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
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Authentication required');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const supabase = locals.supabase;
	const templateId = params.id;

	try {
		// 3. Check if template exists
		const { data: existing, error: checkError } = await supabase
			.from('vip_card_templates')
			.select('id')
			.eq('id', templateId)
			.maybeSingle();

		if (checkError) {
			console.error('Error checking template existence:', checkError);
			throw error(500, 'Failed to check template existence');
		}

		if (!existing) {
			throw error(404, `Template with ID "${templateId}" not found`);
		}

		// 4. Parse multipart/form-data
		const formData = await request.formData();
		const imageFile = formData.get('image');

		if (!imageFile || !(imageFile instanceof File)) {
			throw error(400, 'Image file is required');
		}

		// 5. Validate file type
		if (imageFile.type !== 'image/webp') {
			throw error(400, 'Only WebP images are allowed');
		}

		// 6. Validate file size (max 2MB)
		if (imageFile.size === 0) {
			throw error(400, 'Image file cannot be empty');
		}

		if (imageFile.size > 2 * 1024 * 1024) {
			throw error(400, 'Image must be less than 2MB');
		}

		// 7. Generate storage key
		const storageKey = `${templateId}@0.5x.webp`;

		// 8. Upload to Supabase Storage (upsert mode - replaces existing)
		const { error: uploadError } = await supabase.storage
			.from('vip-card-images')
			.upload(storageKey, imageFile, {
				contentType: 'image/webp',
				upsert: true, // Replace if exists
				cacheControl: '31536000' // Cache for 1 year (immutable content)
			});

		if (uploadError) {
			console.error('Error uploading image:', uploadError);
			throw error(500, `Failed to upload image: ${uploadError.message}`);
		}

		// 9. Get public URL
		const { data: publicUrlData } = supabase.storage
			.from('vip-card-images')
			.getPublicUrl(storageKey);

		if (!publicUrlData?.publicUrl) {
			throw error(500, 'Failed to get public URL for uploaded image');
		}

		// 10. Update template image_path
		const imagePath = `/images/vip-cards/${storageKey}`;

		const { error: updateError } = await supabase
			.from('vip_card_templates')
			.update({ image_path: imagePath })
			.eq('id', templateId);

		if (updateError) {
			console.error('Error updating template image_path:', updateError);
			throw error(500, 'Failed to update template image path');
		}

		// 11. Return success response
		const response: UploadImageResponse = {
			publicUrl: publicUrlData.publicUrl,
			imagePath
		};

		return json(response);
	} catch (err) {
		console.error('Error in POST /api/admin/vip-cards/templates/[id]/image:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
