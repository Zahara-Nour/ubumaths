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
import { PREVIEW_SEED } from '#lib/questions/cart-preview.ts';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import { variationExample } from '#lib/questions/series-draw.ts';
import type { QuestionTemplate } from '#lib/questions/types.ts';
import type { SeriesItem } from '#lib/validation/series.ts';
import type { QuestionTiming } from '#lib/types/evaluation-breakdown.ts';
// Modèle réel relu (Entiers #139) : « Le double de … est … », avec un trou
import fixture from '../../../../data/relecture/entiers/139.json';

const TEMPLATE = { ...(fixture.template as unknown as QuestionTemplate), id: 'modele-139' };
const ITEM: SeriesItem = {
	templateId: '11111111-1111-4111-8111-111111111139',
	quantity: 3,
	delay: 25
};
const TEMPLATE_WITH_ID = { ...TEMPLATE, id: ITEM.templateId };
const generated = generateInstance(TEMPLATE_WITH_ID, PREVIEW_SEED);
const instance = generated.success ? generated.instance : undefined;

async function renderCard(
	overrides: {
		onUpdateDelay?: (templateId: string, delay: number) => void;
		onRemove?: () => void;
		template?: boolean;
		tooShort?: QuestionTiming | null;
		observedDelay?: number | null;
		distinctMax?: number | null;
		onUpdateQuantity?: (templateId: string, quantity: number) => void;
		onUpdateVariations?: (templateId: string, variations: number[] | undefined) => void;
	} = {}
) {
	return await render(CartQuestionCard, {
		item: ITEM,
		template: overrides.template === false ? undefined : TEMPLATE_WITH_ID,
		instance,
		onIncrementQuantity: vi.fn(),
		onDecrementQuantity: vi.fn(),
		onUpdateQuantity: overrides.onUpdateQuantity ?? vi.fn(),
		onUpdateDelay: overrides.onUpdateDelay ?? vi.fn(),
		onRemove: overrides.onRemove ?? vi.fn(),
		tooShort: overrides.tooShort,
		observedDelay: overrides.observedDelay,
		distinctMax: overrides.distinctMax,
		onUpdateVariations: overrides.onUpdateVariations
	});
}

describe('CartQuestionCard', () => {
	it('affiche le titre du modèle au-dessus de la flash-card', async () => {
		const screen = await renderCard();

		await expect
			.element(screen.getByText(TEMPLATE.title, { exact: false }).first())
			.toBeInTheDocument();
	});

	it('modèle retiré : « Modèle retiré » et un bouton pour le retirer du panier', async () => {
		const onRemove = vi.fn();
		const screen = await renderCard({ template: false, onRemove });

		await expect.element(screen.getByText('Modèle retiré')).toBeInTheDocument();
		expect(screen.container.querySelector('.flip-card-front')).toBeNull();
		await screen.getByRole('button', { name: 'Retirer de ma série' }).click();

		expect(onRemove).toHaveBeenCalledWith(ITEM.templateId);
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

		expect(onUpdateDelay).toHaveBeenCalledWith(ITEM.templateId, 30);
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

	it('durée signalée trop courte : la marque et la phrase sous les réglages', async () => {
		const screen = await renderCard({
			tooShort: { delaySeconds: 25, students: 6, unansweredInTime: 4, tooShort: true }
		});
		const mark = screen.container.querySelector('[data-duree-trop-courte]');
		expect(mark?.textContent).toContain('Durée sans doute trop courte');
		expect(mark?.textContent).toContain("4 élèves sur 6 n'ont rien répondu dans les 25\u00a0s");
	});

	it('sans signal : aucune marque', async () => {
		const screen = await renderCard();
		expect(screen.container.querySelector('[data-duree-trop-courte]')).toBeNull();
	});

	it('durée observée : la suggestion, et « Appliquer » règle la durée (A1)', async () => {
		const onUpdateDelay = vi.fn();
		const screen = await renderCard({ observedDelay: 40, onUpdateDelay });
		const hint = screen.container.querySelector('[data-duree-observee]');
		expect(hint?.textContent?.replace(/\s+/g, ' ')).toContain('Durée observée : 40 s');
		await screen
			.getByRole('button', { name: 'Appliquer la durée observée de 40 secondes' })
			.click();
		expect(onUpdateDelay).toHaveBeenCalledWith(ITEM.templateId, 40);
	});

	it('sans durée observée : aucune suggestion', async () => {
		const screen = await renderCard();
		expect(screen.container.querySelector('[data-duree-observee]')).toBeNull();
	});

	it('trop de répétitions : le dit et propose d’abaisser au nombre de questions différentes', async () => {
		const onUpdateQuantity = vi.fn();
		const screen = await renderCard({ distinctMax: 2, onUpdateQuantity });

		await expect
			.element(screen.getByText("Ce modèle n'a que 2 questions différentes."))
			.toBeInTheDocument();
		await screen.getByRole('button', { name: 'Passer à 2 répétitions' }).click();

		expect(onUpdateQuantity).toHaveBeenCalledWith(ITEM.templateId, 2);
	});

	it('une seule question possible : le dit au singulier', async () => {
		const screen = await renderCard({ distinctMax: 1 });

		await expect.element(screen.getByText("Ce modèle n'a qu'une question.")).toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'Passer à 1 répétition' }))
			.toBeInTheDocument();
	});

	it('assez de questions : aucun avertissement', async () => {
		const screen = await renderCard();

		expect(screen.container.querySelector('[data-trop-de-repetitions]')).toBeNull();
	});
});

describe('CartQuestionCard — variations choisies (idée 2)', () => {
	const count = TEMPLATE_WITH_ID.variations.length;

	it('prof : le choix des variations est proposé (modèle à plusieurs variations)', async () => {
		expect(count).toBeGreaterThan(1);
		const screen = await renderCard({ onUpdateVariations: vi.fn() });
		await expect.element(screen.getByText(`Toutes les variations (${count})`)).toBeInTheDocument();
	});

	it('sans gestionnaire (élève) : rien', async () => {
		const screen = await renderCard();
		expect(screen.container.querySelector('[data-choix-variations]')).toBeNull();
	});
});

/** Chantier `automaths`, PR A (phase 0 validée le 2026-11-26) */
describe('CartQuestionCard — corbeille, niveaux, variations', () => {
	it('corbeille entre la durée et les répétitions : retire la ligne sans confirmation', async () => {
		const onRemove = vi.fn();
		const screen = await renderCard({ onRemove });

		const trash = screen.getByRole('button', { name: 'Retirer de ma série' });
		await expect.element(trash).toBeVisible();
		const duration = screen.getByTitle('Durée par question').element();
		const repeats = screen.getByTitle('Nombre de répétitions').element();
		const trashBox = trash.element().getBoundingClientRect();
		expect(trashBox.left).toBeGreaterThan(duration.getBoundingClientRect().right);
		expect(trashBox.right).toBeLessThan(repeats.getBoundingClientRect().left);

		await trash.click();

		expect(onRemove).toHaveBeenCalledWith(ITEM.templateId);
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
	});

	it('badge des niveaux et flèches des variations au-dessus de la carte', async () => {
		const screen = await renderCard();

		expect(screen.container.querySelector('[data-tile-grades]')?.textContent?.trim()).toBe('CE1');
		await expect
			.element(screen.getByRole('button', { name: 'Variation suivante' }))
			.toBeInTheDocument();
	});

	it('une seule variation choisie par le prof : pas de flèches', async () => {
		const generatedFor = generateInstance(
			{ ...TEMPLATE_WITH_ID, variations: [TEMPLATE_WITH_ID.variations[1]] },
			PREVIEW_SEED
		);
		const screen = await render(CartQuestionCard, {
			item: { ...ITEM, variations: [1] },
			template: TEMPLATE_WITH_ID,
			instance: generatedFor.success ? generatedFor.instance : instance,
			onIncrementQuantity: vi.fn(),
			onDecrementQuantity: vi.fn(),
			onUpdateQuantity: vi.fn(),
			onUpdateDelay: vi.fn(),
			onRemove: vi.fn()
		});

		expect(screen.container.querySelector('[data-tile-grades]')).not.toBeNull();
		expect(screen.container.querySelector('[data-tile-variations]')).toBeNull();
	});

	it('carte de 18rem, bouton de retournement de 32 px', async () => {
		const screen = await renderCard();

		const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
		await vi.waitFor(() => expect(screen.container.querySelector('.flip-card')).not.toBeNull());
		expect(screen.container.querySelector('.flip-card')!.getBoundingClientRect().height).toBe(
			18 * rem
		);
		const flip = page.getByRole('button', { name: 'Voir la correction' }).first().element();
		expect(flip.getBoundingClientRect().width).toBe(2 * rem);
	});
});

/** Chantier `automaths`, PR A : points de la revue (2026-11-26) */
describe('CartQuestionCard — points de la revue', () => {
	it('aperçu d’une variation que le prof n’a pas choisie : la carte montre une variation choisie', async () => {
		// Aperçu tiré sur la variation 0, mais le prof n'a gardé que la 1 et la 2
		const three = {
			...TEMPLATE_WITH_ID,
			variations: [
				TEMPLATE_WITH_ID.variations[0],
				TEMPLATE_WITH_ID.variations[1],
				TEMPLATE_WITH_ID.variations[1]
			]
		};
		const preview = variationExample(three, 0, generateInstance);
		expect(preview?.selectedVariationIndex).toBe(0);
		const props = {
			template: three,
			instance: preview!,
			onIncrementQuantity: vi.fn(),
			onDecrementQuantity: vi.fn(),
			onUpdateQuantity: vi.fn(),
			onUpdateDelay: vi.fn(),
			onRemove: vi.fn()
		};
		const statement = (container: HTMLElement) =>
			container.querySelector('.flip-card-front .statement-content')?.textContent ?? '';
		const all = await render(CartQuestionCard, { ...props, item: ITEM });
		const previewText = statement(all.container);
		all.unmount();

		const screen = await render(CartQuestionCard, {
			...props,
			item: { ...ITEM, variations: [1, 2] }
		});

		const counter = screen.container.querySelector<HTMLElement>('[data-tile-variations]');
		expect(counter?.textContent).toContain('1/2');
		await expect.poll(() => statement(screen.container)).not.toBe('');
		expect(statement(screen.container)).not.toBe(previewText);
	});

	it('la tuile est un groupe nommé par le titre du modèle', async () => {
		const screen = await renderCard();

		const tile = screen.getByRole('group', { name: TEMPLATE.title, exact: false });
		await expect.element(tile).toBeInTheDocument();
		await expect
			.element(tile.getByRole('button', { name: 'Retirer de ma série' }))
			.toBeInTheDocument();
	});
});
