/**
 * Sens de `AB` dans les formules en syntaxe maison rendues à l'écran (lot 5 des longueurs)
 *
 * Une carte de question pose le sens résolu de l'instance (`provideCapitalPairs`) ; les
 * formules `~…~` et `$$…$$` en syntaxe maison l'écrivent : en longueur `AB^2`, `ABC` ; en
 * produit ou sans sens (atelier, exercices, instance d'avant), l'écriture d'avant `A B^2`.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CapitalPairsProviderHarness from './CapitalPairsProviderHarness.svelte';
import type { CapitalPairs } from '$lib/mathAST/parser/types';

const contenu = 'Dans le triangle ~ABC~, ~AB^2=AC^2+BC^2~.';

/** LaTeX des formules affichées (<math-span>), dans l'ordre. */
async function formules(capitalPairs?: CapitalPairs): Promise<string> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const screen = await render(CapitalPairsProviderHarness as any, {
		props: { content: contenu, ...(capitalPairs ? { capitalPairs } : {}) }
	});
	const el = screen.container;
	await expect.poll(() => el.querySelectorAll('math-span').length).toBe(2);
	return [...el.querySelectorAll('math-span')].map((m) => m.textContent ?? '').join(' | ');
}

describe('formules en syntaxe maison — sens de AB posé par la carte', () => {
	it('longueur : AB^2 et le nom de figure ABC, sans espace entre les points', async () => {
		const latex = await formules('length');
		expect(latex).toContain('ABC');
		expect(latex).toContain('AB^2');
		expect(latex).not.toContain('A B');
	});

	it('produit : l’écriture d’avant', async () => {
		expect(await formules('product')).toContain('A B^2');
	});

	it('sans sens (instance d’avant, exercices, atelier) : produit, comme avant', async () => {
		expect(await formules()).toBe(await formules('product'));
	});
});
