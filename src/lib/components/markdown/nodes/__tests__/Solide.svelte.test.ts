/**
 * Bloc ```solide à l'écran (chantier `solides`, lot 3)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Espace from '../Espace.svelte';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import { ESPACE_UNAVAILABLE } from '#lib/ubumark/types/espace.ts';

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

	it('vecteurs donnés : une flèche à pointe pleine, visible (couleur du texte)', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: {
				node: node(
					'forme: cube 2',
					'sommets: A B C D E F G H',
					'points: I milieu AE',
					'vecteurs: AB, u = AI'
				)
			}
		});
		// AB, AI et la petite flèche de u : trois traits, trois pointes
		expect(screen.container.querySelectorAll('line.solide-trait')).toHaveLength(3);
		const heads = screen.container.querySelectorAll('polygon.solide-pointe');
		expect(heads).toHaveLength(3);
		const fill = getComputedStyle(heads[0]).fill;
		expect(fill).not.toBe('none');
		expect(fill).toBe(getComputedStyle(screen.container.querySelector('text')!).fill);
		const texts = [...screen.container.querySelectorAll('text')].map((t) => t.textContent);
		expect(texts).toContain('I');
		expect(texts).toContain('u');
		expect(screen.container.querySelector('svg')!.getAttribute('aria-label')).toContain(
			'vecteur u égal à AI'
		);
	});

	it('plans donnés : teintés, bord en couleur, tirets pour le bord caché, nom entre parenthèses', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: {
				node: node('forme: cube 2', 'sommets: A B C D E F G H', 'plans: P = (BDE), (ACG)')
			}
		});
		const fills = [...screen.container.querySelectorAll('polygon.solide-plan')];
		expect(fills).toHaveLength(2);
		// Teintés, chacun de sa couleur, sans contour
		const tints = fills.map((f) => getComputedStyle(f).fill);
		expect(tints[0]).not.toBe('none');
		expect(tints[1]).not.toBe('none');
		expect(tints[0]).not.toBe(tints[1]);
		// Bord : (BDE) a un côté visible ([BE], face de devant) et deux cachés
		const borders = [...screen.container.querySelectorAll('polyline.solide-plan-bord')];
		const first = borders.filter((b) => !b.classList.contains('solide-plan-second'));
		expect(first.map((p) => p.getAttribute('stroke-dasharray') !== null).sort()).toEqual([
			false,
			true,
			true
		]);
		const edge = screen.container.querySelector('polyline.solide-trait')!;
		const stroke = getComputedStyle(first[0]).stroke;
		expect(stroke).not.toBe('none');
		expect(stroke).not.toBe(getComputedStyle(edge).stroke);
		expect(getComputedStyle(first[0]).fill).toBe('none');
		expect(parseFloat(getComputedStyle(first[0]).strokeWidth)).toBeGreaterThan(0);
		const texts = [...screen.container.querySelectorAll('text')].map((t) => t.textContent);
		expect(texts).toContain('(P)');
	});

	it('droites données : en couleur, tirets dans le solide, nom entre parenthèses', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: {
				node: node('forme: cube 2', 'sommets: A B C D E F G H', 'droites: d = (AG)')
			}
		});
		// (AG) : plein, tirets dans le cube, plein
		const pieces = [...screen.container.querySelectorAll('polyline.solide-droite')];
		expect(pieces).toHaveLength(3);
		expect(pieces.map((p) => p.getAttribute('stroke-dasharray') !== null)).toEqual([
			false,
			true,
			false
		]);
		// Une couleur à elle : ni celle des arêtes, ni rien
		const stroke = getComputedStyle(pieces[0]).stroke;
		const edge = screen.container.querySelector('polyline:not(.solide-droite)')!;
		expect(stroke).not.toBe('none');
		expect(stroke).not.toBe(getComputedStyle(edge).stroke);
		expect(getComputedStyle(pieces[0]).fill).toBe('none');
		// Le trait a une vraie épaisseur à l'écran
		expect(parseFloat(getComputedStyle(pieces[0]).strokeWidth)).toBeGreaterThan(0);
		const texts = [...screen.container.querySelectorAll('text')].map((t) => t.textContent);
		expect(texts).toContain('(d)');
		expect(screen.container.querySelector('svg')!.getAttribute('aria-label')).toContain(
			'droite d égale à (AG)'
		);
	});

	it('vecteur indicé : w puis 1 en indice (tspan plus petit, abaissé)', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('forme: cube 2', 'sommets: A B C D E F G H', 'vecteurs: w1 = AB') }
		});
		const w = [...screen.container.querySelectorAll('text')].find((t) => t.textContent === 'w1');
		const sub = w?.querySelector('tspan');
		expect(sub?.textContent).toBe('1');
		expect(Number(sub?.getAttribute('dy'))).toBeGreaterThan(0);
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
