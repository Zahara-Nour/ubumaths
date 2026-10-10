/**
 * Résultat attendu (R1-R10, chantier « résultat attendu », lot 1)
 * ===============================================================
 *
 * `buildExpectedResult` décrit, en DONNÉES (pas en HTML), ce que l'élève voit
 * au premier niveau de correction : comparaison `3 + 5 ≠ 9` / `= 8`, énoncé
 * rempli, « Ta réponse », QCM, remarques. Les statuts sont sémantiques : la
 * couleur appartient à l'affichage (écran ou PDF).
 */

import { describe, it, expect } from 'vitest';
import {
	buildExpectedResult,
	fillMarkdown,
	type ExpectedLine,
	type ExpectedResult
} from '../expected-result';
import { generateInstance } from '../generator/instance-generator';
import { CONSTRAINT_FEEDBACK } from '../feedback';
import { REAL_TEMPLATES } from '$lib/server/validation/__tests__/fixtures/real-templates';
import type { InstanceBlank, QuestionInstance, QuestionTemplate } from '../types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
function template(
	statement: string,
	blanks: unknown[],
	extra: Record<string, unknown> = {},
	variables: unknown[] = []
): QuestionTemplate {
	return {
		id: 't',
		type: 'fill_in_blanks',
		level: 1,
		theme: 'x',
		domain: 'y',
		grades: ['6'],
		title: 't',
		variations: [{ statement, blanks, variables, ...extra }]
	} as unknown as QuestionTemplate;
}

function generate(t: QuestionTemplate, seed = 1): QuestionInstance {
	const r = generateInstance(t, seed);
	if (!r.success) throw new Error(JSON.stringify(r.errors));
	return r.instance;
}

/** `$$<<expr:expression>>a + 1$$`, une case (convention expression) */
const expressionInstance = generate(REAL_TEMPLATES.singleBlank, 3);
const exprLhs =
	expressionInstance.expressions![0].displayLatex ?? expressionInstance.expressions![0].latex;
const exprSolution = expressionInstance.blanks![0].expectedAnswer;

/** `$3 + 5 = ?$` */
const equalsInstance = generate(template('$3+5=?$', [{ expectedAnswer: '8' }]));

const kinds = (r: ExpectedResult) => r.lines.map((l) => l.kind);
function line<K extends ExpectedLine['kind']>(
	r: ExpectedResult,
	kind: K
): Extract<ExpectedLine, { kind: K }> {
	const found = r.lines.find((l) => l.kind === kind);
	if (!found) throw new Error(`ligne ${kind} absente : ${JSON.stringify(r.lines)}`);
	return found as Extract<ExpectedLine, { kind: K }>;
}
const answer = (values: string[]) => ({ values, latex: values });
/** Rendu témoin : `[valeur|statut]` à la place de chaque case */
const witness = (markdown: string, fills: Parameters<typeof fillMarkdown>[1]) =>
	fillMarkdown(markdown, fills, (f) => `[${f.value}|${f.status}]`);
/** Aucune ligne ne porte « ≠ » */
const noNotEqual = (r: ExpectedResult) =>
	r.lines.every((l) => l.kind !== 'comparison' || l.relation === '=');

// Tests
describe('R1 — la case est tout le membre de droite', () => {
	describe.each([
		['convention expression', expressionInstance, exprLhs, exprSolution],
		['$3+5=?$', equalsInstance, '3 + 5', '8']
	])('%s', (_name, instance, lhs, solution) => {
		it('juste : une seule ligne `lhs = réponse` (statut correct)', () => {
			const r = buildExpectedResult(instance, answer([solution]));
			expect(r.status).toBe('correct');
			expect(r.lines).toEqual([
				{
					kind: 'comparison',
					lhs,
					relation: '=',
					answer: { index: 0, context: 'math', value: solution, status: 'correct' }
				}
			]);
		});

		it('faux : `lhs ≠ réponse` puis `= solution`', () => {
			const r = buildExpectedResult(instance, answer(['999']));
			expect(r.status).toBe('incorrect');
			expect(r.lines).toEqual([
				{
					kind: 'comparison',
					lhs,
					relation: '≠',
					answer: { index: 0, context: 'math', value: '999', status: 'incorrect' }
				},
				{ kind: 'solution', lhs, latex: solution, possible: false }
			]);
		});

		it('vide : `= solution` puis « Tu n’as rien répondu. »', () => {
			const r = buildExpectedResult(instance, answer(['']));
			expect(r.status).toBe('empty');
			expect(r.lines).toEqual([
				{ kind: 'solution', lhs, latex: solution, possible: false },
				{ kind: 'empty', text: "Tu n'as rien répondu." }
			]);
		});
	});
});

describe('R2 — forme non optimale', () => {
	it('réponse en ambre (=), remarque dessous, puis la solution', () => {
		const r = buildExpectedResult(equalsInstance, answer(['08']));
		expect(r.status).toBe('unoptimal_form');
		expect(kinds(r)).toEqual(['comparison', 'remark', 'solution']);
		const c = line(r, 'comparison');
		expect(c.relation).toBe('=');
		expect(c.answer).toEqual({ index: 0, context: 'math', value: '08', status: 'unoptimal' });
		expect(line(r, 'remark')).toEqual({
			kind: 'remark',
			index: 0,
			text: CONSTRAINT_FEEDBACK.zeros.single
		});
	});

	it('mauvaise forme (valeur juste) : `=`, jamais `≠`', () => {
		const r = buildExpectedResult(equalsInstance, answer(['4+4']));
		expect(r.status).toBe('bad_form');
		expect(line(r, 'comparison').relation).toBe('=');
		expect(line(r, 'comparison').answer.status).toBe('incorrect');
		expect(kinds(r)).toContain('remark');
		expect(kinds(r)).toContain('solution');
	});
});

describe('R3 — énoncé rempli puis « Ta réponse »', () => {
	it('`?+5=10` : solutions dans l’énoncé, cases de l’élève avec leur statut', () => {
		const inst = generate(template('$?+5=10$', [{ expectedAnswer: '5' }]));
		const r = buildExpectedResult(inst, answer(['4']));
		expect(kinds(r)).toEqual(['filled-statement', 'your-answer']);
		const filled = line(r, 'filled-statement');
		expect(witness(filled.markdown, filled.fills)).toBe('$[5|solution] + 5 = 10$');
		const mine = line(r, 'your-answer');
		expect(witness(mine.markdown, mine.fills)).toBe('$[4|incorrect] + 5 = 10$');
		expect(noNotEqual(r)).toBe(true);
	});

	it('tout juste : l’énoncé rempli par les réponses de l’élève, sans « Ta réponse »', () => {
		const inst = generate(template('$?+5=10$', [{ expectedAnswer: '5' }]));
		const r = buildExpectedResult(inst, answer(['5']));
		expect(kinds(r)).toEqual(['filled-statement']);
		const filled = line(r, 'filled-statement');
		expect(witness(filled.markdown, filled.fills)).toBe('$[5|correct] + 5 = 10$');
	});

	it('`?<c<?` (modèle réel, convention expression à trous) : pas de « = » ajouté', () => {
		const inst = generate(REAL_TEMPLATES.multiBlank, 2);
		const [a, b] = inst.blanks!.map((x) => x.expectedAnswer);
		const r = buildExpectedResult(inst, answer([a, '9']));
		const filled = line(r, 'filled-statement');
		const text = witness(filled.markdown, filled.fills);
		expect(text).toContain(`[${a}|solution] < `);
		expect(text).toContain(`< [${b}|solution]`);
		expect(text).not.toContain('<<expr');
		expect(text).not.toMatch(/\]\s*=/);
		const mine = line(r, 'your-answer');
		expect(mine.fills.map((f) => f.status)).toEqual(['correct', 'incorrect']);
	});

	it('`?\\times10^{?}` (format multi-cases d’une expression) : R3, `=` du format ajouté', () => {
		const inst = generate(
			template(
				'$${{expression}}$$',
				[{ expectedAnswer: '3.5' }, { expectedAnswer: '3' }],
				{ answerFormats: { expression: '?\\times10^{?}' } },
				[{ name: 'expression', expression: '3500' }]
			)
		);
		const r = buildExpectedResult(inst, answer(['3.5', '2']));
		expect(kinds(r)).toEqual(['filled-statement', 'your-answer']);
		const filled = line(r, 'filled-statement');
		expect(witness(filled.markdown, filled.fills)).toBe(
			'$$3500 = [3.5|solution]\\times10^{[3|solution]}$$'
		);
	});

	it('case dans le texte `[_]` : remplie en contexte texte', () => {
		const inst = generate(
			template("Un triangle à trois côtés égaux s'appelle un [_].", [
				{ expectedAnswer: 'équilatéral' }
			])
		);
		const r = buildExpectedResult(inst, answer(['isocèle']));
		const filled = line(r, 'filled-statement');
		expect(filled.fills).toEqual([
			{ index: 0, context: 'text', value: 'équilatéral', status: 'solution' }
		]);
		expect(witness(filled.markdown, filled.fills)).toBe(
			"Un triangle à trois côtés égaux s'appelle un [équilatéral|solution]."
		);
		expect(line(r, 'your-answer').fills[0]).toEqual({
			index: 0,
			context: 'text',
			value: 'isocèle',
			status: 'incorrect'
		});
	});

	it('formule et texte mêlés', () => {
		const inst = generate(
			template('Le nombre $?$ est [_].', [{ expectedAnswer: '4' }, { expectedAnswer: 'pair' }])
		);
		const r = buildExpectedResult(inst, answer(['4', 'impair']));
		const filled = line(r, 'filled-statement');
		expect(witness(filled.markdown, filled.fills)).toBe(
			'Le nombre $[4|solution]$ est [pair|solution].'
		);
		expect(line(r, 'your-answer').fills.map((f) => [f.context, f.status])).toEqual([
			['math', 'correct'],
			['text', 'incorrect']
		]);
	});

	it('vide partiel : statut « empty » sur la case vide', () => {
		const inst = generate(
			template('Le nombre $?$ est [_].', [{ expectedAnswer: '4' }, { expectedAnswer: 'pair' }])
		);
		const r = buildExpectedResult(inst, answer(['4', '']));
		expect(line(r, 'your-answer').fills.map((f) => f.status)).toEqual(['correct', 'empty']);
	});
});

describe('R4 — relation autre que `=`', () => {
	it('`3 < ?` faux : présentation R3, jamais de « ≠ »', () => {
		const inst = generate(template('$3<?$', [{ expectedAnswer: '4' }]));
		const r = buildExpectedResult(inst, answer(['2']));
		expect(kinds(r)).toEqual(['filled-statement', 'your-answer']);
		expect(noNotEqual(r)).toBe(true);
	});

	it('case qui n’est pas tout le membre de droite (`3+5=?+1`) : R3', () => {
		const inst = generate(template('$3+5=?+1$', [{ expectedAnswer: '7' }]));
		const r = buildExpectedResult(inst, answer(['6']));
		expect(kinds(r)).toEqual(['filled-statement', 'your-answer']);
	});
});

describe('R5 — QCM', () => {
	const choices = [
		{ content: 'a' as ResolvedMarkdown, isCorrect: true },
		{ content: 'b' as ResolvedMarkdown, isCorrect: false },
		{ content: 'c' as ResolvedMarkdown, isCorrect: true }
	];
	const multi = {
		templateId: 'qcm',
		statement: 'Coche' as ResolvedMarkdown,
		grades: ['6'],
		theme: 'x',
		domain: 'y',
		level: 1,
		generatedAt: '',
		choices,
		correctChoiceIndex: ['0', '2'],
		multipleAnswers: true,
		// Ordre affiché : c, a, b
		shuffledChoices: [
			{ content: 'c' as ResolvedMarkdown, originalIndex: 2 },
			{ content: 'a' as ResolvedMarkdown, originalIndex: 0 },
			{ content: 'b' as ResolvedMarkdown, originalIndex: 1 }
		]
	} as QuestionInstance;

	it('bon coché vert, faux coché rouge, bon oublié ambre (multi), dans l’ordre affiché', () => {
		const r = buildExpectedResult(multi, { choiceIndexes: [0, 1] });
		expect(r.lines).toEqual([
			{
				kind: 'choices',
				multiple: true,
				choices: [
					{ originalIndex: 2, content: 'c', checked: false, isCorrect: true, status: 'unoptimal' },
					{ originalIndex: 0, content: 'a', checked: true, isCorrect: true, status: 'correct' },
					{ originalIndex: 1, content: 'b', checked: true, isCorrect: false, status: 'incorrect' }
				]
			}
		]);
	});

	it('simple : bon choix non coché encadré (solution)', () => {
		const single = {
			...multi,
			multipleAnswers: false,
			correctChoiceIndex: '0',
			choices: [choices[0], choices[1]],
			shuffledChoices: undefined
		} as QuestionInstance;
		const r = buildExpectedResult(single, { choiceIndexes: [1] });
		expect(line(r, 'choices').choices.map((c) => c.status)).toEqual(['solution', 'incorrect']);
	});

	it('rien coché : bons choix encadrés + « Tu n’as rien répondu. »', () => {
		const r = buildExpectedResult(multi, { choiceIndexes: [] });
		expect(kinds(r)).toEqual(['choices', 'empty']);
		expect(line(r, 'choices').choices.map((c) => c.status)).toEqual([
			'solution',
			'solution',
			'neutral'
		]);
	});
});

describe('R6 — réponse de l’élève en LaTeX, intacte', () => {
	it('unité `km.h^{-1}` : LaTeX MathLive conservé tel quel', () => {
		const inst = generate(REAL_TEMPLATES.unit, 2);
		const typed = '3\\operatorname{km}\\cdot\\operatorname{h}^{-1}';
		const r = buildExpectedResult(inst, answer([typed]));
		const mine = line(r, 'your-answer');
		expect(mine.fills[0]).toEqual({ index: 0, context: 'math', value: typed, status: 'incorrect' });
		expect(line(r, 'filled-statement').fills[0].value).toBe(inst.blanks![0].expectedAnswerLatex);
	});

	it('intervalle : LaTeX de l’élève conservé', () => {
		const inst = generate(
			template('$S=?$', [{ expectedAnswer: ']-\\infty;2]', answerKind: 'intervalles' }])
		);
		const typed = '\\left]-\\infty;3\\right]';
		const r = buildExpectedResult(inst, answer([typed]));
		const c = line(r, 'comparison');
		expect(c.answer.value).toBe(typed);
		expect(c.relation).toBe('≠');
	});

	it('`0{,}5` pour ½ (acceptDecimal) : juste, écrit `0{,}5`', () => {
		const inst = generate(
			template('$\\frac{1}{2}=?$', [{ expectedAnswer: '\\frac{1}{2}', acceptDecimal: true }])
		);
		const r = buildExpectedResult(inst, answer(['0{,}5']));
		expect(r.status).toBe('correct');
		expect(line(r, 'comparison').answer).toEqual({
			index: 0,
			context: 'math',
			value: '0{,}5',
			status: 'correct'
		});
	});
});

describe('R7 — rulesSuffice', () => {
	const rulesTemplate = template(
		'Donne un diviseur de 12 autre que 1 et 12 : $?$',
		[
			{
				expectedAnswer: '3',
				rulesSuffice: true,
				validationRules: [{ type: 'divisor', dividend: '12' }]
			}
		],
		{}
	);

	it('juste : SA réponse comme solution (pas l’exemple)', () => {
		const r = buildExpectedResult(generate(rulesTemplate), answer(['4']));
		expect(kinds(r)).toEqual(['filled-statement']);
		const filled = line(r, 'filled-statement');
		expect(filled.possible).toBe(false);
		expect(filled.fills[0]).toEqual({ index: 0, context: 'math', value: '4', status: 'correct' });
	});

	it('faux : « Une réponse possible » (l’exemple), puis sa réponse', () => {
		const r = buildExpectedResult(generate(rulesTemplate), answer(['5']));
		const filled = line(r, 'filled-statement');
		expect(filled.possible).toBe(true);
		expect(filled.fills[0].value).toBe('3');
		expect(line(r, 'your-answer').fills[0].status).toBe('incorrect');
	});

	it('R1 + rulesSuffice faux : solution marquée « possible »', () => {
		// Témoin sans règle : solution ordinaire
		expect(line(buildExpectedResult(equalsInstance, answer(['5'])), 'solution').possible).toBe(
			false
		);
		const ruled = {
			...equalsInstance,
			blanks: [
				{
					...equalsInstance.blanks![0],
					rulesSuffice: true,
					validationRules: [{ type: 'custom', expression: 'answer > 7' }]
				} as InstanceBlank
			]
		};
		const r = buildExpectedResult(ruled, answer(['2']));
		expect(line(r, 'solution').possible).toBe(true);
	});
});

describe('R8 — case graphique', () => {
	it('réponse attendue seule + réponse de l’élève en texte', () => {
		const inst = {
			...equalsInstance,
			statement: 'Place le point.' as ResolvedMarkdown,
			blanks: [{ expectedAnswer: '2.5', type: 'graphical' } as InstanceBlank]
		};
		const r = buildExpectedResult(inst, answer(['3']));
		const only = line(r, 'expected-only');
		expect(only).toMatchObject({ index: 0, context: 'math', value: '2.5', studentAnswer: '3' });
		expect(kinds(r)).not.toContain('comparison');
	});
});

describe('R9 — sans réponse d’élève', () => {
	// Lot 3 (flash-cards) : un calcul R1 montre sa solution encadrée, comme la
	// ligne de solution d'une réponse vide — plus l'énoncé à case remplie
	it('convention expression : solution `lhs = solution`, seule', () => {
		const r = buildExpectedResult(expressionInstance);
		expect(r.status).toBeNull();
		expect(kinds(r)).toEqual(['solution']);
		expect(line(r, 'solution')).toEqual({
			kind: 'solution',
			lhs: exprLhs,
			latex: expressionInstance.blanks![0].expectedAnswerLatex,
			possible: false
		});
	});

	it('`$3+5=?$` : solution `3 + 5 = 8`', () => {
		const r = buildExpectedResult(equalsInstance);
		expect(kinds(r)).toEqual(['solution']);
		expect(line(r, 'solution')).toMatchObject({ lhs: '3 + 5', latex: '8' });
	});

	it('trou au milieu (pas R1) : énoncé rempli', () => {
		const inst = generate(template('$?+5=10$', [{ expectedAnswer: '5' }]));
		const r = buildExpectedResult(inst);
		const filled = line(r, 'filled-statement');
		expect(witness(filled.markdown, filled.fills)).toBe('$[5|solution] + 5 = 10$');
	});

	it('QCM : bons choix « solution », les autres neutres', () => {
		const inst = generate(REAL_TEMPLATES.multipleChoice, 1);
		const r = buildExpectedResult(inst);
		const statuses = line(r, 'choices').choices.map((c) => c.status);
		expect(statuses.filter((s) => s === 'solution')).toHaveLength(1);
		expect(statuses.filter((s) => s === 'neutral')).toHaveLength(1);
	});
});

describe('R10 — jamais d’exception', () => {
	it('case introuvable dans l’énoncé : réponse attendue sur une ligne à part', () => {
		const inst = {
			...equalsInstance,
			blanks: [...equalsInstance.blanks!, { expectedAnswer: '42', type: 'math' } as InstanceBlank]
		};
		const r = buildExpectedResult(inst);
		expect(line(r, 'expected-only')).toMatchObject({ index: 1, value: '42' });
	});

	it('instance mal formée : rend un résultat, ne lève pas', () => {
		const broken = { statement: undefined, blanks: [null] } as unknown as QuestionInstance;
		expect(() => buildExpectedResult(broken, answer(['1']))).not.toThrow();
		expect(() => buildExpectedResult({} as QuestionInstance)).not.toThrow();
	});

	it('carte de cours : aucune ligne', () => {
		const inst = generate(REAL_TEMPLATES.courseCard, 1);
		expect(buildExpectedResult(inst).lines).toEqual([]);
	});
});

describe('fillMarkdown', () => {
	it('case sans valeur : pointillés (jamais de marqueur brut)', () => {
		expect(fillMarkdown('$\\placeholder[0]{}$ et {{blank:1}}', [], (f) => f.value ?? '')).toBe(
			'$\\text{……}$ et ……'
		);
	});
});

describe('Revue PR #643 — sécurité : la réponse de l’élève est neutralisée DANS la structure', () => {
	it('formule : `\\href`, `\\htmlClass`, `$` retirés de la comparaison R1', () => {
		const hostile = '\\href{javascript:alert(1)}{9}\\htmlClass{x}{1}$ [a](b) $';
		const r = buildExpectedResult(equalsInstance, answer([hostile]));
		const value = line(r, 'comparison').answer.value ?? '';
		expect(value).not.toMatch(/\\(?:href|htmlClass)(?![a-zA-Z])/);
		expect(value).not.toContain('$');
	});

	it('texte : aucun lien ni formule fabricable dans « Ta réponse »', () => {
		const inst = generate(
			template("Un triangle à trois côtés égaux s'appelle un [_].", [
				{ expectedAnswer: 'équilatéral' }
			])
		);
		const r = buildExpectedResult(inst, answer(['[clic](https://evil.example) $x$']));
		const value = line(r, 'your-answer').fills[0].value ?? '';
		expect(value).not.toMatch(/[[\]()$]/);
	});

	it('case graphique : réponse en texte neutralisée aussi', () => {
		const inst = {
			...equalsInstance,
			statement: 'Place le point.' as ResolvedMarkdown,
			blanks: [{ expectedAnswer: '2.5', type: 'graphical' } as InstanceBlank]
		};
		const r = buildExpectedResult(inst, answer(['\\href{javascript:x}{3}']));
		expect(line(r, 'expected-only').studentAnswer).not.toContain('\\href');
	});
});

describe('Revue PR #643 — R1 seulement sans autre relation', () => {
	const r1 = (statement: string, expected = '3') =>
		kinds(
			buildExpectedResult(
				generate(template(statement, [{ expectedAnswer: expected }])),
				answer(['999'])
			)
		);

	it.each([
		['$2x+1=7 \\Longleftrightarrow x=?$'],
		['$a \\implies b=?$'],
		['$x \\in A=?$'],
		['$x \\equiv y=?$'],
		['$a \\mapsto b=?$'],
		['$x \\leqslant y=?$'],
		['$a \\longrightarrow b=?$'],
		['$a \\sim b=?$'],
		['$?=3$'],
		['$\\pi \\approx ?$'],
		['$x = 2+3 = ?$']
	])('%s → R3', (statement) => {
		expect(r1(statement)).toEqual(['filled-statement', 'your-answer']);
	});

	it('`$x = ?$ cm` : unité hors formule → R3 (l’unité n’est pas perdue)', () => {
		expect(r1('La longueur vaut $x = ?$ cm.')).toEqual(['filled-statement', 'your-answer']);
	});

	it('`$x = ?$.` (ponctuation seule après) : R1', () => {
		expect(r1('Calcule $x = ?$.')[0]).toBe('comparison');
	});

	it('`$f(x)=?$`, `\\left(…\\right)` : R1', () => {
		expect(r1('$f(x)=?$')[0]).toBe('comparison');
		expect(r1('$\\left(2+1\\right)\\times 3=?$')[0]).toBe('comparison');
	});
});

describe('Revue PR #643 — mineurs', () => {
	it('case vide dans « Ta réponse » : valeur `null` (absence explicite)', () => {
		const inst = generate(
			template('Le nombre $?$ est [_].', [{ expectedAnswer: '4' }, { expectedAnswer: 'pair' }])
		);
		const r = buildExpectedResult(inst, answer(['4', '']));
		expect(line(r, 'your-answer').fills[1]).toEqual({
			index: 1,
			context: 'text',
			value: null,
			status: 'empty'
		});
	});

	it('« x = » recopié : la réponse affichée est `5`, pas `x=5`', () => {
		const inst = generate(template('$x=?$', [{ expectedAnswer: '5' }]));
		const r = buildExpectedResult(inst, answer(['x=5']));
		expect(line(r, 'comparison').answer.value).toBe('5');
	});

	it('fillMarkdown en une passe : une valeur `{{blank:1}}` n’est pas remplacée à nouveau', () => {
		const out = fillMarkdown(
			'$\\placeholder[0]{}$ {{blank:1}}',
			[
				{ index: 0, context: 'math', value: '{{blank:1}}', status: 'incorrect' },
				{ index: 1, context: 'text', value: 'mot', status: 'correct' }
			],
			(f) => `<${f.value}>`
		);
		expect(out).toBe('$<{{blank:1}}>$ <mot>');
	});

	it('membre gauche R1 = `displayLatex` de l’expression (tel qu’affiché)', () => {
		const inst: QuestionInstance = {
			...expressionInstance,
			statement: '$$<<expr:expression>>1000 + 1$$' as ResolvedMarkdown,
			expressions: [
				{
					name: 'expression',
					latex: '1000 + 1',
					displayLatex: '1{}000 + 1',
					answerFormat: '\\placeholder[0]{}'
				}
			],
			blanks: [{ expectedAnswer: '1001', type: 'math', expressionName: 'expression' }]
		};
		const r = buildExpectedResult(inst, answer(['9']));
		expect(line(r, 'comparison').lhs).toBe('1{}000 + 1');
		const r9 = buildExpectedResult(inst);
		// R9 d'un calcul R1 : la solution, avec le même membre gauche affiché
		expect(line(r9, 'solution').lhs).toBe('1{}000 + 1');
	});

	it('QCM à règles : l’issue des choix suit les règles (statut et choix cohérents)', () => {
		const inst = {
			templateId: 'qcm-regles',
			statement: 'Choisis un nombre pair' as ResolvedMarkdown,
			grades: ['6'],
			theme: 'x',
			domain: 'y',
			level: 1,
			generatedAt: '',
			// Les données des choix disent l'inverse des règles : les règles décident
			choices: [
				{ content: '3' as ResolvedMarkdown, isCorrect: true },
				{ content: '4' as ResolvedMarkdown, isCorrect: false }
			],
			correctChoiceIndex: '0',
			validationRules: [{ type: 'custom', expression: 'answer == 1' }]
		} as QuestionInstance;
		const r = buildExpectedResult(inst, { choiceIndexes: [1] });
		expect(r.status).toBe('correct');
		const choices = line(r, 'choices').choices;
		expect(choices.find((c) => c.originalIndex === 1)).toMatchObject({
			checked: true,
			isCorrect: true,
			status: 'correct'
		});
	});
});
