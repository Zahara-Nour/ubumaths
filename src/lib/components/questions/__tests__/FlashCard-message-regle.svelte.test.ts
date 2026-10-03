/**
 * FlashCard — message d'une règle de validation écrit par l'auteur
 * ================================================================
 *
 * Case `rulesSuffice` (modèle `logique-1spe/B-02`, « donne un contre-exemple ») :
 * une réponse refusée par une règle `custom` décrite affiche la `description`
 * au recto, sous « Faux », et jamais la réponse tirée.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { flushSync, tick } from 'svelte';
import FlashCard from '../FlashCard.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';
import type { MathfieldElement } from 'mathlive';

const NOT_A_COUNTER_EXAMPLE = "Ce nombre n'est pas un contre-exemple : il vérifie l'inégalité.";

const counterExample = {
	templateId: 'b02',
	statement: resolvedMarkdown(
		'Donne un contre-exemple à $x^2\\geqslant 5x$ : $x=\\placeholder[0]{}$'
	),
	blanks: [
		{
			expectedAnswer: '3',
			expectedAnswerLatex: '3',
			type: 'math',
			rulesSuffice: true,
			validationRules: [
				{
					type: 'custom',
					expression: 'answer^2 < (5)*answer',
					description: NOT_A_COUNTER_EXAMPLE
				}
			]
		}
	],
	correction: { steps: [resolvedMarkdown('Tout réel de $]0;5[$ convient.')] },
	grades: ['1_SPE'],
	theme: 'Logique',
	domain: 'Logique',
	level: 2,
	generatedAt: new Date().toISOString()
} as QuestionInstance;

let mains: HTMLElement[] = [];
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

const front = (c: HTMLElement) => c.querySelector('.flip-card-front') as HTMLElement;

async function show(instance: QuestionInstance = counterExample) {
	// Dans <main>, comme en vrai (cf. `main p { font-size … }`)
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return await render(FlashCard, {
		target: main,
		props: { instance, interactive: true } as never
	});
}

async function answer(container: HTMLElement, keys: string) {
	await expect.poll(() => front(container).querySelector('math-field')).toBeTruthy();
	const field = front(container).querySelector('math-field') as MathfieldElement;
	await expect
		.poll(() => {
			field.focus();
			return document.activeElement === field;
		})
		.toBe(true);
	await userEvent.keyboard(keys);
	await expect.poll(() => field.getPromptValue('0')).toBe(keys);
	const button = [...front(container).querySelectorAll('button')].find(
		(b) => b.textContent?.trim() === 'Valider'
	);
	button!.click();
	flushSync();
	await tick();
}

describe('FlashCard — message d’une règle décrite', () => {
	it('réponse refusée : la description s’affiche sous le verdict, sans la réponse tirée', async () => {
		const { container } = await show();
		await answer(container, '7');
		const verdict = front(container).querySelector<HTMLElement>('[data-testid="front-verdict"]');
		await expect.poll(() => verdict?.textContent ?? '').toContain(NOT_A_COUNTER_EXAMPLE);
		expect(verdict!.textContent).not.toContain('3');
	});

	it('autre contre-exemple juste : pas de message de règle', async () => {
		const { container } = await show();
		await answer(container, '2');
		const verdict = front(container).querySelector<HTMLElement>('[data-testid="front-verdict"]');
		await expect.poll(() => verdict?.getAttribute('data-kind')).toBe('correct');
		expect(verdict!.textContent).not.toContain(NOT_A_COUNTER_EXAMPLE);
	});

	it('description avec une formule (`$x>0$`) : rendue en formule, pas en texte brut', async () => {
		const withMath = {
			...counterExample,
			blanks: [
				{
					...counterExample.blanks![0],
					validationRules: [
						{
							type: 'custom',
							expression: 'answer > 0',
							description: 'Choisis $x>0$.'
						}
					]
				}
			]
		} as QuestionInstance;
		const { container } = await show(withMath);
		await answer(container, '-1');
		const verdict = front(container).querySelector<HTMLElement>('[data-testid="front-verdict"]');
		await expect.poll(() => verdict?.textContent ?? '').toContain('Choisis');
		expect(verdict!.textContent).not.toContain('$');
		expect(verdict!.querySelector('math-span')?.textContent).toContain('x>0');
	});
});
