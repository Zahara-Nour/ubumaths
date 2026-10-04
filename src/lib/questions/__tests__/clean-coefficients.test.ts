/**
 * Nettoyage des coefficients d'un modèle (`shared.cleanCoefficients`)
 * ====================================================================
 *
 * `{{a}}x{{b;+}}y{{c;+}}=0` tiré avec a = 1, b = −1, c = 0 affichait « 1x-1y+0=0 ».
 * Avec l'option, les formules passent par une sélection des étapes cosmétiques de
 * `buildASTPipeline` (0·x → 0, x + 0 → x, signes, 1·x → x). Sans l'option, rien ne change.
 * Cf. docs/wip/nettoyer-coefficients-progress.md.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema } from '../template-schema';
import { createQuestionTemplateSchema } from '$lib/server/validation/questions';
import { validateAnswer } from '$lib/utils/answer-validator';
import {
	cleanCoefficientsAst,
	cleanCoefficientsCustom,
	keepsValue,
	latexRelationsToCustom
} from '../clean-coefficients';
import { coefficientCleanupSteps } from '$lib/mathAST/cosmetic-transforms';
import { parseCustomSafe, toLatex } from '$lib/mathAST';
import { templateGenericFunctions } from '../generic-functions';
import type { QuestionInstance, QuestionTemplate, SharedVariationDefaults } from '../types';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

/** Formule maison → LaTeX après nettoyage (la formule doit se lire) */
function cleaned(source: string, functions?: string[]): string {
	const genericFunctions = templateGenericFunctions(functions);
	const parsed = parseCustomSafe(source, { genericFunctions });
	if (!parsed.ast) throw new Error(`formule illisible : ${source}`);
	return toLatex(cleanCoefficientsAst(parsed.ast), { preserveHoles: true });
}

/** Même formule, sans nettoyage */
function raw(source: string, functions?: string[]): string {
	const genericFunctions = templateGenericFunctions(functions);
	const parsed = parseCustomSafe(source, { genericFunctions });
	if (!parsed.ast) throw new Error(`formule illisible : ${source}`);
	return toLatex(parsed.ast, { preserveHoles: true });
}

/** Modèle à une case, énoncé et réponse attendue au choix */
function template(
	statement: string,
	expectedAnswer: string,
	variables: Array<{ name: string; expression: string }>,
	shared?: SharedVariationDefaults,
	extra?: Partial<QuestionTemplate['variations'][number]>
): QuestionTemplate {
	return {
		id: 'test-clean-coefficients',
		title: 'Équation de droite',
		status: 'draft',
		...(shared && { shared }),
		variations: [
			{
				statement: templateMarkdown(statement),
				variables,
				blanks: [{ expectedAnswer }],
				...extra
			}
		],
		grades: ['1_SPE'],
		theme: 'Géométrie',
		domain: 'Géométrie repérée',
		level: 1
	};
}

function generate(t: QuestionTemplate): QuestionInstance {
	const result = generateInstance(t, 1);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

const LINE_VARIABLES = [
	{ name: 'a', expression: '1' },
	{ name: 'b', expression: '-1' },
	{ name: 'c', expression: '0' }
];

// ============================================================================
// SÉLECTION DES ÉTAPES (source unique : buildASTPipeline)
// ============================================================================

describe('coefficientCleanupSteps', () => {
	it('reprend 4 étapes du pipeline, dans son ordre', () => {
		expect(coefficientCleanupSteps().map((step) => step.constraintId)).toEqual([
			'factorZero',
			'nullTerms',
			'signs',
			'factorOne'
		]);
	});
});

// ============================================================================
// NETTOYAGE D'UNE FORMULE
// ============================================================================

describe('cleanCoefficientsAst — cas mesurés', () => {
	it.each([
		['-1x^2+5', '-x^2 + 5'],
		['1x+(-1)y+4=0', 'x - y + 4 = 0'],
		['1x-1y+0=0', 'x - y = 0'],
		['0x+1y-3=0', 'y - 3 = 0'],
		['-(-2)x+0', '2 x']
	])('%s → %s', (source, expected) => {
		expect(cleaned(source)).toBe(expected);
	});

	it.each(['y=3-x/2', '2x-3y+5=0'])('%s inchangé', (source) => {
		expect(cleaned(source)).toBe(raw(source));
	});

	it('formule inchangée : le MÊME nœud est rendu (texte d’origine conservé)', () => {
		const parsed = parseCustomSafe('2x-3y+5=0');
		expect(cleanCoefficientsAst(parsed.ast!)).toBe(parsed.ast);
	});
});

describe('cleanCoefficientsAst — gardes', () => {
	it.each(['f(1)', "f'(-3)", 'f(0)+2'])('fonction par défaut %s intacte', (source) => {
		expect(cleaned(source)).toBe(raw(source));
	});

	it('P(1) avec P déclaré : intact', () => {
		expect(cleaned('P(1)', ['P'])).toBe(raw('P(1)', ['P']));
		expect(cleaned("P'(-3)+0", ['P'])).toBe(raw("P'(-3)", ['P']));
	});

	it.each(['C(1)', 'C(-3)', 'C(0)+1'])(
		'parenthèse collée à une lettre non déclarée %s : intacte',
		(source) => {
			expect(cleaned(source)).toBe(raw(source));
		}
	);

	it.each(['x*(-7)=42', '97.6*1', '3*0+x'])(
		'facteur qui n’est pas un coefficient %s : intact',
		(source) => {
			expect(cleaned(source)).toBe(raw(source));
		}
	);

	it('signe d’un numérateur ou d’un dénominateur : reste dans la fraction', () => {
		expect(cleaned('k={{-10}/{10}}=-1')).toBe(raw('k={{-10}/{10}}=-1'));
		expect(cleaned('{{-1x}/{2}}')).toBe(raw('{{-x}/{2}}'));
		expect(cleaned('{{x}/{-2}}+0')).toBe(raw('{{x}/{-2}}'));
	});

	it.each(['+\\infty', '+1', '+3x'])('signe + écrit %s : reste écrit', (source) => {
		expect(cleaned(source)).toBe(raw(source));
	});

	it('+1x : le + reste, le 1 part', () => {
		expect(cleaned('+1x')).toBe(raw('+x'));
	});

	it.each(['r=-1-(-4)=3', 'r=0-1=-1', 'f(0)=a(0+2)^2-3=4a-3', 'V=21-0^2=21'])(
		'chaîne de calcul %s : intacte',
		(source) => {
			expect(cleaned(source)).toBe(raw(source));
		}
	);

	it('relation qui deviendrait x + 3 = x + 3 : intacte', () => {
		expect(cleaned('x-(-3)=x+3')).toBe(raw('x-(-3)=x+3'));
	});

	it('f(-3)=9 ne devient jamais « -f 3 = 9 »', () => {
		expect(cleaned('f(-3)=9')).toBe(raw('f(-3)=9'));
		expect(cleaned('1C(-3)=9')).toBe(raw('C(-3)=9'));
	});

	it('une case n’est jamais perdue (0×? reste)', () => {
		expect(cleaned('0*?+x')).toBe(raw('0*?+x'));
		expect(cleaned('1x+?=0')).toBe('x + ? = 0');
	});
});

describe('cleanCoefficientsCustom — réponse attendue', () => {
	it('1x-1y+0=0 → x-y=0', () => {
		expect(cleanCoefficientsCustom('1x-1y+0=0')).toBe('x-y=0');
	});

	it('formule déjà propre : texte d’origine, à l’octet près', () => {
		expect(cleanCoefficientsCustom('2x - 3y + 5 = 0')).toBe('2x - 3y + 5 = 0');
	});

	it('formule illisible : intacte, sans exception', () => {
		expect(cleanCoefficientsCustom('1x+(((')).toBe('1x+(((');
		expect(cleanCoefficientsCustom('')).toBe('');
	});
});

// ============================================================================
// EXPONENTIELLE : la constante e s'écrivait `\euler`, illisible pour le validateur
// ============================================================================

describe('cleanCoefficientsCustom — autour de e^', () => {
	// `toCustom` écrit la constante `\euler` : l'attendue nettoyée, relue en LaTeX par
	// le validateur, était illisible et la bonne réponse de l'élève jugée fausse.
	it.each([
		['1e^{2x}', 'e^{2x}'],
		['-1e^{x}', '-e^x'],
		['e^{1x}', 'e^x'],
		['e^{-1x}', 'e^{-x}'],
		['2e^{x}+-3', '2e^x-3'],
		['(1x+-3)e^{x}', '(x-3)e^x'],
		['1e^{2x}+0', 'e^{2x}']
	])('%s → %s', (source, expected) => {
		expect(cleanCoefficientsCustom(source)).toBe(expected);
	});

	it('e^{0x} → e^0 (une puissance nulle n’est pas réduite, comme x^0)', () => {
		expect(cleanCoefficientsCustom('e^{0x}')).toBe('e^0');
		expect(cleanCoefficientsCustom('x^0')).toBe('x^0');
	});

	it('constante π suivie d’une lettre : jamais `\\pix` (formule laissée telle quelle)', () => {
		const out = cleanCoefficientsCustom('1\\pi x');
		expect(out).not.toContain('\\pix');
		expect(parseCustomSafe(out).ast).not.toBeNull();
	});

	it('réponse de l’élève juste avec l’attendue nettoyée (modèle de Terminale)', () => {
		const vars = [
			{ name: 'k', expression: '1' },
			{ name: 'a', expression: '2' },
			{ name: 'b', expression: '-3' }
		];
		const instance = generate(
			template('$f(x)=?$', '{{k}}e^{{{a}}x}{{b;+}}', vars, { cleanCoefficients: true })
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('e^{2x}-3');
		expect(validateAnswer(['e^{2x}-3'], instance, ['e^{2x}-3']).status).toBe('correct');
		expect(validateAnswer(['e^{2x}+3'], instance, ['e^{2x}+3']).isCorrect).toBe(false);
	});
});

// ============================================================================
// SCHÉMA
// ============================================================================

describe('schéma', () => {
	// Le schéma strict refuse `id` (attribué par la base)
	const { id: _id, ...base } = template('$?$', 'x', [], { cleanCoefficients: true });

	it('booléen accepté (strict et route)', () => {
		expect(questionTemplateSchema.safeParse(base).success).toBe(true);
		expect(
			createQuestionTemplateSchema
				.safeParse({
					...base,
					type: 'fill_in_blanks',
					grades: ['1_SPE'],
					delay: 30
				})
				.error?.issues.some((issue) => issue.path.includes('cleanCoefficients'))
		).toBeFalsy();
	});

	it('non-booléen refusé (strict et route)', () => {
		const bad = { ...base, shared: { cleanCoefficients: 'oui' as unknown as boolean } };
		expect(questionTemplateSchema.safeParse(bad).success).toBe(false);
		const route = createQuestionTemplateSchema.safeParse({ ...bad, delay: 30 });
		expect(
			route.error?.issues.some((issue) => issue.path.join('.') === 'shared.cleanCoefficients')
		).toBe(true);
	});
});

// ============================================================================
// GÉNÉRATION
// ============================================================================

describe('generateInstance avec cleanCoefficients', () => {
	const statement = 'Droite $d$ : ${{a}}x{{b;+}}y+{{c}}=0$. Équation : $?$';
	const expected = '{{a}}x{{b;+}}y+{{c}}=0';

	it('énoncé et réponse attendue nettoyés', () => {
		const instance = generate(
			template(statement, expected, LINE_VARIABLES, { cleanCoefficients: true })
		);
		expect(String(instance.statement)).toContain('$x - y = 0$');
		expect(instance.blanks?.[0].expectedAnswer).toBe('x-y=0');
		expect(instance.blanks?.[0].expectedAnswerLatex).toBe('x - y = 0');
	});

	it('option absente ou false : strictement rien ne change', () => {
		const without = generate(template(statement, expected, LINE_VARIABLES));
		const off = generate(
			template(statement, expected, LINE_VARIABLES, { cleanCoefficients: false })
		);
		expect(String(without.statement)).toContain('1 x - 1 y + 0 = 0');
		expect(without.blanks?.[0].expectedAnswer).toBe('1x-1y+0=0');
		expect({ ...off, generatedAt: '' }).toEqual({ ...without, generatedAt: '' });
	});

	it('réponse de l’élève juste avec l’attendu nettoyé', () => {
		const instance = generate(
			template(statement, expected, LINE_VARIABLES, { cleanCoefficients: true })
		);
		expect(validateAnswer(['x-y=0'], instance, ['x-y=0']).isCorrect).toBe(true);
		expect(validateAnswer(['x+y=0'], instance, ['x+y=0']).isCorrect).toBe(false);
	});

	it('verdict inchangé : la même réponse est juste avec et sans nettoyage', () => {
		const vars = [
			{ name: 'a', expression: '1' },
			{ name: 'b', expression: '-1' },
			{ name: 'c', expression: '4' }
		];
		const t = (shared?: SharedVariationDefaults) =>
			template('$?$', '{{a}}x+({{b}})y+{{c}}=0', vars, shared);
		const on = generate(t({ cleanCoefficients: true }));
		const off = generate(t());
		expect(on.blanks?.[0].expectedAnswer).toBe('x-y+4=0');
		for (const answer of ['x-y+4=0', '-x+y-4=0', 'x-y=0', 'x-y+4']) {
			expect(validateAnswer([answer], on, [answer]).status).toBe(
				validateAnswer([answer], off, [answer]).status
			);
		}
	});

	it('correction, feedback et choix de QCM nettoyés', () => {
		const t: QuestionTemplate = {
			...template('$y={{a}}x+{{c}}$', '1', LINE_VARIABLES, { cleanCoefficients: true }),
			variations: [
				{
					statement: templateMarkdown('$y={{a}}x+{{c}}$ ?'),
					variables: LINE_VARIABLES,
					correctChoiceIndex: '0',
					choices: [
						{ content: templateMarkdown('${{a}}x+{{c}}$'), isCorrect: true },
						{ content: templateMarkdown('$2x$'), isCorrect: false }
					],
					correction: {
						steps: [templateMarkdown('On a $y={{b}}x+{{c}}$.')],
						feedback: { incorrect: templateMarkdown('Revoir $y={{a}}x$.') }
					}
				}
			]
		};
		const instance = generate(t);
		expect(String(instance.statement)).toContain('$y = x$');
		expect(instance.choices?.map((c) => String(c.content))).toContain('$x$');
		expect(String(instance.correction?.steps?.[0])).toContain('$y = -x$');
		expect(String(instance.correction?.feedback?.incorrect)).toContain('$y = x$');
	});

	it('formule LaTeX d’auteur (non lisible en syntaxe maison) intacte', () => {
		const instance = generate(
			template(
				'$f\\left(1\\right)={{a}}$ et $\\begin{cases}1x\\end{cases}$ : $?$',
				'1',
				LINE_VARIABLES,
				{ cleanCoefficients: true }
			)
		);
		expect(String(instance.statement)).toContain('\\begin{cases}1x\\end{cases}');
		expect(String(instance.statement)).toMatch(/f\\left\(\s*1\s*\\right\)/);
	});

	it('point ouvert : `{{c;+}}` avec c = 0 rend « y0 », jamais réduit en x = 0', () => {
		const instance = generate(
			template('$?$', '{{a}}x{{b;+}}y{{c;+}}=0', LINE_VARIABLES, { cleanCoefficients: true })
		);
		expect(instance.blanks?.[0].expectedAnswer).not.toBe('x=0');
	});
});

// ============================================================================
// INÉGALITÉS ÉCRITES EN LATEX (`\leqslant`, `\geq`, `\neq`…)
// ============================================================================

describe('latexRelationsToCustom', () => {
	it.each([
		['x\\leqslant2', 'x<=2'],
		['x\\leq 2', 'x<= 2'],
		['x\\le2', 'x<=2'],
		['x\\geqslant2', 'x>=2'],
		['x\\geq2', 'x>=2'],
		['x\\ge 2', 'x>= 2'],
		['x\\neq2', 'x!=2'],
		['x\\ne2', 'x!=2'],
		['x\\lt2', 'x<2'],
		['x\\gt2', 'x>2']
	])('%s → %s', (source, expected) => {
		expect(latexRelationsToCustom(source)).toBe(expected);
	});

	it.each(['\\left(x\\right)', '\\neg x', '\\geometry', 'x<=2'])('%s intact', (source) => {
		expect(latexRelationsToCustom(source)).toBe(source);
	});
});

describe('keepsValue — garde de valeur d’une relation, membre à membre', () => {
	const parse = (source: string) => {
		const parsed = parseCustomSafe(source);
		if (!parsed.ast) throw new Error(`formule illisible : ${source}`);
		return parsed.ast;
	};

	it.each([
		['x^2+1x<=2', 'x^2+x<=2'],
		['0x+y>=-(-3)', 'y>=3'],
		['1x-1y+0=0', 'x-y=0']
	])('%s → %s : valeur conservée', (before, after) => {
		expect(keepsValue(parse(before), parse(after))).toBe(true);
	});

	it.each([
		['x^2+x<=2', 'x^2+x<=3'],
		['x^2+x<=2', '2x^2+2x<=4'],
		['x^2+x<=2', 'x^2+x>=2'],
		['x^2+x<2', '2<x^2+x'],
		['x-y=0', 'y-x=0']
	])('%s → %s : refusé (un membre ou la relation change)', (before, after) => {
		expect(keepsValue(parse(before), parse(after))).toBe(false);
	});
});

describe('generateInstance avec cleanCoefficients — inégalités', () => {
	const variables = (a: string) => [
		{ name: 'a', expression: a },
		{ name: 'b', expression: '2' }
	];
	const statementOf = (relation: string, a: string, shared?: SharedVariationDefaults) =>
		String(
			generate(template(`$x^2+{{a}}x${relation}{{b}}$ : $?$`, '1', variables(a), shared)).statement
		);

	describe.each([
		['\\leqslant', '\\leqslant'],
		['\\geqslant', '\\geqslant'],
		['\\leq', '\\leqslant'],
		['\\geq', '\\geqslant'],
		['\\le', '\\leqslant'],
		['\\ge', '\\geqslant'],
		['\\neq', '\\neq'],
		['<', '<'],
		['>', '>']
	])('%s', (relation, rendered) => {
		it.each([
			['1', `$x^2 + x ${rendered} 2$`],
			['-1', `$x^2 - x ${rendered} 2$`],
			['0', `$x^2 ${rendered} 2$`]
		])('a = %s → %s', (a, expected) => {
			expect(statementOf(relation, a, { cleanCoefficients: true })).toContain(expected);
		});
	});

	it('option absente : \\leqslant laissé tel quel', () => {
		expect(statementOf('\\leqslant', '1')).toContain('$x^2+1x\\leqslant2$');
	});

	it('rien à nettoyer : le texte d’auteur reste à l’octet près', () => {
		expect(statementOf('\\leqslant', '3', { cleanCoefficients: true })).toContain(
			'$x^2+3x\\leqslant2$'
		);
	});

	it('chaîne a \\leqslant b \\leqslant c : laissée telle quelle (comme a = b = c)', () => {
		const instance = generate(
			template('$0\\leqslant {{a}}x\\leqslant 2$ : $?$', '1', variables('1'), {
				cleanCoefficients: true
			})
		);
		expect(String(instance.statement)).toContain('$0\\leqslant 1x\\leqslant 2$');
	});

	it('relation qui deviendrait triviale : intacte', () => {
		const instance = generate(
			template('$x-({{a}})\\leqslant x+3$ : $?$', '1', variables('-3'), {
				cleanCoefficients: true
			})
		);
		expect(String(instance.statement)).toContain('$x-(-3)\\leqslant x+3$');
	});

	it('LaTeX non lisible autour (\\in, \\mathbb) : intact', () => {
		const instance = generate(
			template('$1x\\leqslant 2, x\\in\\mathbb{R}$ : $?$', '1', variables('1'), {
				cleanCoefficients: true
			})
		);
		expect(String(instance.statement)).toContain('$1x\\leqslant 2, x\\in\\mathbb{R}$');
	});
});
