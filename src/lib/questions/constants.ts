/**
 * Question system constants
 */

/** Supabase Storage bucket name for question images */
export const QUESTION_IMAGES_BUCKET = 'question-images';

/**
 * Build the full public URL for a question image from its relative path.
 *
 * @param supabaseUrl - The Supabase project URL (PUBLIC_SUPABASE_URL)
 * @param relativePath - Image path relative to the bucket root (e.g. "entiers/reperage/image.webp")
 * @returns Full public URL
 */
export function getQuestionImageUrl(supabaseUrl: string, relativePath: string): string {
	return `${supabaseUrl}/storage/v1/object/public/${QUESTION_IMAGES_BUCKET}/${relativePath}`;
}
