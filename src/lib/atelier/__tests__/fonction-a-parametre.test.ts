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

	it('.équivalent f et x a → vrai ; f et 2x → faux', () => {
		const same = run('.équivalent f et x a', F);
		const other = run('.équivalent f et 2x', F);
		expect(same.kind === 'commande' && same.output).toMatch(/^Equivalent: true/);
		expect(other.kind === 'commande' && other.output).toMatch(/^Equivalent: false/);
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

	// Q3 (David, 2026-10-14) : la primitive DIVISE par a → condition affichée
	it('.intégrer h → e^{ax}/a + C (a ≠ 0)', () => {
		expect(latex('.intégrer h', H)).toBe('\\dfrac{\\exponentialE^{ax}}{a}+C\\quad(a\\neq0)');
	});

	it('.intégrer h de 0 à 1 → (e^a − 1)/a (a ≠ 0), réduit (sans `a * 0`)', () => {
		expect(latex('.intégrer h de 0 à 1', H)).toBe('\\dfrac{\\exponentialE^a-1}{a}\\quad(a\\neq0)');
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

describe('revue de 8b86c675e', () => {
	it.each(['f(2)=4', 'f(2)<4', 'f(2)>4', 'f(2)\\leq 4', 'f(2)\\geq 4', 'f(2)\\neq 4'])(
		'%s : une comparaison qui dépend de a est refusée (et non « false »)',
		(input) => {
			expect(refusal(input, F)).toBe(DEPENDS_ON('a'));
		}
	);

	it('sans paramètre, f(2)=4 reste vrai', () => {
		const result = run('f(2)=4', ['f(x) = 2x']);
		expect(result.kind === 'calcul' && result.output).toBe('true');
	});

	it.each([
		['f(x) = a/x', 'f(0)'],
		['f(x) = a/(x-1)', 'f(1)'],
		['f(x) = a/(x-1)', 'f(1)+2']
	])('%s, %s : « Division par zéro », comme sans paramètre', (definition, input) => {
		const expected = run(input, [definition.replace('a', '2')]);
		expect(expected).toEqual({
			kind: 'calcul',
			input,
			output: 'Erreur de calcul : Division par zéro'
		});
		expect(run(input, [definition])).toEqual(expected);
	});

	it('f(x) = a/(x-1), f(2) → a', () => {
		expect(latex('f(2)', ['f(x) = a/(x-1)'])).toBe('a');
	});

	it('.dériver f(f(x)) → a² (appels imbriqués)', () => {
		expect(latex('.dériver f(f(x))', F)).toBe('a^2');
	});

	it('f(f(2)) → 2a²', () => {
		expect(latex('f(f(2))', F)).toBe('2a^2');
	});

	it('g prête : g(f(2)) → 4a²', () => {
		expect(latex('g(f(2))', ['f(x) = a x', 'g(x) = x^2'])).toBe('4a^2');
	});

	it('g prête : f(g(x)) → a x²', () => {
		expect(latex('f(g(x))', ['f(x) = a x', 'g(x) = x^2'])).toBe('ax^2');
	});

	it("f(x) = a x^2 : f'(2) → 4a", () => {
		expect(latex("f'(2)", ['f(x) = a x^2'])).toBe('4a');
	});

	it("f(x) = a x^2 : f'(2)+1 → 4a+1", () => {
		expect(latex("f'(2)+1", ['f(x) = a x^2'])).toBe('4a+1');
	});
});

describe('f(g(x)) avec g prête, dans les deux ordres de définition', () => {
	const orders = [
		['g avant f', ['g(x) = x^2', 'f(x) = a x']],
		['g après f', ['f(x) = a x', 'g(x) = x^2']]
	] as const;

	it.each(orders)('%s : .évaluer f(g(x)) en x=1 ; a=2 → 2', (_, setup) => {
		expect(latex('.évaluer f(g(x)) en x=1 ; a=2', setup)).toBe('2');
	});

	it.each(orders)('%s : .dériver f(g(x)) → 2ax', (_, setup) => {
		expect(latex('.dériver f(g(x))', setup)).toBe('2ax');
	});

	it.each(orders)('%s : .intégrer f(g(x)) → ⅓ax³ + C', (_, setup) => {
		expect(latex('.intégrer f(g(x))', setup)).toBe('\\dfrac{1}{3}ax^3+C');
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

// =============================================================================
// Q3 — une primitive qui DIVISE par le paramètre affiche sa condition
// =============================================================================

describe('Q3 : la condition « a ≠ 0 » d’une primitive qui divise par a', () => {
	it.each([
		['.intégrer e^{a x}', '\\dfrac{\\exponentialE^{ax}}{a}+C\\quad(a\\neq0)'],
		['.intégrer e^{a x} de 0 à 1', '\\dfrac{\\exponentialE^a-1}{a}\\quad(a\\neq0)'],
		['.intégrer e^{2a x}', '\\dfrac{\\exponentialE^{2ax}}{2a}+C\\quad(a\\neq0)'],
		['.intégrer e^{(a-1)x}', '\\dfrac{\\exponentialE^{ax-x}}{a-1}+C\\quad(a\\neq1)'],
		['.intégrer x^a', '\\dfrac{x^{a+1}}{a+1}+C\\quad(a\\neq-1)'],
		['.intégrer \\cos(a x)', '\\dfrac{\\sin\\left(ax\\right)}{a}+C\\quad(a\\neq0)']
	])('%s', (input, expected) => {
		expect(latex(input, [])).toBe(expected);
	});

	it('.intégrer x^{a-1} → x^a / a, exposant réduit', () => {
		expect(latex('.intégrer x^{a-1}', [])).toBe('\\dfrac{x^a}{a}+C\\quad(a\\neq0)');
	});

	it('le texte de la ligne porte aussi la condition', () => {
		const result = run('.intégrer h', H);
		expect(result.kind === 'commande' && result.output).toContain('(a ≠ 0)');
	});

	it.each([
		// le dénominateur ne contient pas de paramètre
		['.intégrer f', F, '\\dfrac{1}{2}ax^2+C'],
		['.intégrer e^{2x}', [], '\\dfrac{1}{2}\\exponentialE^{2x}+C'],
		// la division par a vient de l'expression de DÉPART : pas de note
		['.intégrer 1/(a x)', [], '\\dfrac{\\ln\\left|x\\right|}{a}+C'],
		// le paramètre posé : plus de paramètre
		['.intégrer e^{a x}', ['a = 2'], '\\dfrac{1}{2}\\exponentialE^{2x}+C'],
		// toujours vraie : a² + 1 ≠ 0 ne se dit pas
		['.intégrer e^{(a^2+1)x}', [], '\\dfrac{\\exponentialE^{a^2x+x}}{a^2+1}+C']
	])('pas de condition : %s', (input, setup, expected) => {
		expect(latex(input, setup)).toBe(expected);
	});

	it('.dériver 1/(a x) : la condition vient du départ, pas de note', () => {
		expect(latex('.dériver 1/(a x)', [])).not.toContain('neq');
	});
});

// =============================================================================
// Q5 — V57 : `.résoudre` tapé avec une lettre non posée
// =============================================================================

describe('Q5 (V57) : une résolution qui divise par le paramètre refuse', () => {
	it.each([
		['a x = 0', 'a'],
		['a x = 3', 'a'],
		['a x + b = 0', 'a'],
		['a(x-1) = 0', 'a'],
		['x/a = 1', 'a'],
		['a x^2 = 1', 'a'],
		['e^{a x} = 1', 'a'],
		['1/x = a', 'a'],
		// équations rationnelles : la solution peut tomber sur la valeur interdite
		['x/(x-a)=0', 'a'],
		['a/x = 1', 'a'],
		['\\dfrac{a}{x} = 2', 'a'],
		['(x-a)/(x-1)=0', 'a'],
		// le sens de l'inégalité dépend du signe de a
		['a x > 1', 'a']
	])('.résoudre %s → « dépend de %s »', (equation, letter) => {
		const result = run(`.résoudre ${equation}`, []);
		expect(result.kind).toBe('refus');
		if (result.kind !== 'refus') return;
		expect(result.message).toBe(DEPENDS_ON(letter));
		// pas de « Comment ? » sur un refus
		expect(result.steps).toBeUndefined();
	});

	it.each([
		['x + a = 0', 'x=-a'],
		['2x = a', 'x=\\dfrac{a}{2}'],
		['(x-a)(x-1) = 0', 'S=\\left\\{a\\,;\\,1\\right\\}'],
		['\\ln(x) = a', 'x=\\exponentialE^a'],
		// la solution a + 1 n'est jamais la valeur interdite a
		['1/(x-a)=1', 'x=a+1'],
		// pas de division : le moteur écrit lui-même la condition sur a
		['x^2 = a', 'S=\\left\\{\\sqrt{a}\\,;\\,-\\sqrt{a}\\right\\}\\quad\\text{si}a\\geqslant0']
	])('juste pour tout a, gardé : .résoudre %s', (equation, expected) => {
		expect(latex(`.résoudre ${equation}`, [])).toBe(expected);
	});

	it('x + a > 0 : le refus du moteur, inchangé', () => {
		expect(refusal('.résoudre x + a > 0', [])).toBe(
			'Je ne sais pas encore résoudre cette inéquation.'
		);
	});

	it('le paramètre posé : .résoudre a x = 4, a = 2 → x = 2', () => {
		expect(latex('.résoudre a x = 4', ['a = 2'])).toBe('x=2');
	});
});

// =============================================================================
// Bornes à paramètre (revue de 0d3d9beea)
// =============================================================================

describe('.intégrer : une borne ou un exposant à paramètre', () => {
	it.each([
		// ln|a| : faux si 0 est entre 1 et a
		['.intégrer 1/x de 1 à a'],
		['.intégrer 1/x^2 de 1 à a'],
		['.intégrer 1/x de a à 2'],
		// diverge pour a ⩽ −1
		['.intégrer x^a de 0 à 1'],
		// un pôle qui dépend de a, bornes en nombres
		['.intégrer 1/(x-a) de 0 à 1'],
		['.intégrer 1/(x^2-a) de 0 à 1']
	])('%s → « dépend de a »', (input) => {
		expect(refusal(input, [])).toBe(DEPENDS_ON('a'));
	});

	it.each([
		['.intégrer x^2 de 0 à a', '\\dfrac{1}{3}a^3'],
		['.intégrer e^x de 0 à a', '\\exponentialE^a-1']
	])('sans pôle, gardé : %s', (input, expected) => {
		expect(latex(input, [])).toBe(expected);
	});
});

describe('.intégrer 1/(x^2+a^2+1) de 0 à 1 : aucun pôle réel', () => {
	it('pas de refus « dépend de a »', () => {
		const result = run('.intégrer 1/(x^2+a^2+1) de 0 à 1', []);
		expect(result.kind === 'refus' && result.message).not.toBe(DEPENDS_ON('a'));
	});
});

// =============================================================================
// V61 (2026-10-14) : intégrales à paramètre, refus inutiles et message anglais
// =============================================================================

describe('V61 : .intégrer à paramètre, sans pôle sur le segment', () => {
	it('1/(x^2+a^2) de 1 à 2 : x² + a² ⩾ 1 sur [1 ; 2], la valeur (a ≠ 0)', () => {
		expect(latex('.intégrer 1/(x^2+a^2) de 1 à 2', [])).toBe(
			'\\dfrac{\\arctan\\left(\\dfrac{2}{a}\\right)-\\arctan\\left(\\dfrac{1}{a}\\right)}{a}\\quad(a\\neq0)'
		);
	});

	it('1/(x^2+a^2) : la primitive, (a ≠ 0)', () => {
		expect(latex('.intégrer 1/(x^2+a^2)', [])).toBe(
			'\\dfrac{\\arctan\\left(\\dfrac{x}{a}\\right)}{a}+C\\quad(a\\neq0)'
		);
	});

	it('1/(a x) de 1 à 2 : (ln 2)/a (a ≠ 0)', () => {
		expect(latex('.intégrer 1/(a x) de 1 à 2', [])).toBe(
			'\\dfrac{\\ln\\left(2\\right)}{a}\\quad(a\\neq0)'
		);
	});

	it('3/(a x) de 1 à 2 : 3 ln 2 / a (a ≠ 0)', () => {
		expect(latex('.intégrer 3/(a x) de 1 à 2', [])).toBe(
			'\\dfrac{3\\ln\\left(2\\right)}{a}\\quad(a\\neq0)'
		);
	});

	it.each([
		// 0 est dans le segment : x² + a² s'annule pour a = 0
		['.intégrer 1/(x^2+a^2) de -1 à 1'],
		// le pôle x = 0 est dans le segment, quel que soit a
		['.intégrer 1/(a x) de -1 à 1'],
		// x² − a s'annule dans [0 ; 1] pour a dans [0 ; 1]
		['.intégrer 1/(x^2-a) de 0 à 1'],
		// a² − x² aussi
		['.intégrer 1/(a^2-x^2) de 0 à 1']
	])('%s : toujours refusé', (input) => {
		expect(run(input, []).kind).toBe('refus');
	});
});

describe('V61 : .intégrer 1/(x^2+a^2+1) de 0 à 1, refus en français', () => {
	it('le message ne parle pas anglais', () => {
		const result = run('.intégrer 1/(x^2+a^2+1) de 0 à 1', []);
		expect(result.kind).toBe('refus');
		if (result.kind !== 'refus') return;
		expect(result.message).toBe(
			'Je ne sais pas factoriser le dénominateur : je ne peux pas calculer cette intégrale'
		);
		// pas d'étapes d'un refus « non définie » : rien n'est indéfini ici
		expect(result.steps).toBeUndefined();
	});

	it('la primitive non trouvée : la ligne ne cite pas « partial-fractions »', () => {
		const result = run('.intégrer 1/(x^2+a^2+1)', []);
		const shown =
			result.kind === 'refus' ? result.message : result.kind === 'commande' ? result.output : '';
		expect(shown).not.toMatch(/partial|fractions|Integration|supported/);
	});
});

describe('V61 : .intégrer x^a de 1 à 2, 1^{a+1} réduit', () => {
	it('(2^{a+1} − 1)/(a + 1) (a ≠ −1)', () => {
		expect(latex('.intégrer x^a de 1 à 2', [])).toBe('\\dfrac{2^{a+1}-1}{a+1}\\quad(a\\neq-1)');
	});

	it('3x^a de 1 à 2 : le coefficient suit', () => {
		expect(latex('.intégrer 3x^a de 1 à 2', [])).not.toContain('1^{');
	});
});

// =============================================================================
// Revue de V61 : les pôles et les domaines qui ne passent pas par une division
// =============================================================================

describe('V61 (revue) : puissance négative ou fonction à domaine, à paramètre', () => {
	it.each([
		// ln|1 − a| − ln|a| rendu : faux, diverge pour a = 0,5
		['.intégrer (x-a)^(-1) de 0 à 1'],
		['.intégrer 2(x-a)^(-2) de 0 à 1'],
		['.intégrer |x-a|^(-1) de 0 à 1'],
		// argument hors du domaine selon a
		['.intégrer \\ln(x-a) de 1 à 2'],
		['.intégrer 3\\ln(a x) de 1 à 2'],
		['.intégrer \\log(x-a) de 1 à 2'],
		['.intégrer \\sqrt{x-a} de 1 à 2'],
		['.intégrer (x-a)^{1/2} de 1 à 2'],
		['.intégrer \\tan(x-a) de 0 à 1'],
		['.intégrer 1/\\sin(x-a) de 1 à 2'],
		['.intégrer \\arcsin(x-a) de 0 à 1'],
		// exposant à paramètre sur une base qui s'annule dans le segment
		['.intégrer (x-1)^a de 0 à 2']
	])('%s → refus « dépend de a »', (input) => {
		expect(refusal(input, [])).toBe(DEPENDS_ON('a'));
	});

	it.each([
		// x + a² ⩾ 1 sur [1 ; 2]
		['.intégrer 1/(x+a^2) de 1 à 2', '\\ln\\left|a^2+2\\right|-\\ln\\left|a^2+1\\right|'],
		[
			'.intégrer x/(x^2+a^2) de 1 à 2',
			'\\dfrac{\\ln\\left|a^2+4\\right|}{2}-\\dfrac{\\ln\\left|a^2+1\\right|}{2}'
		],
		// x + a² ⩾ 1 sur [1 ; 2] : ln défini
		['.intégrer \\ln(x+a^2) de 1 à 2', null],
		// pas de domaine : sin est définie partout
		['.intégrer 2\\sin(x-a) de 0 à 1', null],
		['.intégrer 3x^a de 1 à 2', '\\dfrac{3\\times2^{a+1}-3}{a+1}\\quad(a\\neq-1)']
	])('gardé : %s', (input, expected) => {
		const shown = latex(input, []);
		if (expected !== null) expect(shown).toBe(expected);
		else expect(shown).not.toBe('');
	});
});
