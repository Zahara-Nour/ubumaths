/**
 * Garde de l'interrupteur Google Classroom côté API (constat B8).
 *
 * L'interface est masquée quand `GOOGLE_CLASSROOM_ENABLED` vaut `false`, mais les routes
 * `/api/google/**` restaient appelables à la main par un prof : se connecter à Google,
 * synchroniser, partager. Chaque handler appelle ce garde en premier. Restent ouvertes :
 * `auth/disconnect` (le prof doit pouvoir révoquer l'accès) et `auth/status` (lecture).
 */
import { error } from '@sveltejs/kit';
import { GOOGLE_CLASSROOM_ENABLED } from '$lib/config/google-classroom';

export function assertGoogleClassroomEnabled(): void {
	if (!GOOGLE_CLASSROOM_ENABLED) throw error(403, 'Google Classroom est désactivé');
}
