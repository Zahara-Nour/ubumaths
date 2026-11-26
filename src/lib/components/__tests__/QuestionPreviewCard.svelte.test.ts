/**
 * QuestionPreviewCard — tuile de la grille Automaths
 *
 * La tuile EST la flash-card (non interactive, retournable), sous le titre et la
 * description du modèle ; un clic sur la tuile n'ouvre rien ; ajout au panier en dessous.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionPreviewCard from '../QuestionPreviewCard.svelte';
import { questionCart } from '#lib/stores/questionCart.svelte.ts';
import { PREVIEW_SEED } from '#lib/questions/cart-preview.ts';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionTemplate } from '#lib/questions/types.ts';
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
	beforeEach(() => {
		questionCart.clearCart();
	});

	it("affiche l'énoncé dans la flash-card, sans champ de saisie", async () => {
		const screen = await renderTile();

		expect(screen.container.querySelector('.flip-card-front')?.textContent).toContain('double');
		expect(screen.container.querySelector('math-field, input, textarea')).toBeNull();
	});

	it('propose le retournement et l’ajout à « Ma série »', async () => {
		await renderTile();

		await expect
			.element(page.getByRole('button', { name: 'Voir la correction' }).first())
			.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /ma série/ })).toBeInTheDocument();
	});

	it('intitulé : titre et description du modèle (la rubrique dit la sous-notion)', async () => {
		const screen = await renderTile();
		const heading = screen.container.querySelector<HTMLElement>('[data-tile-heading]');

		expect(heading).not.toBeNull();
		expect(heading!.textContent).toContain(TEMPLATE.title);
		// La description distingue les modèles d'une même rubrique (même titre)
		const description = heading!.querySelector<HTMLElement>('[data-tile-description] p');
		expect(description).not.toBeNull();
		// Plus petite que le titre (le rendu Markdown imposait sa propre taille)
		const title = heading!.querySelector<HTMLElement>('.tile-title p');
		expect(parseFloat(getComputedStyle(description!).fontSize)).toBeLessThan(
			parseFloat(getComputedStyle(title!).fontSize)
		);
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

	it('« Dans ma série » retire la question : le bouton redevient « Ajouter »', async () => {
		await renderTile();

		await page.getByRole('button', { name: 'Ajouter à ma série' }).click();
		const inCart = page.getByRole('button', { name: 'Dans ma série : retirer' });
		await expect.element(inCart).toBeEnabled();
		await expect.element(inCart).toHaveAttribute('title', 'Retirer de ma série');
		expect(questionCart.hasTemplate(TEMPLATE.id)).toBe(true);

		await inCart.click();

		await expect.element(page.getByRole('button', { name: 'Ajouter à ma série' })).toBeVisible();
		expect(questionCart.hasTemplate(TEMPLATE.id)).toBe(false);
	});

	it('retrait : répétitions et durée (45 s) réglées dans le panier partent avec la question', async () => {
		questionCart.addToCart(TEMPLATE.id, 3, 45);
		await renderTile();

		await page.getByRole('button', { name: 'Dans ma série : retirer' }).click();
		await page.getByRole('button', { name: 'Ajouter à ma série' }).click();

		expect(questionCart.getItem(TEMPLATE.id)).toMatchObject({ quantity: 1 });
		expect(questionCart.getItem(TEMPLATE.id)?.delay).not.toBe(45);
	});
});

/**
 * Chantier `automaths`, PR A (phase 0 validée le 2026-11-26) : ligne fine
 * au-dessus de la carte (niveaux à gauche, « ‹ 2/5 › » à droite), bouton de
 * retournement de 32 px, carte 1,5 × plus haute.
 */
describe('QuestionPreviewCard — ligne des niveaux et des variations', () => {
	beforeEach(() => {
		questionCart.clearCart();
	});

	async function renderWith(template: QuestionTemplate) {
		const generatedFor = generateInstance(template, PREVIEW_SEED);
		expect(generatedFor.success).toBe(true);
		const main = document.body.appendChild(document.createElement('main'));
		return await render(QuestionPreviewCard, {
			target: main,
			props: { template, preview: generatedFor.success ? generatedFor.instance : instance! }
		});
	}

	function frontStatement(container: HTMLElement): string {
		return container.querySelector('.flip-card-front .statement-content')?.textContent ?? '';
	}

	it('badge des niveaux au-dessus de la carte : « CM1–CM2 » pour des niveaux qui se suivent', async () => {
		const screen = await renderWith({ ...TEMPLATE, grades: ['CM1', 'CM2'] });

		const badge = screen.container.querySelector<HTMLElement>('[data-tile-grades]');
		expect(badge?.textContent?.trim()).toBe('CM1–CM2');
		// Au-dessus de la carte, pas dans l'intitulé
		const card = screen.container.querySelector('.flip-card')!;
		expect(badge!.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(screen.container.querySelector('[data-tile-heading] [data-tile-grades]')).toBeNull();
	});

	it('la difficulté reste dans l’intitulé, nommée « Difficulté »', async () => {
		const screen = await renderTile();

		await expect.element(screen.getByTitle('Difficulté')).toHaveTextContent(String(TEMPLATE.level));
	});

	it('deux variations : « k/2 », les flèches changent l’exemple sans toucher à Ma série', async () => {
		const screen = await renderTile();
		const start = instance!.selectedVariationIndex ?? 0;
		const before = frontStatement(screen.container);

		const counter = screen.container.querySelector<HTMLElement>('[data-tile-variations]');
		expect(counter?.textContent).toContain(`${start + 1}/2`);

		await page.getByRole('button', { name: 'Variation suivante' }).click();

		await expect.poll(() => counter?.textContent).toContain(`${((start + 1) % 2) + 1}/2`);
		expect(frontStatement(screen.container)).not.toBe(before);
		expect(questionCart.hasTemplate(TEMPLATE.id)).toBe(false);

		await page.getByRole('button', { name: 'Variation précédente' }).click();

		await expect.poll(() => counter?.textContent).toContain(`${start + 1}/2`);
		expect(frontStatement(screen.container)).toBe(before);
	});

	it('une seule variation : pas de flèches', async () => {
		const screen = await renderWith({ ...TEMPLATE, variations: [TEMPLATE.variations[0]] });

		expect(screen.container.querySelector('[data-tile-grades]')).not.toBeNull();
		expect(screen.container.querySelector('[data-tile-variations]')).toBeNull();
	});

	it('bouton de retournement de 32 px', async () => {
		await renderTile();

		const flip = page.getByRole('button', { name: 'Voir la correction' }).first().element();
		const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
		expect(flip.getBoundingClientRect().width).toBe(2 * rem);
		expect(flip.getBoundingClientRect().height).toBe(2 * rem);
	});
});

/** Chantier `automaths`, PR A : points de la revue (2026-11-26) */
describe('QuestionPreviewCard — points de la revue', () => {
	beforeEach(() => {
		questionCart.clearCart();
	});

	it('la tuile est un groupe nommé par le titre du modèle', async () => {
		await renderTile();

		const tile = page.getByRole('group', { name: TEMPLATE.title, exact: false });
		await expect.element(tile).toBeInTheDocument();
		await expect
			.element(tile.getByRole('button', { name: 'Variation suivante' }))
			.toBeInTheDocument();
		await expect
			.element(tile.getByRole('button', { name: 'Ajouter à ma série' }))
			.toBeInTheDocument();
	});

	it('flèches des variations : zone de clic d’au moins 40 px', async () => {
		await renderTile();

		const arrow = page.getByRole('button', { name: 'Variation suivante' }).element();
		const before = getComputedStyle(arrow, '::before');
		const box = arrow.getBoundingClientRect();
		const inset = -parseFloat(before.top);
		expect(before.content).not.toBe('none');
		expect(box.width + 2 * inset).toBeGreaterThanOrEqual(40);
		expect(box.height + 2 * inset).toBeGreaterThanOrEqual(40);
	});
});
