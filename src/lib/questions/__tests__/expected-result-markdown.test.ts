/**
 * Résultat attendu — décor de l'écran (lot 2)
 * ==========================================
 *
 * Exigence de l'audit de la PR #643 : une valeur `context: 'math'` est TOUJOURS
 * écrite dans une formule `$…$`, jamais dans le texte markdown (sinon
 * `[clic](https://…)` redeviendrait un lien chez le professeur).
 */
import { describe, it, expect } from 'vitest';
import {
	alignedComparisonMarkdown,
	balanceBraces,
	comparisonMarkdown,
	decorateFill,
	expectedOnlyMarkdown,
	filledMarkdown,
	solutionMarkdown
} from '../expected-result-markdown';
import { buildExpectedResult, type ExpectedFill, type ExpectedLine } from '../expected-result';
import { generateInstance } from '../generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '../types';

// Fixtures
function generate(statement: string, blanks: unknown[]): QuestionInstance {
	const template = {
		id: 't',
		type: 'fill_in_blanks',
		level: 1,
		theme: 'x',
		domain: 'y',
		grades: ['6'],
		title: 't',
		variations: [{ statement, blanks, variables: [] }]
	} as unknown as QuestionTemplate;
	const r = generateInstance(template, 1);
	if (!r.success) throw new Error(JSON.stringify(r.errors));
	return r.instance;
}

const HOSTILE = '[clic](https://evil.example)';
/** Le markdown privé de ses formules : ce que l'analyseur lirait comme texte */
const outsideMath = (markdown: string) => markdown.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, ' ');

function markdownOf(line: ExpectedLine, hasComparison = false): string {
	switch (line.kind) {
		case 'comparison':
			return comparisonMarkdown(line.lhs, line.relation, line.answer);
		case 'solution':
			return solutionMarkdown(line.lhs, line.latex, !hasComparison);
		case 'filled-statement':
		case 'your-answer':
			return filledMarkdown(line.markdown, line.fills);
		case 'expected-only':
			return expectedOnlyMarkdown(line.value, line.context);
		default:
			return '';
	}
}

describe('sécurité : une valeur math reste dans une formule', () => {
	it.each([
		['R1 `$3+5=?$`', '$3+5=?$', [{ expectedAnswer: '8' }]],
		['R3 `$?+5=10$`', '$?+5=10$ et $2+?=3$', [{ expectedAnswer: '5' }, { expectedAnswer: '1' }]],
		[
			'case dans le texte',
			'Le nombre [_] vaut $?$',
			[{ expectedAnswer: 'dix', type: 'text' }, { expectedAnswer: '10' }]
		]
	])('%s : la charge n’apparaît jamais hors formule', (_name, statement, blanks) => {
		const instance = generate(statement, blanks);
		const values = (instance.blanks ?? []).map(() => HOSTILE);
		const result = buildExpectedResult(instance, { values, latex: values });
		const hasComparison = result.lines.some((l) => l.kind === 'comparison');
		const all = result.lines.map((l) => markdownOf(l, hasComparison)).join('\n');
		expect(all).toContain('evil');
		expect(outsideMath(all)).not.toContain('evil');
		expect(outsideMath(all)).not.toContain('](');
	});

	it('case texte : syntaxe neutralisée DANS `\\text{}`', () => {
		const fill: ExpectedFill = { index: 0, context: 'text', value: HOSTILE, status: 'incorrect' };
		const md = decorateFill(fill);
		expect(md.startsWith('$') && md.endsWith('$')).toBe(true);
		expect(md).not.toContain('](');
		expect(md).toContain('\\text{');
	});

	it('une valeur ne referme pas le décor : accolades équilibrées, `\\` final retiré', () => {
		expect(balanceBraces('8}}\\frac{1')).toBe('8\\frac{1}');
		expect(balanceBraces('\\{x\\}')).toBe('\\{x\\}');
		expect(balanceBraces('8\\')).toBe('8');
		const md = decorateFill({ index: 0, context: 'math', value: '8}}{', status: 'incorrect' });
		const opens = (md.match(/(?<!\\)\{/g) ?? []).length;
		const closes = (md.match(/(?<!\\)\}/g) ?? []).length;
		expect(opens).toBe(closes);
	});
});

describe('valeur math hors formule : enveloppée en `$…$` (audit lot 2)', () => {
	const math: ExpectedFill = {
		index: 0,
		context: 'math',
		value: '[clic](https://evil.example)',
		status: 'neutral'
	};
	const text: ExpectedFill = { index: 0, context: 'text', value: 'chat', status: 'neutral' };

	it('`\\placeholder` dans le TEXTE (hors `$…$`) : formule à part entière', () => {
		expect(filledMarkdown('Réponse : \\placeholder[0]{} fin', [math])).toBe(
			'Réponse : $[clic](https://evil.example)$ fin'
		);
	});

	it('case math sur un marqueur texte `{{blank:N}}` : formule à part entière', () => {
		expect(filledMarkdown('Réponse : {{blank:0}}', [math])).toBe(
			'Réponse : $[clic](https://evil.example)$'
		);
	});

	it('`\\placeholder` déjà dans une formule : LaTeX tel quel, aucun `$` ajouté', () => {
		expect(filledMarkdown('$x = \\placeholder[0]{}$ et $$\\placeholder[0]{}$$', [math])).toBe(
			'$x = [clic](https://evil.example)$ et $$[clic](https://evil.example)$$'
		);
		expect(filledMarkdown('$x = \\placeholder[0]{}$', [text])).toBe('$x = \\text{chat}$');
	});

	it('`decorateFill` seul : enveloppé par défaut', () => {
		expect(decorateFill(math)).toBe('$[clic](https://evil.example)$');
		expect(decorateFill(math, true)).toBe('[clic](https://evil.example)');
	});
});

describe('décor des lignes', () => {
	const answer = (status: ExpectedFill['status'], value = '9'): ExpectedFill => ({
		index: 0,
		context: 'math',
		value,
		status
	});

	it('faux : `≠` et réponse en rouge', () => {
		const md = comparisonMarkdown('3+5', '≠', answer('incorrect'));
		expect(md).toBe(
			'$3+5 \\textcolor{var(--expected-incorrect)}{\\neq} \\textcolor{var(--expected-incorrect)}{9}$'
		);
	});

	it('juste : toute l’égalité encadrée en vert', () => {
		expect(comparisonMarkdown('3+5', '=', answer('correct', '8'))).toBe(
			'$\\textcolor{var(--expected-correct)}{\\bbox[border:1px solid var(--expected-correct); border-radius:4px]{3+5 = 8}}$'
		);
	});

	it('forme à améliorer : réponse en ambre, `=`', () => {
		expect(comparisonMarkdown('x', '=', answer('unoptimal', '\\frac{2}{4}'))).toBe(
			'$x = \\textcolor{var(--expected-unoptimal)}{\\frac{2}{4}}$'
		);
	});

	it('solution : `= 8` encadré vert (avec le membre gauche si elle est seule)', () => {
		expect(solutionMarkdown('3+5', '8', false)).toBe(
			'$= \\textcolor{var(--expected-correct)}{\\bbox[border:1px solid var(--expected-correct); border-radius:4px]{8}}$'
		);
		expect(solutionMarkdown('3+5', '8', true)).toBe(
			'$3+5 = \\textcolor{var(--expected-correct)}{\\bbox[border:1px solid var(--expected-correct); border-radius:4px]{8}}$'
		);
	});

	it('énoncé : case vide en pointillés, case texte en formule', () => {
		const md = filledMarkdown('Un [_] et $1+\\placeholder[1]{}$ {{blank:0}}', [
			{ index: 0, context: 'text', value: 'chat', status: 'solution' },
			{ index: 1, context: 'math', value: null, status: 'empty' }
		]);
		expect(md).toBe(
			'Un [_] et $1+\\textcolor{var(--expected-empty)}{\\text{……}}$ $\\textcolor{var(--expected-correct)}{\\text{chat}}$'
		);
	});
});

describe('R1 aligné (façon TinyMath)', () => {
	const fill = (value: string, status: ExpectedFill['status']): ExpectedFill => ({
		index: 0,
		context: 'math',
		value,
		status
	});

	it('faux : `lhs &≠ réponse \\\\ &= solution`, un seul environnement', () => {
		expect(alignedComparisonMarkdown('3+5', '≠', fill('9', 'incorrect'), '8')).toBe(
			'$\\begin{aligned}3+5 &\\mathrel{\\textcolor{var(--expected-incorrect)}{\\neq}} ' +
				'\\textcolor{var(--expected-incorrect)}{9} \\\\ ' +
				'&= \\textcolor{var(--expected-correct)}{\\bbox[border:1px solid var(--expected-correct); border-radius:4px]{8}}' +
				'\\end{aligned}$'
		);
	});

	it('forme non optimale : `= 08` ambre puis `= 8`', () => {
		const md = alignedComparisonMarkdown('3+5', '=', fill('08', 'unoptimal'), '8');
		expect(md).toContain('3+5 &= \\textcolor{var(--expected-unoptimal)}{08} \\\\ &= ');
	});

	it('charge hostile : `&`, `\\\\`, `$`, accolades — inertes, une seule formule', () => {
		const md = alignedComparisonMarkdown('3+5', '≠', fill('9 & 1 \\\\ }}$x', 'incorrect'), '8');
		expect(md.match(/(?<!\\)&/g)).toHaveLength(2);
		expect(md.match(/\\begin\{aligned\}/g)).toHaveLength(1);
		expect(md.match(/\$/g)?.length).toBe(2);
		expect(balanceBraces(md)).toBe(md);
	});
});
