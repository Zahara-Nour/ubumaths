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

// C13 (décision de David, 2026-10-11) : la page citait Supabase, Vercel et Google seulement,
// et annonçait des journaux gardés 90 jours (purgés à 30 par run_cleanup_expired_data).
describe('confidentialité : sous-traitants et durées réelles', () => {
	it.each(['Brevo', 'Groq', 'Hugging Face'])('le sous-traitant %s est cité', async (nom) => {
		const screen = await render(Confidentialite);
		await expect.element(screen.getByRole('cell', { name: nom, exact: true })).toBeVisible();
	});

	it('les journaux techniques sont annoncés à 30 jours', async () => {
		const screen = await render(Confidentialite);
		const ligne = screen.getByRole('row', { name: /Logs techniques/ });
		await expect.element(ligne).toHaveTextContent('30 jours');
	});
});

// C11 (décisions de David, 2026-10-11) : les durées annoncées sont celles de la purge.
describe('confidentialité : durées de conservation appliquées', () => {
	it.each([
		['Profil utilisateur (élève)', 'Supprimé après 5 ans sans activité'],
		['Conversations avec le tuteur IA', '1 an après le dernier message'],
		['Préinscriptions non activées', '1 an']
	])('%s : %s', async (type, duree) => {
		const screen = await render(Confidentialite);
		await expect
			.element(screen.getByRole('row', { name: new RegExp(type.replace(/[()]/g, '\\$&')) }))
			.toHaveTextContent(duree);
	});
});
