/**
 * Bloc ```cubes à l'écran (chantier `solides`, lot 1)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Espace from '../Espace.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import { ESPACE_UNAVAILABLE } from '$lib/ubumark/types/espace';
import type { ResolvedMarkdown } from '$lib/ubumark';

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

const node = (...lines: string[]) => parseEspaceContent(lines.join('\n'));

describe('Cubes — figure', () => {
	it('un SVG role="img" au nom accessible qui ne dit pas le nombre de cubes', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('hauteurs: 2 1 1 / 1 0 1') }
		});
		const svgs = screen.container.querySelectorAll('svg[role="img"]');
		expect(svgs).toHaveLength(1);
		expect(svgs[0].getAttribute('aria-label')).toBe('Assemblage de cubes en perspective');
	});

	it('vue de face : son propre nom', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('hauteurs: 2 1 1 / 1 0 1', 'vue: face') }
		});
		expect(screen.container.querySelector('svg')!.getAttribute('aria-label')).toBe(
			'Vue de face d’un assemblage de cubes'
		);
	});

	it('autant de polygones que de faces, par genre', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('hauteurs: 2 1 1 / 1 0 1') }
		});
		expect(screen.container.querySelectorAll('.cubes-devant')).toHaveLength(4);
		expect(screen.container.querySelectorAll('.cubes-dessus')).toHaveLength(5);
		expect(screen.container.querySelectorAll('.cubes-cote')).toHaveLength(4);
	});

	it('aucun texte dans le DOM : la figure se lit par son nom accessible', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('hauteurs: 2 1') }
		});
		expect(screen.container.textContent?.trim()).toBe('');
	});

	it('arête de 1 cm : un cube de face fait 1 cm de large (marge comprise)', async () => {
		const target = mainElement();
		const screen = await render(Espace, {
			target,
			props: { node: node('hauteurs: 1', 'vue: face') }
		});
		const svg = screen.container.querySelector('svg')!;
		const cmInPx = (() => {
			const probe = target.appendChild(document.createElement('div'));
			probe.style.width = '1cm';
			const w = probe.getBoundingClientRect().width;
			probe.remove();
			return w;
		})();
		// 1 cm de carré + 2 marges de 0,05 cm
		expect(svg.getBoundingClientRect().width).toBeCloseTo(cmInPx * 1.1, 0);
	});

	it('couleurs du thème : aucune écrite en dur, trois teintes distinctes, pas d’accent', async () => {
		const target = mainElement();
		const screen = await render(Espace, {
			target,
			props: { node: node('hauteurs: 1 1 / 1 1') }
		});
		const svg = screen.container.querySelector('svg')!;
		for (const el of svg.querySelectorAll('*')) {
			expect(el.hasAttribute('fill'), el.tagName).toBe(false);
			expect(el.hasAttribute('stroke'), el.tagName).toBe(false);
		}
		const fill = (selector: string) => getComputedStyle(svg.querySelector(selector)!).fill;
		const fills = [fill('.cubes-dessus'), fill('.cubes-devant'), fill('.cubes-cote')];
		expect(new Set(fills).size).toBe(3);
		for (const f of fills) expect(f).not.toBe('none');
		const probe = target.appendChild(document.createElement('span'));
		probe.style.color = 'var(--color-foreground)';
		expect(getComputedStyle(svg.querySelector('.cubes-face')!).stroke).toBe(
			getComputedStyle(probe).color
		);
	});

	it('tient sur un téléphone de 320 px, même 6 colonnes', async () => {
		const narrow = mainElement();
		narrow.style.width = '288px';
		const screen = await render(Espace, {
			target: narrow,
			props: { node: node('hauteurs: 1 1 1 1 1 1 / 1 1 1 1 1 1 / 1 1 1 1 1 1') }
		});
		const width = screen.container.querySelector('svg')!.getBoundingClientRect().width;
		expect(width).toBeLessThanOrEqual(288);
		expect(width).toBeGreaterThan(150);
	});

	it('dans un choix (--espace-taille: 3cm) : au plus 3 cm', async () => {
		const target = mainElement();
		target.style.setProperty('--espace-taille', '3cm');
		const screen = await render(Espace, {
			target,
			props: { node: node('hauteurs: 1 1 1 1 1 1 / 1 1 1 1 1 1') }
		});
		const probe = target.appendChild(document.createElement('div'));
		probe.style.width = '3cm';
		const max = probe.getBoundingClientRect().width;
		expect(
			screen.container.querySelector('svg')!.getBoundingClientRect().width
		).toBeLessThanOrEqual(max + 0.5);
	});
});

describe('Cubes — bloc en erreur', () => {
	it('le prof voit le message situé', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('hauteurs: 9'), showErrors: true }
		});
		expect(screen.container.textContent).toContain('Ligne 1 :');
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('l’élève voit un cadre neutre', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('hauteurs: 9'), showErrors: false }
		});
		expect(screen.container.textContent).toContain(ESPACE_UNAVAILABLE);
		expect(screen.container.textContent).not.toContain('Ligne 1');
	});
});

describe('Cubes — branché dans le rendu Markdown', () => {
	it('au premier niveau et dans un item de liste', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: [
					'```cubes',
					'hauteurs: 2 1 / 1 0',
					'```',
					'',
					'1. Et celui-ci ?',
					'',
					'   ```cubes',
					'   hauteurs: 1 2',
					'   vue: face',
					'   ```'
				].join('\n') as ResolvedMarkdown
			}
		});
		expect(screen.container.querySelectorAll('svg[role="img"]')).toHaveLength(2);
	});
});
