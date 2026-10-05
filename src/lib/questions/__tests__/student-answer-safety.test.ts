/**
 * Réponse d'élève affichée chez un autre utilisateur (revue de la PR #643)
 * ========================================================================
 *
 * Le résultat attendu d'une évaluation est lu par le PROFESSEUR : la réponse
 * de l'élève y passe d'un utilisateur à l'autre. Aucune réponse ne doit pouvoir
 * y fabriquer un lien, une image, une classe CSS, une formule ou une case.
 */

import { describe, it, expect } from 'vitest';
import { neutralizeStudentLatex, escapeStudentText } from '../student-answer-safety';
import { parseMarkdown } from '$lib/ubumark';

// Fixtures
const HOSTILE_LATEX = [
	'\\href{javascript:alert(1)}{9}',
	'\\url{https://evil.example}',
	'\\htmlData{foo=bar}{9}',
	'\\htmlClass{admin}{9}',
	'\\class{x}{9}',
	'\\cssId{x}{9}',
	'\\htmlStyle{position:fixed;inset:0}{9}',
	'\\htmlId{x}{9}',
	'\\includegraphics{https://evil.example/x.png}',
	'\\hr\\hrefef{javascript:alert(1)}{9}',
	'\\href  {javascript:alert(1)}{9}',
	'\\def\\x{\\href}\\x{javascript:alert(1)}{9}',
	'\\placeholder[3]{}',
	'9$ [lien](https://evil.example) $9',
	'9\n\n# titre'
];

const FORBIDDEN_COMMAND =
	/\\(?:href|url|htmlData|htmlClass|class|cssId|htmlStyle|htmlId|includegraphics|def|placeholder)(?![a-zA-Z])/;

// Tests
describe('neutralizeStudentLatex', () => {
	it.each(HOSTILE_LATEX)('%j : aucune commande dangereuse, aucun `$`, une seule ligne', (raw) => {
		const safe = neutralizeStudentLatex(raw);
		expect(safe).not.toMatch(FORBIDDEN_COMMAND);
		expect(safe).not.toContain('$');
		expect(safe).not.toContain('\n');
	});

	it('LaTeX ordinaire intact (fractions, unités, intervalles, virgule)', () => {
		for (const latex of [
			'\\frac{3}{2}',
			'0{,}5',
			'20\\operatorname{km}\\cdot\\operatorname{h}^{-1}',
			'\\left]-\\infty;3\\right]',
			'\\sqrt{2}\\times10^{3}',
			'\\text{vrai}'
		]) {
			expect(neutralizeStudentLatex(latex)).toBe(latex);
		}
	});
});

describe('escapeStudentText', () => {
	it.each([
		'[clique ici](https://evil.example)',
		'![x](https://evil.example/x.png)',
		'$\\href{javascript:alert(1)}{x}$',
		'<img src=x onerror=alert(1)>',
		'**gras** _italique_ `code`',
		'{{blank:0}}',
		'~3[m]~',
		'a\n\n# titre',
		'#hashtag @prof ==surligné== ~~barré~~',
		'{{hint:indice}} [[cours:abc]]'
	])('%j : ni lien, ni image, ni formule, ni case une fois parsé', (raw) => {
		const safe = escapeStudentText(raw);
		expect(safe).not.toMatch(/[[\]()*_`$<>{}~\\\n#@]|==/);
		const ast = JSON.stringify(parseMarkdown(`Réponse : ${safe}`));
		for (const type of [
			'link',
			'image',
			'math-inline',
			'math-block',
			'blank',
			'heading',
			'hashtag',
			'mention',
			'internal-link',
			'hint-reference'
		]) {
			expect(ast).not.toContain(`"type":"${type}"`);
		}
		// Aucune mise en forme fabriquée
		expect(ast).not.toMatch(/"(?:bold|italic|code|strikethrough|highlight)":true/);
	});

	it('texte ordinaire intact', () => {
		expect(escapeStudentText('équilatéral')).toBe('équilatéral');
		expect(escapeStudentText('3,5 cm')).toBe('3,5 cm');
	});
});

// Vecteur en colonne saisi avec l'onglet « Vecteur » du clavier (case « vecteur », #745)
describe('neutralizeStudentLatex — vecteur en colonne', () => {
	it('vecteur en colonne intact (2 ou 3 coordonnées, fractions, nom du vecteur)', () => {
		for (const latex of [
			'\\begin{pmatrix}2\\\\-3\\end{pmatrix}',
			'\\begin{pmatrix}1\\\\0\\\\-4\\end{pmatrix}',
			'\\begin{pmatrix}\\frac{1}{2}\\\\-\\sqrt{3}\\end{pmatrix}',
			'\\vec{n}\\begin{pmatrix}2\\\\-3\\end{pmatrix}'
		]) {
			expect(neutralizeStudentLatex(latex)).toBe(latex);
		}
	});

	it('passage à la ligne : son option d’espacement `[…]` est retirée', () => {
		expect(neutralizeStudentLatex('\\begin{pmatrix}1\\\\[999em]2\\end{pmatrix}')).toBe(
			'\\begin{pmatrix}1\\\\2\\end{pmatrix}'
		);
		expect(neutralizeStudentLatex('\\begin{pmatrix}1\\\\ [999em]2\\end{pmatrix}')).toBe(
			'\\begin{pmatrix}1\\\\2\\end{pmatrix}'
		);
	});

	it('option d’espacement retirée derrière tout blanc (tabulation, insécable, saut de page…)', () => {
		for (const blank of ['\t', '\u00a0', '\f', '\v', '\u2028', ' \t ']) {
			expect(
				neutralizeStudentLatex(`\\begin{pmatrix}1\\\\${blank}[999em]2\\end{pmatrix}`)
			).not.toContain('999em');
		}
	});

	it('trois coordonnées au plus : les passages à la ligne en masse sont retirés', () => {
		// 300 lignes : sous la borne de longueur (au-delà, la réponse entière devient inerte)
		const many = `\\begin{pmatrix}${'1\\\\'.repeat(300)}1\\end{pmatrix}`;
		expect(neutralizeStudentLatex(many).match(/\\\\/g)).toHaveLength(2);
	});

	it('passage à la ligne hors d’une colonne : toujours retiré', () => {
		expect(neutralizeStudentLatex('2\\\\3')).toBe('23');
		expect(neutralizeStudentLatex('\\begin{pmatrix}1\\end{pmatrix}\\\\3')).toBe(
			'\\begin{pmatrix}1\\end{pmatrix}3'
		);
	});

	it('autre environnement ou forme étoilée : retiré (texte inerte)', () => {
		for (const raw of [
			'\\begin{array}{c}1\\end{array}',
			'\\begin{pmatrix*}[r]1\\\\2\\end{pmatrix*}',
			'\\begin {pmatrix}1\\end {pmatrix}',
			'\\begin{bmatrix}1\\end{bmatrix}'
		]) {
			const safe = neutralizeStudentLatex(raw);
			expect(safe).not.toMatch(/\\begin|\\end(?![a-zA-Z])/);
			expect(safe).not.toContain('[r]');
		}
	});
});

// Rendu géant avec des commandes ADMISES (mesuré le 2026-10-05, MathLive 0.110) :
// `\left(\dfrac{…}{1}\right)` ×12 rend 4 096em et 4 Mo de HTML, `\sqrt` ×200 sans
// accolades des Mo aussi. Au-delà des bornes, la réponse devient un texte inerte.
describe('neutralizeStudentLatex — profondeur et longueur bornées', () => {
	const nest = (times: number, wrap: (inner: string) => string, seed = 'x') => {
		let latex = seed;
		for (let i = 0; i < times; i++) latex = wrap(latex);
		return latex;
	};
	const INERT = /^\\text\{[^\\{}$]*\}$/;

	it.each([
		['\\left(\\dfrac{…}{1}\\right) ×13', nest(13, (s) => `\\left(\\dfrac{${s}}{1}\\right)`)],
		['\\left(\\frac{…}{1}\\right) ×20', nest(20, (s) => `\\left(\\frac{${s}}{1}\\right)`)],
		['\\left(\\dfrac1…\\right) ×13 sans accolades', nest(13, (s) => `\\left(\\dfrac1${s}\\right)`)],
		['\\left|…\\right| ×4', nest(4, (s) => `\\left|\\dfrac{${s}}{1}\\right|`)],
		['\\sqrt ×100 sans accolades', `${'\\sqrt'.repeat(100)}x`],
		['\\dfrac ×30', nest(30, (s) => `\\dfrac{${s}}{1}`)],
		['accolades ×500', nest(500, (s) => `{${s}}`)],
		['accolades ouvertes ×900', '{'.repeat(900)],
		['colonnes imbriquées ×8', nest(8, (s) => `\\begin{pmatrix}${s}\\\\1\\end{pmatrix}`)],
		['réponse de 5 000 caractères', '1+'.repeat(2500)]
	])('%s : texte inerte et court', (_, raw) => {
		const safe = neutralizeStudentLatex(raw);
		expect(safe).toMatch(INERT);
		expect(safe.length).toBeLessThan(400);
	});

	it('écritures légitimes imbriquées intactes (parenthèses du clavier, fractions, racines)', () => {
		for (const latex of [
			'f\\left(g\\left(h\\left(x\\right)\\right)\\right)',
			'\\left(\\dfrac{\\left(x+1\\right)^{2}}{\\sqrt{x}}\\right)',
			'\\left(\\dfrac{1}{\\left(\\dfrac{1}{\\left(x\\right)}\\right)}\\right)',
			'\\dfrac{\\dfrac{\\dfrac{1}{2}}{3}}{4}',
			'\\sqrt{\\sqrt{\\sqrt{2}}}',
			'e^{-\\frac{x^{2}}{2}}',
			'\\left\\lbrace\\begin{pmatrix}\\frac{1}{2}\\\\-\\sqrt{3}\\end{pmatrix}\\right.'
		]) {
			expect(neutralizeStudentLatex(latex)).toBe(latex);
		}
	});

	it('texte inerte : le début de la réponse, syntaxe neutralisée, sans `$`', () => {
		const safe = neutralizeStudentLatex(nest(13, (s) => `\\left(\\dfrac{${s}}{1}\\right)`));
		expect(safe.startsWith('\\text{＼left（＼dfrac｛')).toBe(true);
		expect(safe.endsWith('…}')).toBe(true);
		expect(neutralizeStudentLatex(`$${'{'.repeat(1500)}%`)).toMatch(INERT);
	});
});
