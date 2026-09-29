/**
 * QuestionPreviewCard — tuile de la grille Automaths
 *
 * La tuile EST la flash-card (non interactive, retournable), sous « Thème /
 * Domaine » ; un clic sur la tuile n'ouvre rien ; ajout au panier en dessous.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionPreviewCard from '../QuestionPreviewCard.svelte';
import { previewCartItem } from '$lib/questions/cart-preview';
import type { QuestionTemplate } from '$lib/questions/types';
// Modèle réel relu (Entiers #139) : « Le double de … est … », avec un trou
import fixture from '../../../../docs/relecture/entiers/139.json';

const TEMPLATE = { ...(fixture.template as unknown as QuestionTemplate), id: 'modele-139' };
const { instance } = previewCartItem([TEMPLATE], {
	theme: TEMPLATE.theme,
	domain: TEMPLATE.domain,
	subdomain: TEMPLATE.subdomain ?? null,
	level: TEMPLATE.level
});

async function renderTile() {
	expect(instance).toBeDefined();
	return await render(QuestionPreviewCard, { template: TEMPLATE, preview: instance! });
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
