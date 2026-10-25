/**
 * Résultat attendu d'une case « figure » (bloc ```figure-a-completer, PR 3)
 * ====================================================================
 *
 * Verso de la carte flash et copie corrigée : la figure elle-même (tracés de
 * l'élève, bonne droite), jamais la chaîne `droite(…)` en texte
 * (`docs/wip/geometrie-validation-progress.md` § 5, décision 3).
 */
import { describe, it, expect } from 'vitest';
import '$lib/questions/construction/positions-setup';
import { buildExpectedResult } from '../expected-result';
import { instructionOf } from '../correction-card-verdict';
import { generateInstance } from '../generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';

const STATEMENT = [
	'Trace la droite qui passe par les points A et B.',
	'',
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 6',
	'outils: droite',
	'verifier: droite_par A ; B',
	'---',
	'A = point(1, 2)',
	'B = point(7, 2)',
	'C = point(4, 5)',
	'```'
].join('\n');

function instance(): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-cp059',
			title: 'Tracer une droite',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [{ statement: templateMarkdown(STATEMENT) }],
			grades: ['CP'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		} as unknown as QuestionTemplate,
		42
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('résultat attendu : case « figure »', () => {
	it('sans réponse (R9) : la figure, bonne droite seule', () => {
		const { lines } = buildExpectedResult(instance());
		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatchObject({ kind: 'figure', index: 0, answer: null, status: 'solution' });
		if (lines[0].kind !== 'figure') return;
		expect(lines[0].source).toContain('A = point(1, 2)');
		expect(lines[0].source).toContain('verifier: droite_par A ; B');
	});

	it('juste : la figure avec la droite de l’élève, aucune ligne en texte', () => {
		const { status, lines } = buildExpectedResult(instance(), { values: ['droite(1;2;7;2)'] });
		expect(status).toBe('correct');
		expect(lines).toEqual([
			expect.objectContaining({ kind: 'figure', answer: 'droite(1;2;7;2)', status: 'correct' })
		]);
	});

	it('faux : la figure, puis le message du juge', () => {
		const { status, lines } = buildExpectedResult(instance(), { values: ['droite(1;2;4;5)'] });
		expect(status).toBe('incorrect');
		expect(lines[0]).toMatchObject({
			kind: 'figure',
			answer: 'droite(1;2;4;5)',
			status: 'incorrect'
		});
		expect(lines.slice(1)).toEqual([
			{ kind: 'remark', index: 0, text: 'Ta droite passe par A et C, pas par B.' }
		]);
		expect(lines.some((l) => l.kind === 'expected-only')).toBe(false);
	});

	it('rien tracé : la figure (bonne droite) et « Tu n’as rien répondu. »', () => {
		const { lines } = buildExpectedResult(instance(), { values: [''] });
		expect(lines.map((l) => l.kind)).toEqual(['figure', 'empty']);
		expect(lines[0]).toMatchObject({ answer: '', status: 'empty' });
	});
});

describe('consigne d’une case « figure »', () => {
	it('l’énoncé sans le bloc (la figure est dans le résultat attendu)', () => {
		const statement = String(instance().statement);
		expect(statement).toContain('```figure-a-completer');
		expect(instructionOf(statement)).toBe('Trace la droite qui passe par les points A et B.');
	});
});
