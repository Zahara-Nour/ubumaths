/**
 * Formule GÉANTE en rendu restreint (chat, messages, signalements, carnets
 * d'élèves lus par autrui) — décision de David, 2026-10-05.
 *
 * PR #832 : `\left(\dfrac{…}{1}\right)` ×13 (313 caractères) fait produire à
 * MathLive 4 Mo de HTML puis épuise la mémoire — page du lecteur bloquée. La
 * réponse d'élève lue par le prof est bornée (`neutralizeStudentLatex`) ; le
 * rendu restreint ne regardait que les commandes dangereuses
 * (`hasUnsafeMathCommand`). Même borne ici (`exceedsMathNestingLimits`) : une
 * formule hors bornes suit le chemin d'une formule refusée — texte, jamais
 * MathLive. Hors mode restreint (contenu du prof), rien ne change.
 *
 * Décor réel : JSON TipTap → `tipTapToMarkdown` → `MarkdownRenderer`, dans un
 * <main>. Les cas géants ne sont JAMAIS rendus hors restreint (le navigateur de
 * test y passerait) : la non-régression hors restreint utilise 5 `\left`
 * imbriqués, refusés en restreint mais de rendu modeste.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { JSONContent } from '@tiptap/core';
import MarkdownRenderer from '../MarkdownRenderer.svelte';
import CellOutputs from '$lib/components/notebook/CellOutputs.svelte';
import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';

// Constantes
const nest = (times: number, wrap: (inner: string) => string, seed = 'x') => {
	let latex = seed;
	for (let i = 0; i < times; i++) latex = wrap(latex);
	return latex;
};

/** Le cas de la PR #832 : 313 caractères, 4 Mo de HTML */
const DEEP_LEFT = nest(13, (s) => `\\left(\\dfrac{${s}}{1}\\right)`);
/** 2 000 accolades (1 000 ouvertes, 1 000 fermées) */
const BRACES = `${'{'.repeat(1000)}x${'}'.repeat(1000)}`;
/** 20 000 caractères */
const LONG = 'x+'.repeat(10_000);
/** Refusé en restreint (4 `\left` imbriqués > 3), rendu modeste hors restreint */
const FIVE_LEFTS = nest(5, (s) => `\\left(${s}\\right)`);

const GIANTS: [string, string][] = [
	['\\left(\\dfrac{…}{1}\\right) ×13', DEEP_LEFT],
	['2 000 accolades', BRACES],
	['20 000 caractères', LONG],
	['5 \\left imbriqués', FIVE_LEFTS]
];

/** Plafond du DOM produit (le cas de la PR #832 en faisait 4 Mo) */
const MAX_RENDERED_HTML = 60_000;
const MATH_ELEMENTS = 'math-span, math-div, math-field';

// Variables
let mains: HTMLElement[] = [];

// Functions
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

const texte = (text: string): JSONContent => ({ type: 'text', text });
const paragraphe = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', content });
const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content });
const formule = (latex: string): JSONContent => ({
	type: 'mathInline',
	attrs: { latex, syntax: 'latex' }
});
const formuleCentree = (latex: string): JSONContent => ({
	type: 'mathBlock',
	attrs: { latex, syntax: 'latex' }
});

async function rendu(message: JSONContent, restricted = true): Promise<HTMLElement> {
	const screen = await render(MarkdownRenderer, {
		target: mainElement(),
		props: { content: tipTapToMarkdown(message), restricted }
	});
	return screen.container as HTMLElement;
}

/** Taille du HTML produit, shadow DOM des formules compris */
function renderedHtmlLength(root: Element | ShadowRoot): number {
	let total = root instanceof Element ? root.outerHTML.length : root.innerHTML.length;
	for (const el of root.querySelectorAll('*')) {
		if (el.shadowRoot) total += renderedHtmlLength(el.shadowRoot);
	}
	return total;
}

describe('Rendu restreint — formule hors bornes : texte, jamais MathLive', () => {
	it.each(GIANTS)('formule en ligne %s', async (_, latex) => {
		const el = await rendu(doc(paragraphe(texte('avant '), formule(latex), texte(' après'))));
		await expect.poll(() => el.textContent).toContain('après');
		expect(el.querySelector(MATH_ELEMENTS)).toBeNull();
		expect(el.querySelector('code.restricted-math')).not.toBeNull();
		expect(renderedHtmlLength(el)).toBeLessThan(MAX_RENDERED_HTML);
	});

	it.each(GIANTS)('formule centrée %s', async (_, latex) => {
		const el = await rendu(doc(paragraphe(texte('avant')), formuleCentree(latex)));
		await expect.poll(() => el.querySelector('code.restricted-math')).not.toBeNull();
		expect(el.querySelector(MATH_ELEMENTS)).toBeNull();
		expect(renderedHtmlLength(el)).toBeLessThan(MAX_RENDERED_HTML);
	});

	// 20 000 caractères : trop long pour le parseur, la case `\placeholder{}` (sans
	// indice) n'est pas repérée → chemin MathInline ; les autres passent par MathPrompt
	it.each(GIANTS)('formule à case (MathPrompt) %s', async (_, latex) => {
		const el = await rendu(doc(paragraphe(texte('a '), formule(`\\placeholder{}+${latex}`))));
		await expect.poll(() => el.querySelector('code.restricted-math')).not.toBeNull();
		expect(el.querySelector(MATH_ELEMENTS)).toBeNull();
		expect(renderedHtmlLength(el)).toBeLessThan(MAX_RENDERED_HTML);
	});

	it.each(GIANTS)('sortie text/plain de carnet %s', async (_, latex) => {
		const screen = await render(CellOutputs, {
			target: mainElement(),
			props: {
				outputs: [{ output_type: 'display_data', data: { 'text/plain': latex } }],
				restricted: true
			}
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.querySelector('pre')).not.toBeNull();
		expect(el.querySelector(MATH_ELEMENTS)).toBeNull();
		expect(renderedHtmlLength(el)).toBeLessThan(MAX_RENDERED_HTML);
	});
});

describe('Rendu restreint — formules légitimes : toujours rendues', () => {
	it.each([
		['fraction', '\\frac{1}{2}'],
		['racine', '\\sqrt{x+1}'],
		['parenthèses du clavier', 'f\\left(g\\left(h\\left(x\\right)\\right)\\right)']
	])('%s en ligne', async (_, latex) => {
		const el = await rendu(doc(paragraphe(texte('a '), formule(latex))));
		await expect.poll(() => el.querySelectorAll('math-span').length).toBe(1);
		expect(el.querySelector('code.restricted-math')).toBeNull();
	});

	it('vecteur en colonne (pmatrix), formule centrée', async () => {
		const el = await rendu(doc(formuleCentree('\\begin{pmatrix}1\\\\2\\end{pmatrix}')));
		await expect.poll(() => el.querySelectorAll('math-div').length).toBe(1);
		expect(el.querySelector('code.restricted-math')).toBeNull();
	});

	it('sortie text/plain de carnet \\frac{1}{2}', async () => {
		const screen = await render(CellOutputs, {
			target: mainElement(),
			props: {
				outputs: [{ output_type: 'display_data', data: { 'text/plain': '\\frac{1}{2}' } }],
				restricted: true
			}
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.querySelector('math-span')).not.toBeNull();
	});
});

describe('Hors mode restreint (contenu du prof) — inchangé', () => {
	it('5 \\left imbriqués en ligne : un math-span', async () => {
		const el = await rendu(doc(paragraphe(formule(FIVE_LEFTS))), false);
		await expect.poll(() => el.querySelectorAll('math-span').length).toBe(1);
	});

	it('5 \\left imbriqués centrés : un math-div', async () => {
		const el = await rendu(doc(formuleCentree(FIVE_LEFTS)), false);
		await expect.poll(() => el.querySelectorAll('math-div').length).toBe(1);
	});

	it('5 \\left imbriqués en sortie text/plain : un math-span', async () => {
		const screen = await render(CellOutputs, {
			target: mainElement(),
			props: {
				outputs: [{ output_type: 'display_data', data: { 'text/plain': FIVE_LEFTS } }],
				restricted: false
			}
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.querySelector('math-span')).not.toBeNull();
	});
});
