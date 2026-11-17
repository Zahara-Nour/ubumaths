/**
 * Forme « Saisie » d'une série (chantier `formes-de-serie`, N2, N3, PR 5) :
 * l'élève tape, « Valider » retourne la carte d'elle-même, « Suivante » passe à
 * la question d'après. Carte de cours : comme en Flash-cards. Sans chrono ;
 * bilan « k questions réussies sur n » et « Revoir » comme en Flash-cards.
 */

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { flushSync, tick } from 'svelte';
import type { MathfieldElement } from 'mathlive';
import TypingSeries from '../TypingSeries.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import type { TestResult } from '$lib/types/test';
import type { SeriesTraceBody } from '$lib/questions/series-trace';
import { resolvedMarkdown } from '$lib/ubumark';

// Constantes
const MODELES = [
	'11111111-1111-4111-8111-111111111111',
	'22222222-2222-4222-8222-222222222222',
	'33333333-3333-4333-8333-333333333333'
];
const REVIEW = "Revoir celles que je n'avais pas réussies";

// Functions
function question(index: number, expected = '4'): QuestionInstance {
	return {
		templateId: MODELES[index],
		statement: resolvedMarkdown(`Question ${index + 1} : $\\placeholder[0]{}$`),
		blanks: [{ expectedAnswer: expected, type: 'math' }],
		grades: ['6'],
		level: 1,
		seed: 100 + index,
		generatedAt: new Date().toISOString(),
		correction: { steps: [resolvedMarkdown(`Correction ${index + 1}`)] }
	} as QuestionInstance;
}

function courseCard(index: number): QuestionInstance {
	return {
		templateId: MODELES[index],
		statement: resolvedMarkdown(`Carte ${index + 1}`),
		grades: ['6'],
		level: 1,
		seed: 100 + index,
		generatedAt: new Date().toISOString(),
		correction: { steps: [resolvedMarkdown(`Verso ${index + 1}`)] },
		options: { courseCard: true }
	} as QuestionInstance;
}

let mains: HTMLElement[] = [];
afterEach(() => {
	for (const main of mains) main.remove();
	mains = [];
});

beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

async function open(instances: QuestionInstance[], isLoggedIn = true) {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	const onComplete = vi.fn<(result: TestResult) => void>();
	const onRestart = vi.fn();
	const onBack = vi.fn();
	const record = vi.fn<(trace: SeriesTraceBody) => void>();
	const result = await render(TypingSeries, {
		target: main,
		props: {
			instances,
			isLoggedIn,
			onComplete,
			onRestart,
			onBack,
			traceRecorder: { record, settle: async () => ({ failed: 0 }) }
		}
	});
	flushSync();
	await tick();
	return { ...result, onComplete, onRestart, onBack, record };
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement | undefined {
	return [...container.querySelectorAll<HTMLButtonElement>('button')].find(
		(candidate) =>
			candidate.getAttribute('aria-label') === label || candidate.textContent?.trim() === label
	);
}

async function click(container: HTMLElement, label: string) {
	const found = findButton(container, label);
	if (!found) throw new Error(`Bouton « ${label} » introuvable`);
	found.click();
	flushSync();
	await tick();
}

function card(container: HTMLElement): HTMLElement {
	return container.querySelector('[data-testid="typing-card"]') as HTMLElement;
}

function isFlipped(container: HTMLElement): boolean {
	return card(container).querySelector('.flip-card.flipped, .flipped') !== null;
}

/** Tape `keys` dans la première case de la carte affichée */
async function type(container: HTMLElement, keys: string) {
	const front = () => card(container).querySelector('.flip-card-front') as HTMLElement;
	await expect.poll(() => front().querySelector('math-field')).toBeTruthy();
	const field = front().querySelector('math-field') as MathfieldElement;
	await expect
		.poll(() => {
			field.focus();
			return document.activeElement === field;
		})
		.toBe(true);
	await userEvent.keyboard(keys);
	await expect.poll(() => field.getPromptValue('0')).not.toBe('');
}

/** Valide la question affichée (réponse tapée ou vide) puis passe à la suivante */
async function answerAndNext(container: HTMLElement, keys?: string) {
	if (keys) await type(container, keys);
	await click(container, 'Valider');
	const next = findButton(container, 'Suivante') ?? findButton(container, 'Terminer');
	if (!next) throw new Error('Ni « Suivante » ni « Terminer »');
	next.click();
	flushSync();
	await tick();
}

describe('TypingSeries — une question à la fois (N2)', () => {
	it('affiche la première question, au recto, avec sa position et « Valider »', async () => {
		const { container } = await open([question(0), question(1)]);
		expect(container.querySelector('[data-testid="typing-position"]')?.textContent).toContain(
			'Question 1 / 2'
		);
		expect(card(container).textContent).toContain('Question 1');
		expect(findButton(container, 'Valider')).toBeDefined();
		expect(isFlipped(container)).toBe(false);
	});

	it('avant « Valider » : la carte ne se retourne pas (pas de bouton)', async () => {
		const { container } = await open([question(0)]);
		expect(findButton(container, 'Voir la correction')).toBeUndefined();
	});

	it('« Valider » retourne la carte d’elle-même et propose « Suivante »', async () => {
		const { container } = await open([question(0), question(1)]);
		await click(container, 'Valider');
		await expect.poll(() => isFlipped(container)).toBe(true);
		expect(findButton(container, 'Suivante')).toBeDefined();
		// La carte peut ensuite être retournée à la main (revoir sa réponse)
		expect(findButton(container, 'Retour à la question')).toBeDefined();
	});

	it('« Suivante » montre la question suivante, au recto et vide', async () => {
		const { container } = await open([question(0), question(1)]);
		await answerAndNext(container);
		expect(card(container).textContent).toContain('Question 2');
		expect(isFlipped(container)).toBe(false);
		expect(findButton(container, 'Valider')).toBeDefined();
	});

	it('dernière question : le bouton dit « Terminer »', async () => {
		const { container } = await open([question(0)]);
		await click(container, 'Valider');
		expect(findButton(container, 'Terminer')).toBeDefined();
		expect(findButton(container, 'Suivante')).toBeUndefined();
	});

	it('pas de chrono affiché', async () => {
		const { container } = await open([question(0)]);
		expect(container.textContent).not.toMatch(/\d+\s*s\b|Temps/);
	});
});

describe('TypingSeries — carte de cours (N3)', () => {
	it('comme en Flash-cards : retourner, puis « Pas réussi / Réussi »', async () => {
		const { container, record } = await open([courseCard(0), question(1)]);
		expect(findButton(container, 'Valider')).toBeUndefined();
		expect(findButton(container, 'Réussi')).toBeUndefined();
		await click(container, 'Voir la correction');
		await click(container, 'Réussi');
		expect(card(container).textContent).toContain('Question 2');
		expect(record.mock.calls[0][0]).toEqual({
			template_id: MODELES[0],
			success: true,
			place: 'typing',
			seed: 100
		});
	});
});

describe('TypingSeries — traces (N9, N10, N11)', () => {
	it('« Valider » envoie la trace aussitôt : lieu typing, réponse et verdict par case, sans durée', async () => {
		const { container, record } = await open([question(0), question(1)]);
		await type(container, '4');
		await click(container, 'Valider');
		expect(record).toHaveBeenCalledTimes(1);
		expect(record.mock.calls[0][0]).toEqual({
			template_id: MODELES[0],
			success: true,
			place: 'typing',
			seed: 100,
			answer_parts: ['4'],
			part_verdicts: [true]
		});
	});

	it('validée à vide : ratée, sans case (NULL, jamais [])', async () => {
		const { container, record } = await open([question(0)]);
		await click(container, 'Valider');
		expect(record.mock.calls[0][0]).toEqual({
			template_id: MODELES[0],
			success: false,
			place: 'typing',
			seed: 100
		});
	});

	it('« Revoir » les ratées : aucune nouvelle trace', async () => {
		const { container, record } = await open([question(0), question(1)]);
		await answerAndNext(container);
		await answerAndNext(container);
		expect(record).toHaveBeenCalledTimes(2);
		await click(container, REVIEW);
		await answerAndNext(container);
		expect(record).toHaveBeenCalledTimes(2);
	});
});

describe('TypingSeries — fin de série', () => {
	it('bilan « k questions réussies sur n », onComplete appelé une fois, forme typing', async () => {
		const { container, onComplete } = await open([question(0), question(1), courseCard(2)]);
		await answerAndNext(container, '4');
		await answerAndNext(container);
		await click(container, 'Voir la correction');
		await click(container, 'Pas réussi');
		const summary = container.querySelector('[data-testid="typing-summary"]');
		expect(summary?.textContent).toContain('1 question réussie sur 2');
		expect(summary?.textContent).toContain('1 carte de cours révisée');
		expect(onComplete).toHaveBeenCalledTimes(1);
		const result = onComplete.mock.calls[0][0];
		expect(result.mode).toBe('typing');
		expect(result.correctAnswers).toBe(1);
		expect(result.totalQuestions).toBe(3);
	});

	it('« Revoir » ne rejoue que les ratées, sans nouvel onComplete', async () => {
		const { container, onComplete } = await open([question(0), question(1)]);
		await answerAndNext(container, '4');
		await answerAndNext(container);
		await click(container, REVIEW);
		expect(container.querySelector('[data-testid="typing-position"]')?.textContent).toContain(
			'Question 1 / 1'
		);
		expect(card(container).textContent).toContain('Question 2');
		await answerAndNext(container);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it('« Recommencer » et « Retour au panier »', async () => {
		const { container, onRestart, onBack } = await open([question(0)]);
		await answerAndNext(container);
		await click(container, 'Recommencer avec de nouvelles questions');
		await click(container, 'Retour au panier');
		expect(onRestart).toHaveBeenCalledTimes(1);
		expect(onBack).toHaveBeenCalledTimes(1);
	});
});

describe('TypingSeries — visiteur et série vide', () => {
	it('visiteur : le message « Connecte-toi… », la série reste jouable', async () => {
		const { container } = await open([question(0)], false);
		expect(container.textContent).toContain('Connecte-toi');
		await click(container, 'Valider');
		expect(findButton(container, 'Terminer')).toBeDefined();
	});

	it('série vide : un message et le retour au panier', async () => {
		const { container, onBack } = await open([]);
		expect(container.textContent).toContain('Aucune question à afficher');
		await click(container, 'Retour au panier');
		expect(onBack).toHaveBeenCalledTimes(1);
	});
});
