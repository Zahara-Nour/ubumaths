/**
 * CartQuestionCard — tuile du panier / de la création d'évaluation
 *
 * La tuile EST la flash-card (non interactive, retournable), sous « Thème /
 * Domaine » ; en dessous, durée et répétitions toujours visibles, boutons − / +
 * au survol. Un clic sur la tuile n'ouvre rien.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import CartQuestionCard from '../CartQuestionCard.svelte';
import { previewCartItem } from '$lib/questions/cart-preview';
import type { QuestionTemplate } from '$lib/questions/types';
import type { CartItem } from '$lib/stores/questionCart.svelte';
// Modèle réel relu (Entiers #139) : « Le double de … est … », avec un trou
import fixture from '../../../../data/relecture/entiers/139.json';

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

async function renderCard(overrides: { onUpdateDelay?: () => void } = {}) {
	return await render(CartQuestionCard, {
		item: ITEM,
		instance,
		onIncrementQuantity: vi.fn(),
		onDecrementQuantity: vi.fn(),
		onUpdateDelay: overrides.onUpdateDelay ?? vi.fn()
	});
}

describe('CartQuestionCard', () => {
	it('affiche « Thème / Domaine » au-dessus de la flash-card', async () => {
		const screen = await renderCard();

		await expect
			.element(screen.getByText(`${TEMPLATE.theme}`, { exact: false }).first())
			.toHaveTextContent(`${TEMPLATE.theme} / ${TEMPLATE.domain}`);
	});

	it("affiche l'énoncé dans la flash-card, sans champ de saisie", async () => {
		expect(instance).toBeDefined();
		const screen = await renderCard();
		const front = screen.container.querySelector<HTMLElement>('.flip-card-front');

		expect(front?.textContent).toContain('double');
		expect(screen.container.querySelector('math-field, input, textarea')).toBeNull();
	});

	it('propose le bouton de retournement de la flash-card', async () => {
		await renderCard();

		await expect
			.element(page.getByRole('button', { name: 'Voir la correction' }).first())
			.toBeInTheDocument();
	});

	it('affiche la durée et le nombre de répétitions sans survol', async () => {
		await renderCard();

		await expect.element(page.getByTitle('Durée par question')).toHaveTextContent('25 s');
		await expect.element(page.getByTitle('Nombre de répétitions')).toHaveTextContent('3');
	});

	it("un clic sur l'énoncé n'ouvre rien", async () => {
		const screen = await renderCard();

		// FlipCard rend aussi une copie cachée (mesure de hauteur) : on vise la face visible
		const statement = screen.container.querySelector<HTMLElement>(
			'.flip-card-front .statement-content'
		);
		expect(statement).not.toBeNull();
		await page.elementLocator(statement!).click();

		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});

	it('un bouton de réglage change la durée', async () => {
		const onUpdateDelay = vi.fn();
		const screen = await renderCard({ onUpdateDelay });

		// Geste réel : survoler la tuile révèle les boutons, puis cliquer
		await screen.getByTitle('Durée par question').hover();
		await screen.getByRole('button', { name: 'Augmenter la durée' }).click();

		expect(onUpdateDelay).toHaveBeenCalledWith(ITEM.category, 30);
	});

	/**
	 * Survol (décision de David, 2026-09-29) : durée et répétitions toujours
	 * visibles, leurs boutons − / + seulement au survol ou au focus clavier.
	 * Vérifiable depuis que les tests navigateur chargent Tailwind (#544).
	 */
	describe('boutons − / + révélés au survol', () => {
		// La souris garde sa position d'un test à l'autre : on l'éloigne de la tuile,
		// sinon le survol d'un test précédent rend les boutons visibles à tort.
		async function renderAtRest() {
			const screen = await renderCard();
			await userEvent.unhover(screen.getByTitle('Durée par question'));
			return screen;
		}

		const CONTROL_LABELS = [
			'Diminuer la durée',
			'Augmenter la durée',
			'Diminuer le nombre de répétitions',
			'Augmenter le nombre de répétitions'
		];

		it('au repos : boutons invisibles, valeurs visibles', async () => {
			const screen = await renderAtRest();

			for (const name of CONTROL_LABELS) {
				await expect.element(screen.getByRole('button', { name })).toHaveStyle({ opacity: '0' });
			}
			await expect.element(screen.getByTitle('Durée par question')).toHaveStyle({ opacity: '1' });
			await expect
				.element(screen.getByTitle('Nombre de répétitions'))
				.toHaveStyle({ opacity: '1' });
		});

		it('au survol de la tuile : les quatre boutons apparaissent', async () => {
			const screen = await renderAtRest();

			await screen.getByTitle('Durée par question').hover();

			for (const name of CONTROL_LABELS) {
				await expect.element(screen.getByRole('button', { name })).toHaveStyle({ opacity: '1' });
			}
		});

		it('au focus clavier : les boutons apparaissent aussi', async () => {
			const screen = await renderAtRest();

			const button = screen.getByRole('button', { name: 'Augmenter la durée' });
			await expect.element(button).toHaveStyle({ opacity: '0' });
			(button.element() as HTMLElement).focus();

			await expect.element(button).toHaveStyle({ opacity: '1' });
		});
	});
});
