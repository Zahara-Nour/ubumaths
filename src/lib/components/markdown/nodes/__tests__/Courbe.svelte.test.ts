/**
 * Bloc ```courbe à l'écran (2026-10-01)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des
 * règles), Tailwind chargé par le projet de tests navigateur.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Courbe from '../Courbe.svelte';
import ListNode from '../ListNode.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';
import { buildCourbeScene } from '$lib/ubumark/utils/courbe-scene';
import { parseMarkdown, type ListNode as ListAst } from '$lib/ubumark';

const SOURCE = `x: -4 ; 6
y: -8 ; 12
grille: 1 ; 2
f(x) = 1/(x-2) + 1   bleu   nom=\\mathcal{C}_f
g(x) = x/2 sur ]0 ; 4]   rouge pointillé
points: A(-1 ; 0), M(3 ; f(3))
asymptotes: x=2 ; y=1
aire: g ; 1 ; 3`;

const ERREUR = `x: -4 ; 6
y: -8 ; 12
f(x) = 2*(x+1`;

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

describe('Courbe — figure', () => {
	it('SVG role="img" avec un libellé automatique (comportement 11)', async () => {
		const node = parseCourbeContent(SOURCE);
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector('svg[role="img"]');
		expect(svg).not.toBeNull();
		expect(svg!.getAttribute('aria-label')).toBe('Courbes de f et g, x de −4 à 6');
	});

	it('la description de l’auteur est prioritaire', async () => {
		const node = parseCourbeContent(`${SOURCE}\ndescription: Hyperbole et droite.`);
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector('svg[role="img"]');
		expect(svg!.getAttribute('aria-label')).toBe('Hyperbole et droite.');
	});

	it('autant de tracés, de points et de disques que la scène (comportement 10)', async () => {
		const node = parseCourbeContent(SOURCE);
		const scene = buildCourbeScene(node.spec!);
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const el = screen.container;
		const polylines = scene.curves.reduce((n, c) => n + c.polylines.length, 0);
		expect(polylines).toBeGreaterThanOrEqual(3);
		expect(el.querySelectorAll('.courbe-trace').length).toBe(polylines);
		expect(el.querySelectorAll('.courbe-point').length).toBe(scene.points.length);
		expect(el.querySelectorAll('.courbe-borne').length).toBe(scene.endpoints.length);
		expect(el.querySelectorAll('.courbe-asymptote').length).toBe(2);
		expect(el.querySelectorAll('.courbe-aire').length).toBe(1);
	});

	it('les tracés sont VISIBLES : trait coloré, non vide', async () => {
		const node = parseCourbeContent(SOURCE);
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const trace = screen.container.querySelector('.courbe-trace') as SVGElement;
		const style = getComputedStyle(trace);
		expect(style.stroke).not.toBe('none');
		expect(style.stroke).not.toBe('');
		expect(parseFloat(style.strokeWidth)).toBeGreaterThan(0);
		const dashed = screen.container.querySelector('.courbe-trace.pointille') as SVGElement;
		expect(getComputedStyle(dashed).strokeDasharray).not.toBe('none');
		const open = screen.container.querySelector('.courbe-borne.ouverte') as SVGElement;
		expect(open).not.toBeNull();
	});

	it('graduations à la française et nom de courbe', async () => {
		const node = parseCourbeContent('x: -1 ; 1\ny: -1 ; 1\ngrille: 0.5 ; 0.5\nf(x) = x  nom=C_f');
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const text = screen.container.textContent ?? '';
		expect(text).toContain('0,5');
		expect(text).toContain('−0,5');
		const label = screen.container.querySelector('.courbe-nom');
		expect(label?.textContent).toBe('Cf');
	});
});

describe('Courbe — erreurs (Q48)', () => {
	it('élève (défaut) : cadre neutre « Figure indisponible », pas de détail', async () => {
		const node = parseCourbeContent(ERREUR);
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const text = screen.container.textContent ?? '';
		expect(text).toContain('Figure indisponible');
		expect(text).not.toContain('Ligne');
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('prof / aperçu : message détaillé avec le numéro de ligne', async () => {
		const node = parseCourbeContent(ERREUR);
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node, showErrors: true }
		});
		const text = screen.container.textContent ?? '';
		expect(text).toContain('Ligne 3');
		expect(text).toMatch(/illisible/);
	});

	it('MarkdownRenderer : `showAuthoringErrors` transmis aux blocs, élève par défaut', async () => {
		const content = ['Avant.', '', '```courbe', ERREUR, '```', '', 'Après.'].join('\n');
		const eleve = await render(MarkdownRenderer, { target: mainElement(), props: { content } });
		expect(eleve.container.textContent).toContain('Figure indisponible');
		expect(eleve.container.textContent).toContain('Après.');
		const prof = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content, showAuthoringErrors: true }
		});
		expect(prof.container.textContent).toContain('Ligne 3');
	});

	it('prof : un avertissement (point hors fenêtre) est signalé sous la figure', async () => {
		const node = parseCourbeContent('x: -4 ; 6\ny: -8 ; 12\nf(x) = x\npoints: B(10 ; 0)');
		const prof = await render(Courbe, { target: mainElement(), props: { node, showErrors: true } });
		expect(prof.container.querySelector('svg[role="img"]')).not.toBeNull();
		expect(prof.container.textContent).toContain('hors de la fenêtre');
		const eleve = await render(Courbe, { target: mainElement(), props: { node } });
		expect(eleve.container.textContent).not.toContain('hors de la fenêtre');
	});
});

describe('Courbe — dans un item de liste (comportement 8)', () => {
	it('ListNode affiche la figure', async () => {
		const md = [
			'1. Lire :',
			'',
			'   ```courbe',
			...SOURCE.split('\n').map((l) => `   ${l}`),
			'   ```',
			'2. Suite.'
		].join('\n');
		const list = parseMarkdown(md).children[0] as ListAst;
		const screen = await render(ListNode, {
			target: mainElement(),
			props: { ordered: true, items: list.items }
		});
		expect(screen.container.querySelectorAll('svg[role="img"]').length).toBe(1);
		expect(screen.container.querySelectorAll('.courbe-trace').length).toBeGreaterThan(0);
	});
});

describe('Courbe — suites (1re spé)', () => {
	const SUITES = `x: -1 ; 10
y: -1 ; 20
f(x) = 0.5*x+2   vert   nom=C_f
u(n) = 2*n+1 pour n de 0 à 12   bleu   nom=u
v(0) = 1 ; v(n+1) = 0.5*v(n)+2 pour n de 0 à 9   rouge   nom=v`;

	it('un disque par terme visible, autant que la scène (et que Typst)', async () => {
		const node = parseCourbeContent(SUITES);
		const scene = buildCourbeScene(node.spec!);
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const disks = screen.container.querySelectorAll('.courbe-terme');
		expect(disks.length).toBe(20);
		expect(disks.length).toBe(scene.sequences.reduce((n, s) => n + s.terms.length, 0));
		// Points non reliés : aucune polyligne de plus que la courbe de f
		expect(screen.container.querySelectorAll('.courbe-trace').length).toBe(
			scene.curves[0].polylines.length
		);
	});

	it('les termes sont VISIBLES : disque rempli d’une couleur, rayon non nul', async () => {
		const node = parseCourbeContent(SUITES);
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const disk = screen.container.querySelector('.courbe-terme') as SVGCircleElement;
		const style = getComputedStyle(disk);
		expect(style.fill).not.toBe('none');
		expect(style.fill).not.toBe('');
		expect(Number(disk.getAttribute('r'))).toBeGreaterThan(0);
		const box = disk.getBoundingClientRect();
		expect(box.width).toBeGreaterThan(0);
	});

	it('aria-label mentionne la suite ; noms affichés', async () => {
		const node = parseCourbeContent(SUITES);
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector('svg[role="img"]');
		expect(svg!.getAttribute('aria-label')).toBe('Courbe de f et suites u et v, x de −1 à 10');
		const names = [...screen.container.querySelectorAll('.courbe-nom')].map((n) => n.textContent);
		expect(names).toEqual(['Cf', 'u', 'v']);
	});

	it('prof : termes hors fenêtre et récurrence explosive signalés sous la figure', async () => {
		const node = parseCourbeContent(
			'x: -1 ; 10\ny: -1 ; 20\nu(n) = 2*n+1 pour n de 0 à 12\nv(0) = 2 ; v(n+1) = v(n)^2 pour n de 0 à 50'
		);
		const prof = await render(Courbe, { target: mainElement(), props: { node, showErrors: true } });
		const text = prof.container.textContent ?? '';
		expect(text).toContain('hors de la fenêtre');
		expect(text).toContain('calcul arrêté');
	});

	it('dans un item de liste, via MarkdownRenderer', async () => {
		const content = [
			'1. Conjecturer :',
			'',
			'   ```courbe',
			...SUITES.split('\n').map((l) => `   ${l}`),
			'   ```'
		].join('\n');
		const screen = await render(MarkdownRenderer, { target: mainElement(), props: { content } });
		expect(screen.container.querySelectorAll('.courbe-terme').length).toBe(20);
	});
});

describe('Courbe — escalier (lot 0 des suites 1re spé)', () => {
	const ESCALIER = `x: 0 ; 7
y: 0 ; 7
u(0) = 0.5 ; u(n+1) = 0.5*u(n)+3 pour n de 0 à 4   rouge   escalier termes   nom=C_f`;

	it('autant de traits que la scène : relation, y = x, escalier, rappels, rangs', async () => {
		const node = parseCourbeContent(ESCALIER);
		const st = buildCourbeScene(node.spec!).sequences[0].staircase!;
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const el = screen.container;
		expect(el.querySelectorAll('.courbe-relation').length).toBe(st.curve.length);
		expect(el.querySelectorAll('.courbe-diagonale').length).toBe(1);
		expect(el.querySelectorAll('.courbe-escalier').length).toBe(st.steps.length);
		expect(el.querySelectorAll('.courbe-rappel').length).toBe(4);
		expect(el.querySelectorAll('.courbe-terme').length).toBe(0);
		const ranks = [...el.querySelectorAll('.courbe-rang')].map((r) => r.textContent);
		expect(ranks).toEqual(['u0', 'u1', 'u2', 'u3']);
	});

	it('l’escalier est VISIBLE : trait coloré, sans remplissage, non vide', async () => {
		const node = parseCourbeContent(ESCALIER);
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		for (const selector of ['.courbe-escalier', '.courbe-relation', '.courbe-diagonale']) {
			const line = screen.container.querySelector(selector) as SVGPolylineElement;
			const style = getComputedStyle(line);
			expect(style.fill).toBe('none');
			expect(style.stroke).not.toBe('none');
			expect(Number.parseFloat(style.strokeWidth)).toBeGreaterThan(0);
			expect(line.getBoundingClientRect().width).toBeGreaterThan(0);
		}
	});

	it('les rangs restent DANS le dessin, même axe des abscisses en bas', async () => {
		const node = parseCourbeContent(ESCALIER);
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector('svg')!.getBoundingClientRect();
		for (const rank of screen.container.querySelectorAll('.courbe-rang')) {
			expect(rank.getBoundingClientRect().bottom).toBeLessThanOrEqual(svg.bottom + 0.5);
		}
	});

	it('aria-label mentionne l’escalier', async () => {
		const node = parseCourbeContent(ESCALIER);
		const screen = await render(Courbe, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector('svg[role="img"]');
		expect(svg!.getAttribute('aria-label')).toBe('Escalier de la suite u, x de 0 à 7');
	});
});
