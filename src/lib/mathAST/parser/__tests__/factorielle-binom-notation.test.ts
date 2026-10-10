/**
 * Notation factorielle `n!` et coefficient binomial `\binom{n}{k}` (2026-10-05)
 *
 * Avant : `6!` → « Unexpected token: ! » dans les deux parseurs, `\binom{10}{3}` →
 * « Unknown command » ; l'élève qui tapait `6!` pour 720 avait faux sans rien
 * comprendre. La notation produit le MÊME nœud que `factorial(...)` / `binom(...)`
 * (#821) : aucun second concept.
 *
 * Priorité retenue : `!` s'applique à ce qui le précède immédiatement sur la ligne,
 * comme à l'écran — `2^3!` = (2³)! (l'exposant TeX n'est qu'un atome : MathLive
 * écrit `2^3!` quand le `!` est HORS de l'exposant), `2^{3!}` = 2^(3!), `n!^2` =
 * (n!)², `-3!` = −(3!), `2n!` = 2·(n!). `3!!` (double factorielle) est refusé.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../index';
import { parseCustom, parseCustomRD } from '../custom';
import { MathAST } from '../../factory';
import { toLatex } from '../../latex-generator';
import { areEquivalent } from '../../equivalence';
import type { MathNode } from '../../types';

const n = (v: string) => MathAST.number(v);
const v = (name: string) => MathAST.variable(name);
const fact = (x: MathNode) => MathAST.func('factorial', [x]);
const binom = (a: MathNode, b: MathNode) => MathAST.func('binom', [a, b]);

const latexParsers = {
	pratt: (s: string) => parseLatex(s),
	rd: (s: string) => parseLatex(s, { parser: 'rd' })
};
const customParsers = {
	pratt: (s: string) => parseCustom(s),
	rd: (s: string) => parseCustomRD(s)
};

describe.each(Object.entries(latexParsers))('LaTeX (%s) — factorielle postfixe', (_name, parse) => {
	it('6! → factorial(6)', () => {
		expect(parse('6!')).toEqual(fact(n('6')));
	});

	it('n! → factorial(n)', () => {
		expect(parse('n!')).toEqual(fact(v('n')));
	});

	it('(n+1)! → factorial(n+1), sans délimiteur dans l’argument', () => {
		expect(parse('(n+1)!')).toEqual(fact(MathAST.add(v('n'), n('1'))));
	});

	it('\\left(n+1\\right)! → factorial(n+1)', () => {
		expect(parse('\\left(n+1\\right)!')).toEqual(fact(MathAST.add(v('n'), n('1'))));
	});

	it('\\frac{10!}{7!} → quotient de factorielles', () => {
		expect(parse('\\frac{10!}{7!}')).toEqual(
			MathAST.divide(fact(n('10')), fact(n('7')), 'fraction')
		);
	});

	it('-3! = −(3!)', () => {
		expect(parse('-3!')).toEqual(MathAST.opposite(fact(n('3'))));
	});

	it('2^3! = (2³)! : l’exposant TeX est un seul atome', () => {
		expect(parse('2^3!')).toEqual(fact(MathAST.superscript(n('2'), n('3'))));
	});

	it('2^{3!} = 2^(3!)', () => {
		expect(parse('2^{3!}')).toEqual(MathAST.superscript(n('2'), fact(n('3'))));
	});

	it('n!^2 = (n!)²', () => {
		expect(parse('n!^2')).toEqual(MathAST.superscript(fact(v('n')), n('2')));
	});

	it('2n! = 2 × (n!)', () => {
		expect(parse('2n!')).toEqual(MathAST.multiply(n('2'), fact(v('n')), 'implicit'));
	});

	it('3!27! = 3! × 27! (un nombre juste après une factorielle)', () => {
		expect(parse('3!27!')).toEqual(MathAST.multiply(fact(n('3')), fact(n('27')), 'implicit'));
	});

	it('x2 reste refusé (la règle du nombre ne change qu’après !)', () => {
		expect(() => parse('x2')).toThrow();
	});

	it('(3!)! est accepté', () => {
		expect(parse('(3!)!')).toEqual(fact(fact(n('3'))));
	});

	it('3!! (double factorielle) est refusé', () => {
		expect(() => parse('3!!')).toThrow(/factorielle/i);
	});

	it('x!=3 en LaTeX : factorial(x) = 3 (≠ s’écrit \\neq)', () => {
		expect(parse('x!=3')).toEqual(MathAST.relation('=', fact(v('x')), n('3')));
	});

	it('! en tête reste une erreur', () => {
		expect(() => parse('!3')).toThrow();
	});
});

describe.each(Object.entries(latexParsers))('LaTeX (%s) — \\! reste un espace', (_name, parse) => {
	it('a\\!b est un produit, sans factorielle', () => {
		expect(parse('a\\!b')).toEqual(MathAST.multiply(v('a'), v('b'), 'implicit'));
	});

	it('6\\!\\! n’est pas une factorielle', () => {
		expect(parse('6\\!\\!')).toEqual(n('6'));
	});
});

describe.each(Object.entries(latexParsers))('LaTeX (%s) — \\binom', (_name, parse) => {
	it.each(['binom', 'dbinom', 'tbinom'])('\\%s{10}{3} → binom(10, 3)', (cmd) => {
		expect(parse(`\\${cmd}{10}{3}`)).toEqual(binom(n('10'), n('3')));
	});

	it('\\binom{n}{k} symbolique', () => {
		expect(parse('\\binom{n}{k}')).toEqual(binom(v('n'), v('k')));
	});

	it('\\binom{4}{2}\\times\\binom{28}{3}', () => {
		expect(parse('\\binom{4}{2}\\times\\binom{28}{3}')).toEqual(
			MathAST.multiply(binom(n('4'), n('2')), binom(n('28'), n('3')), 'cross')
		);
	});

	// Forme que rend le clavier virtuel MathLive pour deux arguments d'un caractère
	// (mesuré au clic sur la touche « Coefficient binomial », 2026-10-05)
	it('\\binom52 sans accolades → binom(5, 2)', () => {
		expect(parse('\\binom52')).toEqual(binom(n('5'), n('2')));
	});

	it('2\\binom{4}{2} : multiplication implicite', () => {
		expect(parse('2\\binom{4}{2}')).toEqual(
			MathAST.multiply(n('2'), binom(n('4'), n('2')), 'implicit')
		);
	});
});

describe.each(Object.entries(customParsers))(
	'Syntaxe maison (%s) — factorielle',
	(_name, parse) => {
		it('6! → factorial(6), même nœud que factorial(6)', () => {
			expect(parse('6!')).toEqual(fact(n('6')));
			expect(parse('6!')).toEqual(parse('factorial(6)'));
		});

		it('(n+1)! → factorial(n+1)', () => {
			expect(parse('(n+1)!')).toEqual(parse('factorial(n+1)'));
		});

		it('10!/7! → quotient de factorielles', () => {
			expect(parse('10!/7!')).toEqual(MathAST.divide(fact(n('10')), fact(n('7')), 'fraction'));
		});

		it('-3! = −(3!)', () => {
			expect(parse('-3!')).toEqual(MathAST.opposite(fact(n('3'))));
		});

		it('2^3! = (2³)!, comme en LaTeX ; 2^{3!} = 2^(3!)', () => {
			expect(parse('2^3!')).toEqual(fact(MathAST.superscript(n('2'), n('3'))));
			expect(parse('2^{3!}')).toEqual(MathAST.superscript(n('2'), fact(n('3'))));
		});

		it('n!^2 = (n!)²', () => {
			expect(parse('n!^2')).toEqual(MathAST.superscript(fact(v('n')), n('2')));
		});

		it('3!! est refusé', () => {
			expect(() => parse('3!!')).toThrow(/factorielle/i);
		});

		it('3!27! = 3! × 27!', () => {
			expect(parse('3!27!')).toEqual(MathAST.multiply(fact(n('3')), fact(n('27')), 'implicit'));
		});

		it('x!=3 reste la relation ≠ (opérateur existant)', () => {
			expect(parse('x!=3')).toEqual(MathAST.relation('!=', v('x'), n('3')));
		});

		it('x! = 3 (avec espace) : factorielle', () => {
			expect(parse('x! = 3')).toEqual(MathAST.relation('=', fact(v('x')), n('3')));
		});

		it('!x reste le NON logique', () => {
			expect(parse('!x')).toEqual(MathAST.logicalNot(v('x')));
		});

		it('binom(10,3) inchangé', () => {
			expect(parse('binom(10,3)')).toEqual(binom(n('10'), n('3')));
		});
	}
);

describe('toLatex — factorielle et coefficient binomial', () => {
	it('factorial(6) → 6!', () => {
		expect(toLatex(fact(n('6')))).toBe('6!');
	});

	it('factorial(n) → n!', () => {
		expect(toLatex(fact(v('n')))).toBe('n!');
	});

	it.each([
		['factorial(n+1)', '(n+1)!'],
		['factorial(2n)', '(2n)!'],
		['factorial(-3)', '(-3)!'],
		['factorial(2^3)', '(2^3)!'],
		['factorial(factorial(3))', '(3!)!'],
		['2^(factorial(3))', '2^{3!}'],
		['factorial(n)^2', 'n!^2'],
		['-factorial(3)', '-3!'],
		['factorial(10)/factorial(7)', '\\frac{10!}{7!}'],
		['binom(10,3)', '\\binom{10}{3}'],
		['binom(n+1,k)', '\\binom{n+1}{k}']
	])('%s se relit en LaTeX à l’identique (%s)', (custom, latex) => {
		const node = parseCustom(custom);
		const rendered = toLatex(node);
		expect(rendered).not.toMatch(/factorial|binom\\left/);
		expect(parseLatex(rendered)).toEqual(parseLatex(latex));
	});

	it('factorial(n+1) est parenthésé', () => {
		expect(toLatex(parseCustom('factorial(n+1)'))).toMatch(/^\\left\( n \+ 1 \\right\)!$/);
	});

	it('binom(10,3) → \\binom{10}{3}', () => {
		expect(toLatex(binom(n('10'), n('3')))).toBe('\\binom{10}{3}');
	});
});

describe('Équivalence — valeur des notations', () => {
	const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

	it.each([
		['6!', '720'],
		['\\binom{10}{3}', '120'],
		['\\frac{10!}{7!}', '720'],
		['\\binom{32}{5}', '201376'],
		['0!', '1'],
		['\\frac{30!}{3!27!}', '4060'],
		['\\binom{4}{2}\\times\\binom{28}{3}', '19656'],
		['\\binom52', '10']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it.each([
		['6!', '721'],
		['\\binom{10}{3}', '720'],
		['5!', '720']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});

	it('n! symbolique reste un nœud opaque, sans erreur', () => {
		expect(eq('n!', 'n!')).toBe(true);
		expect(eq('n!', 'n')).toBe(false);
		expect(eq('(n+1)!', 'n!')).toBe(false);
	});

	it('une factorielle démesurée est fausse sans bloquer', () => {
		const start = Date.now();
		expect(eq('1000000000!', '720')).toBe(false);
		expect(eq('\\binom{1000000000}{500000000}', '720')).toBe(false);
		expect(Date.now() - start).toBeLessThan(2000);
	});
});
