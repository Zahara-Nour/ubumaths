/**
 * FillBlanksInput — case « intervalles » : le bouton du clavier virtuel OUVRE le clavier.
 *
 * Bug de production (2026-10-01, modèle n° 11) : clic sur le bouton du clavier → rien.
 * Mesuré : en s'ouvrant, MathLive fait sortir puis rentrer le focus du champ ; le
 * composant réaffectait alors `smartFence`, et toute affectation d'option sur un
 * math-field `readonly` focalisé, clavier visible, appelle `hideVirtualKeyboard`
 * (MathLive, `setOptions`). Le clavier se refermait aussitôt ouvert.
 *
 * Contrairement à `FillBlanksInput-intervals-keyboard`, ce fichier installe le VRAI
 * clavier de MathLive dans l'iframe de vitest (au lieu du proxy, dont `visible` ne
 * bouge jamais faute de page parente qui l'écoute) : le clic réel sur le bouton
 * l'affiche comme en production.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank } from '$lib/questions/types';
import type { MathfieldElement, VirtualKeyboardLayout } from 'mathlive';

const statement = 'Solutions : $S=\\placeholder[0]{}$' as ResolvedMarkdown;
const intervalBlank: InstanceBlank = {
	type: 'math',
	expectedAnswer: ']2;3[\\cup[4;+\\infty[',
	answerKind: 'intervalles'
};

beforeAll(async () => {
	// Import dynamique : un `import 'mathlive'` statique casse le mocker de vitest
	const { initVirtualKeyboardInCurrentBrowsingContext } = await import('mathlive');
	await customElements.whenDefined('math-field');
	initVirtualKeyboardInCurrentBrowsingContext();
});

afterEach(() => {
	window.mathVirtualKeyboard.hide({ animate: false });
});

/** Le math-field rendu, une fois monté */
async function mountedMathField(): Promise<MathfieldElement> {
	await expect.poll(() => document.querySelector('math-field')?.shadowRoot).toBeTruthy();
	return document.querySelector('math-field') as MathfieldElement;
}

/** Bouton « clavier virtuel » du champ (shadow DOM de MathLive) */
async function keyboardToggle(mathField: MathfieldElement): Promise<HTMLElement> {
	await expect
		.poll(() => mathField.shadowRoot?.querySelector('[part="virtual-keyboard-toggle"]'))
		.toBeTruthy();
	return mathField.shadowRoot!.querySelector<HTMLElement>('[part="virtual-keyboard-toggle"]')!;
}

function hasIntervalsTab(): boolean {
	return window.mathVirtualKeyboard.layouts.some(
		(layout) =>
			typeof layout !== 'string' && (layout as VirtualKeyboardLayout).label === 'Intervalles'
	);
}

/** Laisse passer le cycle focus sortant/entrant de MathLive et ses rendus */
async function settle(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 300));
}

describe('FillBlanksInput — bouton du clavier virtuel', () => {
	it('case « intervalles », champ déjà focalisé : le clic ouvre le clavier, onglet présent', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [intervalBlank] } });
		const mathField = await mountedMathField();
		// Focus sans pointeur : un clic dans le champ ouvre déjà le clavier ici (politique « auto »)
		await expect
			.poll(() => {
				mathField.focus();
				return document.activeElement === mathField;
			})
			.toBe(true);
		expect(window.mathVirtualKeyboard.visible).toBe(false);
		await userEvent.click(await keyboardToggle(mathField));
		await settle();

		expect(window.mathVirtualKeyboard.visible).toBe(true);
		expect(hasIntervalsTab()).toBe(true);
		expect(mathField.smartFence).toBe(false);
	});

	it('case « intervalles », clic direct sur le bouton : le clavier s’ouvre et y reste', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [intervalBlank] } });
		const mathField = await mountedMathField();
		await userEvent.click(await keyboardToggle(mathField));
		await settle();

		expect(window.mathVirtualKeyboard.visible).toBe(true);
		expect(hasIntervalsTab()).toBe(true);
	});

	it('case ordinaire (témoin) : le clic ouvre le clavier', async () => {
		await render(FillBlanksInput, {
			props: { statement, blanks: [{ type: 'math', expectedAnswer: '3' }] }
		});
		const mathField = await mountedMathField();
		await userEvent.click(await keyboardToggle(mathField));
		await settle();

		expect(window.mathVirtualKeyboard.visible).toBe(true);
		expect(hasIntervalsTab()).toBe(false);
	});
});
