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
		expect(lines[1]).toMatchObject({ text: "Tu n'as rien posé." });
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
		expect(lines.some((l) => l.kind === 'expected-only')).toBe(false);
		// Revue : le bloc est retiré de l'énoncé rempli, le plan vient APRÈS lui
		const kinds = lines.map((l) => l.kind);
		expect(kinds.indexOf('filled-statement')).toBeLessThan(kinds.indexOf('build'));
		const filled = lines.find((l) => l.kind === 'filled-statement');
		expect(filled?.kind === 'filled-statement' && filled.markdown).not.toContain('```monnaie');
	});

	it('mêlé, case à construire vide : « Tu n’as rien posé. », propre à la case', () => {
		const { lines } = buildExpectedResult(
			instance(`$? + 1 = 3$\n\n${MONNAIE}`, [{ expectedAnswer: '2' }]),
			{ values: ['2', ''] }
		);
		const empty = lines.filter((l) => l.kind === 'empty');
		expect(empty.map((l) => l.kind === 'empty' && l.text)).toEqual(["Tu n'as rien posé."]);
		const kinds = lines.map((l) => l.kind);
		expect(kinds.indexOf('build')).toBeLessThan(kinds.indexOf('empty'));
	});
});

// Droite à placer (```line, `placer:`) : même ligne `build`, genre `line`
// (chantier `docs/wip/reponses-a-placer-progress.md`)
describe('résultat attendu : droite à placer', () => {
	const LINE = [
		'Place 7.',
		'',
		'```line',
		'start: 0',
		'end: 20',
		'step: 1',
		'placer: 7',
		'```'
	].join('\n');

	it('faux : la droite de l’élève, sans le bloc dans la consigne', () => {
		const { lines } = buildExpectedResult(instance(LINE), { values: ['9'] });
		expect(lines).toEqual([
			expect.objectContaining({
				kind: 'build',
				buildKind: 'line',
				answer: '9',
				status: 'incorrect'
			})
		]);
		expect(instructionOf(String(instance(LINE).statement))).toBe('Place 7.');
	});

	it('juste : correct', () => {
		const { status } = buildExpectedResult(instance(LINE), { values: ['7'] });
		expect(status).toBe('correct');
	});

	it('vide : la droite juste, puis « Tu n’as rien placé. »', () => {
		const { lines } = buildExpectedResult(instance(LINE), { values: [''] });
		expect(lines.map((l) => l.kind)).toEqual(['build', 'empty']);
		expect(lines[1]).toMatchObject({ text: "Tu n'as rien placé." });
	});
});
