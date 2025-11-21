/**
 * Admin Shop Item Image Upload API
 * =================================
 *
 * Endpoint:
 * - POST: Upload/update item icon image
 *
 * Security: Admin only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// ID validation schema
const idSchema = z.string().uuid('ID invalide');

// Allowed image types and max size
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * POST /api/admin/shop/items/[id]/image
 *
 * Upload a new icon image for a shop item
 *
 * Body: FormData with 'image' file
 *
 * Response: { success: true, icon_url: string }
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifié');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux administrateurs');
	}

	// 3. Validate ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const supabase = locals.supabase;
	const itemId = params.id;

	try {
		// 4. Check if item exists
		const { data: item, error: checkError } = await supabase
			.from('shop_item_templates')
			.select('id, display_name, icon_url')
			.eq('id', itemId)
			.single();

		if (checkError || !item) {
			throw error(404, 'Article non trouvé');
		}

		// 5. Parse form data
		const formData = await request.formData();
		const imageFile = formData.get('image') as File;

		if (!imageFile || !(imageFile instanceof File)) {
			throw error(400, 'Aucune image fournie');
		}

		// 6. Validate image type
		if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
			throw error(400, "Format d'image non supporté. Utilisez JPG, PNG ou WebP.");
		}

		// 7. Validate image size
		if (imageFile.size > MAX_IMAGE_SIZE) {
			throw error(400, "L'image est trop grande. Taille maximale: 2MB");
		}

		// 8. Generate unique filename
		const timestamp = Date.now();
		const fileExt = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
		const fileName = `shop-items/${itemId}/${timestamp}.${fileExt}`;

		// 9. Delete old image if exists
		if (item.icon_url) {
			// Extract path from URL
			const oldPath = item.icon_url.split('/').slice(-3).join('/'); // Get last 3 segments
			if (oldPath.startsWith('shop-items/')) {
				const { error: deleteError } = await supabase.storage.from('public').remove([oldPath]);

				if (deleteError) {
					console.warn('Failed to delete old image:', deleteError);
					// Continue anyway, not critical
				}
			}
		}

		// 10. Upload new image to Supabase Storage
		const arrayBuffer = await imageFile.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const { error: uploadError } = await supabase.storage.from('public').upload(fileName, buffer, {
			contentType: imageFile.type,
			upsert: true,
			cacheControl: '3600'
		});

		if (uploadError) {
			console.error('Error uploading image:', uploadError);
			throw error(500, "Erreur lors de l'upload de l'image");
		}

		// 11. Get public URL
		const {
			data: { publicUrl }
		} = supabase.storage.from('public').getPublicUrl(fileName);

		// 12. Update item with new icon URL
		const { error: updateError } = await supabase
			.from('shop_item_templates')
			.update({
				icon_url: publicUrl,
				updated_at: new Date().toISOString()
			})
			.eq('id', itemId);

		if (updateError) {
			console.error('Error updating item icon URL:', updateError);
			// Try to clean up uploaded image
			await supabase.storage.from('public').remove([fileName]);
			throw error(500, "Erreur lors de la mise à jour de l'article");
		}

		// 13. Return success response
		return json({
			success: true,
			icon_url: publicUrl,
			message: `Image mise à jour pour "${item.display_name}"`
		});
	} catch (err) {
		console.error('Error in POST /api/admin/shop/items/[id]/image:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all
		throw error(500, 'Erreur serveur interne');
	}
};
