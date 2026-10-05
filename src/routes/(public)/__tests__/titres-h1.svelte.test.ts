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
import type { Component } from 'svelte';
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

const PAGES: [string, Component<never>, Record<string, unknown>, RegExp][] = [
	['connexion', Login as Component<never>, { form: null }, /Connexion/],
	['inscription', Register as Component<never>, { form: null }, /Créer ton compte/],
	['mot de passe oublié', ResetPassword as Component<never>, { form: null }, /password/i],
	['nouveau mot de passe', UpdatePassword as Component<never>, { form: null }, /password/i],
	['attente d’approbation', PendingApproval as Component<never>, {}, /approbation/],
	['2048', Game2048 as Component<never>, { data: gameData }, /2048/],
	['Mathémo', Mathemo as Component<never>, { data: gameData }, /Mathémo/]
];

describe('titre de niveau 1 des pages publiques', () => {
	it.each(PAGES)('%s : exactement un titre de niveau 1', async (_nom, Page, props, name) => {
		await render(Page, { props: props as never });
		const h1 = page.getByRole('heading', { level: 1 });
		await expect.element(h1).toHaveAccessibleName(name);
		expect(h1.elements()).toHaveLength(1);
	});
});
