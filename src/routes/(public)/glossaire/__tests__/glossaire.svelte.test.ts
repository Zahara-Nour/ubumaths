/**
 * Glossaire : la liste mène à la page de chaque terme (`/glossaire/<slug>`, chantier
 * seo, choix B1 de David : plus de fenêtre) ; le filtre de niveau trie la liste.
 * Le contenu d'un terme est testé avec sa page : `[slug]/__tests__/`.
 */
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { REFERENCE_DICTIONARY } from '../../../../../tests/fixtures/lexique/dictionnaire-reference';
import { termKey, type GlossarySlugs } from '$lib/dictionary/glossary-page';
import Glossaire from '../+page.svelte';
import type { PageData } from '../$types';

/** Adresses des entrées de référence, à la règle de la base (minuscules, sans accents, tirets). */
const SLUGS: GlossarySlugs = Object.fromEntries(
	REFERENCE_DICTIONARY.map((t) => [
		termKey(t),
		`${t.term} ${t.sense ?? ''}`
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
	])
);

/** Le glossaire, avec les entrées que lui donne le serveur (ici, celles du fichier).
 *  La page ne lit que `entries` et `slugs` : le reste de PageData (session, profil,
 *  venus du layout) n'est pas fabriqué, mais les deux restent vérifiés par `satisfies`. */
async function renderGlossaire() {
	const data = { entries: REFERENCE_DICTIONARY, slugs: SLUGS } satisfies Pick<
		PageData,
		'entries' | 'slugs'
	>;
	return await render(Glossaire, {
		props: { params: {}, data: data as PageData, form: undefined }
	});
}

/** Le lien d'un terme dans la liste (son nom accessible contient aussi ses étiquettes). */
async function termLink(name: string) {
	await page.getByPlaceholder('Rechercher un terme...').fill(name);
	return page.getByRole('link', { name: new RegExp(`^${name}`) }).first();
}

describe('glossaire', () => {
	it('chaque terme mène à sa page', async () => {
		await renderGlossaire();
		await expect
			.element(await termLink('inverse modulaire'))
			.toHaveAttribute('href', '/glossaire/inverse-modulaire');
	});

	it('un homonyme mène à la page de son sens', async () => {
		await renderGlossaire();
		const carre = REFERENCE_DICTIONARY.filter((t) => t.term === 'carré' && t.sense);
		expect(carre.length).toBeGreaterThan(1);
		await page.getByPlaceholder('Rechercher un terme...').fill('carré');
		for (const t of carre) {
			await expect
				.element(page.getByRole('link', { name: new RegExp(`^carré\\s*\\(${t.sense}\\)`) }))
				.toHaveAttribute('href', `/glossaire/${SLUGS[termKey(t)]}`);
		}
	});

	it('un renvoi nu mène droit à la page du terme cité', async () => {
		await renderGlossaire();
		await expect
			.element(await termLink('multiplier'))
			.toHaveAttribute('href', '/glossaire/multiplication');
	});

	it('un renvoi qui a sa propre définition mène à sa page', async () => {
		await renderGlossaire();
		await expect.element(await termLink('Thalès')).toHaveAttribute('href', '/glossaire/thales');
	});

	it('le filtre propose la Terminale maths expertes', async () => {
		await renderGlossaire();
		await page
			.getByRole('button', { name: /niveau/i })
			.first()
			.click();
		await expect
			.element(page.getByRole('option', { name: 'Terminale maths expertes' }))
			.toBeInTheDocument();
	});

	// Ces élèves voient les mots partagés avec leur 1re : le filtre doit pouvoir le montrer
	it('le filtre propose la Terminale maths complémentaires et la Terminale techno', async () => {
		await renderGlossaire();
		await page
			.getByRole('button', { name: /niveau/i })
			.first()
			.click();
		await expect
			.element(page.getByRole('option', { name: 'Terminale maths complémentaires' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('option', { name: 'Terminale technologique' }))
			.toBeInTheDocument();
	});

	// Les mots de la 1re générale (enseignement scientifique) ne se voyaient
	// qu'en « Tous les niveaux » : aucun autre niveau n'y donne accès.
	it('le filtre propose la 1re générale, qui montre ses mots', async () => {
		await renderGlossaire();
		await page
			.getByRole('button', { name: /niveau/i })
			.first()
			.click();
		await page.getByRole('option', { name: '1ère générale (maths spécifiques)' }).click();
		await page.getByPlaceholder('Rechercher un terme...').fill('discret');
		await expect.element(page.getByRole('link', { name: /^discret/ })).toBeInTheDocument();
	});

	// Un mot de 1re spé que nomme aussi le programme de 1re techno lui est partagé
	it('le filtre propose la 1re techno, qui voit les mots partagés avec elle', async () => {
		await renderGlossaire();
		await page
			.getByRole('button', { name: /niveau/i })
			.first()
			.click();
		await page.getByRole('option', { name: '1ère technologique' }).click();
		await page.getByPlaceholder('Rechercher un terme...').fill('nombre dérivé');
		await expect.element(page.getByRole('link', { name: /^nombre dérivé/ })).toBeInTheDocument();
		// Le niveau affiché est celui où l'élève de 1re techno rencontre le mot
		await expect
			.element(page.getByRole('link', { name: /^nombre dérivé/ }))
			.toHaveTextContent(/1ère technologique/);
		await expect
			.element(page.getByRole('link', { name: /^nombre dérivé/ }))
			.not.toHaveTextContent(/spécialité/);
		// « discriminant », de 1re spé, est exclu du programme de 1re techno
		await page.getByPlaceholder('Rechercher un terme...').fill('discriminant');
		await expect.element(page.getByRole('link', { name: /^discriminant/ })).not.toBeInTheDocument();
	});

	it('le niveau affiché dans la liste suit le filtre', async () => {
		await renderGlossaire();
		await expect.element(await termLink('nombre dérivé')).toHaveTextContent(/spécialité/);
		await page
			.getByRole('button', { name: /niveau/i })
			.first()
			.click();
		await page.getByRole('option', { name: '1ère technologique' }).click();
		await expect.element(await termLink('nombre dérivé')).toHaveTextContent(/1ère technologique/);
	});

	it('plus de fenêtre : un terme est un lien, pas un bouton qui s’ouvre sur place', async () => {
		await renderGlossaire();
		await expect.element(await termLink('inverse modulaire')).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: /^inverse modulaire/ }))
			.not.toBeInTheDocument();
	});
});
