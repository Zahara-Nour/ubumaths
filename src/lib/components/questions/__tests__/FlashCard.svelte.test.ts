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

	it('sinon, aucun intitulé au-dessus de la réponse (verso allégé, 2026-09-29)', async () => {
		const { container } = await render(FlashCard, { instance: instance(undefined) });
		await flip(container);
		expect(container.textContent).not.toContain('Réponse correcte');
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
 * Hauteur des deux faces (demande de David, 2026-09-30) : recto et verso ont
 * TOUJOURS la même hauteur. Deux modes :
 * - sans `height` : la hauteur de la plus haute face, tout le contenu visible ;
 * - avec `height` : hauteur imposée, le contenu défile dans la carte.
 * Les deux faces sont empilées dans une grille CSS : plus de copie cachée
 * mesurée en JavaScript (chaque face rendue une seule fois).
 */
describe('FlashCard — hauteur des deux faces', () => {
	const LONG_CORRECTION = Array.from({ length: 12 }, (_, i) =>
		resolvedMarkdown(
			`Étape ${i + 1} : une ligne d'explication assez longue pour prendre de la place.`
		)
	);
	const INSTANCE = {
		templateId: 'test',
		statement: resolvedMarkdown('Calcule. $$2 \\times 80$$'),
		blanks: [{ expectedAnswer: '160', expectedAnswerLatex: '160', type: 'math' }],
		correction: { steps: LONG_CORRECTION },
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Multiplier',
		level: 1,
		generatedAt: new Date().toISOString()
	} as unknown as QuestionInstance;

	function faces(container: HTMLElement) {
		const front = container.querySelector<HTMLElement>('.flip-card-front');
		const back = container.querySelector<HTMLElement>('.flip-card-back');
		expect(front).not.toBeNull();
		expect(back).not.toBeNull();
		return { front: front!, back: back! };
	}

	it('sans hauteur imposée : recto et verso ont la même hauteur, celle de la plus haute', async () => {
		const { container } = await render(FlashCard, { instance: INSTANCE });
		const { front, back } = faces(container);
		const frontHeight = front.getBoundingClientRect().height;
		const backHeight = back.getBoundingClientRect().height;

		expect(frontHeight).toBeCloseTo(backHeight, 0);
		// Rien n'est rogné ni ne défile : tout le contenu reste visible
		expect(getComputedStyle(back).overflowY).toBe('visible');
		expect(back.querySelector('.scrollable')).toBeNull();
	});

	it('chaque face est rendue une seule fois (plus de copie cachée)', async () => {
		const { container } = await render(FlashCard, { instance: INSTANCE });

		expect(container.querySelectorAll('.flip-card-front').length).toBe(1);
		expect(container.textContent?.split('Étape 12').length).toBe(2);
	});

	it('la face cachée est inerte (ni tabulation, ni lecteur d’écran)', async () => {
		const { container } = await render(FlashCard, { instance: INSTANCE });
		const { front, back } = faces(container);

		expect(back.inert).toBe(true);
		expect(front.inert).toBe(false);
	});

	it('hauteur imposée : même hauteur des deux côtés, le contenu défile, le bouton reste dans la carte', async () => {
		const { container } = await render(FlashCard, { instance: INSTANCE, height: '200px' });
		const { front, back } = faces(container);

		expect(front.getBoundingClientRect().height).toBeCloseTo(200, 0);
		expect(back.getBoundingClientRect().height).toBeCloseTo(200, 0);

		// La zone qui défile : la carte du verso (le bouton de retournement est à côté)
		const scroller = back.querySelector<HTMLElement>('[data-slot="card"]');
		expect(scroller).not.toBeNull();
		expect(scroller!.scrollHeight).toBeGreaterThan(scroller!.clientHeight);
		expect(getComputedStyle(scroller!).overflowY).toBe('auto');

		const card = back.getBoundingClientRect();
		const button = back.querySelector<HTMLElement>('.flip-button')!.getBoundingClientRect();
		expect(button.bottom).toBeLessThanOrEqual(card.bottom + 1);
	});
});

/**
 * Verso allégé (demande de David, 2026-09-29) : « Correction » centré en vert
 * en haut ; ni badge, ni « Réponse correcte », ni « Explication », ni encadré ;
 * un seul trou → uniquement sa bonne réponse, en plus gros.
 */
describe('FlashCard — verso allégé', () => {
	function instance(overrides: Partial<QuestionInstance> = {}): QuestionInstance {
		return {
			templateId: 'test',
			statement: resolvedMarkdown('Calcule. $$2 \\times 80$$'),
			blanks: [{ expectedAnswer: '160', expectedAnswerLatex: '160', type: 'math' }],
			correction: { steps: [resolvedMarkdown('On multiplie 2 par 8 dizaines.')] },
			grades: ['6'],
			theme: 'Entiers',
			domain: 'Multiplier',
			level: 1,
			generatedAt: new Date().toISOString(),
			...overrides
		} as unknown as QuestionInstance;
	}

	function back(container: HTMLElement): HTMLElement {
		const face = container.querySelector<HTMLElement>('.flip-card-back');
		expect(face).not.toBeNull();
		return face!;
	}

	it('titre « Correction » centré, en vert', async () => {
		const { container } = await render(FlashCard, { instance: instance() });
		const title = back(container).querySelector<HTMLElement>('[data-verso-title]');

		expect(title?.textContent?.trim()).toBe('Correction');
		expect(title?.className).toContain('text-center');
		expect(title?.className).toMatch(/text-green/);
	});

	it('ni badge du type, ni « Réponse correcte », ni « Explication »', async () => {
		const { container } = await render(FlashCard, { instance: instance() });
		const text = back(container).textContent ?? '';

		expect(text).not.toContain('fill_in_blanks');
		expect(text).not.toContain('Réponse correcte');
		expect(text).not.toContain('Explication');
		expect(text).toContain('On multiplie 2 par 8 dizaines.');
	});

	it("aucun encadré (ni vert autour de la réponse, ni autour de l'explication)", async () => {
		const { container } = await render(FlashCard, { instance: instance() });

		// Le contenu du verso, pas la carte elle-même (qui garde son bord)
		const content = back(container).querySelector('[data-slot="card-content"]');
		expect(content).not.toBeNull();
		expect(content!.querySelector('.border, .border-2')).toBeNull();
	});

	it('un seul trou : uniquement la bonne réponse, en plus gros', async () => {
		const { container } = await render(FlashCard, { instance: instance() });
		const answer = back(container).querySelector<HTMLElement>('[data-single-answer]');

		expect(answer).not.toBeNull();
		expect(answer?.className).toMatch(/text-(2xl|3xl)/);
		expect(answer?.textContent).toContain('160');
		// L'énoncé n'est pas répété autour de la réponse
		expect(answer?.textContent).not.toContain('Calcule');
	});

	it('plusieurs trous : pas de réponse unique en gros', async () => {
		const { container } = await render(FlashCard, {
			instance: instance({
				statement: resolvedMarkdown('$${{blank:0}} + {{blank:1}} = 5$$'),
				blanks: [
					{ expectedAnswer: '2', expectedAnswerLatex: '2', type: 'math' },
					{ expectedAnswer: '3', expectedAnswerLatex: '3', type: 'math' }
				]
			} as Partial<QuestionInstance>)
		});

		expect(back(container).querySelector('[data-single-answer]')).toBeNull();
	});
});
