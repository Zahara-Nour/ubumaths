/**
 * Question à solide à geste (` ```solide ` + `tracer: vecteur …`, chantier
 * `solide-vecteur`, lot 2 ; spécification : `docs/wip/solide-vecteur-progress.md`,
 * Phase 0)
 *
 * Même patron que le patron à geste : le bloc compte pour une case ; sa réponse
 * attendue est lue du bloc (calculée en 3D), jamais écrite dans le modèle ; la
 * réponse de l'élève (`A/G`) passe par un juge à part.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { isBlankValueCorrect, validateAnswer } from '$lib/utils/answer-validator';
import { buildExpectedResult } from '../../expected-result';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-solide-gestes',
		title: 'Solide',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['T_SPE'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const CUBE = ['forme: cube 2', 'sommets: A B C D E F G H'];
const solide = (...body: string[]) => ['```solide', ...body, '```'].join('\n');

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('assignBlankIndices — solide à geste', () => {
	it('une case texte, numéro posé dans le bloc', () => {
		const result = assignBlankIndices(solide(...CUBE, 'tracer: vecteur AB + AD'));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(solide('case: 0', ...CUBE, 'tracer: vecteur AB + AD'));
		expect(result.buildBlanks).toEqual({
			0: { kind: 'solide', source: [...CUBE, 'tracer: vecteur AB + AD'].join('\n') }
		});
	});

	it('solide à regarder (sans geste) : aucune case', () => {
		expect(assignBlankIndices(solide(...CUBE, 'vecteurs: AB')).totalBlanks).toBe(0);
	});

	it('bloc cité : pas de case, signalé', () => {
		const result = assignBlankIndices(
			['> ```solide', ...CUBE.map((l) => `> ${l}`), '> tracer: vecteur AB', '> ```'].join('\n')
		);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Un solide à geste doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('tracer: — la case et sa réponse', () => {
	it('sans blanks[] : réponse attendue = les deux points, juge', () => {
		const instance = generate(
			template({
				statement: `Trace $\\overrightarrow{AB}+\\overrightarrow{AD}+\\overrightarrow{AE}$ depuis A.\n\n${solide(...CUBE, 'tracer: vecteur AB + AD + AE depuis A')}`
			})
		);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'text',
			expectedAnswer: 'A/G',
			construire: 'solide'
		});
		expect(validateAnswer('A/G', instance, 'A/G').status).toBe('correct');
		expect(validateAnswer('A/C', instance, 'A/C').isCorrect).toBe(false);
		expect(validateAnswer('', instance, '').status).toBe('empty');
		expect(isBlankValueCorrect('A/G', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('B/G', instance.blanks![0], instance)).toBe(false);
	});

	it('origine libre : tout représentant est juste', () => {
		const instance = generate(template({ statement: solide(...CUBE, 'tracer: vecteur AB') }));
		expect(validateAnswer('H/G', instance, 'H/G').status).toBe('correct');
		expect(validateAnswer('B/A', instance, 'B/A').isCorrect).toBe(false);
	});

	it('variables résolues avant le bloc', () => {
		const instance = generate(
			template({
				statement: solide(
					'forme: pave 4 2 {{h}}',
					'sommets: A B C D E F G H',
					'tracer: vecteur AB + AE depuis D'
				),
				variables: [{ name: 'h', expression: '3' }]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('D/G');
	});

	it('bloc en erreur : refusé avec son message', () => {
		const result = generateInstance(
			template({ statement: solide(...CUBE, 'tracer: vecteur 2 AB depuis A') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Case 1 \(solide à geste\).*aucun point/);
	});

	it('une réponse écrite pour le bloc : refusée', () => {
		const result = generateInstance(
			template({
				statement: solide(...CUBE, 'tracer: vecteur AB'),
				blanks: [{ expectedAnswer: 'A/B' }]
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case 1.*bloc solide/i);
	});

	it('le validateur de modèle accepte une question sans blanks[]', () => {
		const errors = validateTemplate(template({ statement: solide(...CUBE, 'tracer: vecteur AB') }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});
});

describe('résultat attendu', () => {
	it('une ligne « build » solide, la réponse de l’élève', () => {
		const instance = generate(template({ statement: solide(...CUBE, 'tracer: vecteur AB') }));
		const { lines } = buildExpectedResult(instance, { values: ['A/C'] });
		expect(lines.find((l) => l.kind === 'build')).toMatchObject({
			kind: 'build',
			buildKind: 'solide',
			source: [...CUBE, 'tracer: vecteur AB'].join('\n'),
			answer: 'A/C',
			status: 'incorrect'
		});
	});

	it('rien posé', () => {
		const instance = generate(template({ statement: solide(...CUBE, 'tracer: vecteur AB') }));
		expect(
			buildExpectedResult(instance, { values: [''] }).lines.find((l) => l.kind === 'empty')
		).toMatchObject({ text: 'Il faut placer l’origine et l’extrémité.' });
	});
});
