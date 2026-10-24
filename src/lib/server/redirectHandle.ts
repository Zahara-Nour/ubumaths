/**
 * Redirections des anciennes adresses
 *
 * Sorti de `hooks.server.ts` le 2026-10-13 pour être testé seul
 * (`__tests__/redirectHandle.test.ts`) ; sa place dans la chaîne des handles
 * ne change pas.
 *
 * @module server/redirectHandle
 */

import { redirect, type Handle } from '@sveltejs/kit';

/**
 * Pages de démo et de debug rangées sous `/dev` (chantier demo-debug, PR 2) :
 * ancienne adresse → nouvelle. Les sous-pages suivent (`/test-erreur/404` →
 * `/dev/erreurs/page/404`).
 */
const MOVED_PAGES: Record<string, string> = {
	'/demo/theme-test': '/dev/theme',
	'/test-saisie': '/dev/saisie-naturelle',
	'/test-cadres': '/dev/cadres',
	'/test-erreur': '/dev/erreurs/page',
	'/blockly/playground': '/dev/blockly',
	'/dashboard/admin/errors/test': '/dev/erreurs/surveillance',
	'/dashboard/admin/debug/session': '/dev/session',
	'/dashboard/admin/debug/rls': '/dev/rls',
	'/dashboard/admin/debug/api-docs': '/dev/api',
	'/dashboard/admin/debug/avatar': '/dev/avatar',
	'/dashboard/admin/debug/wheel': '/dev/roue',
	'/dashboard/admin/debug/mathfield': '/dev/champ-math',
	'/dashboard/admin/debug/question-preview-base-card': '/dev/apercu-question',
	'/dashboard/admin/debug/correction-mode-b': '/dev/correction-generee',
	'/dashboard/admin/debug/typst-preview': '/dev/pdf-typst',
	'/dashboard/admin/debug/latex-preview': '/dev/pdf-latex',
	'/dashboard/admin/debug/latex-transpiler': '/dev/latex-vers-ubumark',
	'/dashboard/admin/debug/database': '/dashboard/admin/integrite-donnees',
	// Fusions et parts dev (PR 3) ; la plus longue adresse avant son préfixe
	'/dashboard/admin/debug/question-display': '/dev/carte-question',
	'/demo/question-display-demo': '/dev/carte-question',
	'/dashboard/admin/debug/rich-text': '/dev/editeur-riche',
	'/demo/rich-text-editor-demo': '/dev/editeur-riche',
	'/slides/demo-embedded': '/dev/diaporama',
	'/slides/test-transitions': '/dev/diaporama',
	'/slides/demo': '/dev/diaporama',
	'/test-structure': '/dev/structure',
	'/demo/vip-cards-demo/examples': '/dev/cartes/exemples',
	'/demo/vip-cards-demo': '/dev/cartes',
	'/demo/mots-cliquables': '/dev/mots-cliquables'
};

/** Nouvelle adresse d'une page déplacée, ou `null` si `pathname` n'en est pas une. */
function movedPageTarget(pathname: string): string | null {
	// Adresse exacte seulement : les images du PDF de démonstration restent
	// servies sous `static/test-font/`.
	if (pathname === '/test-font' || pathname === '/test-font/') return '/dev/polices';
	for (const [from, to] of Object.entries(MOVED_PAGES)) {
		if (pathname === from || pathname.startsWith(from + '/')) {
			return to + pathname.slice(from.length);
		}
	}
	return null;
}

/**
 * URL Redirect Handle
 * Handles deprecated route redirects to maintain backwards compatibility
 * Includes navigation restructure redirects (2026-01)
 */
export const redirectHandle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// === NAVIGATION RESTRUCTURE REDIRECTS (308 Permanent) ===
	// Note: We access event.url.search only when performing actual redirects
	// to avoid "Cannot access url.search on a page with prerendering enabled" errors

	// Contenu group redirects
	if (pathname.startsWith('/dashboard/teacher/templates')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/templates',
			'/dashboard/teacher/contenu/templates'
		);
		throw redirect(308, newPath + event.url.search);
	}
	if (pathname.startsWith('/dashboard/teacher/exercises')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/exercises',
			'/dashboard/teacher/contenu/exercices'
		);
		throw redirect(308, newPath + event.url.search);
	}
	if (pathname.startsWith('/dashboard/teacher/riddles')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/riddles',
			'/dashboard/teacher/contenu/enigmes'
		);
		throw redirect(308, newPath + event.url.search);
	}
	if (pathname.startsWith('/dashboard/teacher/worksheets')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/worksheets',
			'/dashboard/teacher/contenu/worksheets'
		);
		throw redirect(308, newPath + event.url.search);
	}

	// Gamification group redirects
	if (pathname.startsWith('/dashboard/teacher/rewards')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/rewards',
			'/dashboard/teacher/gamification/rewards'
		);
		throw redirect(308, newPath + event.url.search);
	}
	if (pathname.startsWith('/dashboard/teacher/marketplace')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/marketplace',
			'/dashboard/teacher/gamification/marketplace'
		);
		throw redirect(308, newPath + event.url.search);
	}

	// Moderation group redirects
	if (pathname.startsWith('/dashboard/teacher/warnings')) {
		const newPath = pathname.replace(
			'/dashboard/teacher/warnings',
			'/dashboard/teacher/moderation/avertissements'
		);
		throw redirect(308, newPath + event.url.search);
	}

	// Google Classroom redirect to existing settings/google page
	if (pathname === '/dashboard/teacher/google') {
		throw redirect(308, '/dashboard/teacher/settings/google' + event.url.search);
	}

	// Students redirect (now accessed via Classes)
	if (pathname === '/dashboard/students') {
		throw redirect(308, '/dashboard/teacher/classes');
	}

	// Legacy login path → canonical auth route. The only login route lives at
	// /auth/login ((public)/auth/login); a bare /login matches no route (404).
	// Safety net for external / bookmarked /login URLs (internal code uses
	// /auth/login directly — see src/routes/login-redirect.test.ts).
	if (pathname === '/login') {
		throw redirect(308, '/auth/login' + event.url.search);
	}

	// `/cas` (calculatrice symbolique) retirée le 2026-10-13 : l'atelier fait tout
	// ce qu'elle faisait, avec le même moteur (`docs/wip/atelier-cas-phase0.md`, PR 4).
	// Filet pour les liens gardés et les favoris.
	if (pathname === '/cas' || pathname === '/cas/') {
		throw redirect(308, '/atelier' + event.url.search);
	}

	const movedTo = movedPageTarget(pathname);
	if (movedTo) {
		throw redirect(308, movedTo + event.url.search);
	}

	return resolve(event);
};
