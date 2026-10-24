/**
 * Garde des espaces réservés `/dev` et `/aide-ecriture` (chantier demo-debug)
 * ===========================================================================
 *
 * Décision de David (2026-10-24) : la garde vit dans le hook, pas dans un layout. Un
 * layout ne protège ni les loads de page lancés en parallèle, ni les actions de
 * formulaire ; ici, aucun load serveur, aucune action ni aucun `+server.ts` de ces
 * espaces ne s'exécute avant la garde, et une page déplacée plus tard sous `/dev` est
 * gardée d'office.
 *
 * ⚠️ Navigation côté client : le hook ne tourne que si le navigateur demande
 * `__data.json`. Chaque espace a donc son `+layout.server.ts`, nœud serveur neuf à
 * l'entrée dans l'espace, qui force cette requête et refait le contrôle
 * (`checkReservedArea`). Un load universel (`+page.ts`) ou une requête Supabase faite
 * dans le navigateur ne passent pas par le serveur : aucune donnée sensible par là.
 *
 * - `/dev` (pages de dev) : admin seul — vrai compte admin, ou prof élevé (mêmes
 *   conditions que `requireAdmin`). Prof non élevé : écran d'élévation, puis retour.
 * - `/aide-ecriture` (aides pour écrire du contenu) : prof seul, élevé ou non. Un vrai
 *   compte admin est refusé : contenu pédagogique = prof, jamais l'admin.
 *
 * Posé dans le hook APRÈS `adminElevationHandle` (qui remplit `locals.adminElevation`).
 */

import { error, redirect, type Handle, type RequestEvent } from '@sveltejs/kit';

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Espaces gardés, par IDENTIFIANT de route, jamais par chemin brut : SvelteKit route
 * sur le chemin décodé (`/%64ev` atteint `/dev`), un test sur `url.pathname` se contourne.
 */
const DEV_ROUTE = '/(protected)/dev';
const AIDE_ECRITURE_ROUTE = '/(protected)/aide-ecriture';

/** Méthodes qui ne modifient rien : seules elles sont redirigées, les autres refusées. */
const METHODES_LECTURE = new Set(['GET', 'HEAD']);

// ============================================================================
// FUNCTIONS
// ============================================================================

function isUnder(routeId: string, area: string): boolean {
	return routeId === area || routeId.startsWith(`${area}/`);
}

function isAdmin(locals: App.Locals): boolean {
	const elevated = Boolean(locals.adminElevation?.active && locals.adminSupabase);
	return elevated || locals.profile?.role === 'admin';
}

/** Visiteur : page de connexion en lecture, 401 en écriture. */
function refuseVisitor(event: RequestEvent): never {
	if (METHODES_LECTURE.has(event.request.method)) throw redirect(303, '/auth/login');
	throw error(401, 'Non autorisé - Authentification requise');
}

/**
 * Contrôle d'accès aux espaces réservés : lève une redirection ou une erreur si le
 * compte n'y a pas droit, ne fait rien sinon (ou hors des deux espaces). Appelé par le
 * hook et, en défense en profondeur, par le `+layout.server.ts` de chaque espace.
 */
export function checkReservedArea(event: RequestEvent): void {
	const routeId = event.route.id;
	if (!routeId) return;

	const { locals } = event;

	if (isUnder(routeId, DEV_ROUTE)) {
		if (!locals.user) refuseVisitor(event);
		if (isAdmin(locals)) return;
		if (locals.profile?.role === 'teacher' && METHODES_LECTURE.has(event.request.method)) {
			throw redirect(303, `/dashboard/elevate?redirect=${encodeURIComponent(event.url.pathname)}`);
		}
		throw error(403, "Accès réservé à l'administration");
	}

	if (isUnder(routeId, AIDE_ECRITURE_ROUTE)) {
		if (!locals.user) refuseVisitor(event);
		if (locals.profile?.role === 'teacher') return;
		throw error(403, 'Accès réservé au professeur');
	}
}

// ============================================================================
// HANDLE
// ============================================================================

export const reservedAreasHandle: Handle = async ({ event, resolve }) => {
	checkReservedArea(event);
	return resolve(event);
};
