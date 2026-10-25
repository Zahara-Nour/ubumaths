/**
 * Coloration des blocs de code : choix du langage et chargement
 * (chantier demo-debug, PR 6i-a)
 */
import { describe, it, expect } from 'vitest';
import { highlightCode, resolveLanguage } from '../code-highlight';

describe('resolveLanguage', () => {
	it('reconnaît les langages colorés et leurs alias, sans tenir compte de la casse', () => {
		expect(resolveLanguage('python')).toBe('python');
		expect(resolveLanguage(' Py ')).toBe('python');
		expect(resolveLanguage('sh')).toBe('bash');
		expect(resolveLanguage('shell')).toBe('bash');
		expect(resolveLanguage('html')).toBe('xml');
		expect(resolveLanguage('svg')).toBe('xml');
		expect(resolveLanguage('js')).toBe('javascript');
		expect(resolveLanguage('ts')).toBe('typescript');
		expect(resolveLanguage('tex')).toBe('latex');
	});

	it('laisse en texte brut un langage absent ou inconnu', () => {
		expect(resolveLanguage(undefined)).toBeNull();
		expect(resolveLanguage('')).toBeNull();
		expect(resolveLanguage('pseudo')).toBeNull();
		expect(resolveLanguage('python3')).toBeNull();
	});

	it('ne prend jamais une propriété d’objet pour un langage', () => {
		for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
			expect(resolveLanguage(name)).toBeNull();
		}
	});
});

describe('highlightCode', () => {
	it('colore deux blocs du même langage demandés en même temps', async () => {
		const [first, second] = await Promise.all([
			highlightCode('for i in range(3):\n    print(i)', 'python'),
			highlightCode('while True:\n    break', 'py')
		]);
		expect(first).toContain('<span class="hljs-keyword">for</span>');
		expect(second).toContain('<span class="hljs-keyword">while</span>');
	});

	it('rend null pour un langage non coloré', async () => {
		expect(await highlightCode('si x > 0 alors', 'pseudo')).toBeNull();
		expect(await highlightCode('x', undefined)).toBeNull();
	});

	it('échappe le texte du code', async () => {
		const html = await highlightCode('print("<b>&</b>")', 'python');
		expect(html).toContain('&lt;b&gt;&amp;&lt;/b&gt;');
		expect(html).not.toContain('<b>');
	});
});
