/**
 * Saisie de « log » dans une case de réponse (MathPrompt)
 *
 * Le raccourci intégré de MathLive écrit `\log_{#?}` : une case de BASE s'ouvre et
 * « log(7) » tapé au clavier devient `\log_{(7)}`, que le moteur juge faux. Dans le
 * dépôt, `\log` sans base est le logarithme décimal (Terminale techno) : la case
 * de réponse doit écrire `\log` (décision Q27, journal questions-ttechno).
 *
 * Tourne dans un vrai navigateur. La frappe réelle (« log(7) » → `\log\left(7\right)`)
 * n'est pas testée ici : en CI, les frappes n'arrivaient pas dans la case (3 essais,
 * #2839) ; elle est vérifiée à la main dans l'aperçu admin (journal § 36).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
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

	it('« ln » reste le logarithme népérien', async () => {
		const field = await champ();
		expect((field.inlineShortcuts as Record<string, unknown>).ln).toBe('\\ln');
	});
});
