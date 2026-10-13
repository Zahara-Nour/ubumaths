/**
 * Audit du convertisseur LaTeX → Typst des fiches PDF (2026-10-13), lot 2.
 *
 * 1. Le texte de `\text{…}` passait par toutes les règles mathématiques : `\text{50\,cm}`
 *    affichait « 50 thin cm », `\text{segment [AB]}` « bracket.l AB bracket.r »,
 *    `\text{20\%}` « 20\% », un guillemet devenait `prime.double`, et `{,}` laissait une
 *    virgule nue dans un `display(…)` (argument en trop, toute la fiche échouait).
 * 2. Système `\left\{\begin{aligned}…\end{aligned}\right.` : en formule de bloc, seul le
 *    contenu de `aligned` était gardé (l'accolade et `S =` disparaissaient) ; en ligne,
 *    l'accolade ne grandissait pas sur les deux lignes.
 *
 * Les sorties attendues ont été compilées avec le compilateur de production.
 */

import { describe, it, expect } from 'vitest';
import { convertLatexToTypstMath, markdownToTypst } from '../typst-generator';

/** Corps du document Typst, sans le préambule */
async function body(markdown: string): Promise<string> {
	return markdownToTypst(markdown, { includeSetup: false, language: 'fr' });
}

describe('1 — le texte de \\text{…} reste du texte', () => {
	it.each([
		['\\text{50\\,cm}', '"50 cm"'],
		['\\text{50\\;cm}', '"50 cm"'],
		['\\text{50~cm}', '"50 cm"'],
		['\\text{segment [AB]}', '"segment [AB]"'],
		['\\text{20\\%}', '"20%"'],
		['\\text{soit 0{,}5 cm}', '"soit 0,5 cm"'],
		["\\text{l'ensemble \\{1;2\\}}", '"l\'ensemble {1;2}"'],
		['\\text{coûte 5\\$}', '"coûte 5$"'],
		['\\textrm{50\\,cm}', '"50 cm"'],
		['\\text{il dit "oui"}', '"il dit \\"oui\\""']
	])('%s → %s', (latex, expected) => {
		expect(convertLatexToTypstMath(latex)).toBe(expected);
	});

	it('aucune règle mathématique ne touche le texte', () => {
		const out = convertLatexToTypstMath('x = 3 \\text{ cm (segment [AB], 20\\%)}');
		expect(out).not.toMatch(/thin|bracket|prime|\\%/);
		expect(out).toContain('" cm (segment [AB], 20%)"');
	});

	it('{,} dans un \\text{…} de cases : aucune virgule nue dans display(…)', () => {
		const out = convertLatexToTypstMath(
			'\\begin{cases} x = 1 & \\text{si 0{,}5 cm} \\\\ x = 2 & \\text{sinon} \\end{cases}'
		);
		expect(out).toContain('"si 0,5 cm"');
		expect(out).not.toContain('","');
	});

	it('les formules imbriquées de \\text{… $…$ …} restent converties', () => {
		expect(convertLatexToTypstMath('\\text{car $x-1<0$}')).toBe('"car " x-1<0');
		expect(convertLatexToTypstMath('\\text{car $x \\leq \\dfrac{1}{2}$ ici}')).toBe(
			'"car " x <= frac(1, 2) " ici"'
		);
	});

	it('\\text{d}x reste une différentielle', () => {
		expect(convertLatexToTypstMath('\\int f(x)\\text{d}x')).toContain('dif x');
	});

	it('en ligne et en bloc, par markdownToTypst', async () => {
		const inline = await body('Longueur : $\\ell = \\text{50\\,cm}$.');
		expect(inline).toContain('"50 cm"');
		expect(inline).not.toContain('thin cm');
		const block = await body('$$\\text{segment [AB] : } 20\\%$$');
		expect(block).toContain('"segment [AB] : "');
	});
});

describe('2 — système \\left\\{\\begin{aligned}…\\end{aligned}\\right.', () => {
	const system = 'S = \\left\\{\\begin{aligned} x + y &= 3 \\\\ 2x - y &= 0 \\end{aligned}\\right.';

	it("convertLatexToTypstMath : l'accolade englobe les deux lignes, alignées sur &", () => {
		const out = convertLatexToTypstMath(system);
		expect(out).toMatch(/^S = lr\(\s*brace\.l\s+vec\(delim: #none, /);
		expect(out).toContain('display(x + y &= 3)');
		expect(out).toContain('display(2x - y &= 0)');
	});

	it('en bloc : S = et l’accolade sont gardés (plus de grille sans eux)', async () => {
		const out = await body(`$$${system}$$`);
		expect(out).not.toContain('#grid');
		expect(out).toMatch(/\$ S = lr\(\s*brace\.l\s+vec\(delim: #none, /);
	});

	it('en ligne : même forme, l’accolade grandit', async () => {
		const out = await body(`Résoudre $${system}$.`);
		expect(out).toMatch(/S = lr\(\s*brace\.l\s+vec\(delim: #none, /);
	});

	it('virgule dans une ligne : protégée (un seul argument par ligne)', () => {
		const out = convertLatexToTypstMath(
			'\\left\\{\\begin{aligned} x &= 1, \\\\ y &= 2 \\end{aligned}\\right.'
		);
		expect(out).toContain('display(x &= 1",")');
	});

	it('aligned seul en bloc : toujours la grille alignée', async () => {
		const out = await body('$$\\begin{aligned} x &= 1 \\\\ y &= 2 \\end{aligned}$$');
		expect(out).toContain('#grid');
	});
});
