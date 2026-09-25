/**
 * Point décimal à l'écran pour un contenu en anglais (2026-09-25)
 *
 * Décision de David : en anglais, « 0.3 » ; en français, « 0,3 ». La langue est
 * posée par `MarkdownRenderer` (prop `locale`, ou héritée d'un parent) et lue par
 * les formules et l'arbre pondéré. Sans langue : français, comme avant.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../MarkdownRenderer.svelte';

const contenu = [
	'Take ~p=0.3~ and $q=0.25$.',
	'',
	'$$0.75$$',
	'',
	'```probtree',
	'$A$:0.4',
	'  $B$:0.6',
	'$\\overline{A}$:0.6',
	'```'
].join('\n');

/** LaTeX affiché par les formules et l'arbre (<math-span>, <math-div>), dans l'ordre. */
async function formules(locale?: 'fr' | 'en'): Promise<string> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const screen = await render(MarkdownRenderer as any, {
		props: { content: contenu, ...(locale ? { locale } : {}) }
	});
	const el = screen.container;
	await expect.poll(() => el.querySelectorAll('math-span, math-div').length).toBeGreaterThan(4);
	return [...el.querySelectorAll('math-span, math-div')]
		.map((m) => m.textContent ?? '')
		.join(' | ');
}

describe('MarkdownRenderer — séparateur décimal selon la langue', () => {
	it('anglais : point dans les formules du texte, centrées et l’arbre', async () => {
		const latex = await formules('en');
		expect(latex).toContain('0.3');
		expect(latex).toContain('0.25');
		expect(latex).toContain('0.75');
		expect(latex).toContain('0.4');
		expect(latex).not.toContain('{,}');
	});

	it('français : virgule', async () => {
		const latex = await formules('fr');
		expect(latex).toContain('0{,}3');
		expect(latex).toContain('0{,}25');
		expect(latex).toContain('0{,}75');
		expect(latex).toContain('0{,}4');
	});

	it('sans langue : français, comme avant', async () => {
		const latex = await formules();
		expect(latex).toContain('0{,}3');
		expect(latex).not.toMatch(/\d\.\d/);
	});
});
