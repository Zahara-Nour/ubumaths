/**
 * Fonctions génériques suivies de `\left( … \right)`.
 *
 * `\left( … \right)` est partout : énoncés relus réécrits avec, réponses
 * d'élèves produites par MathLive, auteurs qui l'écrivent à la main. Un nom de
 * fonction générique reconnu (config par défaut ou fournie) suivi de
 * `\left( … \right)` doit donner EXACTEMENT le même AST que `f(…)`. Une lettre
 * non déclarée suivie de `\left(` reste un produit, comme avant.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../parser';
import { areEquivalent } from '../equivalence';
import { removeFactorsOneAST, removeSignsAST } from '../cosmetic-transforms';
import { toLatex } from '../latex-generator';

describe('Fonction générique suivie de \\left( … \\right) — config par défaut', () => {
	const pairs: Array<[string, string]> = [
		['f\\left(1\\right)', 'f(1)'],
		['f \\left( 1 \\right)', 'f(1)'],
		["f'\\left(1\\right)", "f'(1)"],
		["f' \\left( 1 \\right)", "f'(1)"],
		["f''\\left(x\\right)", "f''(x)"],
		['f^{-1}\\left(x\\right)', 'f^{-1}(x)'],
		['f^{(3)}\\left(x\\right)', 'f^{(3)}(x)'],
		['f\\left(-3\\right)', 'f(-3)'],
		['f \\left( -3 \\right) = 9', 'f(-3)=9'],
		['g\\left(x+1\\right)', 'g(x+1)'],
		['H\\left(2x\\right)', 'H(2x)'],
		['f\\left(a, b\\right)', 'f(a,b)'],
		['2f\\left(x\\right)+1', '2f(x)+1'],
		['f \\circ g\\left(x\\right)', 'f \\circ g(x)'],
		['f\\left(\\left(x\\right)\\right)', 'f((x))'],
		['f\\left(g\\left(x\\right)\\right)', 'f(g(x))']
	];

	for (const [withLeft, plain] of pairs) {
		it(`${withLeft} ≡ ${plain} (même AST)`, () => {
			expect(parseLatex(withLeft)).toEqual(parseLatex(plain));
		});
	}

	it("f'\\left(1\\right) est un nœud function", () => {
		const ast = parseLatex("f'\\left(1\\right)");
		expect(ast.type).toBe('function');
	});
});

describe('Ce qui ne change pas', () => {
	it('une lettre non déclarée suivie de \\left( reste un produit', () => {
		expect(parseLatex('a\\left(x\\right)').type).toBe('multiplication');
	});

	it('genericFunctions: null → f\\left(x\\right) reste un produit, comme f(x)', () => {
		const opts = { genericFunctions: null };
		expect(parseLatex('f\\left(x\\right)', opts).type).toBe('multiplication');
		expect(parseLatex('f(x)', opts).type).toBe('multiplication');
	});

	it('\\left[ ne devient pas un appel de fonction', () => {
		expect(parseLatex('f\\left[x\\right]').type).not.toBe('function');
	});

	it('\\left| ne devient pas un appel de fonction', () => {
		expect(parseLatex('f\\left|x\\right|').type).not.toBe('function');
	});
});

describe('Config personnalisée', () => {
	const opts = { genericFunctions: { names: ['P'] } };

	it('P\\left(x\\right) = P(x) quand P est déclaré', () => {
		const ast = parseLatex('P\\left(x\\right)', opts);
		expect(ast.type).toBe('function');
		expect(ast).toEqual(parseLatex('P(x)', opts));
	});

	it("f n'est plus une fonction quand la config ne la déclare pas", () => {
		expect(parseLatex('f\\left(x\\right)', opts).type).toBe('multiplication');
	});
});

describe('Conséquences en aval', () => {
	it('areEquivalent : f\\left(1\\right) ≡ f(1)', () => {
		expect(areEquivalent(parseLatex('f\\left(1\\right)'), parseLatex('f(1)'))).toBe(true);
	});

	it("areEquivalent : f'\\left(1\\right) n'est pas f'", () => {
		expect(areEquivalent(parseLatex("f'\\left(1\\right)"), parseLatex("f'"))).toBe(false);
	});

	it("removeFactorsOneAST(removeSignsAST) garde f'\\left(1\\right) comme f'(1)", () => {
		const ast = removeFactorsOneAST(removeSignsAST(parseLatex("f'\\left(1\\right)")));
		expect(ast).toEqual(removeFactorsOneAST(removeSignsAST(parseLatex("f'(1)"))));
	});

	it('removeFactorsOneAST(removeSignsAST) garde f\\left(-3\\right) comme f(-3)', () => {
		const ast = removeFactorsOneAST(removeSignsAST(parseLatex('f\\left(-3\\right)')));
		expect(ast).toEqual(removeFactorsOneAST(removeSignsAST(parseLatex('f(-3)'))));
	});

	it('toLatex rend les deux écritures de la même façon', () => {
		expect(toLatex(parseLatex('f\\left(-3\\right)'))).toBe(toLatex(parseLatex('f(-3)')));
	});
});
