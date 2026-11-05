/**
 * Calcul aligné dans l'éditeur, en vrai navigateur : Ctrl+Entrée dans un bloc
 * `$$`, raccourcis « ou »/« et », bouton « Calcul aligné ».
 */

import { describe, it, expect, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Editor, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import 'mathlive';
import { MathInline, MathBlock } from '../math-extension';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

let editor: Editor | null = null;

afterEach(() => {
	editor?.destroy();
	editor = null;
	document.body.innerHTML = '';
});

async function editeur(content: JSONContent[]): Promise<Editor> {
	const element = document.createElement('div');
	document.body.appendChild(element);
	editor = new Editor({
		element,
		extensions: [StarterKit, MathInline, MathBlock],
		content: { type: 'doc', content }
	});
	await pause(100);
	return editor;
}

/** Clique dans le champ, curseur en fin de formule. */
async function entrerDans(selecteur: string): Promise<void> {
	const champ = document.querySelector(`${selecteur} math-field`) as HTMLElement;
	await userEvent.click(champ);
	await pause(300);
	await userEvent.keyboard('{End}');
}

async function taper(texte: string): Promise<void> {
	await userEvent.keyboard(texte);
	await pause(100);
}

const nouvelleLigne = () => taper('{Control>}{Enter}{/Control}');

/** LaTeX du premier nœud du type, sans espaces (MathLive en sème autour des &). */
function latexDe(e: Editor, type: string): string {
	let latex = '';
	e.state.doc.descendants((n) => {
		if (!latex && n.type.name === type) latex = String(n.attrs.latex);
	});
	return latex.replace(/\s+/g, '');
}

const bloc = (latex: string): JSONContent => ({ type: 'mathBlock', attrs: { latex } });

describe('Ctrl+Entrée dans un bloc', () => {
	it('calcul : coupe sur =, reprend = à chaque ligne', async () => {
		const e = await editeur([bloc('A=3+4')]);
		await entrerDans('.math-block-wrapper');
		await nouvelleLigne();
		await taper('7');
		await nouvelleLigne();
		await taper('8');
		expect(latexDe(e, 'mathBlock')).toBe('\\begin{aligned}A&=3+4\\\\&=7\\\\&=8\\end{aligned}');
	});

	it('raisonnement : coupe sur ⇔, « ou » devient un mot', async () => {
		const e = await editeur([bloc('x^2-1=0\\iff x^2=1')]);
		await entrerDans('.math-block-wrapper');
		await nouvelleLigne();
		await taper('x=1oux=-1');
		expect(latexDe(e, 'mathBlock')).toBe(
			'\\begin{aligned}x^2-1=0&\\iffx^2=1\\\\&\\iffx=1\\:\\mathrm{ou}\\:x=-1\\end{aligned}'
		);
	});
});

describe('effacer', () => {
	it('une ligne vidée puis effacée disparaît', async () => {
		const e = await editeur([bloc('A=3+4')]);
		await entrerDans('.math-block-wrapper');
		await nouvelleLigne();
		await taper('{Backspace}{Backspace}');
		expect(latexDe(e, 'mathBlock')).toBe('\\begin{aligned}A&=3+4\\end{aligned}');
	});
});

describe('formule dans le texte', () => {
	it('Ctrl+Entrée ne la transforme pas en calcul aligné', async () => {
		const e = await editeur([
			{ type: 'paragraph', content: [{ type: 'mathInline', attrs: { latex: 'A=3+4' } }] }
		]);
		await entrerDans('.math-inline-wrapper');
		await nouvelleLigne();
		expect(latexDe(e, 'mathInline')).not.toContain('aligned');
	});
});

describe('bouton « Calcul aligné »', () => {
	it('insère un bloc où l’on écrit, puis Ctrl+Entrée aligne la ligne', async () => {
		const e = await editeur([{ type: 'paragraph' }]);
		e.commands.focus();
		e.commands.insertCalculAligne();
		await pause(300);
		await taper('A=3+4');
		await nouvelleLigne();
		await taper('7');
		expect(latexDe(e, 'mathBlock')).toBe('\\begin{aligned}A&=3+4\\\\&=7\\end{aligned}');
	});
});

describe('Retour arrière sur une sélection (revue #2410)', () => {
	it('efface toute la sélection, même avec une ligne vide ailleurs', async () => {
		const e = await editeur([bloc('\\begin{aligned}A&=3+4\\\\&\\end{aligned}')]);
		const champ = document.querySelector('.math-block-wrapper math-field') as HTMLElement & {
			selection: unknown;
			value: string;
		};
		await userEvent.click(champ);
		await pause(300);
		// Sélectionne « =3 » (deux atomes de la cellule droite de la ligne 1)
		champ.selection = { ranges: [[2, 5]] };
		await taper('{Backspace}');
		expect(latexDe(e, 'mathBlock')).toBe('\\begin{aligned}A&+4\\\\&\\end{aligned}');
	});
});
