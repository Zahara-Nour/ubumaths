/**
 * FillBlanksInput — onglet « n! » du clavier virtuel : factorielle et coefficient binomial.
 *
 * Carte de Terminale (T_SPE, T_COMP, T_EXP) seulement, d'après le niveau de la carte
 * (décision de David, 2026-10-05) ; ailleurs le clavier reste celui d'avant.
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
import type { GradeLevel, InstanceBlank } from '$lib/questions/types';
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

const TAB_SELECTOR = '.MLK__toolbar [data-tooltip="Factorielle et coefficient binomial"]';

/** Rend une case ordinaire dans <main>, focalise le champ et ouvre le clavier par son bouton */
async function openKeyboard(grades: GradeLevel[] = ['T_SPE']): Promise<MathfieldElement> {
	const main = document.body.appendChild(document.createElement('main'));
	await render(FillBlanksInput, {
		target: main,
		props: { statement, blanks: [ordinaryBlank], grades }
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
	await settle();
	expect(window.mathVirtualKeyboard.visible).toBe(true);
	return mathField;
}

/** Clic réel sur l'onglet « n! » de la barre d'onglets du clavier */
async function openCombinatoricsTab(): Promise<void> {
	await expect.poll(() => document.querySelector(TAB_SELECTOR)).toBeTruthy();
	await userEvent.click(document.querySelector<HTMLElement>(TAB_SELECTOR)!);
	await settle();
}

/** Touche visible de l'onglet, par son nom accessible */
async function key(name: string): Promise<HTMLElement> {
	const selector = `.MLK__layer.is-visible [aria-label="${name}"]`;
	await expect.poll(() => document.querySelector(selector)).toBeTruthy();
	return document.querySelector<HTMLElement>(selector)!;
}

describe('FillBlanksInput — onglet « n! » du clavier virtuel', () => {
	it.each<GradeLevel>(['T_SPE', 'T_COMP', 'T_EXP'])(
		'carte %s : l’onglet existe, à côté des onglets par défaut',
		async (grade) => {
			await openKeyboard([grade]);
			await openCombinatoricsTab();
			expect(await key('Factorielle')).toBeTruthy();
			expect(await key('Coefficient binomial')).toBeTruthy();
		}
	);

	// Témoin : la barre d'onglets est bien affichée (onglet « 123 » présent), sans « n! »
	it.each<[string, GradeLevel[]]>([
		['1re spécialité', ['1_SPE']],
		['6e', ['6']],
		['sans niveau (évaluation)', []]
	])('carte %s : pas d’onglet « n! »', async (_name, grades) => {
		await openKeyboard(grades);
		await expect
			.poll(() => document.querySelector('.MLK__toolbar')?.textContent ?? '')
			.toContain('123');
		expect(document.querySelector(TAB_SELECTOR)).toBeNull();
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
