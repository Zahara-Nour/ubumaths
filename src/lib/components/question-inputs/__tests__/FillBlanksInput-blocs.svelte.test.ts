/**
 * FillBlanksInput — blocs de l'énoncé sans trou (2026-10-01)
 *
 * L'énoncé d'une question à trous n'affichait que paragraphes, formules,
 * images et titres : une courbe, un tableau, un bloc de code ou une liste
 * DISPARAISSAIENT sans message (deux modèles publiés du second degré lisaient
 * des racines sur une parabole que l'élève ne voyait pas).
 *
 * Rendu dans <main> : décor réel de l'application.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank } from '$lib/questions/types';

const blanks: InstanceBlank[] = [{ type: 'math', expectedAnswer: '3' }];

const STATEMENT = [
	'Lis le terme demandé.',
	'',
	'```courbe',
	'x: -1 ; 6',
	'y: -1 ; 10',
	'u(n) = 2*n+1 pour n de 0 à 4   bleu',
	'```',
	'',
	'| $n$ | 0 | 1 |',
	'| --- | --- | --- |',
	'| $u_n$ | 1 | 3 |',
	'',
	'```python',
	'def u(n):',
	'    return 2 * n + 1',
	'```',
	'',
	'- premier point',
	'- second point',
	'',
	'$u_1 = \\placeholder[0]{}$'
].join('\n') as ResolvedMarkdown;

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

describe('FillBlanksInput — blocs sans trou dans l’énoncé', () => {
	it('la courbe est dessinée (SVG role="img", un disque par terme)', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, validationResults: [] }
		});
		const svg = screen.container.querySelector('svg[role="img"]');
		expect(svg).not.toBeNull();
		expect(screen.container.querySelectorAll('.courbe-terme').length).toBe(5);
	});

	it('le tableau, le code et la liste sont affichés', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, validationResults: [] }
		});
		const el = screen.container;
		expect(el.querySelector('table')).not.toBeNull();
		expect(el.querySelectorAll('table tr').length).toBeGreaterThanOrEqual(2);
		expect(el.querySelector('pre')?.textContent).toContain('return 2 * n + 1');
		const items = [...el.querySelectorAll('li')].map((li) => li.textContent?.trim());
		expect(items).toEqual(['premier point', 'second point']);
	});

	it('le trou reste interactif à côté des blocs', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, validationResults: [] }
		});
		expect(screen.container.querySelector('math-field')).not.toBeNull();
	});
});
