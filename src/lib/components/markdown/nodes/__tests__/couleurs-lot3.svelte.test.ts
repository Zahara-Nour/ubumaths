/**
 * Couleurs thémables, lot 3 : droite graduée, cercle trigo, tableau de variations,
 * arbre de probabilités. On lit la couleur RENDUE (`getComputedStyle`) en basculant
 * `color-scheme` sur <html>, dont dépendent les tokens `light-dark()` d'app.css.
 *
 * Spécification : docs/wip/couleurs-lot3-progress.md.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NumberLine from '../NumberLine.svelte';
import TrigCircle from '../TrigCircle.svelte';
import VariationTable from '../VariationTable.svelte';
import ProbabilityTree from '../ProbabilityTree.svelte';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { parseTrigCircleContent } from '$lib/ubumark/parser/trig-circle-parser';
import { parseProbTreeContent } from '$lib/ubumark/parser/probability-tree-parser';
import { parseVariationTableContent } from '$lib/ubumark/parser/variation-table-parser';
import type { NumberLineNode } from '$lib/ubumark/types/number-line';

// Valeurs attendues (app.css)
const FOND = { light: 'rgb(250, 250, 250)', dark: 'rgb(38, 38, 36)' };
const TEXTE = { light: 'rgb(26, 26, 26)', dark: 'rgb(239, 239, 239)' };
const BORDURE = { light: 'rgb(224, 224, 224)', dark: 'rgb(61, 61, 58)' };
const BLEU = { light: 'rgb(37, 99, 235)', dark: 'rgb(93, 147, 254)' };
const ROUGE = { light: 'rgb(220, 38, 38)', dark: 'rgb(255, 98, 87)' };
const VIOLET = { light: 'rgb(147, 51, 234)', dark: 'rgb(180, 120, 254)' };

// Les transitions CSS (`.pt-branch-line`) retarderaient la couleur lue après bascule
const noTransitions = document.head.appendChild(document.createElement('style'));
noTransitions.textContent = '*, *::before, *::after { transition: none !important; }';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
	document.documentElement.style.colorScheme = '';
});

function inBothModes(read: () => string): { light: string; dark: string } {
	// Décor de mode-watcher : `color-scheme` (tokens light-dark()) ET classe `.dark`
	const root = document.documentElement;
	try {
		root.style.colorScheme = 'light';
		root.classList.remove('dark');
		const light = read();
		root.style.colorScheme = 'dark';
		root.classList.add('dark');
		const dark = read();
		return { light, dark };
	} finally {
		root.style.colorScheme = '';
		root.classList.remove('dark');
	}
}

function one(container: Element, selector: string): Element {
	const found = container.querySelector(selector);
	if (!found) throw new Error(`aucun élément ${selector}`);
	return found;
}

function numberLine(lines: string[]): NumberLineNode {
	const { node, errors } = parseNumberLineContent(lines);
	if (!node) throw new Error(errors[0]?.message);
	return node;
}

async function renderNumberLine(node: NumberLineNode, showErrors = false) {
	const screen = await render(NumberLine, { target: mainElement(), props: { node, showErrors } });
	return screen.container;
}

async function renderTrig(block: string, showErrors = false) {
	const { node } = parseTrigCircleContent(block.split('\n'));
	if (!node) throw new Error('bloc trig non analysé');
	const screen = await render(TrigCircle, { target: mainElement(), props: { node, showErrors } });
	return screen.container;
}

describe('Droite graduée', () => {
	it('points ouverts : remplis de la couleur du fond, dans les deux modes', async () => {
		const c = await renderNumberLine(
			numberLine(['start: 0', 'end: 10', 'step: 1', 'segments: ]1, 3[ bleu'])
		);
		const open = c.querySelectorAll('circle.nl-endpoint-open');
		expect(open).toHaveLength(2);
		expect(inBothModes(() => getComputedStyle(open[0]).fill)).toEqual(FOND);
		expect(inBothModes(() => getComputedStyle(open[0]).stroke)).toEqual(BLEU);
	});

	it('`bleu` et `blue` : le bleu de la palette, qui suit le thème', async () => {
		for (const name of ['bleu', 'blue']) {
			const c = await renderNumberLine(
				numberLine(['start: 0', 'end: 10', 'step: 1', `points: A=3 ${name}`])
			);
			expect(inBothModes(() => getComputedStyle(one(c, 'circle.nl-point')).fill)).toEqual(BLEU);
		}
	});

	it('axe et graduations : la couleur du texte', async () => {
		const c = await renderNumberLine(numberLine(['start: 0', 'end: 10', 'step: 1']));
		expect(inBothModes(() => getComputedStyle(one(c, 'line.nl-axis')).stroke)).toEqual(TEXTE);
	});

	it('couleur inconnue : défaut (rouge) + avertissement visible par le prof', async () => {
		const c = await renderNumberLine(
			numberLine(['start: 0', 'end: 10', 'step: 1', 'points: A=3 magenta']),
			true
		);
		expect(inBothModes(() => getComputedStyle(one(c, 'circle.nl-point')).fill)).toEqual(ROUGE);
		expect(c.textContent).toContain('couleur inconnue « magenta »');
	});

	it('avertissement invisible côté élève, bloc affiché quand même', async () => {
		const c = await renderNumberLine(
			numberLine(['start: 0', 'end: 10', 'step: 1', 'points: A=3 magenta'])
		);
		expect(c.querySelector('circle.nl-point')).not.toBeNull();
		expect(c.textContent).not.toContain('couleur inconnue');
	});

	it('hex trop sombre : avertissement avec suggestion ; hex lisible : rien', async () => {
		const dark = await renderNumberLine(
			numberLine(['start: 0', 'end: 10', 'step: 1', 'points: A=3 #000080']),
			true
		);
		expect(dark.textContent).toContain('« bleu »');
		expect(getComputedStyle(one(dark, 'circle.nl-point')).fill).toBe('rgb(0, 0, 128)');
		const fine = await renderNumberLine(
			numberLine(['start: 0', 'end: 10', 'step: 1', 'points: A=3 #ff9900']),
			true
		);
		expect(fine.querySelector('.nl-warnings')).toBeNull();
	});

	it('valeur hostile : n’atteint jamais le style', async () => {
		const base = numberLine(['start: 0', 'end: 10', 'step: 1', 'points: A=3']);
		const hostile = 'red; background:url(https://evil.example/x.png)';
		const node: NumberLineNode = {
			...base,
			points: base.points.map((p) => ({ ...p, color: hostile }))
		};
		const c = await renderNumberLine(node, true);
		// Aucun attribut style ne porte la valeur ; le message la cite en TEXTE seulement
		const styles = [...c.querySelectorAll('[style]')].map((el) => el.getAttribute('style'));
		expect(styles.length).toBeGreaterThan(0);
		for (const style of styles) expect(style).not.toMatch(/url\(|evil/);
		expect(c.querySelector('.nl-warnings')?.textContent).toContain('couleur inconnue');
		expect(getComputedStyle(one(c, 'circle.nl-point')).fill).toBe(ROUGE.light);
	});
});

describe('Cercle trigo', () => {
	it('`rouge` (français) et `red` : la palette, qui suit le thème (plus de bleu imposé en sombre)', async () => {
		for (const name of ['rouge', 'red']) {
			const c = await renderTrig(`preset: quarters\ncolor: ${name}`);
			expect(inBothModes(() => getComputedStyle(one(c, '.trig-angle-point')).fill)).toEqual(ROUGE);
		}
	});

	it('cercle et axes : la couleur du texte ; halo des points : le fond', async () => {
		const c = await renderTrig('preset: quarters\ncolor: violet');
		expect(inBothModes(() => getComputedStyle(one(c, '.trig-unit-circle')).stroke)).toEqual(TEXTE);
		expect(inBothModes(() => getComputedStyle(one(c, '.trig-angle-point')).stroke)).toEqual(FOND);
		expect(inBothModes(() => getComputedStyle(one(c, '.trig-angle-point')).fill)).toEqual(VIOLET);
	});

	it('couleur inconnue : bleu de la palette + avertissement pour le prof', async () => {
		const c = await renderTrig('preset: quarters\ncolor: magenta', true);
		expect(inBothModes(() => getComputedStyle(one(c, '.trig-angle-point')).fill)).toEqual(BLEU);
		expect(c.textContent).toContain('couleur inconnue « magenta »');
	});

	it('valeur hostile : n’atteint jamais le style', async () => {
		const c = await renderTrig(
			'preset: quarters\ncolor: red; background:url(https://evil.example/x)',
			true
		);
		const styles = [...c.querySelectorAll('[style]')].map((el) => el.getAttribute('style'));
		expect(styles.length).toBeGreaterThan(0);
		for (const style of styles) expect(style).not.toMatch(/url\(|evil/);
		expect(c.textContent).toContain('couleur inconnue');
	});
});

describe('Tableau de variations et arbre : tokens du thème', () => {
	it('bordures du tableau : --color-border dans les deux modes', async () => {
		const { node } = parseVariationTableContent([
			'variable: x',
			'domain: 0, 1, 2',
			'',
			"sign: f'(x)",
			'  0,1: +',
			'  1: z',
			'  1,2: -'
		]);
		if (!node) throw new Error('tableau non analysé');
		const screen = await render(VariationTable, { target: mainElement(), props: { node } });
		const cell = one(screen.container, 'td');
		expect(inBothModes(() => getComputedStyle(cell).borderTopColor)).toEqual(BORDURE);
	});

	it('branches de l’arbre : la couleur du texte dans les deux modes', async () => {
		const { node } = parseProbTreeContent(['A:1/2', 'B:1/2']);
		if (!node) throw new Error('arbre non analysé');
		const screen = await render(ProbabilityTree, { target: mainElement(), props: { node } });
		expect(
			inBothModes(() => getComputedStyle(one(screen.container, '.pt-branch-line')).stroke)
		).toEqual(TEXTE);
	});
});
