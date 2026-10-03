/**
 * Cercle trigo — la couleur de l'auteur ne sort jamais brute dans le style.
 *
 * `color:` était recopié tel quel dans `style="--primary-color: …"`. Une valeur
 * `red; background-image: url(https://…)` faisait charger une ressource externe
 * chez chaque lecteur — y compris dans le CHAT élève, qui affiche l'ubumark
 * (fuite d'adresse IP de mineurs). Seules sortent : une couleur nommée de la
 * palette (synonymes anglais compris), un hexadécimal, ou la couleur par défaut.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TrigCircle from '../TrigCircle.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseTrigCircleContent } from '$lib/ubumark/parser/trig-circle-parser';

const HOSTILE = 'red; background-image: url(https://exemple.invalid/traceur.png)';

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

/** La valeur de --primary-color posée sur le conteneur */
function primaryColorOf(container: HTMLElement): string {
	const box = container.querySelector('.trig-circle-container') as HTMLElement;
	return box.style.getPropertyValue('--primary-color').trim();
}

describe('TrigCircle — couleur de l’auteur', () => {
	it('une valeur hostile n’atteint pas le style (aucune ressource externe)', async () => {
		const screen = await render(TrigCircle, {
			target: mainElement(),
			props: { node: nodeOf(`preset: custom\npoints: M = pi/3\ncolor: ${HOSTILE}`) }
		});
		const box = screen.container.querySelector('.trig-circle-container') as HTMLElement;

		expect(box.getAttribute('style') ?? '').not.toContain('url(');
		expect(getComputedStyle(box).backgroundImage).toBe('none');
	});

	it('par le rendu markdown aussi (chemin du chat)', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: `\`\`\`trig\npreset: custom\npoints: M = pi/3\ncolor: ${HOSTILE}\n\`\`\`` }
		});
		await expect
			.poll(() => screen.container.querySelector('.trig-circle-container'))
			.not.toBeNull();

		expect(screen.container.innerHTML).not.toContain('traceur.png');
	});

	it('un nom de la palette suit le thème, en français comme en anglais', async () => {
		const fr = await render(TrigCircle, {
			target: mainElement(),
			props: { node: nodeOf('preset: custom\npoints: M = pi/3\ncolor: rouge') }
		});
		const en = await render(TrigCircle, {
			target: mainElement(),
			props: { node: nodeOf('preset: custom\npoints: M = pi/3\ncolor: red') }
		});

		expect(primaryColorOf(fr.container)).toBe('var(--color-fig-rouge)');
		expect(primaryColorOf(en.container)).toBe('var(--color-fig-rouge)');
	});

	it('un hexadécimal reste tel quel', async () => {
		const screen = await render(TrigCircle, {
			target: mainElement(),
			props: { node: nodeOf('preset: custom\npoints: M = pi/3\ncolor: #1e40af') }
		});

		expect(primaryColorOf(screen.container)).toBe('#1e40af');
	});
});
