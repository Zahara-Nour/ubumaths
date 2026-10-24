/**
 * Redirections des anciennes adresses (`redirectHandle`)
 * ======================================================
 *
 * `/cas` est retirée le 2026-10-13 : l'atelier la remplace (phase 0
 * `docs/wip/atelier-cas-phase0.md`, PR 4). Un lien gardé ou un favori mène à
 * `/atelier` en 308 (permanente, comme les autres anciennes routes), la query
 * string comprise.
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { redirectHandle } from '../redirectHandle';

// ============================================================================
// HELPERS
// ============================================================================

/** La redirection produite pour une adresse, ou `null` si la requête passe. */
async function redirectionOf(path: string): Promise<{ status: number; location: string } | null> {
	const event = { url: new URL(`https://www.chiph.re${path}`) } as unknown as RequestEvent;
	const resolve = vi.fn().mockResolvedValue(new Response('ok'));
	try {
		await redirectHandle({ event, resolve });
		return null;
	} catch (e) {
		const thrown = e as { status: number; location: string };
		return { status: thrown.status, location: thrown.location };
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe('redirectHandle — /cas, remplacée par l’atelier', () => {
	it('/cas mène à /atelier, en 308', async () => {
		expect(await redirectionOf('/cas')).toEqual({ status: 308, location: '/atelier' });
	});

	it('/cas/ aussi', async () => {
		expect(await redirectionOf('/cas/')).toEqual({ status: 308, location: '/atelier' });
	});

	it('la query string suit', async () => {
		expect(await redirectionOf('/cas?expr=x%5E2')).toEqual({
			status: 308,
			location: '/atelier?expr=x%5E2'
		});
	});

	it('une adresse qui commence seulement par « /cas » passe', async () => {
		expect(await redirectionOf('/casino')).toBeNull();
		expect(await redirectionOf('/calc')).toBeNull();
		expect(await redirectionOf('/atelier')).toBeNull();
	});
});

describe('redirectHandle — pages de démo et de debug rangées sous /dev', () => {
	it.each([
		['/demo/theme-test', '/dev/theme'],
		['/test-saisie', '/dev/saisie-naturelle'],
		['/test-cadres', '/dev/cadres'],
		['/test-font', '/dev/polices'],
		['/test-erreur', '/dev/erreurs/page'],
		['/blockly/playground', '/dev/blockly'],
		['/dashboard/admin/errors/test', '/dev/erreurs/surveillance'],
		['/dashboard/admin/debug/session', '/dev/session'],
		['/dashboard/admin/debug/rls', '/dev/rls'],
		['/dashboard/admin/debug/api-docs', '/dev/api'],
		['/dashboard/admin/debug/avatar', '/dev/avatar'],
		['/dashboard/admin/debug/wheel', '/dev/roue'],
		['/dashboard/admin/debug/mathfield', '/dev/champ-math'],
		['/dashboard/admin/debug/question-preview-base-card', '/dev/apercu-question'],
		['/dashboard/admin/debug/correction-mode-b', '/dev/correction-generee'],
		['/dashboard/admin/debug/typst-preview', '/dev/pdf-typst'],
		['/dashboard/admin/debug/latex-preview', '/dev/pdf-latex'],
		['/dashboard/admin/debug/latex-transpiler', '/dev/latex-vers-ubumark'],
		['/dashboard/admin/debug/database', '/dashboard/admin/integrite-donnees'],
		['/dashboard/admin/debug/question-display', '/dev/carte-question'],
		['/demo/question-display-demo', '/dev/carte-question'],
		['/dashboard/admin/debug/rich-text', '/dev/editeur-riche'],
		['/demo/rich-text-editor-demo', '/dev/editeur-riche'],
		['/slides/demo', '/dev/diaporama'],
		['/slides/demo-embedded', '/dev/diaporama'],
		['/slides/test-transitions', '/dev/diaporama'],
		['/test-structure', '/dev/structure'],
		['/demo/vip-cards-demo', '/dev/cartes'],
		['/demo/mots-cliquables', '/dev/mots-cliquables']
	])('%s mène à %s, en 308', async (from, to) => {
		expect(await redirectionOf(from)).toEqual({ status: 308, location: to });
	});

	it('les sous-pages et la query string suivent', async () => {
		expect(await redirectionOf('/test-erreur/404?message=Not%20Found')).toEqual({
			status: 308,
			location: '/dev/erreurs/page/404?message=Not%20Found'
		});
		expect(await redirectionOf('/test-erreur/plantage')).toEqual({
			status: 308,
			location: '/dev/erreurs/page/plantage'
		});
		expect(await redirectionOf('/demo/vip-cards-demo/examples')).toEqual({
			status: 308,
			location: '/dev/cartes/exemples'
		});
	});

	it('les images de /test-font/ restent servies, sans redirection', async () => {
		expect(await redirectionOf('/test-font/courbe.png')).toBeNull();
	});

	it('une adresse qui commence seulement pareil passe', async () => {
		expect(await redirectionOf('/test-cadresX')).toBeNull();
		expect(await redirectionOf('/dashboard/admin/errors')).toBeNull();
		expect(await redirectionOf('/dashboard/admin/errors/42')).toBeNull();
		expect(await redirectionOf('/slides/demox')).toBeNull();
		expect(await redirectionOf('/demo/trig-circle-demo')).toBeNull();
		expect(await redirectionOf('/demo')).toBeNull();
	});
});

describe('redirectHandle — les anciennes routes déjà redirigées', () => {
	it('/login mène toujours à /auth/login', async () => {
		expect(await redirectionOf('/login?error=x')).toEqual({
			status: 308,
			location: '/auth/login?error=x'
		});
	});

	it('/dashboard/teacher/templates mène toujours au contenu', async () => {
		expect(await redirectionOf('/dashboard/teacher/templates/12')).toEqual({
			status: 308,
			location: '/dashboard/teacher/contenu/templates/12'
		});
	});
});
