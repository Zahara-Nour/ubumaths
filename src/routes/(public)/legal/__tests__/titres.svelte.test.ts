import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Component } from 'svelte';
import Mentions from '../mentions-legales/+page.svelte';
import Confidentialite from '../confidentialite/+page.svelte';
import Cgu from '../cgu/+page.svelte';

describe('titres des pages légales, accentués', () => {
	it.each([
		['mentions légales', Mentions, 'Mentions légales'],
		['confidentialité', Confidentialite, 'Politique de confidentialité'],
		['CGU', Cgu, 'Conditions générales d’utilisation']
	] as [string, Component, string][])('%s', async (_nom, Page, titre) => {
		const screen = await render(Page);
		await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(titre);
	});
});

describe('intertitres des pages légales, accentués', () => {
	it.each([
		['confidentialité', '3. Données personnelles collectées', Confidentialite, 2],
		['confidentialité', '9. Sécurité des données', Confidentialite, 2],
		['confidentialité', '3.2 Données pédagogiques', Confidentialite, 3],
		['mentions légales', '1. Éditeur du site', Mentions, 2],
		['mentions légales', '2. Hébergement', Mentions, 2],
		['mentions légales', '3. Propriété intellectuelle', Mentions, 2],
		['mentions légales', '9. Crédits', Mentions, 2],
		['CGU', '2. Présentation du Service', Cgu, 2],
		['CGU', '3. Accès au Service', Cgu, 2],
		['CGU', '2.1 Fonctionnalités principales', Cgu, 3]
	] as [string, string, Component, number][])('%s : %s', async (_nom, titre, Page, niveau) => {
		const screen = await render(Page);
		await expect.element(screen.getByRole('heading', { level: niveau, name: titre })).toBeVisible();
	});
});
