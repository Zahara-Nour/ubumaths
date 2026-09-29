/**
 * CartQuestionCard — tuile du panier / de la création d'évaluation
 *
 * Ce qui doit se VOIR sans survol : l'aperçu de l'énoncé, la durée, le nombre
 * de répétitions. Clic sur la tuile : la question en grand. Clic sur un bouton
 * de réglage : pas d'ouverture.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import CartQuestionCard from '../CartQuestionCard.svelte';
import { previewCartItem } from '$lib/questions/cart-preview';
import type { QuestionTemplate } from '$lib/questions/types';
import type { CartItem } from '$lib/stores/questionCart.svelte';
// Modèle réel relu (Entiers #139)
import fixture from '../../../../docs/relecture/entiers/139.json';

const TEMPLATE = { ...(fixture.template as unknown as QuestionTemplate), id: 'modele-139' };
const ITEM: CartItem = {
	category: {
		theme: TEMPLATE.theme,
		domain: TEMPLATE.domain,
		subdomain: TEMPLATE.subdomain ?? null,
		level: TEMPLATE.level
	},
	quantity: 3,
	delay: 25
};
const { instance } = previewCartItem([TEMPLATE], ITEM.category);

function renderCard(overrides: { onUpdateDelay?: () => void } = {}) {
	return render(CartQuestionCard, {
		item: ITEM,
		template: TEMPLATE,
		instance,
		onIncrementQuantity: vi.fn(),
		onDecrementQuantity: vi.fn(),
		onUpdateDelay: overrides.onUpdateDelay ?? vi.fn()
	});
}

describe('CartQuestionCard', () => {
	it("affiche l'aperçu de l'énoncé", async () => {
		expect(instance?.statement.length).toBeGreaterThan(0);
		const screen = await renderCard();

		const card = screen.getByRole('button', { name: /Voir la question/ });
		// L'énoncé contient du texte en clair avant toute formule : on en cherche le début
		const firstWords = (instance?.statement ?? '').split('$')[0].trim().slice(0, 12);
		expect(firstWords.length).toBeGreaterThan(0);
		await expect.element(card).toHaveTextContent(firstWords);
	});

	it('affiche la durée et le nombre de répétitions sans survol', async () => {
		await renderCard();

		await expect.element(page.getByTitle('Durée par question')).toHaveTextContent('25 s');
		await expect.element(page.getByTitle('Nombre de répétitions')).toHaveTextContent('3');
	});

	it('ouvre la question en grand au clic sur la tuile', async () => {
		const screen = await renderCard();

		await screen.getByRole('button', { name: /Voir la question/ }).click();

		await expect.element(page.getByRole('dialog')).toBeVisible();
	});

	it("un bouton de réglage change la durée sans ouvrir l'aperçu", async () => {
		const onUpdateDelay = vi.fn();
		const screen = await renderCard({ onUpdateDelay });

		// Geste réel : survoler la tuile révèle les boutons, puis cliquer
		await screen.getByRole('button', { name: /Voir la question/ }).hover();
		const increaseDelay = screen.getByRole('button', { name: 'Augmenter la durée' });
		await expect.element(increaseDelay).toHaveStyle({ opacity: '1' });
		await increaseDelay.click();

		expect(onUpdateDelay).toHaveBeenCalledWith(ITEM.category, 30);
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});
});
