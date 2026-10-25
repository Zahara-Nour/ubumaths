/**
 * Coloration des blocs de code ubumark (chantier demo-debug, PR 6i-a)
 *
 * `highlight.js` est chargé à la demande : chaque test attend la coloration.
 * Langage inconnu ou absent : le code reste en texte brut.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CodeBlock from '../CodeBlock.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';

const PYTHON = `u = 1
for n in range(10):
    u = 0.5 * u + 2
print(u)`;

async function coloredOf(container: HTMLElement): Promise<HTMLElement> {
	await expect
		.poll(() => container.querySelector('code .hljs-keyword'), { timeout: 5000 })
		.not.toBeNull();
	return container.querySelector('code') as HTMLElement;
}

describe('coloration des blocs de code', () => {
	it('colore un bloc python sans changer son texte', async () => {
		const { container } = await render(CodeBlock, { code: PYTHON, language: 'python' });
		const code = await coloredOf(container);
		const keywords = [...code.querySelectorAll('.hljs-keyword')].map((e) => e.textContent);
		expect(keywords).toContain('for');
		expect(code.querySelector('.hljs-built_in')?.textContent).toBe('range');
		expect(code.textContent).toBe(PYTHON);
	});

	it('colore aussi sous l’alias py, et via le rendu ubumark', async () => {
		const { container } = await render(MarkdownRenderer, {
			content: '```py\n' + PYTHON + '\n```'
		});
		const code = await coloredOf(container);
		expect(code.textContent).toBe(PYTHON);
	});

	it('suit un changement de code, sans garder l’ancien', async () => {
		const { container, rerender } = await render(CodeBlock, {
			code: PYTHON,
			language: 'python'
		});
		await coloredOf(container);
		const next = 'while True:\n    break';
		await rerender({ code: next, language: 'python' });
		await expect.poll(() => container.querySelector('code')?.textContent).toBe(next);
		expect(container.querySelector('code .hljs-keyword')?.textContent).toBe('while');
	});

	// Le langage est choisi sans rien charger (`resolveLanguage`, testé à part) :
	// un langage non coloré ne déclenche aucun chargement qui arriverait en retard
	it('laisse en texte brut un langage inconnu, étiquette comprise', async () => {
		const { container } = await render(CodeBlock, { code: 'si x > 0 alors', language: 'pseudo' });
		// Le temps qu'une coloration éventuelle arrive
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(container.querySelector('code [class^="hljs-"]')).toBeNull();
		expect(container.querySelector('code')?.textContent).toBe('si x > 0 alors');
		expect(container.textContent).toContain('pseudo');
	});

	it('laisse en texte brut un bloc sans langage', async () => {
		const { container } = await render(CodeBlock, { code: 'for i in x' });
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(container.querySelector('code [class^="hljs-"]')).toBeNull();
		expect(container.querySelector('code')?.textContent).toBe('for i in x');
	});

	it('n’interprète jamais le code comme du HTML', async () => {
		const malicious = 'print("<img src=x onerror=alert(1)>")\n# <script>alert(2)</script>';
		const { container } = await render(CodeBlock, { code: malicious, language: 'python' });
		await expect
			.poll(() => container.querySelector('code .hljs-string'), { timeout: 5000 })
			.not.toBeNull();
		expect(container.querySelector('code img')).toBeNull();
		expect(container.querySelector('code script')).toBeNull();
		expect(container.querySelector('code')?.textContent).toBe(malicious);
	});
});
