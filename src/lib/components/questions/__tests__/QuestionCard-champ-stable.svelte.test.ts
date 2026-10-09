/**
 * Mots cliquables (lot 2 du lexique) : le dictionnaire arrive APRÈS le premier
 * affichage de la question (chargement à la demande). Une première version
 * découpait les nœuds texte : les positions changeaient et Svelte recréait le
 * champ de réponse, où l'élève avait peut-être commencé à taper.
 *
 * Fichier à part, un seul test : le dictionnaire n'y est pas encore chargé au
 * premier affichage (chaque fichier de test a ses propres modules).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';

const WITH_PROMPT = {
	templateId: 'b03',
	statement: resolvedMarkdown('Calcule la somme : $3+5=\\placeholder[0]{}$'),
	blanks: [{ expectedAnswer: '8', expectedAnswerLatex: '8', type: 'math' }],
	correction: { steps: [resolvedMarkdown('$3+5=8$')] },
	grades: ['6'],
	theme: 'Calcul',
	domain: 'Nombres',
	level: 1,
	generatedAt: new Date().toISOString()
} as QuestionInstance;

beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

function lexiconButtons(container: HTMLElement): string[] {
	return [...container.querySelectorAll('button.lexicon-term')].map((b) => b.textContent ?? '');
}

describe('champ de réponse et mots cliquables', () => {
	it('le champ reste le même quand les mots deviennent cliquables', async () => {
		const { container } = await render(QuestionCard, { interactive: true, instance: WITH_PROMPT });
		await expect.poll(() => container.querySelector('math-field')).not.toBeNull();
		// Premier affichage sans mot cliquable : le dictionnaire n'est pas encore là
		expect(lexiconButtons(container)).toEqual([]);
		const field = container.querySelector('math-field');
		await expect.poll(() => lexiconButtons(container)).toEqual(['Calcule', 'somme']);
		expect(container.querySelector('math-field')).toBe(field);
		expect(field?.isConnected).toBe(true);
	});
});
