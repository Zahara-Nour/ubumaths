/**
 * FillBlanksInput — navigation au clavier entre les cases (2026-10-04)
 *
 * Tab / Maj+Tab : case suivante / précédente, dans l'ordre que voit l'élève (un
 * tableau `:table-h` est parcouru tel qu'affiché, transposé). Entrée : valide si
 * toutes les cases sont remplies, sinon place le curseur dans la première case
 * vide. L'index des trous (ordre des réponses) ne change pas.
 *
 * Vrais événements clavier (userEvent) ; la touche « Entrée » du clavier virtuel
 * MathLive exécute la commande `commit`, appelée telle quelle.
 *
 * Rendu dans <main> : décor réel de l'application.
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { MathfieldElement } from 'mathlive';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank } from '$lib/questions/types';

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
	// Import dynamique : un `import 'mathlive'` statique casse le mocker de vitest
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

function mathBlanks(count: number): InstanceBlank[] {
	return Array.from({ length: count }, () => ({ type: 'math', expectedAnswer: '1' }));
}

function fields(container: HTMLElement): MathfieldElement[] {
	return [...container.querySelectorAll<MathfieldElement>('math-field')];
}

async function focus(element: HTMLElement) {
	await expect
		.poll(() => {
			element.focus();
			return document.activeElement === element;
		})
		.toBe(true);
}

async function setup(statement: string, blanks: InstanceBlank[]) {
	const values: string[] = [];
	let submitted = 0;
	const screen = await render(FillBlanksInput, {
		target: mainElement(),
		props: {
			statement: statement as ResolvedMarkdown,
			blanks,
			values,
			validationResults: [],
			onSubmit: () => submitted++
		}
	});
	// Champs MathLive montés (prompts lisibles)
	await expect
		.poll(() => fields(screen.container).every((field) => field.getPrompts().length > 0))
		.toBe(true);
	return { container: screen.container, values, submitted: () => submitted };
}

describe('Tab / Maj+Tab', () => {
	it('parcourt les cases d’une formule puis passe à la formule suivante', async () => {
		const { container, values } = await setup(
			'$\\placeholder[0]{}+\\placeholder[1]{}=5$ et $\\placeholder[2]{}$',
			mathBlanks(3)
		);
		const [first, second] = fields(container);
		await focus(first);
		await userEvent.keyboard('1');
		await userEvent.keyboard('{Tab}');
		await userEvent.keyboard('2');
		await userEvent.keyboard('{Tab}');
		await expect.poll(() => document.activeElement).toBe(second);
		await userEvent.keyboard('3');
		await expect.poll(() => [values[0], values[1], values[2]]).toEqual(['1', '2', '3']);
	});

	it('Maj+Tab dans une formule revient à la case précédente', async () => {
		const { container, values } = await setup(
			'$\\placeholder[0]{}+\\placeholder[1]{}=5$',
			mathBlanks(2)
		);
		await focus(fields(container)[0]);
		await userEvent.keyboard('{Tab}');
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await userEvent.keyboard('6');
		await expect.poll(() => values[0]).toBe('6');
		expect(values[1] ?? '').toBe('');
	});

	it('Maj+Tab depuis la formule suivante revient sur la DERNIÈRE case de la précédente', async () => {
		const { container, values } = await setup(
			'$\\placeholder[0]{}+\\placeholder[1]{}=5$ et $\\placeholder[2]{}$',
			mathBlanks(3)
		);
		const [first, second] = fields(container);
		await focus(second);
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await expect.poll(() => document.activeElement).toBe(first);
		await userEvent.keyboard('7');
		await expect.poll(() => values[1]).toBe('7');
		expect(values[0] ?? '').toBe('');
	});

	it('Maj+Tab depuis le bouton placé après la question → dernière case de la formule', async () => {
		const { container, values } = await setup(
			'$\\placeholder[0]{}+\\placeholder[1]{}=5$',
			mathBlanks(2)
		);
		const button = container.appendChild(document.createElement('button'));
		button.textContent = 'Valider';
		await focus(button);
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await expect.poll(() => document.activeElement).toBe(fields(container)[0]);
		await userEvent.keyboard('5');
		await expect.poll(() => values[1]).toBe('5');
		expect(values[0] ?? '').toBe('');
	});

	it('Maj+Tab depuis une case texte revient sur la dernière case de la formule', async () => {
		const blanks: InstanceBlank[] = [...mathBlanks(2), { type: 'text', expectedAnswer: 'un' }];
		const { container, values } = await setup(
			'$\\placeholder[0]{}+\\placeholder[1]{}$ puis {{blank:2}}',
			blanks
		);
		const input = container.querySelector<HTMLInputElement>('input[type="text"]')!;
		await focus(input);
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await expect.poll(() => document.activeElement).toBe(fields(container)[0]);
		await userEvent.keyboard('8');
		await expect.poll(() => values[1]).toBe('8');
		expect(values[0] ?? '').toBe('');
	});

	it('Tab depuis une case texte entre dans la première case de la formule suivante', async () => {
		const blanks: InstanceBlank[] = [{ type: 'text', expectedAnswer: 'un' }, ...mathBlanks(2)];
		const { container, values } = await setup(
			'{{blank:0}} puis $\\placeholder[1]{}+\\placeholder[2]{}$',
			blanks
		);
		const input = container.querySelector<HTMLInputElement>('input[type="text"]')!;
		await focus(input);
		await userEvent.keyboard('{Tab}');
		await expect.poll(() => document.activeElement).toBe(fields(container)[0]);
		await userEvent.keyboard('4');
		await expect.poll(() => values[1]).toBe('4');
	});

	it('tableau `:table-h` : Tab suit l’affichage transposé, les index restent ceux du modèle', async () => {
		// Affiché : ligne x → 1 | [1] | 3 ; ligne f(x) → [0] | 4 | [2]
		const statement = [
			':table-h',
			'| $x$ | $f(x)$ |',
			'|---|---|',
			'| $1$ | $\\placeholder[0]{}$ |',
			'| $\\placeholder[1]{}$ | $4$ |',
			'| $3$ | $\\placeholder[2]{}$ |'
		].join('\n');
		const { container, values } = await setup(statement, mathBlanks(3));
		const all = fields(container);
		expect(all.map((field) => field.getPrompts())).toEqual([['1'], ['0'], ['2']]);
		await focus(all[0]);
		await userEvent.keyboard('a');
		await userEvent.keyboard('{Tab}');
		await expect.poll(() => document.activeElement).toBe(all[1]);
		await userEvent.keyboard('b');
		await userEvent.keyboard('{Tab}');
		await expect.poll(() => document.activeElement).toBe(all[2]);
		await userEvent.keyboard('c');
		await expect.poll(() => [values[0], values[1], values[2]]).toEqual(['b', 'a', 'c']);
	});
});

describe('Entrée', () => {
	it('formule : une case vide → curseur dans cette case, pas de validation', async () => {
		const { container, values, submitted } = await setup(
			'$\\placeholder[0]{}+\\placeholder[1]{}=5$',
			mathBlanks(2)
		);
		const [field] = fields(container);
		await focus(field);
		await userEvent.keyboard('{Tab}');
		await userEvent.keyboard('3');
		await userEvent.keyboard('{Enter}');
		expect(submitted()).toBe(0);
		await userEvent.keyboard('2');
		await expect.poll(() => [values[0], values[1]]).toEqual(['2', '3']);
	});

	it('formule : toutes les cases remplies → valide', async () => {
		const { container, submitted } = await setup(
			'$\\placeholder[0]{}+\\placeholder[1]{}=5$',
			mathBlanks(2)
		);
		await focus(fields(container)[0]);
		await userEvent.keyboard('2');
		await userEvent.keyboard('{Tab}');
		await userEvent.keyboard('3');
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => submitted()).toBe(1);
	});

	it('la première case vide est dans une autre formule : le focus y va', async () => {
		const { container, values, submitted } = await setup(
			'$\\placeholder[0]{}$ et $\\placeholder[1]{}$',
			mathBlanks(2)
		);
		const [first, second] = fields(container);
		await focus(second);
		await userEvent.keyboard('5');
		await userEvent.keyboard('{Enter}');
		expect(submitted()).toBe(0);
		await expect.poll(() => document.activeElement).toBe(first);
		await userEvent.keyboard('6');
		await expect.poll(() => [values[0], values[1]]).toEqual(['6', '5']);
	});

	it('case texte avec une case de formule vide : le focus va dans la formule', async () => {
		const blanks: InstanceBlank[] = [...mathBlanks(1), { type: 'text', expectedAnswer: 'un' }];
		const { container, values, submitted } = await setup(
			'$\\placeholder[0]{}$ puis {{blank:1}}',
			blanks
		);
		const input = container.querySelector<HTMLInputElement>('input[type="text"]')!;
		await userEvent.type(input, 'un');
		await userEvent.keyboard('{Enter}');
		expect(submitted()).toBe(0);
		await expect.poll(() => document.activeElement).toBe(fields(container)[0]);
		await userEvent.keyboard('9');
		await expect.poll(() => values[0]).toBe('9');
	});

	it('case texte vide avant une formule remplie : le focus va dans la case texte', async () => {
		const blanks: InstanceBlank[] = [{ type: 'text', expectedAnswer: 'un' }, ...mathBlanks(1)];
		const { container, submitted } = await setup('{{blank:0}} puis $\\placeholder[1]{}$', blanks);
		await focus(fields(container)[0]);
		await userEvent.keyboard('4');
		await userEvent.keyboard('{Enter}');
		expect(submitted()).toBe(0);
		const input = container.querySelector<HTMLInputElement>('input[type="text"]')!;
		await expect.poll(() => document.activeElement).toBe(input);
	});

	it('case texte, tout est rempli → valide (comportement inchangé)', async () => {
		const blanks: InstanceBlank[] = [...mathBlanks(1), { type: 'text', expectedAnswer: 'un' }];
		const { container, submitted } = await setup('$\\placeholder[0]{}$ puis {{blank:1}}', blanks);
		await focus(fields(container)[0]);
		await userEvent.keyboard('4');
		const input = container.querySelector<HTMLInputElement>('input[type="text"]')!;
		await userEvent.type(input, 'un');
		await userEvent.keyboard('{Enter}');
		expect(submitted()).toBe(1);
	});

	it('touche Entrée du clavier virtuel (commande `commit`) : même règle', async () => {
		const { container, values, submitted } = await setup(
			'$\\placeholder[0]{}+\\placeholder[1]{}=5$',
			mathBlanks(2)
		);
		const [field] = fields(container);
		await focus(field);
		await userEvent.keyboard('{Tab}');
		await userEvent.keyboard('3');
		field.executeCommand('commit');
		expect(submitted()).toBe(0);
		await userEvent.keyboard('2');
		await expect.poll(() => [values[0], values[1]]).toEqual(['2', '3']);
		field.executeCommand('commit');
		await expect.poll(() => submitted()).toBe(1);
	});
});
