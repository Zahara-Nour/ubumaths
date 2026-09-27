/**
 * `{{eval:…}}` calcule avec des grandeurs (lot 2 du chantier Grandeurs)
 * ======================================================================
 *
 * Spécification : docs/wip/grandeurs-eval-progress.md (« Lot 2 », décisions de
 * David du 2026-09-27). Avant : `evaluate` jetait l'unité en silence
 * (`{{eval:3[h]+20[min]}}` → 23). Désormais le calcul passe par
 * `tidy(…, { unitChoice: 'written' })`, garde son unité, et tout ce qui ne
 * donne pas UNE grandeur à écriture décimale finie est une erreur visible.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate } from '../../types';
import type { Variable } from '$lib/ubumark';
import { templateMarkdown, resolveVariables } from '$lib/ubumark';
import { validateAnswer } from '$lib/utils/answer-validator';
import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';

const A_B: Variable[] = [
	{ name: 'a', expression: '7[mm]' },
	{ name: 'b', expression: '5[mm]' }
];

/** Valeur d'un `{{eval:…}}`, après les variables `a` = 7 mm et `b` = 5 mm */
function evalOf(expression: string): string {
	const resolved = resolveVariables(
		[...A_B, { name: 'r', expression: `{{eval:${expression}}}` }],
		1
	);
	return resolved[resolved.length - 1].value;
}

function templateOf(statement: string, expectedAnswer: string): QuestionTemplate {
	return {
		id: 't',
		title: 't',
		status: 'draft',
		grades: ['6'],
		theme: 'T',
		domain: 'D',
		level: 1,
		variations: [
			{
				statement: templateMarkdown(`${statement} $?$`),
				variables: A_B,
				blanks: [{ expectedAnswer, unit: { expected: true } }]
			}
		]
	};
}

function instanceOf(statement: string, expectedAnswer = '{{eval:4*a}}') {
	const result = generateInstance(templateOf(statement, expectedAnswer), 1);
	if (!result.success) throw new Error(result.errors.join('; '));
	return result.instance;
}

describe('un calcul avec une grandeur garde son unité', () => {
	it.each([
		['4*a', '28[mm]'],
		['a*b', '35[mm^2]'],
		['3[h]+20[min]', '200[min]'],
		['5[km]+3[m]', '5.003[km]'],
		['120[km]/2[h]', '60[km/h]'],
		['(1[h]+30[min])*60[km/h]', '90[km]'],
		['90[min]*60[km/h]', '90[km]']
	])('{{eval:%s}} → %s', (expression, expected) => {
		expect(evalOf(expression)).toBe(expected);
	});

	it('grandeur ÷ grandeur de même dimension : un nombre', () => {
		expect(evalOf('3[h]/1[min]')).toBe('180');
	});

	it('modificateurs de signe sur une grandeur', () => {
		expect(evalOf('4*a;+')).toBe('+28[mm]');
		expect(evalOf('3[m]-5[m];()')).toBe('(-2[m])');
	});
});

describe('rendu dans un énoncé et réponse attendue', () => {
	it('$…$ : 28~\\unit{mm} ; ~…~ : 28[mm], affiché « 28 mm »', () => {
		const statement = String(instanceOf('${{eval:4*a}}$ et ~{{eval:4*a}}~').statement);
		expect(statement).toContain('$28~\\unit{mm}$');
		expect(statement).toContain('~28[mm]~');
		expect(expressionToLatex('28[mm]', 'custom')).toBe('28~\\mathrm{mm}');
	});

	it('case à unité : 28 mm et 2,8 cm sont justes, 28 cm est faux', () => {
		const instance = instanceOf('Longueur ?');
		expect(validateAnswer(['28\\unit{mm}'], instance).isCorrect).toBe(true);
		expect(validateAnswer(['2{,}8\\unit{cm}'], instance).isCorrect).toBe(true);
		expect(validateAnswer(['28\\unit{cm}'], instance).isCorrect).toBe(false);
	});
});

describe('modificateur ;[unité] — « exprimé en »', () => {
	it.each([
		['3[h];[min]', '180[min]'],
		['a*b;[mm^2]', '35[mm^2]'],
		['a*b;[cm^2]', '0.35[cm^2]'],
		['5[km]+3[m];[m]', '5003[m]']
	])('{{eval:%s}} → %s', (expression, expected) => {
		expect(evalOf(expression)).toBe(expected);
	});

	it.each([
		['3[h];[m]', /incompatible/i],
		['1[h];[s^2]', /incompatible/i],
		['1[min];[h]', /décimale finie/i]
	])('{{eval:%s}} → erreur', (expression, message) => {
		expect(() => evalOf(expression)).toThrow(message);
	});
});

describe('modificateur ;hms — durées', () => {
	it.each([
		['135[min];hms', '{2[h]}{15[min]}'],
		['150[s];hms', '{2[min]}{30[s]}'],
		['60[min];hms', '1[h]'],
		['3[h]+20[min]+5[s];hms', '{3[h]}{20[min]}{5[s]}'],
		['2[h]+5[s];hms', '{2[h]}{5[s]}']
	])('{{eval:%s}} → %s', (expression, expected) => {
		expect(evalOf(expression)).toBe(expected);
	});

	it('s’affiche « 2 h 15 min » dans $…$ comme dans ~…~', () => {
		const statement = String(
			instanceOf('${{eval:135[min];hms}}$ ~{{eval:135[min];hms}}~').statement
		);
		expect(statement).toContain('$2~\\unit{h} 15~\\unit{min}$');
		expect(statement).toContain('~{2[h]}{15[min]}~');
		expect(expressionToLatex('{2[h]}{15[min]}', 'custom')).toBe('2~\\mathrm{h} 15~\\mathrm{min}');
	});

	it.each([
		['1[s]/3;hms', /entier de secondes/i],
		['0.5[s];hms', /entier de secondes/i],
		['3[m];hms', /durée/i],
		['12;hms', /durée/i]
	])('{{eval:%s}} → erreur', (expression, message) => {
		expect(() => evalOf(expression)).toThrow(message);
	});
});

describe('erreurs visibles : jamais d’unité jetée en silence', () => {
	it.each([
		['5[m]+3[s]', /une seule grandeur/i],
		['10[km]/3', /décimale finie/i],
		['100[km]/3[h]', /décimale finie/i],
		['2[m]+x', /x/]
	])('{{eval:%s}} → erreur', (expression, message) => {
		expect(() => evalOf(expression)).toThrow(message);
	});
});

describe('non-régression : sans unité, rien ne change', () => {
	it.each([
		['3+20', '23'],
		['1/3', '\\dfrac{1}{3}'],
		['1/4;d', '0.25'],
		['-3;()', '(-3)']
	])('{{eval:%s}} → %s', (expression, expected) => {
		expect(evalOf(expression)).toBe(expected);
	});
});

// L'écriture de ;hms est une juxtaposition, lue comme un PRODUIT : réutilisée dans un
// calcul, elle donnerait 2 h × 15 min en silence. Un produit de durées est refusé.
describe('garde-fou : pas de produit de deux durées', () => {
	it.each([
		['{2[h]}{15[min]}', /produit de durées/i],
		['2[h]*15[min]', /produit de durées/i],
		['{2[h]}{15[min]};[min]', /produit de durées/i]
	])('{{eval:%s}} → erreur', (expression, message) => {
		expect(() => evalOf(expression)).toThrow(message);
	});

	it('une durée multipliée par un nombre reste permise : 2*15[min] → 30[min]', () => {
		expect(evalOf('2*15[min]')).toBe('30[min]');
	});
});

// Relecture de code de #484
describe('relecture : un résultat nul garde son unité', () => {
	it.each([
		['3[m]-3[m]', '0[m]'],
		['a-a', '0[mm]'],
		['3[h]*0', '0[h]']
	])('{{eval:%s}} → %s', (expression, expected) => {
		expect(evalOf(expression)).toBe(expected);
	});

	it('un quotient nul de même dimension reste un nombre : 0[h]/1[min] → 0', () => {
		expect(evalOf('0[h]/1[min]')).toBe('0');
	});

	it('attendu 0 m : « 0 m » est juste', () => {
		const instance = instanceOf('Calcule.', '{{eval:3[m]-3[m]}}');
		expect(validateAnswer(['0\\unit{m}'], instance).isCorrect).toBe(true);
	});
});

describe('relecture : attendu signé (;+ et ;()) lu par le correcteur', () => {
	it('attendu {{eval:2[m]-5[m];()}} : « -3 m » juste, « 3 m » faux', () => {
		const instance = instanceOf('Calcule.', '{{eval:2[m]-5[m];()}}');
		expect(validateAnswer(['-3\\unit{m}'], instance).isCorrect).toBe(true);
		expect(validateAnswer(['3\\unit{m}'], instance).isCorrect).toBe(false);
	});

	it('attendu {{eval:3[m];+}} : « 3 m » juste', () => {
		const instance = instanceOf('Calcule.', '{{eval:3[m];+}}');
		expect(validateAnswer(['3\\unit{m}'], instance).isCorrect).toBe(true);
	});
});

describe('relecture : ;hms interdit dans une réponse attendue', () => {
	it('la génération échoue, avec un message', () => {
		const result = generateInstance(templateOf('Calcule.', '{{eval:135[min];hms}}'), 1);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.errors.join(' ')).toMatch(/hms/);
	});
});

describe('relecture : produit de durées, facteurs imbriqués', () => {
	it.each(['2[h]*(3*15[min])', '(2*2[h])*15[min]', '2*(3[h]*15[min])'])(
		'{{eval:%s}} → erreur',
		(expression) => {
			expect(() => evalOf(expression)).toThrow(/produit de durées/i);
		}
	);
});
