/**
 * État « ambre » (forme non optimale, R12 du chantier « résultat attendu »)
 *
 * Une case juste mais mal écrite n'est ni verte ni rouge : ambre, dans une
 * phrase (BlankInput) comme dans une formule (MathPrompt). Les booléens
 * historiques (`isCorrect` seul) gardent leur rendu.
 *
 * Rendu dans <main> : décor réel de l'application.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BlankInput from '../BlankInput.svelte';
import MathPrompt from '../MathPrompt.svelte';
import type { InputState } from '$lib/ubumark';

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

/** Couleur calculée d'une valeur CSS, via un témoin */
function resolvedColor(value: string): string {
	const probe = document.body.appendChild(document.createElement('span'));
	probe.style.color = value;
	const color = getComputedStyle(probe).color;
	probe.remove();
	return color;
}

describe('BlankInput — ambre', () => {
	it('juste + non optimale : bordure ambre (token warning), data-state="unoptimal"', async () => {
		const screen = await render(BlankInput, {
			target: mainElement(),
			props: { index: 0, value: '08', isCorrect: true, unoptimal: true, disabled: true }
		});
		const input = screen.container.querySelector('input')!;
		expect(input.dataset.state).toBe('unoptimal');
		expect(input.className).toContain('border-warning');
		const border = getComputedStyle(input).borderTopColor;
		// `border-warning/80` de Tailwind 4 : le token warning à 80 % (color-mix oklab)
		expect(border).toBe(
			resolvedColor('color-mix(in oklab, var(--color-warning) 80%, transparent)')
		);
		expect(input.getAttribute('aria-invalid')).toBeNull();
	});

	it('rétro-compatible : isCorrect seul reste vert / rouge', async () => {
		const ok = await render(BlankInput, {
			target: mainElement(),
			props: { index: 0, value: '8', isCorrect: true }
		});
		const okInput = ok.container.querySelector('input')!;
		expect(okInput.dataset.state).toBe('correct');
		expect(okInput.className).toContain('border-green-500/80');
		expect(okInput.className).not.toContain('border-warning');

		const ko = await render(BlankInput, {
			target: mainElement(),
			props: { index: 1, value: '9', isCorrect: false, unoptimal: true }
		});
		const koInput = ko.container.querySelector('input')!;
		// « non optimale » n'a de sens que sur une réponse juste
		expect(koInput.dataset.state).toBe('incorrect');
		expect(koInput.className).not.toContain('border-warning');
	});
});

describe('MathPrompt — ambre', () => {
	const state = (index: number, isCorrect: boolean | null, unoptimal?: boolean): InputState => ({
		index,
		value: '',
		type: 'math',
		isCorrect,
		...(unoptimal !== undefined && { unoptimal })
	});

	it('case juste non optimale : la formule passe la couleur « correct » à l’ambre', async () => {
		const screen = await render(MathPrompt, {
			target: mainElement(),
			props: {
				expression: '\\placeholder[0]{}+5=10',
				syntax: 'latex',
				inputs: [state(0, true, true)],
				disabled: true
			}
		});
		const field = screen.container.querySelector('math-field') as HTMLElement;
		expect(field.classList.contains('math-prompt-unoptimal')).toBe(true);
		expect(field.dataset.unoptimalPrompts).toBe('0');
		const correctColor = getComputedStyle(field).getPropertyValue('--correct-color').trim();
		expect(resolvedColor(correctColor)).toBe(resolvedColor('var(--color-warning)'));
	});

	it('rétro-compatible : isCorrect seul, pas d’ambre', async () => {
		const screen = await render(MathPrompt, {
			target: mainElement(),
			props: { expression: '\\placeholder[0]{}+5=10', syntax: 'latex', inputs: [state(0, true)] }
		});
		const field = screen.container.querySelector('math-field') as HTMLElement;
		expect(field.classList.contains('math-prompt-unoptimal')).toBe(false);
		expect(field.dataset.unoptimalPrompts).toBeUndefined();
	});

	it('formule mêlant une case juste et une non optimale : la case est signalée, la couleur reste verte', async () => {
		const screen = await render(MathPrompt, {
			target: mainElement(),
			props: {
				expression: '\\placeholder[0]{}\\times10^{\\placeholder[1]{}}',
				syntax: 'latex',
				inputs: [state(0, true), state(1, true, true)]
			}
		});
		const field = screen.container.querySelector('math-field') as HTMLElement;
		expect(field.dataset.unoptimalPrompts).toBe('1');
		expect(field.classList.contains('math-prompt-unoptimal')).toBe(false);
	});
});

describe('Revue PR #643 — l’état n’est pas porté par la seule couleur', () => {
	/** Texte lu par un lecteur d'écran via aria-describedby */
	function description(el: Element): string {
		const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
		return ids.map((id) => document.getElementById(id)?.textContent?.trim() ?? '').join(' ');
	}

	it.each([
		[true, true, 'forme à améliorer'],
		[true, false, 'juste'],
		[false, false, 'fausse']
	])('BlankInput isCorrect=%s unoptimal=%s → « %s »', async (isCorrect, unoptimal, text) => {
		const screen = await render(BlankInput, {
			target: mainElement(),
			props: { index: 0, value: '8', isCorrect, unoptimal }
		});
		const input = screen.container.querySelector('input')!;
		expect(description(input)).toContain(text);
	});

	it('BlankInput non corrigé : aucune description', async () => {
		const screen = await render(BlankInput, {
			target: mainElement(),
			props: { index: 0, value: '' }
		});
		expect(description(screen.container.querySelector('input')!)).toBe('');
	});

	it('MathPrompt : chaque case corrigée a son libellé (dont « forme à améliorer »)', async () => {
		const screen = await render(MathPrompt, {
			target: mainElement(),
			props: {
				expression: '\\placeholder[0]{}\\times10^{\\placeholder[1]{}}',
				syntax: 'latex',
				inputs: [
					{ index: 0, value: '', type: 'math', isCorrect: false },
					{ index: 1, value: '', type: 'math', isCorrect: true, unoptimal: true }
				]
			}
		});
		const field = screen.container.querySelector('math-field')!;
		const text = description(field);
		expect(text).toContain('Case 1 : fausse');
		expect(text).toContain('Case 2 : forme à améliorer');
	});
});
