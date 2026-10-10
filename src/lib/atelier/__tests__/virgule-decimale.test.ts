/**
 * La vue Calcul écrit les décimaux avec une VIRGULE (décision de David,
 * 2026-10-09) : `0,5` en texte, `0{,}5` en LaTeX — l'écriture de MathLive, et
 * celle des réponses en ln de `.résoudre` (`solve-latex.ts`).
 *
 * Seul l'AFFICHAGE change : l'arbre gardé (`ast`) et ce que l'élève a tapé
 * (l'écho, le rejeu) restent tels quels.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, runAction, type CalcResult, type CalcSession } from '../calcul';
import {
	SERIES_HINT,
	decimalCommaDeep,
	decimalCommaInput,
	decimalCommaLatex,
	decimalCommaText
} from '../decimal-comma';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';

// =============================================================================
// Outils
// =============================================================================

/** Un décimal écrit avec un point : ce qui ne doit plus s'afficher. */
const DOT_DECIMAL = /\d\.\d/;

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

/** Une session en mode décimal : les résultats y sont approchés. */
function decimalSession(): CalcSession {
	const s = session();
	runInput(s, '.mode decimal');
	return s;
}

/** Tout ce que la ligne affiche, étapes comprises. */
function shown(result: CalcResult): string[] {
	switch (result.kind) {
		case 'calcul':
			return [result.output, result.latex ?? ''];
		case 'commande':
			return [
				result.output,
				result.latex ?? '',
				result.note ?? '',
				...(result.steps ?? []).flatMap(stepTexts)
			];
		default:
			return [];
	}
}

function stepTexts(step: RenderedStep): string[] {
	return [
		step.title,
		step.explanation ?? '',
		step.expressionLatex ?? '',
		...(step.subSteps ?? []).flatMap(stepTexts)
	];
}

function expectNoDotDecimal(result: CalcResult): void {
	for (const text of shown(result)) expect(text).not.toMatch(DOT_DECIMAL);
}

function commande(result: CalcResult) {
	if (result.kind !== 'commande') throw new Error(`attendu une commande, reçu ${result.kind}`);
	return result;
}

function calcul(result: CalcResult) {
	if (result.kind !== 'calcul') throw new Error(`attendu un calcul, reçu ${result.kind}`);
	return result;
}

// =============================================================================
// Tests
// =============================================================================

describe('la conversion elle-même', () => {
	it('écrit la virgule en texte, `{,}` en LaTeX', () => {
		expect(decimalCommaText('x ≈ 1.25')).toBe('x ≈ 1,25');
		expect(decimalCommaLatex('x \\approx 1.25')).toBe('x \\approx 1{,}25');
	});

	it('ne touche ni `\\cdot`, ni `...`, ni un nom de commande, ni un entier', () => {
		expect(decimalCommaText('Tape .évaluer x^2... puis 12. Fin.')).toBe(
			'Tape .évaluer x^2... puis 12. Fin.'
		);
		expect(decimalCommaLatex('2 \\cdot x \\ldots 3')).toBe('2 \\cdot x \\ldots 3');
	});

	it('laisse intact un décimal déjà à virgule', () => {
		expect(decimalCommaText('B(10 ; 0,3)')).toBe('B(10 ; 0,3)');
		expect(decimalCommaLatex('0{,}3')).toBe('0{,}3');
	});

	// Une virgule qui SÉPARE, à côté d'un décimal, deviendrait ambiguë
	it('passe au point-virgule quand une virgule sépare des décimaux', () => {
		expect(decimalCommaText('(1.5, 2)')).toBe('(1,5 ; 2)');
		expect(decimalCommaText('a = 0.5, b = 1')).toBe('a = 0,5 ; b = 1');
		// Loin du décimal, la virgule n'est pas ambiguë : « a = 1, b = 0,5 »
		expect(decimalCommaText('a = 1, b = 0.5')).toBe('a = 1, b = 0,5');
		expect(decimalCommaLatex('\\left(1.5, -2.5\\right)')).toBe('\\left(1{,}5 ; -2{,}5\\right)');
	});

	// Les valeurs d'une ligne de tableau sont rangées par point du domaine :
	// clé et point doivent rester identiques après conversion
	it('convertit un tableau en gardant ses `Map` et leurs clés', () => {
		const table = {
			domain: [{ expression: '0.5' }],
			rows: [{ values: new Map([['0.5', { expression: '-1.25' }]]) }]
		};

		const converted = decimalCommaDeep(table);

		expect(converted.domain[0].expression).toBe('0{,}5');
		expect(converted.rows[0].values.get('0{,}5')).toEqual({ expression: '-1{,}25' });
	});

	it('garde la virgule qui sépare des entiers, et l’espace fine `\\,` du LaTeX', () => {
		expect(decimalCommaText('a = 1, b = 0, c = -2')).toBe('a = 1, b = 0, c = -2');
		expect(decimalCommaLatex('\\left\\{ -1.5 \\,;\\, 2.5 \\right\\}')).toBe(
			'\\left\\{ -1{,}5 \\,;\\, 2{,}5 \\right\\}'
		);
	});
});

describe('chaque commande de la vue Calcul écrit la virgule', () => {
	it('calcul direct (mode décimal) : 0.1+0.2', () => {
		const result = calcul(runInput(decimalSession(), '0.1+0.2'));

		expect(result.output).toBe('≈ 0,300000000000000');
		expect(result.latex).toBe('0{,}300000000000000');
		// L'arbre gardé reste un nombre lisible par le moteur
		expect(result.ast).toBeDefined();
	});

	it('calcul direct (mode décimal) : \\pi approché', () => {
		const result = calcul(runInput(decimalSession(), '\\pi'));

		expect(result.latex).toBe('3{,}14159265358979');
	});

	it('calcul avec une unité : 3.5 km', () => {
		const result = calcul(runInput(session(), '3.5 km'));

		expect(result.output).toBe('3,5km');
		expect(result.latex).toContain('3{,}5');
	});

	it('.évaluer (mode décimal)', () => {
		const result = commande(runInput(decimalSession(), '.évaluer x^2 en x=0.3'));

		expect(result.output).toContain('0,09');
		expectNoDotDecimal(result);
	});

	it('.résoudre, étapes pédagogiques comprises : 0.5x+3=1', () => {
		const result = commande(runInput(session(), '.résoudre 0.5x+3=1'));

		expect(result.steps?.[0]?.expressionLatex).toBe('0{,}5x + 3 = 1');
		expectNoDotDecimal(result);
	});

	it('.résoudre (mode décimal) : la valeur approchée', () => {
		const result = commande(runInput(decimalSession(), '.résoudre e^x=3'));

		expect(result.output).toContain('x ≈ 1,0986');
		expectNoDotDecimal(result);
	});

	it('.dériver : étapes et texte', () => {
		const result = commande(runInput(session(), '.dériver 0.5x^2'));

		expect(result.output).toBe('d/dx(0,5x^2) = x');
		expect(result.steps?.[0]?.title).toBe('On sort la constante 0,5');
		expectNoDotDecimal(result);
	});

	it('.intégrer', () => {
		const result = commande(runInput(session(), '.intégrer 0.5x de 0 à 1'));

		expect(result.output).toContain('0,5x dx');
		expectNoDotDecimal(result);
	});

	it('.taylor', () => {
		const result = commande(runInput(session(), '.taylor e^(0.5x) ordre 2'));

		expect(result.output).toContain('0,5x');
		expectNoDotDecimal(result);
	});

	it('.variations', () => {
		const result = commande(runInput(session(), '.variations x^3-3x+0.5'));

		expect(result.output).toContain('Expression : x^3-3x+0,5');
		expectNoDotDecimal(result);
	});

	it('.domaine', () => {
		const result = commande(runInput(session(), '.domaine ln(x-0.5)'));

		expect(result.output).toContain('ln(x-0,5)');
		expectNoDotDecimal(result);
	});

	it('.simplifier, étapes comprises', () => {
		const result = commande(runInput(session(), '.simplifier 0.5x+0.25x'));

		expectNoDotDecimal(result);
	});

	it('.stats (déjà en virgule : non-régression)', () => {
		const result = commande(runInput(session(), '.stats 1.5 ; 2'));

		expect(result.output).toContain('Moyenne = 1,75');
		expectNoDotDecimal(result);
	});

	it('.ajustement (déjà en virgule : non-régression)', () => {
		const result = commande(
			runInput(
				session(),
				'.ajustement 1 ; 2 ; 3 ; 4 ; 5 ; 6 : 12 ; 15 ; 19 ; 22 ; 27 ; 30 en x = 8'
			)
		);

		expect(result.output).toContain('G(3,5 ; 20,833)');
		expectNoDotDecimal(result);
	});

	it('.binomiale tapée avec un point', () => {
		const result = commande(runInput(session(), '.binomiale X 10 0.3'));

		expect(result.output).toBe('X suit B(10 ; 0,3)');
	});
});

describe('les actions des cartes, affichées dans la même vue', () => {
	it('Variations : texte et tableau', () => {
		const s = session();
		runInput(s, 'f(x) = 0.5x^2 - 1.5');

		const outcome = runAction(s, 'variations', 'f');

		expect(outcome.ok && outcome.output).toContain('0,5x^2-1,5');
		expect(outcome.ok && outcome.output).not.toMatch(DOT_DECIMAL);
	});

	it('Dériver : étapes', () => {
		const s = session();
		runInput(s, 'f(x) = 0.5x^2 - 1.5');

		const outcome = runAction(s, 'derive', 'f');

		expect(outcome.ok).toBe(true);
		const steps = outcome.ok ? (outcome.steps ?? []) : [];
		for (const text of steps.flatMap(stepTexts)) expect(text).not.toMatch(DOT_DECIMAL);
	});

	it('image (mode décimal)', () => {
		const s = decimalSession();
		runInput(s, 'f(x) = 0.5x^2 - 1.5');

		const outcome = runAction(s, 'image', 'f', '0.3');

		expect(outcome.ok && outcome.output).toBe('≈ -1,45500000000000');
		expect(outcome.ok && outcome.latex).toBe('-1{,}45500000000000');
	});
});

/** Ce que la ligne dit, refus compris. */
function said(result: CalcResult): string {
	if (result.kind === 'refus') return result.message;
	if (result.kind === 'calcul' || result.kind === 'commande') return result.output;
	return '';
}

describe('la saisie lit la virgule que l’affichage écrit', () => {
	it('dans l’expression d’une commande : .évaluer x^2+0,5 en x=0,3', () => {
		const result = commande(runInput(session(), '.évaluer x^2+0,5 en x=0,3'));

		expect(result.output).toContain('59/100');
	});

	it.each([
		['.évaluer 2x en x=1,5', 'Result: 3'],
		['.résoudre 0,5x+3=1', 'x = -4'],
		['.intégrer x de 0 à 0,5', '1/8'],
		['.taylor e^x ordre 3 en 0,5', 'x-0,5'],
		['.dériver 0,5x^2', '= x'],
		['.résoudre x^2=2 dans [0;1,5]', 'sqrt(2)'],
		['.binomiale X 10 0,3', 'B(10 ; 0,3)']
	])('%s', (input, expected) => {
		const result = commande(runInput(session(), input));

		expect(result.output).toContain(expected);
	});

	it.each(['0{,}5x+3=1', '0,5x+3=1'])('aller-retour : la sortie recopiée se relit (%s)', (out) => {
		const result = commande(runInput(session(), `.résoudre ${out}`));

		expect(result.latex).toBe('x = -4');
		expect(result.output).toContain('x = -4');
	});
});

// Décision de David (2026-10-09) : une virgule entre deux chiffres est
// TOUJOURS décimale ; « ; » sépare des nombres ; une virgule voisine d'une
// lettre sépare ; plusieurs virgules entre chiffres sont refusées, corrigées
describe('la règle de la virgule dans la saisie (décision de David)', () => {
	it.each([
		['0,5+1', '\\dfrac{3}{2}'],
		['(1,5)^2', '\\dfrac{9}{4}'],
		['(-0,5)^2', '\\dfrac{1}{4}'],
		['(0,5)', '\\dfrac{1}{2}'],
		// Convention française : un couple s'écrit avec « ; »
		['(1,2)+(3,4)', '\\dfrac{23}{5}']
	])('virgule entre deux chiffres, parenthèses comprises : %s', (input, latex) => {
		expect(calcul(runInput(session(), input)).latex).toBe(latex);
	});

	it('f(1,5) sur une fonction de l’atelier', () => {
		const s = session();
		runInput(s, 'f(x) = x^2');

		expect(calcul(runInput(s, 'f(1,5)')).latex).toBe('\\dfrac{9}{4}');
	});

	it.each([
		['u(n) = 2n', 'u(1,5)'],
		['u(n+1) = u(n) + 1', 'u(1,5)']
	])('un rang décimal de suite est refusé (%s)', (definition, input) => {
		const s = session();
		runInput(s, definition);

		expect(said(runInput(s, input))).toBe(
			'Le rang de u doit être un entier positif : u(5), pas u(1,5).'
		);
	});

	it.each([
		['max(1 ; 5 ; 2)', '5'],
		['max(1,5 ; 2)', '2'],
		['gcd(12 ; 18)', '6'],
		['binom(5 ; 2)', '10'],
		['mod(7 ; 3)', '1']
	])('« ; » sépare les arguments : %s', (input, output) => {
		expect(calcul(runInput(session(), input)).output).toBe(output);
	});

	it('.stats 1,5 ; 2 ; 3', () => {
		expect(commande(runInput(session(), '.stats 1,5 ; 2 ; 3')).output).toContain('Minimum = 1,5');
	});

	it.each(['max(a,b)', 'max(x, 1)'])('une virgule voisine d’une lettre sépare : %s', (input) => {
		expect(calcul(runInput(session(), input)).latex).toContain('\\max');
	});

	it.each([
		['.stats 12,15,9', 'Pour séparer des valeurs, utilise « ; » : .stats 12 ; 15 ; 9'],
		[
			'.ajustement 1,2,3 : 4,5,6',
			'Pour séparer des valeurs, utilise « ; » : .ajustement 1 ; 2 ; 3 : 4 ; 5 ; 6'
		]
	])('plusieurs virgules entre chiffres : refus corrigé (%s)', (input, message) => {
		const result = runInput(session(), input);

		expect(result.kind).toBe('refus');
		expect(said(result)).toBe(message);
	});

	// Hors commande, aucune forme à proposer : `1 ; 2 ; 3` échouerait retapé
	it.each(['1,2,3', '2,5,3', '1.5,2.5', '{1,2,3}', '.dériver x*1,2,3'])(
		'plusieurs virgules hors d’une commande de séries : l’explication, sans forme (%s)',
		(input) => {
			expect(said(runInput(session(), input))).toBe(SERIES_HINT);
		}
	);

	it('l’exemple de l’explication passe', () => {
		const example = SERIES_HINT.split('par exemple ')[1].replace(/\.$/, '');
		expect(commande(runInput(session(), example)).output).toContain('Effectif : 3');
	});

	it('la forme corrigée reprend TOUTE la ligne : binom(10,3)*0,3^3', () => {
		expect(said(runInput(session(), 'binom(10,3)*0,3^3'))).toBe(
			'Sépare les valeurs avec « ; » : binom(10 ; 3)*0,3^3'
		);
	});

	// Un message ne propose jamais une saisie qui échoue
	it.each([
		'.stats 12,15,9',
		'.ajustement 1,2,3 : 4,5,6',
		'.ajustement 0,1,2 : 1.5,2.5,3.5',
		'max(1,2)',
		'gcd(12,18)',
		'binom(5,2)',
		'binom(10,3)*0,3^3',
		'2*max(1,5)+1'
	])('retaper la forme proposée réussit : %s', (input) => {
		const refused = runInput(session(), input);
		expect(refused.kind).toBe('refus');
		const proposed = said(refused).split('» : ')[1];
		expect(proposed).toBeDefined();

		const retyped = runInput(session(), proposed);

		expect(retyped.kind).not.toBe('refus');
		if (retyped.kind === 'calcul') expect(retyped.latex).toBeDefined();
		if (retyped.kind === 'commande') expect(retyped.output).not.toMatch(/Erreur|Error/);
	});

	it.each([
		['1,000', '1'],
		['max(x,1,5)', 'max(x ; 1,5)']
	])('conforme à la règle, inchangé : %s', (input, output) => {
		expect(calcul(runInput(session(), input)).output).toBe(output);
	});

	it('un `1,2,3` ne devient jamais 1.2.3', () => {
		expect(decimalCommaInput('1,2,3')).not.toContain('.');
	});

	it.each([
		['max(1,2)', 'Sépare les valeurs avec « ; » : max(1 ; 2)'],
		['gcd(12,18)', 'Sépare les valeurs avec « ; » : gcd(12 ; 18)'],
		['binom(5,2)', 'Sépare les valeurs avec « ; » : binom(5 ; 2)']
	])('une fonction à deux arguments qui en reçoit un décimal : %s', (input, message) => {
		const result = runInput(session(), input);

		expect(result.kind).toBe('refus');
		expect(said(result)).toBe(message);
	});

	it.each(['(1 ; 2)', '(1;2)+(3;4)'])('un couple est refusé : %s', (input) => {
		expect(said(runInput(session(), input))).toBe(
			"Les couples (a ; b) ne sont pas encore pris en charge dans l'atelier."
		);
	});

	it.each(['{1 ; 2 ; 3}', '{1,5 ; 2}'])('un ensemble est refusé : %s', (input) => {
		expect(said(runInput(session(), input))).toBe(
			"Les ensembles {a ; b} ne sont pas encore pris en charge dans l'atelier."
		);
	});

	it('un \\frac{…}{…} n’est pas un ensemble', () => {
		expect(calcul(runInput(session(), '\\frac{1,5}{3}')).latex).toBe('\\dfrac{1}{2}');
	});

	it('la conversion : virgule entre chiffres → point, « ; » des fonctions → « , »', () => {
		expect(decimalCommaInput('(1,2)+(3,4)')).toBe('(1.2)+(3.4)');
		expect(decimalCommaInput('max(1,5 ; 2)')).toBe('max(1.5 , 2)');
		expect(decimalCommaInput('\\frac{1,5}{2}')).toBe('\\frac{1.5}{2}');
		expect(decimalCommaInput('0{,}5')).toBe('0{,}5');
		expect(decimalCommaInput('max(a,b)')).toBe('max(a,b)');
		// Le « ; » d'une commande (variable, intervalle) n'est pas touché
		expect(decimalCommaInput('x^2 ; t')).toBe('x^2 ; t');
	});

	// Le point-virgule est pour les maths, pas pour les phrases du moteur
	it('.taylor … en 0,5 : la phrase garde sa virgule', () => {
		const result = commande(runInput(session(), '.taylor sin(x) ordre 3 en 0,5'));

		expect(result.output).toContain('at x=0,5, order 3');
	});

	it('le point-virgule ne s’applique pas devant un mot', () => {
		expect(decimalCommaText('at x=0.5, order 3')).toBe('at x=0,5, order 3');
		expect(decimalCommaText('a = 0.5, b = 1')).toBe('a = 0,5 ; b = 1');
	});
});

describe('les statistiques d’une liste à valeurs décimales', () => {
	// La carte « + Liste » range ce qu'écrit MathLive : `1{,}5;2;3{,}5`
	it.each(['1{,}5;2;3{,}5', '1,5 ; 2 ; 3,5'])(
		'la liste garde ses trois valeurs (%s)',
		(definition) => {
			const atelier = new Atelier();
			atelier.create({ kind: 'list', name: 'L', definition }, 'keyboard');

			const list = atelier.get('L');
			expect(list?.kind === 'list' && list.values).toEqual([1.5, 2, 3.5]);
		}
	);

	it.each(['1{,}5;2;3{,}5', '1,5 ; 2 ; 3,5'])('.stats L lit ses valeurs (%s)', (definition) => {
		const s = session();
		s.atelier.create({ kind: 'list', name: 'L', definition }, 'keyboard');

		const result = commande(runInput(s, '.stats L'));

		expect(result.output).toContain('Effectif : 3');
		expect(result.output).toContain('Minimum = 1,5');
	});
});

describe('ce qui ne change pas', () => {
	// La commande citée se relit maintenant avec des virgules : le refus les écrit
	it('le refus cite la commande à retaper, en virgule', () => {
		const result = runInput(session(), '.évaluer x^2+0.5 x=0.3');

		expect(result.kind).toBe('refus');
		const message = result.kind === 'refus' ? result.message : '';
		expect(message).toBe('Pour remplacer x par 0,3, écris : .évaluer x^2+0,5 en x=0,3');
		const retyped = commande(runInput(session(), message.split('écris : ')[1]));
		expect(retyped.output).toContain('59/100');
	});

	it('l’écho de la saisie reste ce qui a été tapé', () => {
		const result = commande(runInput(session(), '.dériver 0.5x^2'));

		expect(result.input).toBe('.dériver 0.5x^2');
	});
});
