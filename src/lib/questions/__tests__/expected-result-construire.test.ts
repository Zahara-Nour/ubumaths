/**
 * Résultat attendu d'une case à construire (blocs ```collection et ```monnaie)
 * ===========================================================================
 *
 * Copie corrigée et verso de la carte flash : le plan lui-même (la construction
 * de l'élève, sa valeur, une construction juste), jamais le bloc rejoué avec
 * une réserve active (vérification locale du 2026-10-26, chantier construire Q8).
 */
import { describe, it, expect } from 'vitest';
import { buildExpectedResult, showsInstructionOnly } from '../expected-result';
import { instructionOf } from '../correction-card-verdict';
import { generateInstance } from '../generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';

const MONNAIE = ['Paie le ballon à 35 €.', '', '```monnaie', 'construire: 35', '```'].join('\n');
const COLLECTION = ['Construis 34.', '', '```collection', 'construire: 34', '```'].join('\n');

function instance(statement: string, blanks?: { expectedAnswer: string }[]): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-construire',
			title: 'Construire',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [{ statement: templateMarkdown(statement), ...(blanks && { blanks }) }],
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

describe('résultat attendu : case à construire', () => {
	it('sans réponse (R9) : le plan, construction juste seule', () => {
		const { lines } = buildExpectedResult(instance(MONNAIE));
		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatchObject({
			kind: 'build',
			index: 0,
			buildKind: 'monnaie',
			answer: null,
			status: 'solution'
		});
		if (lines[0].kind !== 'build') return;
		expect(lines[0].source).toContain('construire: 35');
	});

	it('juste : le plan avec la construction de l’élève, aucune ligne en texte', () => {
		const { status, lines } = buildExpectedResult(instance(MONNAIE), { values: ['35'] });
		expect(status).toBe('correct');
		expect(lines).toEqual([
			expect.objectContaining({ kind: 'build', answer: '35', status: 'correct' })
		]);
	});

	it('faux : le plan de l’élève (32), jamais « Réponse attendue » en texte', () => {
		const { lines } = buildExpectedResult(instance(MONNAIE), { values: ['32'] });
		expect(lines).toEqual([
			expect.objectContaining({ kind: 'build', answer: '32', status: 'incorrect' })
		]);
	});

	it('vide : le plan (construction juste), puis « Tu n’as rien répondu. »', () => {
		const { lines } = buildExpectedResult(instance(MONNAIE), { values: [''] });
		expect(lines.map((l) => l.kind)).toEqual(['build', 'empty']);
		expect(lines[0]).toMatchObject({ answer: null, status: 'solution' });
	});

	it('collection : la même ligne', () => {
		const { lines } = buildExpectedResult(instance(COLLECTION), { values: ['32'] });
		expect(lines).toEqual([
			expect.objectContaining({ kind: 'build', buildKind: 'collection', answer: '32' })
		]);
	});

	it('consigne seule au-dessus (le plan est dans sa ligne), sans le bloc', () => {
		const { lines } = buildExpectedResult(instance(MONNAIE), { values: ['32'] });
		expect(showsInstructionOnly(lines)).toBe(true);
		const text = instructionOf(String(instance(MONNAIE).statement));
		expect(text).toBe('Paie le ballon à 35 €.');
	});

	it('avec une autre case dans l’énoncé : l’énoncé rempli, le plan à part', () => {
		const { lines } = buildExpectedResult(
			instance(`$? + 1 = 3$\n\n${MONNAIE}`, [{ expectedAnswer: '2' }]),
			{ values: ['2', '35'] }
		);
		expect(lines.some((l) => l.kind === 'build')).toBe(true);
		expect(lines.some((l) => l.kind === 'expected-only')).toBe(false);
	});
});
