/**
 * Résultat attendu d'un tableau de signes à compléter (```variation à `?`)
 * ========================================================================
 *
 * Chantier `docs/wip/tableau-signes-progress.md`, PR 4 : le corrigé montre le
 * TABLEAU lui-même, chaque cellule cachée avec la réponse de l'élève et son
 * statut, la bonne valeur dans la cellule fausse (phase 0, point 5) — jamais une
 * ligne « Réponse attendue » par case.
 */
import { describe, it, expect } from 'vitest';
import { buildExpectedResult, showsInstructionOnly, type ExpectedLine } from '../expected-result';
import { instructionOf } from '../correction-card-verdict';
import { generateInstance } from '../generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';

const TABLEAU = [
	'```variation',
	'variable: x',
	'domain: -inf, ?-3, 2, +inf',
	'',
	'sign: (x+3)(x-2)',
	'  -inf,-3: ?+',
	'  -3: ?z',
	'  -3,2: -',
	'  2: z',
	'  2,+inf: ?+',
	'```'
];
const SEUL = ['Complète le tableau de signes de $(x+3)(x-2)$.', '', ...TABLEAU].join('\n');
const JUSTE = ['-3', '+', 'z', '+'];

function instance(statement: string, blanks?: { expectedAnswer: string }[]): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-tableau-signes',
			title: 'Tableau de signes',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [{ statement: templateMarkdown(statement), ...(blanks && { blanks }) }],
			grades: ['2'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		} as unknown as QuestionTemplate,
		42
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

type SignTableLine = Extract<ExpectedLine, { kind: 'sign-table' }>;

function signTable(lines: readonly ExpectedLine[]): SignTableLine {
	const found = lines.filter((l): l is SignTableLine => l.kind === 'sign-table');
	expect(found).toHaveLength(1);
	return found[0];
}

describe('résultat attendu : tableau de signes à compléter', () => {
	it('sans réponse (R9) : le tableau, cellules remplies des solutions, aucune ligne par case', () => {
		const { lines } = buildExpectedResult(instance(SEUL));
		expect(lines.map((l) => l.kind)).toEqual(['sign-table']);
		const line = signTable(lines);
		expect(line).toMatchObject({ index: 0, status: 'solution' });
		// Texte du bloc sans `case:` : la cellule cachée reste cachée (`?`), remplie au rendu
		expect(line.source).not.toContain('case:');
		expect(line.source).toContain('domain: -inf, ?-3, 2, +inf');
		expect(line.cells).toEqual([
			{ index: 0, cellule: 'valeur', expected: '-3', student: null, status: 'solution' },
			{ index: 1, cellule: 'signe', expected: '+', student: null, status: 'solution' },
			{ index: 2, cellule: 'marque', expected: 'z', student: null, status: 'solution' },
			{ index: 3, cellule: 'signe', expected: '+', student: null, status: 'solution' }
		]);
	});

	it('consigne seule au-dessus : la phrase, sans le tableau (il est dans la ligne)', () => {
		const inst = instance(SEUL);
		expect(showsInstructionOnly(buildExpectedResult(inst).lines)).toBe(true);
		const instruction = instructionOf(String(inst.statement));
		expect(instruction).toMatch(/^Complète le tableau de signes de \$.+\$\.$/);
		expect(instruction).not.toContain('variation');
	});

	it('tout juste : chaque cellule juste, le tableau juste', () => {
		const { status, lines } = buildExpectedResult(instance(SEUL), { values: JUSTE });
		expect(status).toBe('correct');
		expect(lines.map((l) => l.kind)).toEqual(['sign-table']);
		const line = signTable(lines);
		expect(line.status).toBe('correct');
		expect(line.cells.map((c) => [c.student, c.status])).toEqual([
			['-3', 'correct'],
			['+', 'correct'],
			['z', 'correct'],
			['+', 'correct']
		]);
	});

	it('un signe faux : la cellule fausse, sa bonne valeur gardée, le tableau faux', () => {
		const { status, lines } = buildExpectedResult(instance(SEUL), {
			values: ['-3', '-', 'z', '+']
		});
		expect(status).toBe('incorrect');
		const line = signTable(lines);
		expect(line.status).toBe('incorrect');
		expect(line.cells[1]).toEqual({
			index: 1,
			cellule: 'signe',
			expected: '+',
			student: '-',
			status: 'incorrect'
		});
		expect(line.cells.filter((c) => c.status === 'correct')).toHaveLength(3);
	});

	it('« 0 » pour la marque zéro et « − » pour moins : ramenés au jeton', () => {
		const { lines } = buildExpectedResult(instance(SEUL), { values: ['-3', '+', '0', '+'] });
		expect(signTable(lines).cells[2]).toMatchObject({ student: 'z', status: 'correct' });
		const minus = buildExpectedResult(instance(SEUL), { values: ['-3', '−', 'z', '+'] });
		expect(signTable(minus.lines).cells[1]).toMatchObject({ student: '-', status: 'incorrect' });
	});

	it('une cellule vide : statut vide, sans réponse ; tout vide : « rien rempli »', () => {
		const partial = buildExpectedResult(instance(SEUL), { values: ['-3', '', 'z', '+'] });
		expect(signTable(partial.lines).cells[1]).toMatchObject({ student: null, status: 'empty' });
		expect(partial.lines.some((l) => l.kind === 'empty')).toBe(false);

		const none = buildExpectedResult(instance(SEUL), { values: ['', '', '', ''] });
		expect(none.lines.map((l) => l.kind)).toEqual(['sign-table', 'empty']);
		expect(none.lines[1]).toEqual({ kind: 'empty', text: "Tu n'as rien rempli dans le tableau." });
	});

	it('réponse d’élève inattendue dans une case signe : texte échappé, jamais du markdown', () => {
		const { lines } = buildExpectedResult(instance(SEUL), {
			values: ['-3', '<b>x</b>', 'z', '+']
		});
		const cell = signTable(lines).cells[1];
		expect(cell.status).toBe('incorrect');
		expect(cell.student).not.toContain('<b>');
	});

	it('valeur de x juste en valeur, forme à améliorer : le tableau aussi', () => {
		const { lines } = buildExpectedResult(instance(SEUL), {
			values: ['-\\frac{6}{2}', '+', 'z', '+']
		});
		const line = signTable(lines);
		expect(line.cells[0]).toMatchObject({ student: '-\\frac{6}{2}', status: 'unoptimal' });
		expect(line.status).toBe('unoptimal');
	});

	it('avec une autre case dans l’énoncé : énoncé rempli SANS le tableau, puis le tableau', () => {
		const statement = ['Résous $(x+3)(x-2) = 0$ : $x_1 = ?$.', '', ...TABLEAU].join('\n');
		const inst = instance(statement, [{ expectedAnswer: '-3' }]);
		const { lines } = buildExpectedResult(inst, { values: ['-3', '-3', '+', 'z', '+'] });
		expect(lines.map((l) => l.kind)).toEqual(['filled-statement', 'sign-table']);
		const filled = lines[0];
		if (filled.kind !== 'filled-statement') return;
		expect(filled.markdown).not.toContain('```variation');
		expect(signTable(lines).index).toBe(1);
		expect(signTable(lines).cells.map((c) => c.index)).toEqual([1, 2, 3, 4]);
	});

	it('énoncé masqué (évaluation notée) : les solutions viennent des cases, pas du bloc', () => {
		const inst = instance(SEUL);
		const masked = {
			...inst,
			statement: String(inst.statement)
				.replace('?-3', '??1')
				.replaceAll('-inf,-3', '-inf,??1')
				.replace('  -3: ?z', '  ??1: ?')
				.replace('-3,2', '??1,2')
				.replaceAll(': ?+', ': ?')
		};
		const line = signTable(buildExpectedResult(masked).lines);
		expect(line.cells.map((c) => c.expected)).toEqual(JUSTE);
	});
});
