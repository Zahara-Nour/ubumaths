/**
 * Une fonction de l'atelier à paramètre (V56, 2026-10-14).
 *
 * `f(x) = a x`, `a` non posé : f est « en attente » de a. Avant ce lot, une
 * commande ne remplaçait pas f par son expression, et le moteur recevait le
 * SYMBOLE f, traité comme une constante : `.dériver f` répondait 0,
 * `.intégrer f` ½f² + C, `.limite f en +∞` « = f ».
 *
 * Comportement voulu :
 * - la fonction se comporte comme son expression, le paramètre reste une
 *   lettre : `.dériver f` → a, `.intégrer f` → ½ax² + C, `f(2)` → 2a ;
 * - là où le paramètre empêche de conclure (`.résoudre`, `.variations`,
 *   `.limite`, `.domaine`, `.réciproque`), un refus clair qui nomme le
 *   paramètre — jamais une réponse fausse ;
 * - rien ne change pour une fonction sans paramètre, ni pour `.évaluer` (E6).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

// =============================================================================
// Décor
// =============================================================================

function session(setup: readonly string[]): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of setup) runInput(s, line);
	return s;
}

function run(input: string, setup: readonly string[]): CalcResult {
	return runInput(session(setup), input);
}

/** Le LaTeX rendu, sans espaces : ce que voit l'élève. */
function latex(input: string, setup: readonly string[]): string {
	const result = run(input, setup);
	if (result.kind !== 'commande' && result.kind !== 'calcul') {
		throw new Error(`attendu une réponse, reçu ${JSON.stringify(result)}`);
	}
	return (result.latex ?? '').replace(/\s/g, '');
}

function refusal(input: string, setup: readonly string[]): string {
	const result = run(input, setup);
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${JSON.stringify(result)}`);
	return result.message;
}

const F = ['f(x) = a x'];
const G = ['g(x) = x^2 + k'];
const H = ['h(x) = e^{a x}'];

const DEPENDS_ON = (letters: string, pronoun = 'lui') =>
	`Le résultat dépend de ${letters} : donne-${pronoun} une valeur (${letters.split(' ')[0]} = 2) pour l'étudier.`;

// =============================================================================
// La fonction se comporte comme son expression
// =============================================================================

describe('f(x) = a x : les commandes qui concluent', () => {
	it('.dériver f → a (et non 0)', () => {
		expect(latex('.dériver f', F)).toBe('a');
	});

	it('.dériver f : même forme que sans paramètre', () => {
		const withParameter = run('.dériver f', F);
		const without = run('.dériver f', ['f(x) = 2 x']);
		expect(withParameter.kind).toBe(without.kind);
		expect(withParameter.kind === 'commande' && withParameter.output).toBe('d/dx((ax)) = a');
	});

	it('.intégrer f → ½ a x² + C', () => {
		expect(latex('.intégrer f', F)).toBe('\\dfrac{1}{2}ax^2+C');
	});

	it('.intégrer f de 0 à 1 → a/2', () => {
		expect(latex('.intégrer f de 0 à 1', F)).toBe('\\dfrac{a}{2}');
	});

	it('.simplifier f lit l’expression, pas la lettre f', () => {
		const result = run('.simplifier f', F);
		expect(result.kind === 'commande' && result.output).toContain('ax');
		expect(result.kind === 'commande' && result.output).not.toContain('V(f)');
	});

	it('.factoriser f lit l’expression', () => {
		const result = run('.factoriser f', F);
		expect(result.kind === 'commande' && result.output).toContain('« ax »');
	});

	it('.taylor f 2 → a x', () => {
		expect(latex('.taylor f 2', F)).toBe('ax');
	});

	it("f'(x) → a, inchangé", () => {
		expect(latex("f'(x)", F)).toBe('a');
	});
});

describe('f(x) = a x : dans un calcul', () => {
	it('f seul → a x, comme une fonction prête', () => {
		expect(latex('f', F)).toBe('ax');
	});

	it('f(2x) : une seule substitution (et non a·2¹⁰x)', () => {
		expect(latex('.dériver f(2x)', F)).toBe('2a');
	});

	it('f(2) → 2a, et non « Fonction inconnue »', () => {
		expect(latex('f(2)', F)).toBe('2a');
	});

	it('f(2) + 1 → 2a + 1', () => {
		expect(latex('f(2)+1', F)).toBe('2a+1');
	});
});

describe('g(x) = x^2 + k', () => {
	it('.dériver g → 2x (et non 0)', () => {
		expect(latex('.dériver g', G)).toBe('2x');
	});

	it('.intégrer g → ⅓x³ + kx + C', () => {
		expect(latex('.intégrer g', G)).toBe('\\dfrac{1}{3}x^3+kx+C');
	});

	it('.intégrer g de 0 à 1 → k + ⅓', () => {
		expect(latex('.intégrer g de 0 à 1', G)).toBe('k+\\dfrac{1}{3}');
	});

	it('g(2) → 4 + k', () => {
		expect(latex('g(2)', G)).toBe('k+4');
	});
});

describe('h(x) = e^{a x}', () => {
	it('.dériver h → a e^{ax} (et non 0)', () => {
		expect(latex('.dériver h', H)).toBe('a\\exponentialE^{ax}');
	});

	it('.intégrer h → e^{ax}/a + C', () => {
		expect(latex('.intégrer h', H)).toBe('\\dfrac{\\exponentialE^{ax}}{a}+C');
	});

	it('.intégrer h de 0 à 1 : réduit, sans `a * 0`', () => {
		expect(latex('.intégrer h de 0 à 1', H)).not.toContain('*');
	});

	it('h(2) → e^{2a}', () => {
		expect(latex('h(2)', H)).toBe('\\exponentialE^{2a}');
	});
});

describe('une fonction qui cite une fonction à paramètre', () => {
	const chain = ['f(x) = a x', 'g(x) = f(x)+1'];

	it(".dériver g → a (et non f'(x))", () => {
		expect(latex('.dériver g', chain)).toBe('a');
	});

	it('g(2) → 2a + 1', () => {
		expect(latex('g(2)', chain)).toBe('2a+1');
	});
});

// =============================================================================
// Le paramètre empêche de conclure : refus clair
// =============================================================================

describe('le résultat dépend du paramètre : refus qui le nomme', () => {
	it.each([
		['.résoudre f(x)=0', F],
		['.variations f', F],
		['.limite f en +inf', F],
		['.domaine f', F],
		['.réciproque f', F],
		['.limite h en +inf', H],
		['.variations h', H],
		['.résoudre h(x)=0', H]
	])('%s', (input, setup) => {
		expect(refusal(input, setup)).toBe(DEPENDS_ON('a'));
	});

	it('.résoudre g(x)=0 nomme k', () => {
		expect(refusal('.résoudre g(x)=0', G)).toBe(DEPENDS_ON('k'));
	});

	it("la dérivée citée aussi : .résoudre f'(x)=0", () => {
		expect(refusal(".résoudre f'(x)=0", F)).toBe(DEPENDS_ON('a'));
	});

	it('deux paramètres : nommés tous les deux', () => {
		expect(refusal('.variations p', ['p(x) = a x + b'])).toBe(DEPENDS_ON('a et b', 'leur'));
	});
});

// =============================================================================
// Aucune régression
// =============================================================================

describe('sans paramètre : inchangé', () => {
	it.each([
		['.dériver f', ['f(x) = 2 x'], '2'],
		['.intégrer f', ['f(x) = 2 x'], 'x^2+C'],
		['.résoudre f(x)=0', ['f(x) = 2 x'], 'x=0'],
		['f(2)', ['f(x) = 2 x'], '4'],
		['.résoudre g(x)=0', ['g(x) = x^2 + 3'], 'S=\\emptyset']
	])('%s', (input, setup, expected) => {
		expect(latex(input, setup)).toBe(expected);
	});

	it('le paramètre posé : f(x) = a x, a = 2 → .dériver f = 2', () => {
		expect(latex('.dériver f', ['f(x) = a x', 'a = 2'])).toBe('2');
	});

	it('le paramètre posé : .résoudre f(x)=0 répond', () => {
		expect(latex('.résoudre f(x)=0', ['f(x) = a x', 'a = 2'])).toBe('x=0');
	});
});

describe('.évaluer (E6) : inchangé', () => {
	it('.évaluer f en x=1 ; a=2 → 2', () => {
		expect(latex('.évaluer f en x=1 ; a=2', F)).toBe('2');
	});

	it('sans la valeur de a : « Il manque la valeur de a »', () => {
		expect(refusal('.évaluer f en x=1', F)).toContain('Il manque la valeur de a');
	});
});
