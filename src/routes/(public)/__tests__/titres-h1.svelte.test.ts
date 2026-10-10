/**
 * Un seul titre de niveau 1 par page publique.
 *
 * Le logo de l'en-tête n'est plus un `<h1>` (#847) : chaque page doit porter le
 * sien, pour les lecteurs d'écran et pour les moteurs. Ces pages-ci n'en avaient
 * pas (inventaire sur les pages rendues, 2026-10-05).
 */
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { readable } from 'svelte/store';
import Login from '../auth/login/+page.svelte';
import Register from '../auth/register/+page.svelte';
import ResetPassword from '../auth/reset-password/+page.svelte';
import UpdatePassword from '../auth/update-password/+page.svelte';
import PendingApproval from '../auth/pending-approval/+page.svelte';
import Game2048 from '../games/2048/+page.svelte';
import Mathemo from '../games/mathemo/+page.svelte';

// La connexion lit `?error=` dans l'URL (store `page`)
vi.mock('$app/stores', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/stores')>()),
	page: readable({ url: new URL('http://localhost/auth/login') })
}));

const gameData = {
	serverBestScore: 0,
	canSaveScore: false,
	vipCards: [],
	undoCardsAvailable: 0,
	bombCardsAvailable: 0
};

// Chaque page est rendue par une fonction : `render` infère ainsi le type exact
// de chaque composant (un tableau de composants hétérogènes perd cette inférence).
type RenderPage = () => Promise<{ container: HTMLElement }>;

// Les pages de jeu reçoivent une partie seulement de leur `PageData` (les données
// du layout manquent) : d'où le `as never`, déjà présent avant ce typage.
const PAGES: [string, RenderPage, RegExp][] = [
	['connexion', async () => await render(Login, { props: { form: null } }), /Connexion/],
	[
		'inscription',
		async () => await render(Register, { props: { form: null } }),
		/Créer ton compte/
	],
	[
		'mot de passe oublié',
		async () => await render(ResetPassword, { props: { form: null } }),
		/^Mot de passe oublié$/
	],
	[
		'nouveau mot de passe',
		async () => await render(UpdatePassword, { props: { form: null } }),
		/^Nouveau mot de passe$/
	],
	[
		'attente d’approbation',
		async () => await render(PendingApproval, { props: {} }),
		/approbation/
	],
	['2048', async () => await render(Game2048, { props: { data: gameData } as never }), /2048/],
	// Mathémo reçoit ses mots du serveur (dictionnaire en base, ADR 0022)
	[
		'Mathémo',
		async () =>
			await render(Mathemo, {
				props: { data: { ...gameData, words: [{ term: 'carré', grade: '6' }] } } as never
			}),
		/Mathémo/
	]
];

describe('titre de niveau 1 des pages publiques', () => {
	it.each(PAGES)('%s : exactement un titre de niveau 1', async (_nom, renderPage, name) => {
		await renderPage();
		const h1 = page.getByRole('heading', { level: 1 });
		await expect.element(h1).toHaveAccessibleName(name);
		expect(h1.elements()).toHaveLength(1);
	});

	// Plus un mot d'anglais sur le parcours « mot de passe oublié »
	it.each<[string, RenderPage]>([
		['mot de passe oublié', async () => await render(ResetPassword, { props: { form: null } })],
		['nouveau mot de passe', async () => await render(UpdatePassword, { props: { form: null } })]
	])('%s : entièrement en français', async (_nom, renderPage) => {
		const screen = await renderPage();
		const text = screen.container.textContent ?? '';
		expect(text).not.toMatch(
			/\b(password|reset|email address|send|update|back to|new|confirm|characters|letters|numbers)\b/i
		);
	});
});
