/**
 * Bloc ```figure à l'écran (2026-10-01)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des
 * règles), Tailwind chargé par le projet de tests navigateur. L'afficheur est
 * chargé à la demande : chaque test attend son apparition.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FigureBlock from '../FigureBlock.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseFigureContent } from '$lib/ubumark/parser/figure-parser';
import { buildFigureScene } from '$lib/ubumark/utils/figure-scene';

const SOURCE = `fenetre: -1 ; 8 ; -1 ; 6
taille: petite
---
A = point(0, 0)
B = point(5, 0)
C = point(0, 4)
p = polygone(A, B, C)
angle(B, A, C, marque="carre")
m = marque_segment(A, B, traits=2)
v = vecteur(B, C)
c = cercle(A, rayon=1)
texte(2, 3, "hypoténuse")`;

const ERREUR_DSL = `fenetre: -1 ; 8 ; -1 ; 6
---
A = point(0, 0)
c = cercle(A, 2)`;

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

async function svgOf(container: HTMLElement): Promise<SVGSVGElement> {
	await expect.poll(() => container.querySelector('svg[role="img"]')).not.toBeNull();
	return container.querySelector('svg[role="img"]') as SVGSVGElement;
}

describe('FigureBlock — figure', () => {
	it('SVG role="img" avec un libellé automatique', async () => {
		const node = parseFigureContent(SOURCE);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		expect(svg.getAttribute('aria-label')).toMatch(/^Figure géométrique : points A, B, C/);
	});

	it('la description de l’auteur est prioritaire', async () => {
		const node = parseFigureContent(SOURCE.replace('---', 'description: Triangle ABC.\n---'));
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		expect(svg.getAttribute('aria-label')).toBe('Triangle ABC.');
	});

	it('chaque objet visible de la scène est dessiné', async () => {
		const node = parseFigureContent(SOURCE);
		const scene = buildFigureScene(node).scene!;
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const drawn = new Set(
			[...svg.querySelectorAll('[data-element]')].map((e) => e.getAttribute('data-element'))
		);
		expect(drawn).toEqual(new Set(scene.elements.map((e) => e.id)));
		// Noms des points, codage à deux traits, texte
		const texts = [...svg.querySelectorAll('text')].map((t) => t.textContent);
		expect(texts).toEqual(expect.arrayContaining(['A', 'B', 'C', 'hypoténuse']));
	});

	it('repère isotrope : le rapport du dessin suit la fenêtre', async () => {
		const node = parseFigureContent(SOURCE);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
		expect(w).toBe(280);
		expect(h / w).toBeCloseTo(7 / 9, 2);
	});

	it('trait visible : couleur du texte (token), pas `none`', async () => {
		const node = parseFigureContent(SOURCE);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const scene = buildFigureScene(node).scene!;
		const triangle = scene.elements.find((e) => e.type === 'polygon')!;
		const polygon = svg.querySelector(`polygon[data-element="${triangle.id}"]`)!;
		const stroke = getComputedStyle(polygon).stroke;
		expect(stroke).toMatch(/^rgb/);
		expect(getComputedStyle(polygon).fill).toBe('none');
		// Point : disque plein de la couleur du texte
		const dot = svg.querySelector('circle[r="3"]')!;
		expect(getComputedStyle(dot).fill).toBe(
			getComputedStyle(document.querySelector('main')!).color
		);
	});
});

describe('FigureBlock — erreurs (Q48, comportement 14)', () => {
	it('prof : message situé (ligne du bloc) et piste de correction', async () => {
		const node = parseFigureContent(ERREUR_DSL);
		const screen = await render(FigureBlock, {
			target: mainElement(),
			props: { node, showErrors: true }
		});
		await expect.poll(() => screen.container.textContent).toMatch(/Ligne 4 : `cercle\(\)`/);
		expect(screen.container.textContent).toMatch(/passant=B/);
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('élève : cadre neutre, aucun message technique', async () => {
		const node = parseFigureContent(ERREUR_DSL);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		await expect.poll(() => screen.container.textContent).toMatch(/Figure indisponible/);
		expect(screen.container.textContent).not.toMatch(/Ligne|cercle/);
	});

	it('type refusé (courbe) : situé pour le prof', async () => {
		const node = parseFigureContent('fenetre: 0 ; 4 ; 0 ; 3\n---\ncourbe("y = x")');
		const screen = await render(FigureBlock, {
			target: mainElement(),
			props: { node, showErrors: true }
		});
		await expect.poll(() => screen.container.textContent).toMatch(/Ligne 3 : courbe\(\)/);
	});

	it('erreur d’en-tête : affichée sans attendre le chargement', async () => {
		const node = parseFigureContent('fenetre: 4 ; 0 ; 0 ; 3\n---\n');
		const screen = await render(FigureBlock, {
			target: mainElement(),
			props: { node, showErrors: true }
		});
		expect(screen.container.textContent).toMatch(/Ligne 1 : fenêtre/);
	});
});

describe('FigureBlock — dans MarkdownRenderer', () => {
	const MD = ['Avant.', '', '```figure', ...ERREUR_DSL.split('\n'), '```'].join('\n');

	it('contexte prof posé par `showAuthoringErrors`', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: MD, showAuthoringErrors: true }
		});
		await expect.poll(() => screen.container.textContent).toMatch(/Ligne 4 :/);
	});

	it('par défaut (élève) : cadre neutre', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: MD }
		});
		await expect.poll(() => screen.container.textContent).toMatch(/Figure indisponible/);
	});

	it('bloc en retrait dans un item de liste : dessiné', async () => {
		const md = [
			'1. Observer :',
			'',
			...['```figure', ...SOURCE.split('\n'), '```'].map((l) => `   ${l}`),
			'2. Suite.'
		].join('\n');
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: md }
		});
		await svgOf(screen.container);
	});
});

describe('FigureBlock — couleur hostile (relecture, point 3)', () => {
	const HOSTILE = `fenetre: 0 ; 4 ; 0 ; 3
---
A = point(1, 1, couleur="red;mask-image:url(https://x.supabase.co/pixel)")
B = point(2, 1)`;

	it('élève : jamais dans le DOM, cadre neutre', async () => {
		const md = ['```figure', ...HOSTILE.split('\n'), '```'].join('\n');
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: md }
		});
		await expect.poll(() => screen.container.textContent).toMatch(/Figure indisponible/);
		expect(screen.container.innerHTML).not.toMatch(/mask-image|supabase/);
	});

	it('prof : erreur située, la couleur n’est pas appliquée', async () => {
		const node = parseFigureContent(HOSTILE);
		const screen = await render(FigureBlock, {
			target: mainElement(),
			props: { node, showErrors: true }
		});
		await expect
			.poll(() => screen.container.textContent)
			.toMatch(/Ligne 3 : « A » : couleur inconnue/);
		expect(screen.container.querySelector('[style*="mask"]')).toBeNull();
	});
});

describe('FigureBlock — noms de points et textes placés (2026-10-02)', () => {
	const PLACEMENT = `fenetre: -1 ; 8 ; -1 ; 6
taille: grande
---
A = point(2, 2, etiquette="gauche")
B = point(5, 2, etiquette="bas")
C = point(5, 4, etiquette="aucune")
texte(2, 4, "centre")`;

	it('taille réelle = FIGURE_LABEL_FONT_PX, côtés et centrage respectés (boîtes mesurées)', async () => {
		const { FIGURE_LABEL_FONT_PX } = await import('$lib/ubumark/utils/figure-svg');
		const node = parseFigureContent(PLACEMENT);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const texts = [...svg.querySelectorAll('text')];
		const byText = (t: string) => texts.find((e) => e.textContent === t) as SVGTextElement;
		const dotOf = (label: SVGTextElement) =>
			svg.querySelector(
				`circle[data-element="${label.getAttribute('data-element')}"]`
			) as SVGCircleElement;

		expect(parseFloat(getComputedStyle(byText('A')).fontSize)).toBe(FIGURE_LABEL_FONT_PX);
		expect(getComputedStyle(byText('A')).fontStyle).toBe('italic');

		// A à gauche : la boîte du nom finit avant le point, centrée verticalement sur lui
		const a = byText('A').getBBox();
		const dotA = dotOf(byText('A'));
		expect(a.x + a.width).toBeLessThan(dotA.cx.baseVal.value);
		// B en bas : la boîte commence sous le point
		const b = byText('B').getBBox();
		expect(b.y).toBeGreaterThan(dotOf(byText('B')).cy.baseVal.value);
		// C : pas de nom, point dessiné
		expect(texts.some((e) => e.textContent === 'C')).toBe(false);
		expect(svg.querySelectorAll('circle').length).toBe(3);

		// Texte centré : milieu horizontal de la boîte = abscisse de (2, 4) = abscisse de A
		const t = byText('centre');
		expect(t.getAttribute('dominant-baseline')).toBeNull();
		const tb = t.getBBox();
		expect(Math.abs(tb.x + tb.width / 2 - dotA.cx.baseVal.value)).toBeLessThan(1);
	});
});

// Palette commune des figures (docs/wip/palette-figures-progress.md) : la
// couleur RENDUE dans les deux modes ; un hexadécimal d'auteur reste fixe.
describe('FigureBlock — couleurs et thème', () => {
	const COLORED = `fenetre: -1 ; 8 ; -1 ; 6
---
A = point(0, 0)
B = point(5, 0)
C = point(0, 4)
s = segment(A, B, couleur="rouge")
t = segment(A, C, couleur="#1e40af")`;

	it('une couleur nommée suit le mode, un hexadécimal d’auteur reste fixe', async () => {
		const node = parseFigureContent(COLORED);
		const scene = buildFigureScene(node).scene!;
		const idOf = (label: string) => scene.elements.find((e) => e.label === label)!.id;
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const strokeOf = (label: string) =>
			getComputedStyle(svg.querySelector(`[data-element="${idOf(label)}"]`) as SVGElement).stroke;
		const root = document.documentElement;
		try {
			root.style.colorScheme = 'light';
			expect(strokeOf('s')).toBe('rgb(220, 38, 38)'); // #dc2626
			expect(strokeOf('t')).toBe('rgb(30, 64, 175)'); // #1e40af
			root.style.colorScheme = 'dark';
			expect(strokeOf('s')).toBe('rgb(255, 98, 87)'); // #ff6257
			expect(strokeOf('t')).toBe('rgb(30, 64, 175)');
		} finally {
			root.style.colorScheme = '';
		}
	});
});
