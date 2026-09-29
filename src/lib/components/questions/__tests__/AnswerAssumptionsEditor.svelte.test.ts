import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import AnswerAssumptionsEditor from '../AnswerAssumptionsEditor.svelte';
import AnswerAssumptionsNotice from '../AnswerAssumptionsNotice.svelte';
import type { AnswerAssumptionRow } from '$lib/questions/answer-assumptions';

/**
 * Éditeur des hypothèses de l'énoncé (ADR 0012) : lignes variable + hypothèse,
 * ajout / retrait, message par ligne, et PROPOSITION « n ∈ ℕ » pour les
 * Suites — jamais appliquée d'office : l'auteur clique.
 */

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
	return [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
		b.textContent?.includes(text)
	);
}

function nameInputs(container: HTMLElement): HTMLInputElement[] {
	return [...container.querySelectorAll<HTMLInputElement>('input[data-assumption-name]')];
}

describe('AnswerAssumptionsEditor', () => {
	it('affiche les lignes existantes avec le libellé français de l’hypothèse', async () => {
		const rows: AnswerAssumptionRow[] = [{ name: 'x', kind: 'positive' }];
		const { container } = await render(AnswerAssumptionsEditor, {
			rows,
			drawnNames: [],
			theme: 'Algèbre',
			domain: 'Puissances'
		});
		expect(nameInputs(container).map((i) => i.value)).toEqual(['x']);
		expect(container.textContent).toContain('strictement positif');
	});

	it('« Ajouter une hypothèse » ajoute une ligne, la corbeille la retire', async () => {
		const { container } = await render(AnswerAssumptionsEditor, {
			rows: [],
			drawnNames: [],
			theme: 'Algèbre',
			domain: 'Puissances'
		});
		expect(nameInputs(container)).toHaveLength(0);
		await userEvent.click(buttonByText(container, 'Ajouter une hypothèse')!);
		expect(nameInputs(container)).toHaveLength(1);
		const remove = container.querySelector<HTMLButtonElement>('button[aria-label^="Retirer"]');
		await userEvent.click(remove!);
		expect(nameInputs(container)).toHaveLength(0);
	});

	it('message en français pour une variable tirée et pour e', async () => {
		const { container } = await render(AnswerAssumptionsEditor, {
			rows: [
				{ name: 'a', kind: 'positive' },
				{ name: 'e', kind: 'positive' }
			],
			drawnNames: ['a'],
			theme: 'Algèbre',
			domain: 'Puissances'
		});
		expect(container.textContent).toContain('variable tirée');
		expect(container.textContent).toContain('constante');
	});

	it('Suites sans hypothèse sur n : propose « n ∈ ℕ », n’ajoute rien d’office', async () => {
		const { container } = await render(AnswerAssumptionsEditor, {
			rows: [],
			drawnNames: [],
			theme: 'Suites',
			domain: 'Suites arithmétiques'
		});
		expect(container.textContent).toContain('n ∈ ℕ');
		expect(nameInputs(container)).toHaveLength(0);

		await userEvent.click(buttonByText(container, 'Ajouter n ∈ ℕ')!);
		expect(nameInputs(container).map((i) => i.value)).toEqual(['n']);
		expect(container.textContent).toContain('entier naturel');
		// Hypothèse posée : la proposition disparaît
		expect(buttonByText(container, 'Ajouter n ∈ ℕ')).toBeUndefined();
	});

	it('hors Suites : aucune proposition', async () => {
		const { container } = await render(AnswerAssumptionsEditor, {
			rows: [],
			drawnNames: [],
			theme: 'Algèbre',
			domain: 'Puissances'
		});
		expect(buttonByText(container, 'Ajouter n ∈ ℕ')).toBeUndefined();
	});

	it('Suites mais n déjà tiré : aucune proposition', async () => {
		const { container } = await render(AnswerAssumptionsEditor, {
			rows: [],
			drawnNames: ['n'],
			theme: 'Suites',
			domain: 'Généralités'
		});
		expect(buttonByText(container, 'Ajouter n ∈ ℕ')).toBeUndefined();
	});
});

describe('AnswerAssumptionsNotice (aperçu)', () => {
	it('affiche « Hypothèses : x > 0 ; n ∈ ℕ »', async () => {
		const { container } = await render(AnswerAssumptionsNotice, {
			assumptions: { x: 'positive', n: 'natural' }
		});
		expect(container.textContent?.replace(/\s+/g, ' ').trim()).toBe('Hypothèses : x > 0 ; n ∈ ℕ');
	});

	it('sans hypothèse : rien', async () => {
		const { container } = await render(AnswerAssumptionsNotice, { assumptions: undefined });
		expect(container.querySelector('[data-answer-assumptions]')).toBeNull();
	});
});
