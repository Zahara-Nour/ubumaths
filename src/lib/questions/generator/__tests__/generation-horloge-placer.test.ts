/**
 * Question à horloge à placer (` ```horloge ` + `placer:`, chantier
 * `docs/wip/reponses-a-placer-progress.md` § 13, 14)
 *
 * Même patron que la droite à placer : le bloc compte pour une case ; sa réponse
 * attendue est l'heure de `placer:` sur le cadran de 12, jamais écrite dans le
 * modèle ; la réponse de l'élève (ses deux aiguilles) passe par un juge à part :
 * petite aiguille dans le bon secteur, grande sur la minute.
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
		id: 'test-horloge-placer',
		title: 'Placer les aiguilles',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['CE1'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const clock = (...body: string[]) => ['```horloge', ...body, '```'].join('\n');

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('assignBlankIndices — horloge à placer', () => {
	it('une case texte, numéro posé dans le bloc', () => {
		const result = assignBlankIndices(clock('placer: 9 h 25'));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(clock('case: 0', 'placer: 9 h 25'));
		expect(result.buildBlanks).toEqual({ 0: { kind: 'horloge', source: 'placer: 9 h 25' } });
	});

	it('horloge à lire : aucune case', () => {
		const statement = clock('heure: 9 h');
		expect(assignBlankIndices(statement).totalBlanks).toBe(0);
	});

	it('bloc cité : pas de case, signalé', () => {
		const result = assignBlankIndices(['> ```horloge', '> placer: 9 h', '> ```'].join('\n'));
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Une horloge à placer doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('horloge à placer : la case et sa réponse', () => {
	it('sans blanks[] : la case est créée, réponse = l’heure sur le cadran de 12', () => {
		const instance = generate(
			template({ statement: `Place les aiguilles : 14 h 25.\n\n${clock('placer: 14 h 25')}` })
		);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'text',
			expectedAnswer: '2 h 25',
			construire: 'horloge'
		});
		// Petite aiguille entre le 2 et le 3 (crans 11 à 14), grande sur le 25
		expect(validateAnswer('12 25', instance, '12 25').status).toBe('correct');
		expect(validateAnswer('10 25', instance, '10 25').isCorrect).toBe(false);
		expect(validateAnswer('12 26', instance, '12 26').isCorrect).toBe(false);
		expect(validateAnswer('', instance, '').status).toBe('empty');
		expect(isBlankValueCorrect('12 25', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('10 25', instance.blanks![0], instance)).toBe(false);
	});

	it('trotteuse : réponse `2 h 25 min 40 s`, trois aiguilles jugées (cercle-trotteuse)', () => {
		const instance = generate(template({ statement: clock('placer: 14 h 25 min 40 s') }));
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'text',
			expectedAnswer: '2 h 25 min 40 s',
			construire: 'horloge'
		});
		expect(validateAnswer('12 25 40', instance, '12 25 40').status).toBe('correct');
		expect(validateAnswer('12 25 41', instance, '12 25 41').isCorrect).toBe(false);
		expect(validateAnswer('12 25', instance, '12 25').isCorrect).toBe(false);
		expect(isBlankValueCorrect('12 25 40', instance.blanks![0], instance)).toBe(true);
	});

	it('variables résolues avant le bloc', () => {
		const instance = generate(
			template({
				statement: clock('placer: {{h}} h {{m}}'),
				variables: [
					{ name: 'h', expression: '7' },
					{ name: 'm', expression: '15' }
				]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('7 h 15');
	});

	it('heure illisible : refusée avec son message', () => {
		const result = generateInstance(template({ statement: clock('placer: 9:30') }), 42);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Case 1 \(horloge\).*non comprise/);
	});

	it('une réponse écrite pour le bloc : refusée', () => {
		const result = generateInstance(
			template({ statement: clock('placer: 9 h'), blanks: [{ expectedAnswer: '9 h' }] }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case 1.*l’heure de l’horloge \(placer:\)/i);
	});

	it('le validateur de modèle accepte une question sans blanks[] à horloge à placer', () => {
		const errors = validateTemplate(template({ statement: clock('placer: 9 h') }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('résultat attendu : une ligne « build » horloge, la réponse de l’élève', () => {
		const instance = generate(template({ statement: `Place 9 h.\n\n${clock('placer: 9 h')}` }));
		const { lines } = buildExpectedResult(instance, { values: ['20 0'] });
		const line = lines.find((l) => l.kind === 'build');
		expect(line).toMatchObject({
			kind: 'build',
			buildKind: 'horloge',
			source: 'placer: 9 h',
			answer: '20 0',
			status: 'incorrect'
		});
	});
});
