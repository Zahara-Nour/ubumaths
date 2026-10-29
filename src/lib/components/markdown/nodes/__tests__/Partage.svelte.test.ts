/**
 * Bloc ```partage à l'écran (phase 0 : `docs/wip/fractions-a-colorier-progress.md` § 4)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Partage from '../Partage.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parsePartageContent } from '$lib/ubumark/parser/partage-parser';
import { PARTAGE_UNAVAILABLE } from '$lib/ubumark/types/partage';
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

const node = (...lines: string[]) => parsePartageContent(lines.join('\n'));

describe('Partage — figure', () => {
	it('un SVG role="img" au nom accessible qui dit la forme sans la réponse', async () => {
		const screen = await render(Partage, {
			target: mainElement(),
			props: { node: node('forme: bande 8', 'gris: 3') }
		});
		const svgs = screen.container.querySelectorAll('svg[role="img"]');
		expect(svgs).toHaveLength(1);
		expect(svgs[0].getAttribute('aria-label')).toBe('Bande partagée en parts égales');
	});

	it('disque : la forme seule', async () => {
		const screen = await render(Partage, {
			target: mainElement(),
			props: { node: node('forme: disque 6') }
		});
		expect(screen.container.querySelector('svg')!.getAttribute('aria-label')).toBe(
			'Disque partagé en parts égales'
		);
	});

	it('autant de parts que demandé, autant de coloriées que dans gris:', async () => {
		for (const [lines, total, shaded] of [
			[['forme: bande 8', 'gris: 3'], 8, 3],
			[['forme: grille 10×10', 'gris: 1, 50, 100'], 100, 3],
			[['forme: disque 5', 'gris: 5'], 5, 5],
			[['forme: carre-diagonales'], 4, 0]
		] as const) {
			const screen = await render(Partage, {
				target: mainElement(),
				props: { node: node(...lines) }
			});
			expect(screen.container.querySelectorAll('.partage-part'), lines.join()).toHaveLength(total);
			expect(screen.container.querySelectorAll('.partage-coloriee'), lines.join()).toHaveLength(
				shaded
			);
		}
	});

	it('aucun texte ni titre dans le DOM : la figure se lit par son nom accessible', async () => {
		const screen = await render(Partage, {
			target: mainElement(),
			props: { node: node('forme: bande 8', 'gris: 3') }
		});
		expect(screen.container.textContent?.trim()).toBe('');
		expect(screen.container.querySelector('title, desc')).toBeNull();
	});

	it('couleurs du thème : aucune écrite en dur, parts coloriées en couleur d’accent', async () => {
		const target = mainElement();
		const screen = await render(Partage, {
			target,
			props: { node: node('forme: bande 4', 'gris: 1') }
		});
		const svg = screen.container.querySelector('svg')!;
		for (const el of svg.querySelectorAll('*')) {
			expect(el.hasAttribute('fill'), el.tagName).toBe(false);
			expect(el.hasAttribute('stroke'), el.tagName).toBe(false);
		}
		const token = (name: string) => {
			const probe = target.appendChild(document.createElement('span'));
			probe.style.color = `var(${name})`;
			const color = getComputedStyle(probe).color;
			probe.remove();
			return color;
		};
		const fill = (selector: string) => getComputedStyle(svg.querySelector(selector)!).fill;
		expect(fill('.partage-coloriee')).toBe(token('--color-fig-orange'));
		expect(fill('.partage-part:not(.partage-coloriee)')).toBe(token('--color-background'));
		expect(token('--color-fig-orange')).not.toBe(token('--color-background'));
	});

	it('tient sur un téléphone de 320 px, même une grille 10×10', async () => {
		const narrow = mainElement();
		narrow.style.width = '288px';
		const screen = await render(Partage, {
			target: narrow,
			props: { node: node('forme: grille 10×10', 'gris: 30') }
		});
		const width = screen.container.querySelector('svg')!.getBoundingClientRect().width;
		expect(width).toBeLessThanOrEqual(288);
		expect(width).toBeGreaterThan(200);
	});
});

describe('Partage — bloc en erreur', () => {
	it('le prof voit le message situé', async () => {
		const screen = await render(Partage, {
			target: mainElement(),
			props: { node: node('forme: bande 99'), showErrors: true }
		});
		expect(screen.container.textContent).toContain('Ligne 1 :');
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('l’élève voit un cadre neutre', async () => {
		const screen = await render(Partage, {
			target: mainElement(),
			props: { node: node('forme: bande 99'), showErrors: false }
		});
		expect(screen.container.textContent).toContain(PARTAGE_UNAVAILABLE);
		expect(screen.container.textContent).not.toContain('Ligne 1');
	});
});

describe('Partage — branchée dans le rendu Markdown', () => {
	it('au premier niveau et dans un item de liste', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: [
					'```partage',
					'forme: bande 8',
					'gris: 3',
					'```',
					'',
					'1. Et celle-ci ?',
					'',
					'   ```partage',
					'   forme: disque 4',
					'   ```'
				].join('\n') as ResolvedMarkdown
			}
		});
		expect(screen.container.querySelectorAll('svg[role="img"]')).toHaveLength(2);
	});
});
