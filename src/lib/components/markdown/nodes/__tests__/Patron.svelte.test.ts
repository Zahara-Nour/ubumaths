/**
 * Bloc ```patron à l'écran (chantier `solides`, lot 4)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Espace from '../Espace.svelte';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import { ESPACE_UNAVAILABLE } from '$lib/ubumark/types/espace';
import { PATRON_FOLD_STROKE } from '$lib/ubumark/utils/espace-patrons';

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

const node = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'patron');

/** Un centimètre CSS, en pixels, dans le décor du test */
function cmInPx(target: HTMLElement): number {
	const probe = target.appendChild(document.createElement('div'));
	probe.style.width = '1cm';
	const w = probe.getBoundingClientRect().width;
	probe.remove();
	return w;
}

describe('Patron — figure', () => {
	it('un SVG role="img" dont le nom ne dit ni « patron » ni le solide', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('solide: cube', 'forme: faux 2') }
		});
		const svgs = screen.container.querySelectorAll('svg[role="img"]');
		expect(svgs).toHaveLength(1);
		expect(svgs[0].getAttribute('aria-label')).toBe('Assemblage de polygones à plier');
	});

	it('croix : 5 plis fins, 14 côtés de contour', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('solide: cube') }
		});
		const lines = [...screen.container.querySelectorAll('polyline')];
		const folds = lines.filter(
			(l) => l.getAttribute('stroke-width') === String(PATRON_FOLD_STROKE)
		);
		expect(folds).toHaveLength(5);
		expect(lines).toHaveLength(19);
	});

	it('noms des sommets répétés, numéros des faces', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('solide: cube', 'sommets: A B C D E F G H', 'faces: numeros') }
		});
		const texts = [...screen.container.querySelectorAll('text')].map((t) => t.textContent);
		expect(texts).toHaveLength(14 + 6);
		// 14 coins, 8 sommets : des noms reviennent
		expect(new Set(texts.filter((t) => /^[A-H]$/.test(t ?? ''))).size).toBe(8);
	});

	it('face marquée teintée mais translucide', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('solide: cube', 'marquer: face 3') }
		});
		const fill = getComputedStyle(screen.container.querySelector('.patron-face-marquee')!).fill;
		expect(fill).not.toBe('none');
		expect(fill).toMatch(/rgba|color\(|oklab|\/ 0\./);
	});

	it('plus grand côté du patron : 6 cm', async () => {
		const target = mainElement();
		const screen = await render(Espace, { target, props: { node: node('solide: cube') } });
		const width = screen.container.querySelector('svg')!.getBoundingClientRect().width;
		// Croix 4 × 3 : largeur 6 cm, + 2 marges
		expect(width / cmInPx(target)).toBeCloseTo(6 + 0.1, 1);
	});

	it('bloc en erreur : cadre neutre pour l’élève, messages pour le prof', async () => {
		const pupil = await render(Espace, {
			target: mainElement(),
			props: { node: node('solide: cone 2 3') }
		});
		expect(pupil.container.textContent).toContain(ESPACE_UNAVAILABLE);
		const teacher = await render(Espace, {
			target: mainElement(),
			props: { node: node('solide: cone 2 3'), showErrors: true }
		});
		expect(teacher.container.textContent).toMatch(/le cône n’a pas de patron/);
	});
});
