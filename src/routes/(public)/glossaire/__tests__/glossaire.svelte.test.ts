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

	// Avant : la fiche d'un renvoi n'affichait que « Forme dérivée de X », faux
	// pour un raccourci ou un nom propre, et il fallait cliquer encore pour lire.
	it('un renvoi affiche la définition du terme cité, sans clic de plus', async () => {
		await render(Glossaire);
		await openTerm('multiplier');
		const dialog = page.getByRole('dialog');
		await expect.element(dialog).toHaveTextContent(/Voir : multiplication/);
		await expect.element(dialog).toHaveTextContent(/compter vite des paquets identiques/);
		await expect.element(dialog).not.toHaveTextContent(/Forme dérivée/);
	});

	it('la définition du terme cité suit le niveau choisi', async () => {
		await render(Glossaire);
		await page
			.getByRole('button', { name: /niveau/i })
			.first()
			.click();
		await page.getByRole('option', { name: 'CP', exact: true }).click();
		await openTerm('multiplier');
		const dialog = page.getByRole('dialog');
		await expect.element(dialog).toHaveTextContent(/compter vite des paquets identiques/);
		// Définition de CE1 : pas encore pour un lecteur de CP
		await expect.element(dialog).not.toHaveTextContent(/addition répétée/);
	});

	it('un renvoi qui a sa propre définition garde la sienne', async () => {
		await render(Glossaire);
		await openTerm('Thalès');
		const dialog = page.getByRole('dialog');
		await expect.element(dialog).toHaveTextContent(/Mathématicien grec/);
		await expect
			.element(dialog.getByRole('button', { name: 'théorème de Thalès' }))
			.toBeInTheDocument();
		// Ni remplacée ni doublée par celle du théorème
		await expect.element(dialog).not.toHaveTextContent(/droites sécantes/);
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

	// Les mots de la 1re générale (enseignement scientifique) ne se voyaient
	// qu'en « Tous les niveaux » : aucun autre niveau n'y donne accès.
	it('le filtre propose la 1re générale, qui montre ses mots', async () => {
		await render(Glossaire);
		await page
			.getByRole('button', { name: /niveau/i })
			.first()
			.click();
		await page.getByRole('option', { name: '1ère générale (maths spécifiques)' }).click();
		await page.getByPlaceholder('Rechercher un terme...').fill('discret');
		await expect.element(page.getByRole('button', { name: /^discret/ })).toBeInTheDocument();
	});

	// Un mot de 1re spé que nomme aussi le programme de 1re techno lui est partagé
	it('le filtre propose la 1re techno, qui voit les mots partagés avec elle', async () => {
		await render(Glossaire);
		await page
			.getByRole('button', { name: /niveau/i })
			.first()
			.click();
		await page.getByRole('option', { name: '1ère technologique' }).click();
		await page.getByPlaceholder('Rechercher un terme...').fill('nombre dérivé');
		await expect.element(page.getByRole('button', { name: /^nombre dérivé/ })).toBeInTheDocument();
		// « discriminant », de 1re spé, est exclu du programme de 1re techno
		await page.getByPlaceholder('Rechercher un terme...').fill('discriminant');
		await expect
			.element(page.getByRole('button', { name: /^discriminant/ }))
			.not.toBeInTheDocument();
	});
});
