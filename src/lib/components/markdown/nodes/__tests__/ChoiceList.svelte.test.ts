/**
 * ChoiceList corrigée — choix d'une case choix dans le résultat attendu
 * ====================================================================
 *
 * Repris des tests du QCM d'`ExpectedResultView` (ADR 0033, lot 5) : la liste
 * corrigée est aujourd'hui celle de la case choix (`ChoiceBlock`). Chaque choix
 * porte son état (`data-status`) et un libellé : jamais la couleur seule.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChoiceList from '../ChoiceList.svelte';
import type { ExpectedStatus } from '$lib/questions/expected-result';

type Item = { content: string; status?: ExpectedStatus; checked?: boolean };

async function show(items: Item[], multiple: boolean) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(ChoiceList, { target: main, props: { items, multiple, corrected: true } });
}

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const lines = (container: HTMLElement) => [
	...container.querySelectorAll('[data-kind="choices"] li')
];

describe('statuts : bon coché, coché à tort, bon oublié', () => {
	it('état et libellé de chaque choix', async () => {
		const { container } = await show(
			[
				{ content: 'c', checked: false, status: 'unoptimal' },
				{ content: 'a', checked: true, status: 'correct' },
				{ content: 'b', checked: true, status: 'incorrect' }
			],
			true
		);
		const items = lines(container);
		expect(items.map((li) => li.getAttribute('data-status'))).toEqual([
			'unoptimal',
			'correct',
			'incorrect'
		]);
		expect(text(items[0])).toContain('oublié');
		expect(text(items[1])).toContain('coché, juste');
		expect(text(items[2])).toContain('coché à tort');
	});
});

describe('indicateur cohérent avec la saisie (Q109 a)', () => {
	const items: Item[] = [
		{ content: 'a', checked: true, status: 'correct' },
		{ content: 'b', checked: false, status: 'neutral' }
	];
	const marks = (container: HTMLElement) =>
		[...container.querySelectorAll('[data-kind="choices"] [data-indicator]')].map((m) =>
			m.getAttribute('data-indicator')
		);

	it('réponse unique : rond plein / rond vide', async () => {
		const { container } = await show(items, false);
		expect(marks(container)).toEqual(['circle-dot', 'circle']);
	});

	it('plusieurs réponses : case cochée / case vide', async () => {
		const { container } = await show(items, true);
		expect(marks(container)).toEqual(['square-check', 'square']);
	});
});

describe('choix d’horloges (chantier horloge, décision 5)', () => {
	it('un choix en bloc ```horloge est dessiné, à 3 cm, pas affiché en texte brut', async () => {
		const clock = (h: number) => `\`\`\`horloge\nheure: ${h} h\n\`\`\``;
		const { container } = await show(
			[
				{ content: clock(3), checked: false, status: 'unoptimal' },
				{ content: clock(9), checked: true, status: 'incorrect' }
			],
			false
		);
		const items = lines(container);
		expect(text(items[0])).not.toContain('```');
		for (const li of items) {
			const svg = li.querySelector('svg[role="img"]');
			expect(svg).not.toBeNull();
			expect(svg!.getBoundingClientRect().width / (96 / 2.54)).toBeCloseTo(3, 1);
		}
		expect(text(items[1])).toContain('coché à tort');
	});
});
