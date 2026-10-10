/**
 * Évaluation : onglet « n! » du clavier virtuel pour une carte de Terminale
 * =========================================================================
 *
 * En évaluation, le navigateur n'a que la version publique de la carte
 * (`toPublicQuestion` → `toDisplayInstance`). Son niveau (`grades`) doit y passer
 * pour que l'onglet « n! » (factorielle, coefficient binomial) s'affiche, comme
 * en entraînement. VRAI clavier de MathLive dans l'iframe de vitest, ouvert par
 * un clic réel sur le bouton du champ.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import { toDisplayInstance, toPublicQuestion } from '$lib/questions/public-question';
import type { GradeLevel, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { MathfieldElement } from 'mathlive';

const TAB_SELECTOR = '.MLK__toolbar [data-tooltip="Factorielle et coefficient binomial"]';

beforeAll(async () => {
	// Import dynamique : un `import 'mathlive'` statique casse le mocker de vitest
	const { initVirtualKeyboardInCurrentBrowsingContext } = await import('mathlive');
	await customElements.whenDefined('math-field');
	initVirtualKeyboardInCurrentBrowsingContext();
});

afterEach(() => {
	window.mathVirtualKeyboard.hide({ animate: false });
	document.querySelectorAll('main').forEach((main) => main.remove());
});

/** Carte COMPLÈTE (côté serveur) à une case, au niveau donné */
function fullInstance(grades: GradeLevel[]): QuestionInstance {
	return {
		templateId: '00000000-0000-4000-8000-0000000000c2',
		statement: 'Nombre de tirages : $\\placeholder[0]{}$' as ResolvedMarkdown,
		blanks: [{ type: 'math', expectedAnswer: '120' }],
		grades,
		theme: 'Probabilités',
		domain: 'Dénombrement',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

/** Carte d'évaluation (version publique) dans <main>, clavier ouvert par son bouton */
async function openEvaluationKeyboard(grades: GradeLevel[]): Promise<void> {
	const main = document.body.appendChild(document.createElement('main'));
	await render(QuestionCard, {
		target: main,
		props: {
			interactive: true,
			collectOnly: true,
			instance: toDisplayInstance(
				toPublicQuestion(fullInstance(grades), { position: 0, delaySeconds: 20 })
			)
		}
	});
	await expect.poll(() => document.querySelector('math-field')?.shadowRoot).toBeTruthy();
	const mathField = document.querySelector('math-field') as MathfieldElement;
	await expect
		.poll(() => {
			mathField.focus();
			return document.activeElement === mathField;
		})
		.toBe(true);
	await expect
		.poll(() => mathField.shadowRoot?.querySelector('[part="virtual-keyboard-toggle"]'))
		.toBeTruthy();
	await userEvent.click(
		mathField.shadowRoot!.querySelector<HTMLElement>('[part="virtual-keyboard-toggle"]')!
	);
	// Témoin : la barre d'onglets est affichée (onglet « 123 »)
	await expect
		.poll(() => document.querySelector('.MLK__toolbar')?.textContent ?? '')
		.toContain('123');
}

describe('Évaluation — onglet « n! » d’après le niveau de la carte', () => {
	it('carte T_SPE : onglet présent', async () => {
		await openEvaluationKeyboard(['T_SPE']);
		await expect.poll(() => document.querySelector(TAB_SELECTOR)).toBeTruthy();
	});

	it('carte 1_SPE : onglet absent', async () => {
		await openEvaluationKeyboard(['1_SPE']);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.querySelector(TAB_SELECTOR)).toBeNull();
	});
});
