/**
 * Collège : une opération par étape, et les pièges des nombres négatifs
 *
 * Décisions de David (2026-10-14) :
 * - au collège, aucun sous-calcul n'est avalé sous « On calcule » quand une
 *   règle existe : carré ou cube d'un négatif (`(-3)^2 = (-3)×(-3) = 9`),
 *   opposé d'un opposé, soustraction d'un négatif, somme d'un entier et d'une
 *   fraction (dénominateur commun) ;
 * - le produit s'écrit `\times`, jamais `*` ;
 * - `\sqrt{9} = 3` porte un titre juste (pas « on extrait le facteur carré
 *   parfait ») ;
 * - un dénominateur nul est refusé par une erreur explicite ;
 * - le lycée garde son niveau de détail.
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '../../parser';
import { parseCustom } from '../../parser/custom';
import type { SchoolLevel } from '../../common/step-renderer-base';
import type { Verbosity } from '../../common/verbosity';
import { toLatex } from '../../latex-generator';
import {
	generatePedagogicalArithmeticSteps,
	PedagogicalArithmeticDivisionByZero
} from '../pipeline';
import { PedagogicalArithmeticRenderer } from '../renderer';

// =============================================================================
// Helpers
// =============================================================================

interface Run {
	readonly rules: readonly string[];
	readonly titles: readonly string[];
	readonly latex: readonly string[];
	readonly explanations: readonly (string | undefined)[];
	readonly final: string;
}

function run(
	input: string,
	schoolLevel: SchoolLevel = 'college',
	verbosity: Verbosity = 'detailed',
	syntax: 'latex' | 'custom' = 'latex'
): Run {
	const node = syntax === 'latex' ? parseLatex(input) : parseCustom(input);
	const result = generatePedagogicalArithmeticSteps(node, { schoolLevel, verbosity });
	const rendered = new PedagogicalArithmeticRenderer().renderAll(result.steps, {
		schoolLevel,
		verbosity
	});
	return {
		rules: rendered.map((s) => s.rule),
		titles: rendered.map((s) => s.title),
		latex: rendered.map((s) => s.expressionLatex ?? ''),
		explanations: rendered.map((s) => s.explanation),
		final: toLatex(result.finalNode)
	};
}

/** Les deux lignes d'une étape (`avant`, `après`), sans couleur ni espaces. */
function lines(expressionLatex: string): readonly [string, string] {
	const flat = expressionLatex
		.replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
		.replace(/\\textcolor\{blue\}\{/g, '{')
		.replace(/[{}\s&]/g, '')
		.replace(/\\left|\\right/g, '');
	const [before, after] = flat.split('\\\\');
	return [before, after.replace(/^=/, '')];
}

const VERBOSITIES: readonly Verbosity[] = ['detailed', 'summarized'];

// =============================================================================
// Produit : `\times`, jamais `*`
// =============================================================================

describe('le produit s’écrit \\times', () => {
	for (const level of ['college', 'lycee'] as const) {
		it(`3*(-2)-5 tapé en LaTeX (${level}) : aucun « * » dans les étapes`, () => {
			const r = run('3*(-2)-5', level);
			expect(r.final).toBe('-11');
			for (const l of r.latex) expect(l).not.toContain('*');
			expect(r.latex.join(' ')).toContain('\\times');
		});
	}
});

// =============================================================================
// Aucune étape fantôme
// =============================================================================

describe('aucune étape fantôme (la ligne d’après égale celle d’avant)', () => {
	const cases = ['3*(-2)-5', '(-3)^2', '2(-1)^2-3(-1)+1', '5-(-3)', '-(-3)', '(-1)^2-2(-1)'];
	for (const input of cases) {
		for (const level of ['college', 'lycee'] as const) {
			it(`${input} (${level})`, () => {
				const r = run(input, level);
				for (const l of r.latex) {
					const [before, after] = lines(l);
					expect(after).not.toBe(before);
				}
			});
		}
	}
});

// =============================================================================
// Puissances d'un négatif
// =============================================================================

describe('puissance d’un nombre négatif (collège)', () => {
	for (const verbosity of VERBOSITIES) {
		it(`(-3)^2 = (-3)×(-3) = 9 (${verbosity})`, () => {
			const r = run('(-3)^2', 'college', verbosity);
			expect(r.rules).toEqual(['expand-small-power', 'evaluate-binary-mul']);
			expect(lines(r.latex[0])[1]).toBe('(-3)\\times(-3)');
			expect(r.final).toBe('9');
		});

		it(`(-2)^3 = (-2)×(-2)×(-2) = -8 (${verbosity})`, () => {
			const r = run('(-2)^3', 'college', verbosity);
			expect(r.rules[0]).toBe('expand-small-power');
			expect(lines(r.latex[0])[1]).toBe('(-2)\\times(-2)\\times(-2)');
			expect(r.rules).not.toContain('evaluate-final');
			expect(r.final).toBe('-8');
		});
	}

	it('3^2 reste développé en 3×3 (non-régression)', () => {
		const r = run('3^2');
		expect(r.rules).toEqual(['expand-small-power', 'evaluate-binary-mul']);
		expect(lines(r.latex[0])[1]).toBe('3\\times3');
		expect(r.final).toBe('9');
	});

	it('-3^2 vaut -9 : seul 3 est élevé au carré (non-régression)', () => {
		const r = run('-3^2');
		expect(r.rules).toEqual(['expand-small-power', 'evaluate-binary-mul']);
		expect(r.final).toBe('-9');
	});
});

// =============================================================================
// Expressions substituées (l'atelier, les corrections de questions)
// =============================================================================

describe('expression avec des valeurs négatives substituées (collège)', () => {
	for (const verbosity of VERBOSITIES) {
		it(`2(-1)^2-3(-1)+1 = 6, une opération par étape (${verbosity})`, () => {
			const r = run('2(-1)^2-3(-1)+1', 'college', verbosity);
			expect(r.final).toBe('6');
			expect(r.rules).not.toContain('evaluate-final');
			// La puissance passe avant toute multiplication
			expect(r.rules[0]).toBe('expand-small-power');
			// Le moins-moins a son étape
			expect(r.rules).toContain('subtract-negative');
			// Jamais deux nombres juxtaposés (`2 1`) : le produit s'écrit
			for (const l of r.latex) expect(l).not.toMatch(/\d\s+\d/);
		});

		it(`(-1)^2-2(-1) = 3, une opération par étape (${verbosity})`, () => {
			const r = run('(-1)^2-2(-1)', 'college', verbosity);
			expect(r.final).toBe('3');
			expect(r.rules).not.toContain('evaluate-final');
			expect(r.rules[0]).toBe('expand-small-power');
			expect(r.rules).toContain('subtract-negative');
		});
	}

	it('5-(-3) = 5+3 = 8', () => {
		const r = run('5-(-3)');
		expect(r.rules).toEqual(['subtract-negative', 'evaluate-binary-add']);
		expect(lines(r.latex[0])[1]).toBe('5+3');
		expect(r.final).toBe('8');
	});

	it('-(-3) = 3 a son étape propre', () => {
		const r = run('-(-3)');
		expect(r.rules).toEqual(['opposite-of-opposite']);
		expect(r.final).toBe('3');
	});

	it('2+3×4 : la multiplication d’abord (non-régression)', () => {
		const r = run('2+3\\times4');
		expect(r.rules).toEqual(['evaluate-binary-mul', 'evaluate-binary-add']);
		expect(r.final).toBe('14');
	});
});

// =============================================================================
// Fractions
// =============================================================================

describe('fractions (collège)', () => {
	for (const verbosity of VERBOSITIES) {
		it(`\\frac12×2+\\frac34 : seul le produit est coloré, puis dénominateur commun (${verbosity})`, () => {
			const r = run('\\frac12\\times2+\\frac34', 'college', verbosity);
			expect(r.final).toBe('\\dfrac{7}{4}');
			expect(r.rules).not.toContain('evaluate-final');
			// \frac34 n'est pas calculée : jamais colorée seule
			for (const l of r.latex) expect(l).not.toContain('\\textcolor{blue}{\\dfrac{3}{4}}');
			expect(r.latex.some((l) => lines(l)[1] === '\\dfrac44+\\dfrac34')).toBe(true);
		});
	}

	it('1+\\frac34 = \\frac44+\\frac34 = \\frac74', () => {
		const r = run('1+\\frac34');
		expect(r.rules).toEqual(['integer-to-fraction', 'add-same-denominator']);
		expect(lines(r.latex[0])[1]).toBe('\\dfrac44+\\dfrac34');
		expect(r.final).toBe('\\dfrac{7}{4}');
	});

	it('\\frac{4}{3-1} = \\frac42 = 2 (non-régression)', () => {
		const r = run('\\frac{4}{3-1}');
		expect(r.rules).toEqual(['evaluate-binary-sub', 'evaluate-binary-div']);
		expect(r.final).toBe('2');
	});

	it('\\frac13+\\frac16 garde sa mise au même dénominateur (non-régression)', () => {
		const r = run('\\frac{1}{3}+\\frac{1}{6}');
		expect(r.rules).toEqual(['to-common-denominator', 'add-same-denominator', 'reduce-fraction']);
	});
});

// =============================================================================
// Racine d'un carré parfait
// =============================================================================

describe('racine carrée d’un carré parfait', () => {
	for (const verbosity of VERBOSITIES) {
		it(`\\sqrt{9} = 3 : titre juste (${verbosity})`, () => {
			const r = run('\\sqrt{9}', 'college', verbosity);
			expect(r.final).toBe('3');
			expect(r.titles).toHaveLength(1);
			expect(r.titles[0]).not.toMatch(/facteur carré parfait/);
			expect(r.titles[0]).toContain('$9 = 3^2$');
			for (const e of r.explanations) expect(e ?? '').not.toMatch(/décompose/);
		});
	}

	it('\\sqrt{12} garde « on extrait le facteur carré parfait » (non-régression)', () => {
		const r = run('\\sqrt{12}');
		expect(r.titles[0]).toMatch(/facteur carré parfait/);
	});
});

// =============================================================================
// Dénominateur nul
// =============================================================================

describe('dénominateur nul : erreur explicite', () => {
	for (const level of ['college', 'lycee'] as const) {
		it(`\\frac{2}{0} (${level})`, () => {
			expect(() => run('\\frac{2}{0}', level)).toThrow(PedagogicalArithmeticDivisionByZero);
		});

		it(`\\frac{4}{2-2} (${level}) : le dénominateur vaut 0 après calcul`, () => {
			expect(() => run('\\frac{4}{2-2}', level)).toThrow(PedagogicalArithmeticDivisionByZero);
		});

		it(`1+5/(3-3) en syntaxe maison (${level})`, () => {
			expect(() => run('1+5/(3-3)', level, 'detailed', 'custom')).toThrow(
				PedagogicalArithmeticDivisionByZero
			);
		});
	}

	it('le message dit en français ce qui ne va pas', () => {
		expect(() => run('\\frac{2}{0}')).toThrow(/dénominateur/);
	});
});

// =============================================================================
// Lycée : niveau de détail inchangé
// =============================================================================

describe('lycée : niveau de détail inchangé', () => {
	it('(-3)^2 reste calculé d’un bloc', () => {
		expect(run('(-3)^2', 'lycee').rules).toEqual(['evaluate-final']);
	});

	it('5-(-3) reste une seule différence', () => {
		expect(run('5-(-3)', 'lycee').rules).toEqual(['evaluate-binary-sub']);
	});
});

// =============================================================================
// Revue du 2026-10-14 : division, soustraction de fractions, priorités
// =============================================================================

describe('division : un diviseur négatif ou une somme garde ses parenthèses', () => {
	it('12 ÷ (−3) ne s’écrit pas « 12 : -3 »', () => {
		const r = run('12\\div(-3)');
		expect(r.final).toBe('-4');
		expect(lines(r.latex[0])[0]).toBe('12:(-3)');
	});

	it('(−6) ÷ (−2) × 3 : chaque négatif entre parenthèses', () => {
		const r = run('(-6)\\div(-2)\\times3');
		expect(r.final).toBe('9');
		expect(lines(r.latex[0])[0]).toBe('(-6):(-2)\\times3');
	});

	it('12 ÷ (5 − 8) garde la parenthèse de la somme', () => {
		const r = run('12\\div(5-8)');
		expect(r.final).toBe('-4');
		for (const l of r.latex) expect(lines(l)[0]).not.toMatch(/:5-8/);
	});
});

describe('soustraction d’une fraction (collège)', () => {
	for (const verbosity of VERBOSITIES) {
		it(`1 − \\frac34 = \\frac44 − \\frac34 = \\frac14 (${verbosity})`, () => {
			const r = run('1-\\frac34', 'college', verbosity);
			expect(r.rules).toEqual(['integer-to-fraction', 'subtract-same-denominator']);
			expect(lines(r.latex[0])[1]).toBe('\\dfrac44-\\dfrac34');
			expect(r.final).toBe('\\dfrac{1}{4}');
		});
	}

	it('\\frac34 − 2 = \\frac34 − \\frac84 = −\\frac54', () => {
		const r = run('\\frac34-2');
		expect(r.rules).toEqual(['integer-to-fraction', 'subtract-same-denominator']);
		expect(r.final).toBe('-\\dfrac{5}{4}');
	});

	it('\\frac57 − \\frac27 = \\frac37', () => {
		const r = run('\\frac57-\\frac27');
		expect(r.rules).toEqual(['subtract-same-denominator']);
		expect(r.final).toBe('\\dfrac{3}{7}');
	});
});

describe('priorités', () => {
	it('2×3^2 : la puissance avant le produit', () => {
		const r = run('2\\times3^2');
		expect(r.rules).toEqual(['expand-small-power', 'evaluate-binary-mul', 'evaluate-binary-mul']);
		expect(lines(r.latex[0])[1]).toBe('2\\times3\\times3');
		expect(r.final).toBe('18');
	});
});

describe('signes', () => {
	it('−(−(−2)) : une étape « opposé de l’opposé »', () => {
		const r = run('-(-(-2))');
		expect(r.rules).toEqual(['opposite-of-opposite']);
		expect(r.final).toBe('-2');
	});

	it('primaire : les nombres du titre sont entre $…$', () => {
		const r = run('(-3)\\times(-3)', 'primaire');
		expect(r.titles[0]).toBe('On multiplie $-3$ par $-3$');
	});
});
