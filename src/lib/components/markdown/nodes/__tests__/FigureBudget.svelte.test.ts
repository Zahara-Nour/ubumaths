/**
 * Budget par DOCUMENT des blocs ```figure et ```courbe (relecture 2026-10-01)
 *
 * Mesuré avant correctif : un message de chat de 10 000 caractères avec 126
 * blocs `polygone_regulier(K,1,10^7)` bloquait 2,8 s le fil principal de chaque
 * lecteur ; 70 blocs `intersection` : 2,3 s. Le renderer partage désormais un
 * budget (nombre de blocs + temps cumulé) entre tous ses blocs ; au-delà, cadre
 * neutre (message pour le prof).
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { DOCUMENT_FIGURE_LIMITS } from '../../render-budget';

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

beforeAll(async () => {
	// Le chargement à la demande de l'afficheur n'est pas ce qu'on mesure
	await import('../FigureBlockView.svelte');
});

const POLYGONE = [
	'```figure',
	'fenetre:-2;2;-2;2',
	'---',
	'K=point(0,0)',
	'polygone_regulier(K,1,10^7)',
	'```'
].join('\n');
const INTERSECTION = [
	'```figure',
	'fenetre: -2 ; 2 ; -2 ; 2',
	'---',
	'A = point(0, 0)',
	'c = cercle(A, rayon=1)',
	'd = droite(A, point(1, 1))',
	'pour i de 1 a 1000:',
	'    intersection(c, d)',
	'```'
].join('\n');

function hostile(block: string, count: number): string {
	return Array.from({ length: count }, () => block).join('\n\n');
}

/** Temps jusqu'à ce que chaque bloc soit dessiné OU en cadre neutre. */
async function settle(content: string, count: number, showAuthoringErrors = false) {
	const start = performance.now();
	const screen = await render(MarkdownRenderer, {
		target: mainElement(),
		props: { content, showAuthoringErrors }
	});
	const done = () =>
		screen.container.querySelectorAll(
			'svg[role="img"], .figure-indisponible, .figure-erreur, .courbe-indisponible, .courbe-erreur'
		).length;
	await expect.poll(done, { timeout: 20000, interval: 5 }).toBe(count);
	return { ms: performance.now() - start, container: screen.container };
}

describe('budget par document', () => {
	it('126 blocs polygone_regulier(K,1,10^7) en moins de 300 ms', async () => {
		const content = hostile(POLYGONE, 126);
		expect(content.length).toBeLessThanOrEqual(10000);
		const { ms } = await settle(content, 126);
		expect(ms).toBeLessThan(300);
	});

	it('70 blocs intersection en moins de 300 ms', async () => {
		const { ms } = await settle(hostile(INTERSECTION, 70), 70);
		expect(ms).toBeLessThan(300);
	});

	it(`au-delà de ${DOCUMENT_FIGURE_LIMITS.blocks} blocs : cadre neutre, message pour le prof`, async () => {
		const small = ['```figure', 'fenetre: 0 ; 4 ; 0 ; 3', '---', 'A = point(1, 1)', '```'].join(
			'\n'
		);
		const n = DOCUMENT_FIGURE_LIMITS.blocks + 3;
		const { container } = await settle(hostile(small, n), n, true);
		expect(container.querySelectorAll('svg[role="img"]').length).toBe(
			DOCUMENT_FIGURE_LIMITS.blocks
		);
		expect(container.textContent).toMatch(/Trop de figures/);
	});

	it('figures et courbes partagent le même budget', async () => {
		const courbe = ['```courbe', 'x: -4 ; 6', 'y: -8 ; 12', 'f(x) = x^2', '```'].join('\n');
		const figure = ['```figure', 'fenetre: 0 ; 4 ; 0 ; 3', '---', 'A = point(1, 1)', '```'].join(
			'\n'
		);
		const half = DOCUMENT_FIGURE_LIMITS.blocks / 2;
		const content = [hostile(courbe, half + 2), hostile(figure, half + 2)].join('\n\n');
		const { container } = await settle(content, 2 * half + 4);
		expect(container.querySelectorAll('svg[role="img"]').length).toBe(
			DOCUMENT_FIGURE_LIMITS.blocks
		);
	});
});
