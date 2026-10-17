/**
 * `.évaluer` avec plusieurs lettres (E6, décision de David du 2026-10-14).
 *
 * - Les valeurs se séparent par « ; » : `.évaluer 2a+3b en a=1,5 ; b=2`
 *   (la virgule reste la virgule décimale). La réponse est une formule,
 *   comme à une lettre : la valeur seule pour une expression.
 * - La virgule entre deux valeurs (`en a=1,5, b=2`, `en a=1, b=2`) est
 *   refusée, même sans ambiguïté, par cohérence.
 * - « Comment ? » : « On remplace $a$ par $1{,}5$ et $b$ par $2$ » (trois
 *   lettres : « $a$ par …, $b$ par … et $c$ par … »), puis les étapes de
 *   calcul ; résumé = remplacement + résultat ; gardes E4/E5 et concordance.
 * - Refus : lettre donnée deux fois, lettre de l'expression sans valeur
 *   (« Il manque la valeur de b : … »), lettre donnée absente de
 *   l'expression. Une valeur posée dans l'atelier est déjà remplacée : la
 *   redonner est refusé, comme à une lettre.
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { parse } from '$lib/mathAST/cli/core/pipeline';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';
import { evaluateSteps } from '../evaluate-steps';

// =============================================================================
// Décor
// =============================================================================

function session(setup: readonly string[] = []): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of setup) runInput(s, line);
	return s;
}

function commande(result: CalcResult) {
	if (result.kind !== 'commande') throw new Error(`attendu une commande, reçu ${result.kind}`);
	return result;
}

function line(input: string, setup: readonly string[] = []) {
	return commande(runInput(session(setup), input));
}

function latex(input: string, setup: readonly string[] = []): string {
	return (line(input, setup).latex ?? '').replace(/\s/g, '');
}

function refusal(input: string, setup: readonly string[] = []): string {
	const result = runInput(session(setup), input);
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${result.kind}`);
	return result.message;
}

function steps(input: string, setup: readonly string[] = []): readonly RenderedStep[] {
	const found = line(input, setup).steps;
	if (found === undefined) throw new Error(`pas d'étapes pour ${input}`);
	return found;
}

/** Le LaTeX d'une étape, sans espaces, sans couleur, sans `\left`/`\right`. */
function flat(step: RenderedStep): string {
	return (step.expressionLatex ?? '')
		.replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
		.replace(/\\textcolor\{blue\}/g, '')
		.replace(/\\left|\\right/g, '')
		.replace(/[{}\s&]/g, '');
}

/** La dernière ligne écrite par les étapes : la valeur conclue. */
function conclusion(all: readonly RenderedStep[]): string {
	const last = flat(all[all.length - 1]);
	return last.split('\\\\').pop()?.replace(/^=/, '') ?? '';
}

const COMMA_REFUSAL = 'Sépare les valeurs avec « ; » : .évaluer 2a+3b en a=1,5 ; b=2, par exemple.';

// =============================================================================
// La réponse
// =============================================================================

describe('plusieurs lettres séparées par « ; » : la réponse est une formule', () => {
	it('2a+3b en a=1,5 ; b=2 → 9 (virgule décimale acceptée)', () => {
		expect(latex('.évaluer 2a+3b en a=1,5 ; b=2')).toBe('9');
		expect(line('.évaluer 2a+3b en a=1,5 ; b=2').output).toBe('9');
	});

	it('une réponse décimale garde sa virgule : a+b en a=1,5 ; b=2 → 3,5', () => {
		expect(latex('.évaluer a+b en a=1,5 ; b=2')).toBe('3{,}5');
		expect(line('.évaluer a+b en a=1,5 ; b=2').output).toBe('3,5');
	});

	it.each([
		['.évaluer 2a+3b en a=1 ; b=2'],
		['.évaluer 2a+3b en a=1;b=2'],
		['.évaluer 2a+3b en b=2 ; a=1'],
		['.évaluer 2a+3b pour a=1 ; b=2']
	])('%s → 8', (input) => {
		expect(latex(input)).toBe('8');
	});

	it('trois lettres : a+b+c en a=1 ; b=2 ; c=3 → 6', () => {
		expect(latex('.évaluer a+b+c en a=1 ; b=2 ; c=3')).toBe('6');
	});

	it('une valeur posée dans l’atelier reste remplacée : a x + b en x=3 ; b=1, a = 2 → 7', () => {
		expect(latex('.évaluer a x + b en x=3 ; b=1', ['a = 2'])).toBe('7');
	});
});

// =============================================================================
// Refus
// =============================================================================

describe('refus', () => {
	it.each([
		['.évaluer 2a+3b en a=1,5, b=2'],
		['.évaluer 2a+3b en a=1, b=2'],
		['.évaluer 2a+3b en a=1,b=2'],
		['.évaluer 2a+3b pour a=1, b=2']
	])('%s : la virgule entre deux valeurs est refusée', (input) => {
		expect(refusal(input)).toBe(COMMA_REFUSAL);
	});

	it('la même lettre deux fois', () => {
		expect(refusal('.évaluer 2a+3b en a=1 ; a=2')).toBe('La valeur de a est donnée deux fois.');
	});

	it('une lettre sans valeur : « Il manque la valeur de b : … »', () => {
		expect(refusal('.évaluer 2a+3b+c en a=1 ; c=2')).toBe(
			'Il manque la valeur de b : .évaluer 2a+3b+c en a=1 ; c=2 ; b=3, par exemple.'
		);
	});

	it('une seule valeur donnée, une lettre sans valeur : même refus', () => {
		expect(refusal('.évaluer 2a+3b en a=1')).toBe(
			'Il manque la valeur de b : .évaluer 2a+3b en a=1 ; b=3, par exemple.'
		);
	});

	it('deux lettres sans valeur', () => {
		expect(refusal('.évaluer a+b+c en a=1')).toBe(
			'Il manque les valeurs de b et c : .évaluer a+b+c en a=1 ; b=3 ; c=3, par exemple.'
		);
	});

	it('une lettre donnée absente de l’expression', () => {
		expect(refusal('.évaluer 2a+3b en a=1 ; b=2 ; c=3')).toBe("« c » n'apparaît pas dans 2a+3b.");
	});

	it('une valeur posée dans l’atelier, redonnée : « a vaut déjà 5 dans l’atelier »', () => {
		expect(refusal('.évaluer 2a+3b en a=1 ; b=2', ['a = 5'])).toBe(
			"a vaut déjà 5 dans l'atelier : retire « a=1 », ou efface a avant."
		);
	});

	it('à une lettre aussi, virgule décimale gardée', () => {
		expect(refusal('.évaluer 2a en a=1', ['a = 5'])).toBe(
			"a vaut déjà 5 dans l'atelier : retire « a=1 », ou efface a avant."
		);
		expect(refusal('.évaluer 2a en a=0,5', ['a = 1,5'])).toBe(
			"a vaut déjà 1,5 dans l'atelier : retire « a=0,5 », ou efface a avant."
		);
	});

	it('une valeur qui n’est pas un nombre', () => {
		expect(refusal('.évaluer 2a+3b en a=1 ; b=c')).toBe(
			'La valeur de b doit être un nombre, pas « c ».'
		);
	});

	it('valeur interdite : les valeurs citées en formules', () => {
		expect(refusal('.évaluer \\frac{a}{b} en a=1 ; b=0')).toBe(
			"Pour $a = 1$ et $b = 0$, ce calcul n'a pas de valeur : le dénominateur s'annule."
		);
	});
});

// =============================================================================
// « Comment ? »
// =============================================================================

describe('« Comment ? » : le remplacement de toutes les lettres, puis les calculs', () => {
	it('deux lettres : « On remplace $a$ par $1$ et $b$ par $2$ »', () => {
		const all = steps('.évaluer 2a+3b en a=1 ; b=2');
		expect(all[0].title).toBe('On remplace $a$ par $1$ et $b$ par $2$');
		expect(flat(all[0])).toBe('2\\times1+3\\times2');
		expect(conclusion(all)).toBe('8');
	});

	it('trois lettres : « $a$ par …, $b$ par … et $c$ par … », dans l’ordre tapé', () => {
		const all = steps('.évaluer a+2b-c en a=1 ; b=-2 ; c=3');
		expect(all[0].title).toBe('On remplace $a$ par $1$, $b$ par $-2$ et $c$ par $3$');
		expect(flat(all[0])).toBe('1+2\\times(-2)-3');
		expect(conclusion(all)).toBe('-6');
	});

	it('le résumé : le remplacement, puis le résultat d’un trait', () => {
		const summary = line('.évaluer 2a+3b en a=1 ; b=2').summary;
		expect(summary?.map((s) => s.title)).toEqual([
			'On remplace $a$ par $1$ et $b$ par $2$',
			'On effectue les calculs'
		]);
		expect(flat(summary?.[1] ?? { id: 0, rule: '', title: '' })).toBe('2\\times1+3\\times2=8');
	});

	it('une valeur décimale : virgule dans le titre et les étapes', () => {
		const all = steps('.évaluer 2a+3b en a=1,5 ; b=2');
		expect(all[0].title).toBe('On remplace $a$ par $1{,}5$ et $b$ par $2$');
		expect(all.every((s) => !(s.expressionLatex ?? '').includes('1.5'))).toBe(true);
		expect(conclusion(all)).toBe('9');
	});

	it('E4 : une fonction transcendante, pas de « Comment ? »', () => {
		expect(line('.évaluer e^a+b en a=0 ; b=1').steps).toBeUndefined();
	});

	it('une valeur posée dans l’atelier en plus : pas d’étapes', () => {
		expect(line('.évaluer a x + b en x=3 ; b=1', ['a = 2']).steps).toBeUndefined();
	});

	it('garde de concordance : une réponse du moteur différente → pas d’étapes', () => {
		const args = {
			expression: '2a+3b',
			assignments: [
				{ name: 'a', value: '1' },
				{ name: 'b', value: '2' }
			],
			callLatex: null
		};
		const right = parse('8').ast;
		const wrong = parse('9').ast;
		if (right === undefined || wrong === undefined) throw new Error('lecture');
		expect(evaluateSteps(args, right, '8')).not.toBeNull();
		expect(evaluateSteps(args, wrong, '9')).toBeNull();
	});
});

// =============================================================================
// Revue de 821b27527
// =============================================================================

describe('revue : fonction à paramètre, « ; » final, fractions, valeurs', () => {
	const withParameter = ['f(x) = a x'];

	it('f(x) = a x, a non posé : .évaluer f en x=1 ; a=2 → 2, avec les étapes', () => {
		const result = line('.évaluer f en x=1 ; a=2', withParameter);
		expect(result.output).toBe('2');
		expect(result.steps?.[0].title).toBe('On remplace $x$ par $1$ et $a$ par $2$');
	});

	it('f(x) tapé avec sa variable : .évaluer f(x) en x=1 ; a=2 → 2', () => {
		expect(line('.évaluer f(x) en x=1 ; a=2', withParameter).output).toBe('2');
	});

	it('f(x) = a x, sans la valeur de a : « Il manque la valeur de a »', () => {
		expect(refusal('.évaluer f en x=1', withParameter)).toBe(
			'Il manque la valeur de a : .évaluer f en x=1 ; a=3, par exemple.'
		);
	});

	it('un « ; » final sans valeur : « Il manque la valeur de b »', () => {
		expect(refusal('.évaluer 2a+3b en a=1 ; b')).toBe(
			'Il manque la valeur de b : .évaluer 2a+3b en a=1 ; b=3, par exemple.'
		);
	});

	it('un « ; » final qui redonne une lettre déjà valuée : refus juste', () => {
		expect(refusal('.évaluer x^2 en x=3 ; x')).toBe('x a déjà sa valeur : retire « ; x ».');
	});

	it('a/b en a=2 ; b=4 : le remplacement s’écrit en fraction', () => {
		const all = steps('.évaluer a/b en a=2 ; b=4');
		expect(flat(all[0])).toBe('\\dfrac24');
	});

	it('x/4 en x=2 : aussi à une lettre', () => {
		expect(flat(steps('.évaluer x/4 en x=2')[0])).toBe('\\dfrac24');
	});

	it('a=-1,5 ; b=2 : 2a+3b → 3, le négatif entre parenthèses', () => {
		const result = line('.évaluer 2a+3b en a=-1,5 ; b=2');
		expect(result.output).toBe('3');
		expect(flat(result.steps?.[0] ?? { id: 0, rule: '', title: '' })).toBe(
			'2\\times(-1,5)+3\\times2'
		);
	});

	it('a=1/2 ; b=2 : 2a+3b → 7, la valeur en fraction', () => {
		const result = line('.évaluer 2a+3b en a=1/2 ; b=2');
		expect(result.output).toBe('7');
		expect(result.steps?.[0].title).toBe('On remplace $a$ par $\\dfrac{1}{2}$ et $b$ par $2$');
	});
});

// =============================================================================
// Une seule lettre : inchangé
// =============================================================================

describe('une seule lettre : aucun changement', () => {
	it('x^2+1 en x=3 → 10, « On remplace $x$ par $3$ »', () => {
		expect(latex('.évaluer x^2+1 en x=3')).toBe('10');
		expect(steps('.évaluer x^2+1 en x=3')[0].title).toBe('On remplace $x$ par $3$');
	});

	it('f en x=3 → f(3) = 10', () => {
		expect(latex('.évaluer f en x=3', ['f(x) = x^2+1'])).toBe('f(3)=10');
	});

	it('2x en y=1 : la lettre absente, même refus', () => {
		expect(refusal('.évaluer 2x en y=1')).toBe("« y » n'apparaît pas dans 2x.");
	});
});
