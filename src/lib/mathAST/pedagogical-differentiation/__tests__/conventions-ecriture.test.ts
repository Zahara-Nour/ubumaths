/**
 * Les conventions d'écriture de David, appliquées à la dérivation expliquée.
 *
 * ⚠️ Même règle que pour `pedagogical-solve` (#365) : **pas de point médian
 * pour une multiplication**, c'est `\times`. Les explications de ce module
 * l'employaient neuf fois — « (\sin u)' = \cos(u) \cdot u' » — et elles
 * arrivent désormais sous les yeux de l'élève, dans l'atelier.
 */

import { describe, it, expect } from 'vitest';
import { generatePedagogicalDifferentiationSteps } from '../index';
import { PedagogicalDifferentiationRenderer } from '../renderer';
import { parseCustomSafe } from '../../parser/custom';
import { EXPLANATIONS } from '../descriptions-fr';
import { toLatex } from '../../latex-generator';
import { parseLatex } from '../../parser';

function ast(source: string) {
	const parsed = parseCustomSafe(source);
	if (parsed.ast === null) throw new Error(`parse KO : ${source}`);
	return parsed.ast;
}

function renderedFor(source: string) {
	const result = generatePedagogicalDifferentiationSteps(ast(source), {
		variable: 'x',
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
	return new PedagogicalDifferentiationRenderer().renderAll(result.steps, {
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
}

/** Tout ce qu'une étape et ses sous-étapes donnent à lire. */
function allText(source: string): string {
	const parts: string[] = [];
	const walk = (steps: readonly { title: string; explanation?: string; subSteps?: never }[]) => {
		for (const step of steps) {
			parts.push(step.title, step.explanation ?? '');
			if (step.subSteps) walk(step.subSteps);
		}
	};
	walk(renderedFor(source) as never);
	return parts.join(' ');
}

describe('les multiplications s’écrivent en croix', () => {
	it('la composition avec un sinus', () => {
		const texte = allText('sin(x^2)');

		expect(texte).toContain('\\times');
		expect(texte).not.toContain('\\cdot');
	});

	it('une constante en facteur', () => {
		expect(allText('3*sin(x)')).not.toContain('\\cdot');
	});

	it('une puissance composée', () => {
		expect(allText('(x^2+1)^3')).not.toContain('\\cdot');
	});

	it('une exponentielle composée', () => {
		expect(allText('exp(x^2)')).not.toContain('\\cdot');
	});

	/**
	 * ⚠️ Le garde qui compte : les explications sont écrites une par une dans
	 * `descriptions-fr.ts`, et rien n'empêche d'en ajouter une au point médian.
	 * On les vérifie donc TOUTES, pas seulement celles qu'un exemple traverse.
	 */
	it('aucune explication du module n’emploie le point médian', () => {
		// `EXPLANATIONS` est indexé par niveau, puis par règle.
		const fautives: string[] = [];
		for (const [level, rules] of Object.entries(EXPLANATIONS)) {
			for (const [rule, explain] of Object.entries(rules)) {
				if (typeof explain !== 'function') continue;
				const texte = String(explain({} as never));
				if (texte.includes('\\cdot')) fautives.push(`${level}/${rule}`);
			}
		}

		expect(fautives).toEqual([]);
	});

	it('et il y a bien des explications à vérifier', () => {
		// ⚠️ Sans ce compte, le test ci-dessus passerait sur une table VIDE —
		// vert en ne vérifiant rien.
		const total = Object.values(EXPLANATIONS).reduce(
			(n, rules) => n + Object.keys(rules).length,
			0
		);
		expect(total).toBeGreaterThan(10);
	});
});

/**
 * Deux nombres ne se juxtaposent pas, deux signes ne se suivent pas.
 *
 * ⚠️ **Vu par David** : la dérivée de `3x^3` montrait l'étape `3 3 x^2` — le
 * produit coefficient × (x³)′, construit sans délimiteur ni croix, rendu par
 * une simple espace. `3 × 3x² = 9x²` est une étape de classe ; `3 3x²` ne
 * l'est jamais. De même, la règle du quotient sur `-2/(x-4)` écrivait
 * `--2` : l'opposé d'un opposé s'écrit `-(-2)`.
 */
describe('les étapes : ni nombres juxtaposés, ni deux signes consécutifs', () => {
	function stepsOf(source: string) {
		return generatePedagogicalDifferentiationSteps(ast(source), {
			variable: 'x',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		}).steps;
	}

	it('3x^3 : le coefficient fois (x³)′ s’écrit avec la croix', () => {
		const [step] = stepsOf('3x^3');
		expect(step.rule).toBe('linear-coefficient');
		expect(toLatex(step.after)).toBe('3 \\times 3 x^2');
	});

	it('5x^4 : idem avec un autre coefficient (et le rendu du renderer)', () => {
		const [step] = stepsOf('5x^4');
		expect(toLatex(step.after)).toBe('5 \\times 4 x^3');
		const [rendered] = renderedFor('5x^4');
		expect(JSON.stringify(rendered)).not.toMatch(/(?<![\d.\\a-zA-Z^_{])5 4/);
	});

	it('(3x^2-1)(2x+5) : le produit écrit u′v avec u′ = 3 × 2x', () => {
		const [step] = stepsOf('(3x^2-1)(2x+5)');
		expect(toLatex(step.after)).toBe(
			'3 \\times 2 x \\left( 2 x + 5 \\right) + \\left( 3 x^2 - 1 \\right) 2'
		);
	});

	it('\\frac{-2}{x-4} : la règle du quotient écrit -(-2), pas --2', () => {
		// Écrit en LaTeX, le signe est DANS le numérateur (la syntaxe texte
		// `-2/(x-4)` le met devant la fraction)
		const result = generatePedagogicalDifferentiationSteps(parseLatex('\\frac{-2}{x-4}'), {
			variable: 'x',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		const [step] = result.steps;
		expect(toLatex(step.after)).toBe('\\dfrac{-\\left( -2 \\right)}{\\left( x - 4 \\right)^2}');
	});

	it('1/cos(x) : -(-sin x), pas --sin x', () => {
		const [step] = stepsOf('1/cos(x)');
		expect(toLatex(step.after)).toBe(
			'\\dfrac{-\\left( -\\sin\\left( x \\right) \\right)}{\\cos\\left( x \\right)^2}'
		);
	});
});
