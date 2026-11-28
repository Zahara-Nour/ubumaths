/**
 * Noms lus par un lecteur d'écran sur les cases réponses
 *
 * Une case de phrase (BlankInput) se nomme « Réponse N », avec l'accent. Une formule
 * à compléter (MathPrompt) porte ses cases dans un seul champ MathLive : c'est le champ
 * qui se nomme, avec le nombre de cases ; une formule sans case n'a pas de nom ajouté.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BlankInput from '../BlankInput.svelte';
import MathPrompt from '../MathPrompt.svelte';

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

describe('noms accessibles des cases', () => {
	it('BlankInput : « Réponse 2 »', async () => {
		const screen = await render(BlankInput, {
			target: mainElement(),
			props: { index: 2, value: '' }
		});
		expect(screen.container.querySelector('input')!.getAttribute('aria-label')).toBe('Réponse 2');
	});

	it('MathPrompt, une case : « Expression à compléter, une case »', async () => {
		const screen = await render(MathPrompt, {
			target: mainElement(),
			props: { expression: '\\placeholder[0]{}+5=10', syntax: 'latex', inputs: [] }
		});
		expect(screen.container.querySelector('math-field')!.getAttribute('aria-label')).toBe(
			'Expression à compléter, une case'
		);
	});

	it('MathPrompt, deux cases : le nombre de cases', async () => {
		const screen = await render(MathPrompt, {
			target: mainElement(),
			props: {
				expression: '\\placeholder[0]{}+\\placeholder[1]{}=10',
				syntax: 'latex',
				inputs: []
			}
		});
		expect(screen.container.querySelector('math-field')!.getAttribute('aria-label')).toBe(
			'Expression à compléter, 2 cases'
		);
	});
});
