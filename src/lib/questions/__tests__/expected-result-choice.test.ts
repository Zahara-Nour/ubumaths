/**
 * Résultat attendu d'une case « choix » (chantier figure-et-choix § 2.1)
 * =====================================================================
 *
 * Les choix restent À LEUR PLACE dans l'énoncé rempli (le bloc ```choix y est
 * gardé) ; la ligne `filled-statement` porte, pour chaque case choix, les choix
 * avec les statuts du QCM (cochés par l'élève, bons choix marqués, ordre
 * AFFICHÉ). « Ta réponse » ne les répète pas : jamais deux fois.
 */
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import {
	buildExpectedResult,
	withoutChoiceCases,
	type ExpectedChoiceCase,
	type ExpectedLine
} from '../expected-result';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';

function generate(statement: string, expected: string[]): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-choix',
			title: 'Choix',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [
				{
					statement: templateMarkdown(statement),
					blanks: expected.map((expectedAnswer) => ({ expectedAnswer }))
				}
			],
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		} as QuestionTemplate,
		42
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

const MULTI = generate('Choisis.\n\n```choix\nplusieurs: oui\nmelanger: non\n- a\n- b\n- c\n```', [
	'0;2'
]);
const SINGLE = generate('Choisis.\n\n```choix\nmelanger: non\n- Oui\n- Non\n```', ['0']);
const MIXED = generate('Calcule $2+3=?$.\n\n```choix\nmelanger: non\n- pair\n- impair\n```', [
	'5',
	'1'
]);

const kinds = (lines: ExpectedLine[]) => lines.map((l) => l.kind);

/** Cases choix portées par la première ligne d'énoncé rempli */
function choiceCasesOf(lines: ExpectedLine[]): ExpectedChoiceCase[] {
	const line = lines.find((l) => l.kind === 'filled-statement');
	return line?.kind === 'filled-statement' ? (line.choiceCases ?? []) : [];
}

describe('case choix seule : les statuts du QCM, à leur place dans l’énoncé', () => {
	it('bon coché vert, faux coché rouge, bon oublié ambre (plusieurs)', () => {
		const r = buildExpectedResult(MULTI, { values: ['0;1'] });
		expect(r.status).toBe('incorrect');
		// Énoncé rempli avec son bloc ; pas de « Ta réponse » (rien d'autre à remplir)
		expect(kinds(r.lines)).toEqual(['filled-statement']);
		const [filled] = r.lines;
		expect(filled.kind === 'filled-statement' && filled.markdown).toContain('```choix\ncase: 0');
		expect(choiceCasesOf(r.lines)).toEqual([
			{
				index: 0,
				multiple: true,
				choices: [
					{ originalIndex: 0, content: 'a', checked: true, isCorrect: true, status: 'correct' },
					{ originalIndex: 1, content: 'b', checked: true, isCorrect: false, status: 'incorrect' },
					{ originalIndex: 2, content: 'c', checked: false, isCorrect: true, status: 'unoptimal' }
				]
			}
		]);
	});

	it('une réponse : bon choix non coché encadré (solution)', () => {
		const r = buildExpectedResult(SINGLE, { values: ['1'] });
		expect(choiceCasesOf(r.lines)[0].choices.map((c) => c.status)).toEqual([
			'solution',
			'incorrect'
		]);
	});

	it('rien coché : bons choix encadrés + « Tu n’as rien répondu. »', () => {
		const r = buildExpectedResult(SINGLE, { values: [''] });
		expect(kinds(r.lines)).toEqual(['filled-statement', 'empty']);
		expect(choiceCasesOf(r.lines)[0].choices.map((c) => c.status)).toEqual(['solution', 'neutral']);
	});

	it('sans réponse (R9) : les bons choix seuls', () => {
		const r = buildExpectedResult(SINGLE);
		expect(r.status).toBeNull();
		expect(kinds(r.lines)).toEqual(['filled-statement']);
		expect(choiceCasesOf(r.lines)[0].choices.map((c) => c.status)).toEqual(['solution', 'neutral']);
	});

	it('ordre affiché respecté (mélange)', () => {
		const shuffled = generate('```choix\n- A\n- B\n- C\n- D\n```', ['3']);
		const order = shuffled.blanks?.[0].choice?.order ?? [];
		const r = buildExpectedResult(shuffled, { values: ['3'] });
		expect(choiceCasesOf(r.lines)[0].choices.map((c) => c.originalIndex)).toEqual(order);
	});
});

describe('case choix mêlée à d’autres cases', () => {
	it('juste : un seul énoncé rempli, bloc à sa place', () => {
		const r = buildExpectedResult(MIXED, { values: ['5', '1'] });
		expect(r.status).toBe('correct');
		expect(kinds(r.lines)).toEqual(['filled-statement']);
		const [filled] = r.lines;
		expect(filled.kind === 'filled-statement' && filled.markdown).toContain('```choix');
		expect(choiceCasesOf(r.lines)[0].choices.map((c) => c.status)).toEqual(['neutral', 'correct']);
	});

	it('faux : « Ta réponse » sans le bloc (les choix ne sont montrés qu’une fois)', () => {
		const r = buildExpectedResult(MIXED, { values: ['6', '0'] });
		expect(kinds(r.lines)).toEqual(['filled-statement', 'your-answer']);
		const answer = r.lines[1];
		expect(answer.kind === 'your-answer' && answer.markdown).not.toContain('```choix');
		expect(choiceCasesOf(r.lines)[0].choices.map((c) => c.status)).toEqual([
			'incorrect',
			'solution'
		]);
	});

	it('withoutChoiceCases retire les blocs choix', () => {
		expect(withoutChoiceCases('Avant\n\n```choix\ncase: 0\n- a\n- b\n```\n\nAprès')).toBe(
			'Avant\n\n\n\nAprès'
		);
	});
});
