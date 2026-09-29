import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';

/**
 * Régression : `getQuestionType()` ne connaît que deux types — sans `choices`,
 * une question est classée `fill_in_blanks`. Si elle n'a pas non plus de
 * `blanks`, la face réponse n'avait aucune branche pour ce cas et rendait un
 * encadré vert entièrement vide, sans le moindre message.
 */
describe('FlashCard — face réponse sans réponse structurée', () => {
	function instance(overrides: Partial<QuestionInstance> = {}): QuestionInstance {
		return {
			templateId: 'test',
			statement: resolvedMarkdown('Calculer $$\\frac{3}{4} + \\frac{1}{2}$$'),
			grades: ['6'],
			theme: 'Algèbre',
			domain: 'Fractions',
			level: 1,
			generatedAt: new Date().toISOString(),
			...overrides
		} as QuestionInstance;
	}

	async function flipToAnswer(container: HTMLElement) {
		const flip = container.querySelector<HTMLButtonElement>('[aria-label="Voir la correction"]');
		expect(flip).not.toBeNull();
		flip?.click();
		await new Promise((r) => setTimeout(r, 0));
	}

	it('renvoie vers l’explication quand il y en a une', async () => {
		const { container } = await render(FlashCard, {
			instance: instance({
				correction: { steps: [resolvedMarkdown('On réduit au même dénominateur.')] }
			} as Partial<QuestionInstance>)
		});

		await flipToAnswer(container);

		expect(container.textContent).toContain("voir l'explication ci-dessous");
	});

	it('le dit explicitement quand il n’y a rien à montrer', async () => {
		const { container } = await render(FlashCard, { instance: instance() });

		await flipToAnswer(container);

		expect(container.textContent).toContain('Aucune réponse enregistrée');
	});

	it('ne montre pas le repli quand la question a des blancs', async () => {
		const { container } = await render(FlashCard, {
			instance: instance({
				blanks: [{ expectedAnswer: '5/4', type: 'math' }]
			} as Partial<QuestionInstance>)
		});

		await flipToAnswer(container);

		expect(container.textContent).not.toContain('Aucune réponse enregistrée');
		expect(container.textContent).not.toContain("voir l'explication ci-dessous");
	});
});

/**
 * Question à plusieurs bonnes réponses (`rulesSuffice`) : la réponse montrée
 * au verso n'est qu'UN exemple — le titre ne doit pas dire « la » réponse.
 */
describe('FlashCard — verso d’une question à plusieurs bonnes réponses', () => {
	function instance(rulesSuffice: boolean | undefined): QuestionInstance {
		return {
			templateId: 'test',
			statement: resolvedMarkdown('Trouve un diviseur de 12 : $?$'),
			grades: ['6'],
			theme: 'Entiers',
			domain: 'Diviser',
			level: 1,
			generatedAt: new Date().toISOString(),
			blanks: [
				{
					expectedAnswer: '2',
					type: 'math',
					rulesSuffice,
					validationRules: [{ type: 'divisor', dividend: '12' }]
				}
			]
		} as QuestionInstance;
	}

	async function flip(container: HTMLElement) {
		container.querySelector<HTMLButtonElement>('[aria-label="Voir la correction"]')?.click();
		await new Promise((r) => setTimeout(r, 0));
	}

	it('titre « Une réponse possible » en mode rulesSuffice', async () => {
		const { container } = await render(FlashCard, { instance: instance(true) });
		await flip(container);
		expect(container.textContent).toContain('Une réponse possible');
		expect(container.textContent).not.toContain('Réponse correcte');
	});

	it('titre « Réponse correcte » sinon (inchangé)', async () => {
		const { container } = await render(FlashCard, { instance: instance(undefined) });
		await flip(container);
		expect(container.textContent).toContain('Réponse correcte');
		expect(container.textContent).not.toContain('Une réponse possible');
	});
});

/**
 * Recto allégé (demande de David, 2026-09-29) : ni titre « Question », ni
 * badge du type, ni sous-titre « Énoncé », ni encadré autour de l'énoncé.
 * L'énoncé reste affiché.
 */
describe('FlashCard — recto allégé', () => {
	const INSTANCE = {
		templateId: 'test',
		statement: resolvedMarkdown('Calcule. $$2 \\times 80$$'),
		blanks: [{ expectedAnswer: '160', type: 'math' }],
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Multiplier',
		level: 1,
		generatedAt: new Date().toISOString()
	} as unknown as QuestionInstance;

	function front(container: HTMLElement): HTMLElement {
		const face = container.querySelector<HTMLElement>('.flip-card-front');
		expect(face).not.toBeNull();
		return face!;
	}

	it("affiche l'énoncé", async () => {
		const { container } = await render(FlashCard, { instance: INSTANCE });

		expect(front(container).textContent).toContain('Calcule.');
	});

	it('ne montre ni « Question », ni « Énoncé », ni le badge du type', async () => {
		const { container } = await render(FlashCard, { instance: INSTANCE });
		const text = front(container).textContent ?? '';

		expect(text).not.toMatch(/\bQuestion\b/);
		expect(text).not.toContain('Énoncé');
		expect(text).not.toContain('fill_in_blanks');
	});

	it("n'encadre pas l'énoncé", async () => {
		const { container } = await render(FlashCard, { instance: INSTANCE });

		expect(front(container).querySelector('.statement-content.border')).toBeNull();
	});
});

/**
 * Tuiles : la carte prend la hauteur de la face VISIBLE. Sans cela, un recto
 * court hérite de la hauteur d'une longue correction et reste vide aux trois
 * quarts (constaté le 2026-09-29 sur la grille Automaths).
 */
describe('FlashCard — hauteur de la face visible (fitVisibleFace)', () => {
	const LONG_CORRECTION = Array.from({ length: 12 }, (_, i) =>
		resolvedMarkdown(
			`Étape ${i + 1} : une ligne d'explication assez longue pour prendre de la place.`
		)
	);
	const INSTANCE = {
		templateId: 'test',
		statement: resolvedMarkdown('Calcule. $$2 \\times 80$$'),
		blanks: [{ expectedAnswer: '160', type: 'math' }],
		correction: { steps: LONG_CORRECTION },
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Multiplier',
		level: 1,
		generatedAt: new Date().toISOString()
	} as unknown as QuestionInstance;

	function heights(container: HTMLElement) {
		const inner = container.querySelector<HTMLElement>('.flip-card-inner');
		const [frontMeasure, backMeasure] = container.querySelectorAll<HTMLElement>(
			'.measure-container > div'
		);
		return {
			// Hauteur CIBLE (style) : la hauteur rendue est animée pendant 0,6 s
			card: parseFloat(inner?.style.height ?? '0'),
			front: frontMeasure?.getBoundingClientRect().height ?? 0,
			back: backMeasure?.getBoundingClientRect().height ?? 0
		};
	}

	it('au recto, la carte a la hauteur du recto, pas celle de la correction', async () => {
		const { container } = await render(FlashCard, { instance: INSTANCE, fitVisibleFace: true });
		await new Promise((r) => setTimeout(r, 50));
		const h = heights(container);

		expect(h.back).toBeGreaterThan(h.front);
		expect(h.card).toBeCloseTo(h.front, 0);
	});

	it('sans l’option, la carte garde la hauteur de la plus haute face', async () => {
		const { container } = await render(FlashCard, { instance: INSTANCE });
		await new Promise((r) => setTimeout(r, 50));
		const h = heights(container);

		expect(h.card).toBeCloseTo(h.back, 0);
	});
});
