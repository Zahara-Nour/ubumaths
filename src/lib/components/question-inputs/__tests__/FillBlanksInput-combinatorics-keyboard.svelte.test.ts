/**
 * FillBlanksInput — onglet « n! » du clavier virtuel : factorielle et coefficient binomial.
 *
 * VRAI clavier de MathLive installé dans l'iframe de vitest (comme
 * `FillBlanksInput-intervals-toggle`) : ouverture par le bouton du champ, clic réel
 * sur l'onglet puis sur la touche, valeur LaTeX relue dans le math-field.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank } from '$lib/questions/types';
import type { MathfieldElement } from 'mathlive';

const statement = 'Nombre de tirages : $\\placeholder[0]{}$' as ResolvedMarkdown;
const ordinaryBlank: InstanceBlank = { type: 'math', expectedAnswer: '120' };

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

/** Laisse passer le cycle focus sortant/entrant de MathLive et ses rendus */
async function settle(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 300));
}

/** Rend une case ordinaire dans <main>, focalise le champ et ouvre le clavier par son bouton */
async function openKeyboard(): Promise<MathfieldElement> {
	const main = document.body.appendChild(document.createElement('main'));
	await render(FillBlanksInput, { target: main, props: { statement, blanks: [ordinaryBlank] } });
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
	await settle();
	expect(window.mathVirtualKeyboard.visible).toBe(true);
	return mathField;
}

/** Clic réel sur l'onglet « n! » de la barre d'onglets du clavier */
async function openCombinatoricsTab(): Promise<void> {
	const selector = '.MLK__toolbar [data-tooltip="Factorielle et coefficient binomial"]';
	await expect.poll(() => document.querySelector(selector)).toBeTruthy();
	await userEvent.click(document.querySelector<HTMLElement>(selector)!);
	await settle();
}

/** Touche visible de l'onglet, par son nom accessible */
async function key(name: string): Promise<HTMLElement> {
	const selector = `.MLK__layer.is-visible [aria-label="${name}"]`;
	await expect.poll(() => document.querySelector(selector)).toBeTruthy();
	return document.querySelector<HTMLElement>(selector)!;
}

describe('FillBlanksInput — onglet « n! » du clavier virtuel', () => {
	it('case ordinaire : l’onglet existe, à côté des onglets par défaut', async () => {
		await openKeyboard();
		await openCombinatoricsTab();
		expect(await key('Factorielle')).toBeTruthy();
		expect(await key('Coefficient binomial')).toBeTruthy();
	});

	it('touche « Factorielle » après 5 : 5!', async () => {
		const mathField = await openKeyboard();
		await userEvent.keyboard('5');
		await openCombinatoricsTab();
		await userEvent.click(await key('Factorielle'));
		await settle();

		expect(mathField.getPromptValue('0')).toBe('5!');
	});

	// MathLive peut ôter les accolades d'un argument d'un caractère (mesuré : `\binom52`
	// pour 5 et 2, comme `\frac12`) ; le parseur lit cette forme TeX (`parseCommandArgument`, PR #831)
	it('touche « Coefficient binomial », 10, flèche droite, 3 : \\binom{10}{3}', async () => {
		const mathField = await openKeyboard();
		await openCombinatoricsTab();
		await userEvent.click(await key('Coefficient binomial'));
		await settle();
		await userEvent.keyboard('10');
		await userEvent.keyboard('{ArrowRight}');
		await userEvent.keyboard('3');

		expect(mathField.getPromptValue('0')).toMatch(/^\\binom\{10\}\{?3\}?$/);
	});
});
