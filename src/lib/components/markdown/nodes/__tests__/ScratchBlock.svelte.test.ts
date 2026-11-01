/**
 * Bloc ```scratch à l'écran (chantier `bloc-scratch`, palier 1)
 *
 * La vérification et le dessin sont chargés à la demande : chaque test attend
 * le dessin (ou le message).
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ScratchBlock from '../ScratchBlock.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseScratchContent } from '$lib/ubumark/parser/scratch-parser';

const PROGRAMME = [
	'quand le drapeau vert pressé',
	'mettre [reste v] à (17)',
	"répéter jusqu'à ce que <(reste) < [5]>",
	'mettre [reste v] à ((reste) - (5))',
	'fin',
	'dire (reste)'
].join('\n');

async function drawingOf(container: HTMLElement): Promise<SVGSVGElement> {
	await expect
		.poll(() => container.querySelector('.scratch-bloc svg'), { timeout: 5000 })
		.not.toBeNull();
	return container.querySelector('.scratch-bloc svg') as SVGSVGElement;
}

describe('bloc ```scratch à l’écran', () => {
	it('dessine le programme en blocs, avec ses mots', async () => {
		const { container } = await render(ScratchBlock, { node: parseScratchContent(PROGRAMME) });
		const svg = await drawingOf(container);
		const words = svg.textContent ?? '';
		expect(words).toContain('mettre');
		expect(words).toContain('jusqu');
		expect(words).toContain('dire');
		// Plus de texte brut une fois dessiné
		expect(container.querySelector('.scratch-texte')).toBeNull();
	});

	it('dit le programme à un lecteur d’écran', async () => {
		const { container } = await render(ScratchBlock, { node: parseScratchContent(PROGRAMME) });
		await drawingOf(container);
		const figure = container.querySelector('.scratch-bloc') as HTMLElement;
		expect(figure.getAttribute('role')).toBe('img');
		expect(figure.getAttribute('aria-label')).toBe(
			"Programme Scratch : quand le drapeau vert pressé ; mettre [reste v] à (17) ; répéter jusqu'à ce que <(reste) < [5]> ; mettre [reste v] à ((reste) - (5)) ; fin ; dire (reste)"
		);
	});

	it('instruction non reconnue : message situé pour le prof, pas de dessin', async () => {
		const node = parseScratchContent('dire [Bonjour]\nsauter très haut');
		const { container } = await render(ScratchBlock, { node, showErrors: true });
		await expect
			.poll(() => container.querySelector('.scratch-erreur')?.textContent ?? '', { timeout: 5000 })
			.toContain('Ligne 2 : instruction « sauter très haut » non reconnue');
		expect(container.querySelector('svg')).toBeNull();
	});

	it('instruction non reconnue : « Programme indisponible » pour l’élève', async () => {
		const node = parseScratchContent('dire [Bonjour]\nsauter très haut');
		const { container } = await render(ScratchBlock, { node });
		await expect
			.poll(() => container.querySelector('.scratch-indisponible')?.textContent ?? '', {
				timeout: 5000
			})
			.toContain('Programme indisponible');
		expect(container.textContent).not.toContain('sauter');
	});

	it('bloc vide : message pour le prof', async () => {
		const { container } = await render(ScratchBlock, {
			node: parseScratchContent(''),
			showErrors: true
		});
		expect(container.querySelector('.scratch-erreur')?.textContent).toContain('programme vide');
	});

	it('est rendu par MarkdownRenderer, dans un item de liste', async () => {
		const { container } = await render(MarkdownRenderer, {
			content: '1. Que dit le lutin ?\n\n   ```scratch\n   dire [Bonjour]\n   ```'
		});
		await drawingOf(container);
	});

	it('dans une case « choix » : un dessin par choix', async () => {
		const content = [
			'````choix',
			'- ```scratch',
			'  mettre [c v] à (a)',
			'  mettre [a v] à (b)',
			'  mettre [b v] à (c)',
			'  ```',
			'- ```scratch',
			'  mettre [a v] à (b)',
			'  mettre [b v] à (a)',
			'  ```',
			'````'
		].join('\n');
		const { container } = await render(MarkdownRenderer, { content });
		await expect
			.poll(() => container.querySelectorAll('.scratch-bloc svg').length, { timeout: 5000 })
			.toBe(2);
	});
});
