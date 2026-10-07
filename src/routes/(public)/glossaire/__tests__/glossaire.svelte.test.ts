/**
 * Glossaire : un terme de maths expertes se lit en mode « Tous les niveaux »,
 * et un terme du Cabinet Noir renvoie vers sa page.
 */
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Glossaire from '../+page.svelte';

async function openTerm(name: string) {
	await page.getByPlaceholder('Rechercher un terme...').fill(name);
	// Le nom accessible du bouton contient aussi les étiquettes du terme
	await page
		.getByRole('button', { name: new RegExp(`^${name}`) })
		.first()
		.click();
}

describe('glossaire', () => {
	// Avant : « Tous les niveaux » lisait comme un élève de Terminale spécialité,
	// qui n'a pas accès aux contenus de maths expertes : définition vide.
	it('« Tous les niveaux » : la définition d’un terme de maths expertes s’affiche', async () => {
		await render(Glossaire);
		await openTerm('inverse modulaire');
		await expect.element(page.getByRole('dialog')).toHaveTextContent(/si et seulement si/);
	});

	it('un terme du Cabinet Noir renvoie vers sa page', async () => {
		await render(Glossaire);
		await openTerm('décrypter');
		const link = page.getByRole('dialog').getByRole('link', { name: 'Les Dépêches du Czar' });
		await expect.element(link).toHaveAttribute('href', '/chiffrement/depeches');
	});

	it('le filtre propose la Terminale maths expertes', async () => {
		await render(Glossaire);
		await page
			.getByRole('button', { name: /niveau/i })
			.first()
			.click();
		await expect
			.element(page.getByRole('option', { name: 'Terminale maths expertes' }))
			.toBeInTheDocument();
	});
});
