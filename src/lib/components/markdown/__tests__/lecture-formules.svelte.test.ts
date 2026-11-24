/**
 * Ce qu'un lecteur d'écran lit d'une formule affichée (E32)
 *
 * MathLive posait sur chaque formule un `aria-label` en anglais, balises de
 * synthèse vocale comprises (« the fraction <break time="150ms"/> pie over… »).
 * Attendu : en français dans un contenu français, en anglais sans balises dans
 * un contenu anglais.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../MarkdownRenderer.svelte';
import { installFormulaSpeech } from '#lib/utils/formula-speech/install.ts';

// Dans l'application, posé une fois par `hooks.client.ts`
installFormulaSpeech();

const contenu = ['On a $\\frac{\\pi}{12}$ et $x^2$.', '', '$$\\sqrt{x+1}$$'].join('\n');

/** Les lectures des formules, dans l'ordre, une fois toutes rendues par MathLive. */
async function lectures(locale?: 'fr' | 'en'): Promise<string[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const screen = await render(MarkdownRenderer as any, {
		props: { content: contenu, ...(locale ? { locale } : {}) }
	});
	const formules = () => [...screen.container.querySelectorAll('math-span, math-div')];
	await expect
		.poll(() => formules().filter((f) => (f.getAttribute('aria-label') ?? '') !== '').length)
		.toBe(3);
	// La lecture anglaise arrive un instant après le rendu : laisser passer ses balises
	await expect
		.poll(() => formules().some((f) => f.getAttribute('aria-label')?.includes('<')))
		.toBe(false);
	return formules().map((f) => f.getAttribute('aria-label') ?? '');
}

describe('lecture des formules par un lecteur d’écran', () => {
	it('contenu français : en français, sans balises', async () => {
		expect(await lectures('fr')).toEqual([
			'pi sur 12',
			'x au carré',
			'racine carrée de, x plus 1, fin de racine'
		]);
	});

	it('sans langue : français', async () => {
		expect(await lectures()).toEqual([
			'pi sur 12',
			'x au carré',
			'racine carrée de, x plus 1, fin de racine'
		]);
	});

	it('contenu anglais : en anglais, sans balises', async () => {
		const lues = await lectures('en');
		expect(lues[0]).toContain('over');
		expect(lues[1]).toContain('squared');
		expect(lues[2]).toContain('square root');
		for (const lue of lues) expect(lue).not.toMatch(/[<>]/);
	});
});
