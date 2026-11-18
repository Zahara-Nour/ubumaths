/**
 * Saisie de « log » dans une case de réponse (MathPrompt)
 *
 * Le raccourci intégré de MathLive écrit `\log_{#?}` : une case de BASE s'ouvre et
 * « log(7) » tapé au clavier devient `\log_{(7)}`, que le moteur juge faux. Dans le
 * dépôt, `\log` sans base est le logarithme décimal (Terminale techno) : la case
 * de réponse doit écrire `\log` (décision Q27, journal questions-ttechno).
 *
 * Tourne dans un vrai navigateur, frappe réelle au clavier.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import MathPrompt from '../MathPrompt.svelte';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

async function champ(): Promise<MathfieldElement> {
	const screen = await render(MathPrompt, {
		target: mainElement(),
		props: { expression: 'x=\\placeholder[0]{}', syntax: 'latex', inputs: [] }
	});
	const field = screen.container.querySelector('math-field') as MathfieldElement;
	await expect.poll(() => typeof field.getPromptValue).toBe('function');
	return field;
}

describe('MathPrompt — saisie du logarithme décimal', () => {
	it('« log » tapé écrit \\log, sans case de base', async () => {
		const field = await champ();
		expect((field.inlineShortcuts as Record<string, unknown>).log).toBe('\\log');
	});

	it('« log(7) » tapé au clavier donne \\log(7)', async () => {
		const field = await champ();
		field.focus();
		await userEvent.keyboard('log(7)');
		await expect
			.poll(() => field.getPromptValue('0'))
			.toMatch(/^\\log\\left\(7\\right\)$|^\\log\(7\)$/);
	});

	it('« ln » reste le logarithme népérien', async () => {
		const field = await champ();
		expect((field.inlineShortcuts as Record<string, unknown>).ln).toBe('\\ln');
	});
});
