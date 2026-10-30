/**
 * Bloc ```solide à l'écran (chantier `solides`, lot 3)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Espace from '../Espace.svelte';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import { ESPACE_UNAVAILABLE } from '$lib/ubumark/types/espace';

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

const node = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');

/** Un centimètre CSS, en pixels, dans le décor du test */
function cmInPx(target: HTMLElement): number {
	const probe = target.appendChild(document.createElement('div'));
	probe.style.width = '1cm';
	const w = probe.getBoundingClientRect().width;
	probe.remove();
	return w;
}

describe('Solide — figure', () => {
	it('un SVG role="img" dont le nom ne dit jamais le solide', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('forme: pyramide carree 4 3') }
		});
		const svgs = screen.container.querySelectorAll('svg[role="img"]');
		expect(svgs).toHaveLength(1);
		expect(svgs[0].getAttribute('aria-label')).toBe('Solide en perspective cavalière');
	});

	it('pavé : 12 traits, 3 en tirets', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('forme: pave 4 2 3') }
		});
		expect(screen.container.querySelectorAll('polyline')).toHaveLength(12);
		expect(screen.container.querySelectorAll('polyline[stroke-dasharray]')).toHaveLength(3);
	});

	it('noms des sommets et cotes écrits dans le dessin', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('forme: pave 4 2 3', 'sommets: A B C D E F G H', 'cotes: cm') }
		});
		const texts = [...screen.container.querySelectorAll('text')].map((t) => t.textContent);
		expect(texts).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '4 cm', '2 cm', '3 cm']);
	});

	it('face marquée teintée mais translucide (les tirets restent visibles)', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('forme: cube 2', 'marquer: face dessus') }
		});
		const face = screen.container.querySelector('.solide-face-marquee')!;
		const fill = getComputedStyle(face).fill;
		expect(fill).not.toBe('none');
		// color-mix(…, transparent) : couleur à canal alpha
		expect(fill).toMatch(/rgba|color\(|oklab|\/ 0\./);
	});

	it('plus grand côté du solide : 4 cm (étiquettes en plus)', async () => {
		const target = mainElement();
		const screen = await render(Espace, { target, props: { node: node('forme: pave 4 2 3') } });
		const width = screen.container.querySelector('svg')!.getBoundingClientRect().width;
		const cm = cmInPx(target);
		// pavé 4 × 2 × 3 : largeur = 4 + 2 × 0,35, mise à 4 cm (plus grand côté), + 2 marges
		expect(width / cm).toBeCloseTo(4 + 0.1, 1);
	});

	it('bloc en erreur : cadre neutre pour l’élève, messages pour le prof', async () => {
		const pupil = await render(Espace, {
			target: mainElement(),
			props: { node: node('forme: sphere 3') }
		});
		expect(pupil.container.textContent).toContain(ESPACE_UNAVAILABLE);
		const teacher = await render(Espace, {
			target: mainElement(),
			props: { node: node('forme: sphere 3'), showErrors: true }
		});
		expect(teacher.container.textContent).toMatch(/forme « sphere » inconnue/);
	});
});
