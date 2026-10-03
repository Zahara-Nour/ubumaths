/**
 * Défauts du moteur de génération gênants pour les auteurs de modèles (2026-10, branche
 * `fix/generation-auteurs`) : `a<-1` dans une condition, `{{if:…}}` dans une réponse
 * attendue ou une variable (et imbriqué), variable calculée substituée sans parenthèses,
 * raccourci `{{b;();d}}`, faute d'auteur relancée 100 fois, `cleanCoefficients` (étapes
 * générées, `\leqslant`, `(x+0)`), motifs `requiredForm` et fonctions déclarées.
 */
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { evaluateConditions } from '../condition-evaluator';
import type { QuestionTemplate, QuestionVariation, ResolvedVariable } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { checkRequiredForm } from '../../required-form-validator';
import { templateGenericFunctions } from '../../generic-functions';
import { cleanCoefficientsCustom } from '../../clean-coefficients';
import { areEquivalent, parseCustom } from '$lib/mathAST';

function makeTemplate(
	variation: Partial<QuestionVariation>,
	shared?: QuestionTemplate['shared']
): QuestionTemplate {
	return {
		id: 'generation-auteurs',
		title: 'Génération auteurs',
		status: 'draft',
		grades: ['2'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		...(shared && { shared }),
		variations: [{ statement: templateMarkdown('$?$'), ...variation }]
	};
}

function generate(
	variation: Partial<QuestionVariation>,
	seed = 0,
	shared?: QuestionTemplate['shared']
) {
	const result = generateInstance(makeTemplate(variation, shared), seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function generationErrors(variation: Partial<QuestionVariation>): string[] {
	const result = generateInstance(makeTemplate(variation), 0);
	return result.success ? [] : result.errors;
}

function vars(values: Record<string, string>): ResolvedVariable[] {
	return Object.entries(values).map(([name, value]) => ({ name, value }));
}

function value(instance: ReturnType<typeof generate>, name: string): string | undefined {
	return instance.resolvedVariables?.find((v) => v.name === name)?.value;
}

function expected(instance: ReturnType<typeof generate>, index = 0): string | undefined {
	return instance.blanks?.[index]?.expectedAnswer;
}

// ============================================================================
// 1. `a<-1` dans une condition
// ============================================================================

describe('condition : `<-` est « < » suivi d’un nombre négatif', () => {
	it.each([
		['a<-1', '-3', true],
		['a<-1', '0', false],
		['a<-1', '-1', false],
		['a < -1', '-3', true],
		['a<=-1', '-1', true],
		['a>-1', '0', true],
		['b<-a', '-5', true]
	])('« %s » avec a = %s vaut %s', (condition, a, result) => {
		expect(evaluateConditions([condition], vars({ a, b: '2' }))).toBe(result);
	});

	it('un tirage gardé par `a<-1` respecte la condition', () => {
		for (let seed = 0; seed < 10; seed++) {
			const instance = generate(
				{
					variables: [{ name: 'a', expression: '{{-5..5}}' }],
					conditions: ['a<-1'],
					blanks: [{ expectedAnswer: 'a' }]
				},
				seed
			);
			expect(Number(value(instance, 'a'))).toBeLessThan(-1);
		}
	});

	it('`{{if:a<-1|…}}` dans un énoncé est tranché (il restait tel quel)', () => {
		const instance = generate({
			variables: [{ name: 'a', expression: '-3' }],
			statement: templateMarkdown('{{if:a<-1|petit|grand}} $?$'),
			blanks: [{ expectedAnswer: '1' }]
		});
		expect(String(instance.statement)).toMatch(/^petit /);
	});
});

// ============================================================================
// 2. `{{if:…}}` dans une réponse attendue, une variable, imbriqué
// ============================================================================

describe('{{if:condition|alors|sinon}} hors de l’énoncé', () => {
	it.each([
		['-3', '2'],
		['3', '1']
	])('réponse attendue `{{if:a>0|1|2}}` avec a = %s → %s', (a, answer) => {
		const instance = generate({
			variables: [{ name: 'a', expression: a }],
			blanks: [{ expectedAnswer: '{{if:a>0|1|2}}' }]
		});
		expect(expected(instance)).toBe(answer);
	});

	it.each([
		['-3', '3'],
		['4', '4']
	])('variable `{{if:a>0|{{a}}|{{eval:-a}}}}` avec a = %s → %s', (a, abs) => {
		const instance = generate({
			variables: [
				{ name: 'a', expression: a },
				{ name: 's', expression: '{{if:a>0|{{a}}|{{eval:-a}}}}' }
			],
			blanks: [{ expectedAnswer: 's' }]
		});
		expect(value(instance, 's')).toBe(abs);
	});

	it.each([
		['2', '-1', 'y'],
		['2', '1', 'x'],
		['-2', '1', 'z']
	])('imbriqué dans une variable : a = %s, b = %s → %s', (a, b, result) => {
		const instance = generate({
			variables: [
				{ name: 'a', expression: a },
				{ name: 'b', expression: b },
				{ name: 'r', expression: 'text:{{if:a>0|{{if:b>0|x|y}}|z}}' },
				{ name: 'n', expression: '{{if:a>0|{{if:b>0|1|2}}|3}}' }
			],
			blanks: [{ expectedAnswer: 'n' }]
		});
		expect(value(instance, 'n')).toBe({ x: '1', y: '2', z: '3' }[result]);
	});

	it('imbriqué dans une réponse attendue', () => {
		const instance = generate({
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '-1' }
			],
			blanks: [{ expectedAnswer: '{{if:a>0|{{if:b>0|1|{{eval:a+b}}}}|3}}' }]
		});
		expect(expected(instance)).toBe('1');
	});

	it('imbriqué dans un énoncé (déjà pris en charge, reste vrai)', () => {
		const instance = generate({
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '-1' }
			],
			statement: templateMarkdown('R {{if:a>0|{{if:b>0|X|Y}}|Z}} $?$'),
			blanks: [{ expectedAnswer: '1' }]
		});
		expect(String(instance.statement)).toMatch(/^R Y /);
	});

	it('un tirage `a|b|c` reste un tirage', () => {
		const seen = new Set<string>();
		for (let seed = 0; seed < 30; seed++) {
			const instance = generate(
				{ variables: [{ name: 'a', expression: '{{1|2|3}}' }], blanks: [{ expectedAnswer: 'a' }] },
				seed
			);
			seen.add(value(instance, 'a') ?? '');
		}
		expect([...seen].sort()).toEqual(['1', '2', '3']);
	});

	it('condition illisible dans une réponse attendue : erreur explicite, pas un choix au hasard', () => {
		const errors = generationErrors({
			variables: [{ name: 'a', expression: '3' }],
			blanks: [{ expectedAnswer: '{{if:zz>0|1|2}}' }]
		});
		expect(errors.join(' ')).toMatch(/if:zz>0/);
	});
});

// ============================================================================
// 3. Variable calculée substituée sans parenthèses
// ============================================================================

describe('variable dont la valeur est une formule, citée dans une autre', () => {
	const base = [
		{ name: 'a', expression: '11' },
		{ name: 'T', expression: '{{a}}*{{a}}-3' },
		{ name: 'g', expression: '2' }
	];

	it.each([
		['T/g', '(11*11-3)/2'],
		['{{T}}/{{g}}', '(11*11-3)/2'],
		['g*T', '2*(11*11-3)'],
		['T^2', '(11*11-3)^2'],
		['-T', '-(11*11-3)'],
		['2{{T}}', '2(11*11-3)']
	])('`%s` → `%s` (la valeur garde son sens)', (expression, result) => {
		const instance = generate({
			variables: [...base, { name: 'N', expression }],
			blanks: [{ expectedAnswer: 'N' }]
		});
		expect(value(instance, 'N')).toBe(result);
	});

	it.each([
		['T', '11*11-3'],
		['T+1', '11*11-3+1'],
		['1+T', '1+11*11-3'],
		['{{T}}', '11*11-3'],
		['{{eval:T/g}}', '59']
	])('`%s` → `%s` : aucune parenthèse inutile', (expression, result) => {
		const instance = generate({
			variables: [...base, { name: 'N', expression }],
			blanks: [{ expectedAnswer: 'N' }]
		});
		expect(value(instance, 'N')).toBe(result);
	});

	it('la réponse attendue vaut bien (11×11−3)/2 = 59', () => {
		const instance = generate({
			variables: [...base, { name: 'N', expression: 'T/g' }],
			blanks: [{ expectedAnswer: 'N' }]
		});
		expect(areEquivalent(parseCustom(expected(instance) ?? ''), parseCustom('59'))).toBe(true);
	});
});

// ============================================================================
// 4. Raccourci `{{b;();d}}`
// ============================================================================

describe('raccourci {{b;…;…}} = {{eval:b;…;…}}', () => {
	it.each(['();d', 'd;()', '+;d'])('`{{b;%s}}` comme la forme `{{eval:…}}`', (modifiers) => {
		const variables = [{ name: 'b', expression: '-2.5' }];
		const shortcut = generate({
			variables,
			statement: templateMarkdown(`$3{{b;${modifiers}}}=?$`),
			blanks: [{ expectedAnswer: '1' }]
		});
		const explicit = generate({
			variables,
			statement: templateMarkdown(`$3{{eval:b;${modifiers}}}=?$`),
			blanks: [{ expectedAnswer: '1' }]
		});
		expect(String(shortcut.statement)).toBe(String(explicit.statement));
	});
});

// ============================================================================
// 5. Faute d'auteur dans une variable : échec immédiat
// ============================================================================

describe('faute d’auteur dans une variable : échec au premier tirage', () => {
	it.each([
		['fonction inconnue', '{{eval:foo(a)}}'],
		['syntaxe invalide', '{{eval:a+*2}}'],
		['variable inconnue', '{{eval:{{zz}}+1}}']
	])('%s : erreur rendue sans 100 relances', (_label, expression) => {
		const errors = generationErrors({
			variables: [
				{ name: 'a', expression: '{{1..9}}' },
				{ name: 'b', expression }
			],
			blanks: [{ expectedAnswer: 'b' }]
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatch(/"b"/);
		expect(errors[0]).not.toMatch(/retries/);
	});

	it('une erreur qui dépend du tirage (division par zéro) est toujours relancée', () => {
		for (let seed = 0; seed < 10; seed++) {
			const instance = generate(
				{
					variables: [
						{ name: 'a', expression: '{{0..1}}' },
						{ name: 'b', expression: '{{eval:1/a}}' }
					],
					blanks: [{ expectedAnswer: 'b' }]
				},
				seed
			);
			expect(value(instance, 'a')).toBe('1');
		}
	});

	it('arccos hors domaine est toujours relancé', () => {
		const instance = generate({
			variables: [
				{ name: 'a', expression: '{{1..3}}' },
				{ name: 'b', expression: '{{eval:arccos(a/2);d}}' }
			],
			blanks: [{ expectedAnswer: 'b' }]
		});
		expect(Number(value(instance, 'a'))).toBeLessThanOrEqual(2);
	});
});

// ============================================================================
// 6. cleanCoefficients
// ============================================================================

describe('cleanCoefficients : étapes générées', () => {
	it('`{{a}}x+{{b}}=5` avec a = 1, b = 0 : les étapes partent de `x = 5`', () => {
		const instance = generate(
			{
				variables: [
					{ name: 'a', expression: '1' },
					{ name: 'b', expression: '0' }
				],
				statement: templateMarkdown('$${{a}}x+{{b}}=5$$ $?$'),
				blanks: [{ expectedAnswer: '5' }],
				correction: { generatedSteps: { kind: 'linear-equation', equation: '{{a}}x+{{b}}=5' } }
			},
			0,
			{ cleanCoefficients: true }
		);
		const latex = (instance.correction?._renderedSteps ?? []).map((s) => s.expressionLatex);
		expect(latex.length).toBeGreaterThan(0);
		expect(latex.join(' ')).not.toMatch(/1x|\+ 0/);
	});

	it('sans l’option, les étapes générées ne changent pas', () => {
		const instance = generate({
			variables: [
				{ name: 'a', expression: '1' },
				{ name: 'b', expression: '0' }
			],
			blanks: [{ expectedAnswer: '5' }],
			correction: { generatedSteps: { kind: 'linear-equation', equation: '{{a}}x+{{b}}=5' } }
		});
		expect(instance.correction?._renderedSteps?.[0]?.expressionLatex).toBe('1x + 0 = 5');
	});
});

describe('cleanCoefficients : réponse attendue écrite avec \\leqslant', () => {
	it('`x^2+{{b}}x\\leqslant 2` avec b = 1 : réponse attendue nettoyée', () => {
		const instance = generate(
			{
				variables: [{ name: 'b', expression: '1' }],
				blanks: [{ expectedAnswer: 'x^2+{{b}}x\\leqslant 2' }]
			},
			0,
			{ cleanCoefficients: true }
		);
		expect(expected(instance)).not.toMatch(/1x/);
		expect(instance.blanks?.[0]?.expectedAnswerLatex).toBe('x^2 + x \\leqslant 2');
	});

	it('cleanCoefficientsCustom garde l’écriture LaTeX de la relation', () => {
		expect(cleanCoefficientsCustom('x^2+1x\\leqslant 2')).toBe('x^2 + x \\leqslant 2');
		expect(cleanCoefficientsCustom('1x\\geqslant -3')).toBe('x \\geqslant -3');
	});

	it('rien à nettoyer : texte d’origine', () => {
		expect(cleanCoefficientsCustom('x^2+x\\leqslant 2')).toBe('x^2+x\\leqslant 2');
	});

	it('chaîne `0\\leqslant x\\leqslant 2` : laissée telle quelle', () => {
		expect(cleanCoefficientsCustom('0\\leqslant 1x\\leqslant 2')).toBe(
			'0\\leqslant 1x\\leqslant 2'
		);
	});
});

describe('cleanCoefficients : parenthèse devenue inutile', () => {
	it.each([
		['(x+0)^2', 'x^2'],
		['2(x+0)', '2x'],
		['-(x+0)', '-x'],
		['(1x+0)(x+1)', 'x(x+1)']
	])('`%s` → `%s`', (source, result) => {
		expect(cleanCoefficientsCustom(source)).toBe(result);
	});

	it.each([
		['(x+1+0)^2', '(x+1)^2'],
		['2(x-1+0)', '2(x-1)']
	])('parenthèse nécessaire gardée : `%s` → `%s`', (source, result) => {
		expect(cleanCoefficientsCustom(source)).toBe(result);
	});

	it('notation fonctionnelle gardée : `C(x+0)` (C non déclarée) → `C(x)`', () => {
		expect(cleanCoefficientsCustom('C(x+0)')).toBe('C(x)');
	});

	it('fonction déclarée jamais touchée : `f(x+0)` reste tel quel', () => {
		expect(cleanCoefficientsCustom('f(x+0)')).toBe('f(x+0)');
	});

	it('dans un énoncé : `$({{a}}x+{{b}})^2$` avec a = 1, b = 0 → `x^2`', () => {
		const instance = generate(
			{
				variables: [
					{ name: 'a', expression: '1' },
					{ name: 'b', expression: '0' }
				],
				statement: templateMarkdown('$({{a}}x+{{b}})^2=?$'),
				blanks: [{ expectedAnswer: '1' }]
			},
			0,
			{ cleanCoefficients: true }
		);
		expect(String(instance.statement)).toMatch(/^\$x\^2 = /);
	});
});

// ============================================================================
// 8. Motifs requiredForm et fonctions déclarées
// ============================================================================

describe('requiredForm : un motif lit les fonctions déclarées du modèle', () => {
	const genericFunctions = templateGenericFunctions(['C']);

	it('`a:integer*C(b:integer)` reconnaît `3C(2)` avec C déclarée', () => {
		expect(
			checkRequiredForm(['3C(2)'], { pattern: 'a:integer*C(b:integer)' }, { genericFunctions })
		).toEqual([]);
	});

	it('et refuse `C(2)+3`', () => {
		expect(
			checkRequiredForm(['C(2)+3'], { pattern: 'a:integer*C(b:integer)' }, { genericFunctions })
		).toEqual([0]);
	});

	it('fonction par défaut `f` lue comme fonction dans un motif', () => {
		expect(checkRequiredForm(['3f(2)'], { pattern: 'a:integer*f(b:integer)' })).toEqual([]);
	});

	it('motif sans fonction : inchangé', () => {
		expect(checkRequiredForm(['2\\times 3'], { pattern: 'a:integer * b:integer' })).toEqual([]);
	});
});
