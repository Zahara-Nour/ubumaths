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
