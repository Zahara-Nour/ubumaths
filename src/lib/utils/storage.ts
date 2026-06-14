import { PUBLIC_SUPABASE_URL } from '$env/static/public';

/**
 * Build a public Supabase Storage URL from a bucket id + object path, derived
 * from `PUBLIC_SUPABASE_URL` so it survives project/region migrations — never
 * hardcode the Supabase host. For question images specifically, see
 * `getQuestionImageUrl` in `$lib/questions/constants`.
 *
 * @param bucket - Storage bucket id (e.g. "vip-card-images")
 * @param path - Object path relative to the bucket root (e.g. "super-bonus@0.5x.webp")
 */
export function storageUrl(bucket: string, path: string): string {
	return `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
