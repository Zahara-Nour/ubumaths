/**
 * Lisibilité des PDF : fractions du texte et numéros de liste (2026-09-25)
 *
 * Décision de David (variante E + garde-fous) :
 *  - une fraction `\dfrac` de PREMIER NIVEAU dans une formule du texte est
 *    affichée en taille normale (`display(frac(…))`), comme à l'écran ; en
 *    exposant/indice et à l'intérieur d'une autre fraction, elle reste réduite ;
 *    un `\frac` écrit par l'auteur est respecté ; une fraction trop large pour
 *    la colonne reste réduite ;
 *  - l'interligne suit la hauteur réelle des formules du texte (sinon les lignes
 *    se chevauchent, mesuré avec le compilateur de prod) ;
 *  - le numéro d'un item de liste est DANS la première ligne (aligné sur sa ligne
 *    de base) : `enum` de Typst le colle en haut d'un premier item haut.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '../typst-generator';

const typst = (md: string) => generateTypst(parseMarkdown(md), { includeSetup: false });

/** Formule du texte n° `index` ($…$), hors règles et fonctions d'en-tête. */
function formule(md: string, index = 0): string {
	const corps = typst(md).split('// ubumark: fin de l’en-tête')[1] ?? '';
	return [...corps.matchAll(/\$([^$]+)\$/g)][index]?.[1] ?? '';
}

describe('fractions dans le texte', () => {
	it('fraction de premier niveau : taille normale', () => {
		expect(formule('Soit ~f(x)={1}/{x}~.')).toBe('f( x ) = display(frac(1, x))');
	});

	it('en exposant : réduite', () => {
		const f = formule('On a ~e^{{1}/{2}}~.');
		expect(f).toContain('frac(1, 2)');
		expect(f).not.toContain('display');
	});

	it('fraction dans une fraction : seule l’extérieure est en taille normale', () => {
		const f = formule('~{{a}/{b}}/{c}~');
		expect(f.match(/display\(/g)).toHaveLength(1);
		expect(f).toMatch(/^display\(frac\(frac\(a, b\), c\)\)$/);
	});

	it('`\\frac` écrit par l’auteur en LaTeX : respecté (réduit)', () => {
		expect(formule('$\\frac{1}{2}$')).toBe('frac(1, 2)');
	});

	it('`\\dfrac` écrit par l’auteur en LaTeX : taille normale', () => {
		expect(formule('$\\dfrac{1}{2}$')).toBe('display(frac(1, 2))');
	});

	it('fraction trop large pour la colonne : reste réduite', () => {
		const longue = '(6x^2+10x+3)(-x^2+2x+8)-(2x^3+5x^2+3x)(-2x+2)';
		expect(formule(`~{${longue}}/{(-x^2+2x+8)^2}~`)).not.toContain('display');
	});

	it('`e^\\dfrac{1}{2}` (exposant sans accolades) : réduite', () => {
		expect(formule('$e^\\dfrac{1}{2}$')).not.toContain('display');
	});

	it('`\\dfrac12` sans accolades n’empêche pas la fraction suivante d’être en taille normale', () => {
		expect(formule('$\\dfrac12 + x^{2} + \\dfrac{1}{3}$')).toContain('display(frac(1, 3))');
	});

	// Relecture 2026-09-25 : une fraction au DÉNOMINATEUR passait en taille normale
	it.each([
		['\\dfrac{x^{2}}{\\dfrac{1}{2}}'],
		['\\dfrac{\\sqrt{2}}{\\dfrac{1}{3}}'],
		['\\dfrac{1{,}5}{\\dfrac{1}{2}}'],
		['\\dfrac{\\dfrac{1}{2}}{\\dfrac{3}{4}}']
	])('%s : seule la fraction extérieure est en taille normale', (latex) => {
		const f = formule(`$${latex}$`);
		expect(f.match(/display\(/g)).toHaveLength(1);
		expect(f.startsWith('display(frac(')).toBe(true);
	});

	it('accolades échappées `\\{ \\}` : ne comptent pas comme des groupes', () => {
		expect(formule('$x^{\\left.a\\right\\} \\dfrac{1}{2}}$')).not.toContain('display');
		expect(formule('$\\left\\{\\dfrac{1}{2}\\right\\}$')).toContain('display(frac(1, 2))');
	});

	it('formule centrée ($$…$$) : inchangée', () => {
		expect(typst('$$\\dfrac{1}{2}$$')).not.toContain('display(');
	});
});

describe('interligne', () => {
	it('une seule règle, qui fait compter la hauteur réelle des formules du texte', () => {
		const code = typst('Texte ~{1}/{2}~ et ~{3}/{4}~.');
		const regle =
			'#show math.equation.where(block: false): set text(top-edge: "bounds", bottom-edge: "bounds")';
		expect(code.split(regle)).toHaveLength(2);
	});
});

describe('numéros de liste dans la première ligne', () => {
	it('liste numérotée : chaque item appelle l’aide `ubu-item` avec son numéro', () => {
		const code = typst('1. alpha\n2. beta');
		expect(code).not.toContain('#enum(');
		expect(code).toContain('#ubu-item(numbering("a)", 1), w: "a)")[alpha]');
		expect(code).toContain('#ubu-item(numbering("a)", 2), w: "a)")[beta]');
	});

	it('le numéro de départ est respecté', () => {
		expect(typst('3. alpha\n4. beta')).toContain('#ubu-item(numbering("a)", 3), w: "c)")[alpha]');
	});

	it('sous-liste : style de sa profondeur', () => {
		expect(typst('1. Calculer :\n   a. x\n2. Fin.')).toContain(
			'#ubu-item(numbering("1)", 1), w: "1)")[x]'
		);
	});

	it('liste à puces : puce', () => {
		expect(typst('- alpha\n- beta')).toContain('#ubu-item([•], w: "•")[alpha]');
	});

	it('item qui commence par un bloc : numéro à côté du bloc (grille)', () => {
		expect(typst('1. $$x^2=4$$\n2. b')).toContain('#ubu-item-bloc(numbering("a)", 1), w: "a)")[');
	});

	// Relecture 2026-09-25 : la largeur du numéro était fixe (1,1 em) — `10)`, `m)`,
	// `viii)` débordaient. Comme `enum`, la liste réserve la place de son PLUS LARGE numéro.
	it.each([
		[
			'11 items de profondeur 2 : « 10) » (même largeur que « 11) », le premier est gardé)',
			'1. p\n' + Array.from({ length: 11 }, (_, i) => `   ${i + 1}. x`).join('\n'),
			'"10)"'
		],
		[
			'13 items de profondeur 1 : « m) »',
			Array.from({ length: 13 }, (_, i) => `${i + 1}. x`).join('\n'),
			'"m)"'
		],
		[
			'8 items de profondeur 3 : « viii) »',
			'1. a\n   1. b\n' + Array.from({ length: 8 }, (_, i) => `      ${i + 1}. x`).join('\n'),
			'"viii)"'
		]
	])('%s', (_cas, md, largeur) => {
		expect(typst(md)).toContain(`w: ${largeur})`);
	});

	it('l’aide `ubu-item` est définie une seule fois, avant son usage', () => {
		const code = typst('1. a\n2. b');
		expect(code.split('#let ubu-item(')).toHaveLength(2);
		expect(code.indexOf('#let ubu-item(')).toBeLessThan(code.indexOf('#ubu-item(numbering'));
	});
});

describe('fractions dans un align*', () => {
	// 2026-09-25 : les cellules d'un align* étaient des formules du texte → fractions
	// réduites même dans un calcul centré (corrigé « Al-Kashi », produit scalaire).
	it('fraction de premier niveau d’une ligne : taille normale ; en exposant : réduite', () => {
		const code = typst(
			'$$\\begin{align*}\\cos x&=\\dfrac{5}{40}\\\\&=e^{\\dfrac{1}{2}}\\end{align*}$$'
		);
		expect(code).toContain('[$display(frac(5, 40))$]');
		expect(code).toContain('e^(frac(1, 2))');
	});
});
