/**
 * Bloc ```trig à l'écran : points nommés et erreurs (décision de David, 2026-10-02)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TrigCircle from '../TrigCircle.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseTrigCircleContent } from '$lib/ubumark/parser/trig-circle-parser';

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

function nodeOf(source: string) {
	return parseTrigCircleContent(source).node!;
}

describe('TrigCircle — points nommés', () => {
	it('labels: false : un nom visible par point, aucune valeur', async () => {
		const node = nodeOf(`preset: custom\npoints: M = 2*pi/3, N = -pi/4\nlabels: false`);
		const screen = await render(TrigCircle, { target: mainElement(), props: { node } });
		const el = screen.container;
		const names = [...el.querySelectorAll('.trig-point-name')];
		expect(names.map((n) => n.textContent?.trim())).toEqual(['M', 'N']);
		for (const n of names) {
			const box = n.getBoundingClientRect();
			expect(box.width).toBeGreaterThan(0);
			expect(getComputedStyle(n).fontStyle).toBe('italic');
		}
		expect(el.querySelectorAll('.trig-named-point')).toHaveLength(2);
		expect(el.querySelectorAll('.trig-label')).toHaveLength(0);
	});

	it('preset + points, labels: true : valeurs du preset seulement', async () => {
		// M tombe sur π/2 (angle du preset) : sa valeur disparaît, son nom reste
		const node = nodeOf(`preset: quarters\npoints: M = pi/2, N = pi/3`);
		const screen = await render(TrigCircle, { target: mainElement(), props: { node } });
		const el = screen.container;
		expect(el.querySelectorAll('.trig-point-name')).toHaveLength(2);
		expect(el.querySelectorAll('.trig-label')).toHaveLength(3);
	});

	it('aria-label : « points M et N »', async () => {
		const node = nodeOf(`preset: custom\npoints: M = 2*pi/3, N = -pi/4`);
		const screen = await render(TrigCircle, { target: mainElement(), props: { node } });
		const svg = screen.container.querySelector('svg[role="img"]');
		expect(svg!.getAttribute('aria-label')).toBe('Cercle trigonométrique, points M et N');
	});

	it('aria-label : un seul point, trois points', async () => {
		const un = await render(TrigCircle, {
			target: mainElement(),
			props: { node: nodeOf(`points: M = pi/3`) }
		});
		expect(un.container.querySelector('svg')!.getAttribute('aria-label')).toBe(
			'Cercle trigonométrique, point M'
		);
		const trois = await render(TrigCircle, {
			target: mainElement(),
			props: { node: nodeOf(`points: A = 0, B = pi/2, C = pi`) }
		});
		expect(trois.container.querySelector('svg')!.getAttribute('aria-label')).toBe(
			'Cercle trigonométrique, points A, B et C'
		);
	});
});

describe('TrigCircle — erreurs', () => {
	const ERREUR = `preset: quarters\nnoms: M`;

	it('élève (défaut) : cadre neutre « Figure indisponible », pas de détail', async () => {
		const screen = await render(TrigCircle, {
			target: mainElement(),
			props: { node: nodeOf(ERREUR) }
		});
		const text = screen.container.textContent ?? '';
		expect(text).toContain('Figure indisponible');
		expect(text).not.toContain('Ligne');
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('prof : message situé', async () => {
		const screen = await render(TrigCircle, {
			target: mainElement(),
			props: { node: nodeOf(ERREUR), showErrors: true }
		});
		expect(screen.container.textContent).toContain('Ligne 2 : clé inconnue « noms »');
	});

	it('MarkdownRenderer : le bloc ne disparaît plus, message au prof', async () => {
		const content = ['Avant.', '', '```trig', ERREUR, '```', '', 'Après.'].join('\n');
		const eleve = await render(MarkdownRenderer, { target: mainElement(), props: { content } });
		expect(eleve.container.textContent).toContain('Figure indisponible');
		expect(eleve.container.textContent).toContain('Après.');
		const prof = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content, showAuthoringErrors: true }
		});
		expect(prof.container.textContent).toContain('clé inconnue « noms »');
	});
});
