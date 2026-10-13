/**
 * Audit du convertisseur LaTeX → Typst des fiches PDF (2026-10-13), lot 1.
 *
 * Chaque cas ci-dessous a été confirmé par une compilation réelle avant correction :
 * soit la fiche entière échouait (« unknown variable: xy », « expected content, found
 * array », « unexpected argument »), soit la formule sortait fausse (exposant qui
 * avale la parenthèse suivante, commande LaTeX imprimée en toutes lettres). Les
 * sorties attendues ont été compilées avec le compilateur de production.
 */

import { describe, it, expect } from 'vitest';
import { convertLatexToTypstMath, markDisplayFractions } from '../typst-generator';

describe('A1 — lettres collées devant une parenthèse', () => {
	it('3xy(x+2) : xy est un produit, pas un appel de fonction', () => {
		expect(convertLatexToTypstMath('3xy(x+2)')).toBe('3x y(x+2)');
	});

	it('2ab(a+b)', () => {
		expect(convertLatexToTypstMath('2ab(a+b)')).toBe('2a b(a+b)');
	});

	it('AB(1;2) : deux lettres de géométrie', () => {
		const out = convertLatexToTypstMath('AB(1;2)');
		expect(out).not.toContain('AB(');
		expect(out).toMatch(/^A B\(/);
	});

	it('les vraies fonctions restent collées à leur parenthèse', () => {
		expect(convertLatexToTypstMath('\\sin(x)+f(x)')).toBe('sin(x)+f(x)');
		expect(convertLatexToTypstMath('\\frac{1}{2}')).toBe('frac(1, 2)');
		expect(convertLatexToTypstMath('\\operatorname{Card}(A)')).toContain('op("Card")(A)');
		expect(convertLatexToTypstMath('\\mathbb{D}')).toBe('bb(D)');
	});
});

describe('A2 — « ; » de premier niveau dans un appel Typst', () => {
	it.each([
		['\\max(a;b)', 'max(a semi b)'],
		['\\min(2;3)', 'min(2 semi 3)'],
		['\\gcd(12;18)', 'gcd(12 semi 18)']
	])('%s', (latex, expected) => {
		expect(convertLatexToTypstMath(latex)).toBe(expected);
	});

	it('cases : ensemble {1;2} et ligne « x=1 ; y=2 »', () => {
		const out = convertLatexToTypstMath(
			'\\begin{cases} x\\in\\{1;2\\} \\\\ x=1 ; y=2 \\end{cases}'
		);
		expect(out).not.toContain(';');
		expect(out).toMatch(/display\(x in brace\.l 1\s+semi\s+2\s+brace\.r\s*\)/);
		expect(out).toMatch(/display\(x=1\s+semi\s+y=2\)/);
	});

	it('les « ; » qui séparent les lignes d’une matrice restent', () => {
		expect(convertLatexToTypstMath('\\begin{pmatrix}1\\\\2\\end{pmatrix}')).toBe(
			'mat(delim: "(", 1; 2)'
		);
	});
});

describe('A3 — virgule décimale nue dans \\frac et \\sqrt', () => {
	it('\\frac{2,5}{3}', () => {
		expect(convertLatexToTypstMath('\\frac{2,5}{3}')).toBe('frac(2","5, 3)');
	});

	it('\\sqrt{1,44}', () => {
		expect(convertLatexToTypstMath('\\sqrt{1,44}')).toBe('sqrt(1","44)');
	});

	it('la virgule de séparation de frac(…) et les virgules imbriquées restent', () => {
		expect(convertLatexToTypstMath('\\frac{f(1,2)}{3}')).toBe('frac(f(1,2), 3)');
	});
});

describe('A4 — environnement array et accolades de groupe', () => {
	it('système \\left\\{ array \\right. : matrice sans délimiteur', () => {
		const out = convertLatexToTypstMath(
			'\\left\\{\\begin{array}{l} x+y=3 \\\\ x-y=1 \\end{array}\\right.'
		);
		expect(out).toContain('mat(delim: #none, x+y=3; x-y=1)');
		expect(out).not.toMatch(/begin|array|"/);
	});

	it('argument de colonnes {cc} ignoré', () => {
		expect(convertLatexToTypstMath('\\begin{array}{cc} 1 & 2 \\\\ 3 & 4 \\end{array}')).toBe(
			'mat(delim: #none, 1, 2; 3, 4)'
		);
	});

	it('{l|r} et \\hline ignorés', () => {
		expect(
			convertLatexToTypstMath('\\begin{array}{l|r} a & b \\\\ \\hline c & d \\end{array}')
		).toBe('mat(delim: #none, a, b; c, d)');
	});

	it('array de premier niveau d’une formule du texte : taille normale', () => {
		expect(markDisplayFractions('\\begin{array}{l} x \\end{array}')).toContain('\\ubudisplay');
	});

	it('\\dfrac{\\pi}2 : dénominateur sans accolades', () => {
		expect(convertLatexToTypstMath('\\dfrac{\\pi}2')).toBe('frac(pi, 2)');
	});

	it('groupes effacés : {x}{y} et {x}2 ne recollent pas', () => {
		expect(convertLatexToTypstMath('{x}{y}')).toBe('x y');
		expect(convertLatexToTypstMath('{x}2')).toBe('x 2');
	});
});

describe('B1 — exposant d’une lettre suivi d’une parenthèse', () => {
	it('e^x(x+1) : la parenthèse n’entre pas dans l’exposant', () => {
		expect(convertLatexToTypstMath('e^x(x+1)')).toBe('e^x (x+1)');
	});

	it('p^k(1-p)^{n-k}', () => {
		expect(convertLatexToTypstMath('p^k(1-p)^{n-k}')).toBe('p^k (1-p)^(n-k)');
	});

	it('x^2(x-3) et e^{x}(x+1) inchangés', () => {
		expect(convertLatexToTypstMath('x^2(x-3)')).toBe('x^2(x-3)');
		expect(convertLatexToTypstMath('e^{x}(x+1)')).toBe('e^(x)(x+1)');
	});
});

describe('B4 — commandes courantes', () => {
	it.each([
		['a\\mid b', 'a divides b'],
		['a\\simeq b', 'a tilde.eq b'],
		['\\boxed{x=2}', '#box(stroke: 0.5pt, inset: 2pt)[$x=2$]'],
		['\\tfrac{1}{2}', 'frac(1, 2)'],
		['\\dbinom{n}{k}', 'binom(n, k)'],
		['\\textrm{cm}', '"cm"'],
		['\\nearrow \\searrow', 'arrow.tr arrow.br'],
		['\\vert x\\vert', '|x|'],
		['x\\longmapsto 2x', 'x arrow.r.long.bar 2x'],
		['\\underset{n\\to+\\infty}{\\lim}', 'limits(lim)_(n->+infinity)']
	])('%s', (latex, expected) => {
		expect(convertLatexToTypstMath(latex)).toBe(expected);
	});

	it('\\langle … \\rangle', () => {
		expect(convertLatexToTypstMath('\\langle u, v\\rangle')).toMatch(/^angle\.l u, v\s+angle\.r$/);
	});

	it('\\left\\langle … \\right\\rangle : lr qui grandit', () => {
		expect(convertLatexToTypstMath('\\left\\langle u, v\\right\\rangle')).toMatch(
			/^lr\(\s*angle\.l\s+u","\s*v\s+angle\.r\s*\)$/
		);
	});

	it('\\pmod{n}', () => {
		expect(convertLatexToTypstMath('a\\equiv b\\pmod{n}')).toMatch(/^a equiv b\s+quad \(mod n\)$/);
	});

	it('\\llbracket 1;n \\rrbracket', () => {
		expect(convertLatexToTypstMath('\\llbracket 1;n\\rrbracket')).toMatch(
			/^bracket\.l\.double 1;n\s+bracket\.r\.double$/
		);
	});

	it('\\substack : lignes empilées', () => {
		expect(convertLatexToTypstMath('\\sum_{\\substack{i=1\\\\j=2}} a')).toMatch(
			/^sum_\(i=1\\\s*j=2\) a$/
		);
	});
});

describe('B5 — \\bigl, \\bigr, \\bigm', () => {
	it('\\bigl(x+1\\bigr)^2', () => {
		expect(convertLatexToTypstMath('\\bigl(x+1\\bigr)^2')).toBe('(x+1)^2');
	});

	it('\\bigcup et \\bigcap ne sont pas des \\big', () => {
		expect(convertLatexToTypstMath('\\bigcup_{i} A_i \\bigcap B')).toBe(
			'union.big_(i) A_i sect.big B'
		);
	});
});

describe('B6 — saut de ligne collé à une lettre', () => {
	it('x=1\\\\y=2 : pas de commande \\y', () => {
		expect(convertLatexToTypstMath('x=1\\\\y=2')).toBe('x=1\\ y=2');
	});
});

describe('C — capitales grecques, fractions sans accolades, matrice entre crochets', () => {
	it('\\Pi \\Xi', () => {
		expect(convertLatexToTypstMath('\\Pi \\Xi \\Gamma')).toBe('Pi Xi Gamma');
	});

	it.each([
		['\\frac{1}2', 'frac(1, 2)'],
		['\\frac56', 'frac(5, 6)'],
		['e^{-\\frac56}', 'e^(-frac(5, 6))'],
		['\\frac 12', 'frac(1, 2)'],
		['\\frac1{x}', 'frac(1, x)']
	])('%s', (latex, expected) => {
		expect(convertLatexToTypstMath(latex)).toBe(expected);
	});

	it('matrice entre ] et [ : pas lue comme un intervalle', () => {
		expect(convertLatexToTypstMath(']\\begin{pmatrix}1\\\\2\\end{pmatrix}[')).toContain(
			'mat(delim: "(", 1; 2)'
		);
	});
});
