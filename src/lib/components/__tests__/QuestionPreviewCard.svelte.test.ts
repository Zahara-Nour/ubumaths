/**
 * QuestionPreviewCard — tuile de la grille Automaths
 *
 * La tuile EST la flash-card (non interactive, retournable), sous le titre et la
 * description du modèle ; un clic sur la tuile n'ouvre rien ; ajout au panier en dessous.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionPreviewCard from '../QuestionPreviewCard.svelte';
import { PREVIEW_SEED } from '$lib/questions/cart-preview';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';
// Modèle réel relu (Entiers #139) : « Le double de … est … », avec un trou
import fixture from '../../../../data/relecture/entiers/139.json';

const TEMPLATE = { ...(fixture.template as unknown as QuestionTemplate), id: 'modele-139' };
const generated = generateInstance(TEMPLATE, PREVIEW_SEED);
const instance = generated.success ? generated.instance : undefined;

async function renderTile() {
	expect(instance).toBeDefined();
	// Décor réel : la page place la grille dans <main>, où `app.css` impose la
	// taille des paragraphes (`main p { … !important }`). Hors <main>, un test de
	// taille passerait à tort.
	const main = document.body.appendChild(document.createElement('main'));
	return await render(QuestionPreviewCard, {
		target: main,
		props: { template: TEMPLATE, preview: instance! }
	});
}

describe('QuestionPreviewCard', () => {
	it("affiche l'énoncé dans la flash-card, sans champ de saisie", async () => {
		const screen = await renderTile();

		expect(screen.container.querySelector('.flip-card-front')?.textContent).toContain('double');
		expect(screen.container.querySelector('math-field, input, textarea')).toBeNull();
	});

	it('propose le retournement et l’ajout au panier', async () => {
		await renderTile();

		await expect
			.element(page.getByRole('button', { name: 'Voir la correction' }).first())
			.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /panier/ })).toBeInTheDocument();
	});

	it('intitulé : titre et description du modèle, sans l’ancien sous-domaine (la rubrique dit la sous-notion)', async () => {
		const screen = await renderTile();
		const heading = screen.container.querySelector<HTMLElement>('[data-tile-heading]');

		expect(heading).not.toBeNull();
		expect(heading!.textContent).toContain(TEMPLATE.title);
		expect(TEMPLATE.subdomain).toBeTruthy();
		expect(heading!.textContent).not.toContain(TEMPLATE.subdomain!);
		// La description distingue les modèles d'une même rubrique (même titre)
		const description = heading!.querySelector<HTMLElement>('[data-tile-description] p');
		expect(description).not.toBeNull();
		// Plus petite que le titre (le rendu Markdown imposait sa propre taille)
		const title = heading!.querySelector<HTMLElement>('.tile-title p');
		expect(parseFloat(getComputedStyle(description!).fontSize)).toBeLessThan(
			parseFloat(getComputedStyle(title!).fontSize)
		);
		expect(heading!.textContent).not.toContain(`${TEMPLATE.theme} /`);
	});

	it("un clic sur l'énoncé n'ouvre rien", async () => {
		const screen = await renderTile();

		// FlipCard rend aussi une copie cachée (mesure de hauteur) : on vise la face visible
		const statement = screen.container.querySelector<HTMLElement>(
			'.flip-card-front .statement-content'
		);
		expect(statement).not.toBeNull();
		await page.elementLocator(statement!).click();

		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});
});
