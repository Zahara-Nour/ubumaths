/**
 * Question à bloc ```collection à construire (PR 1, phase 0 :
 * `docs/wip/construire-progress.md` § 3, 5)
 *
 * Le bloc compte pour une case ; sa réponse attendue est la valeur de
 * `construire:`, jamais écrite dans le modèle ; elle passe au juge ordinaire.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { validateAnswer } from '$lib/utils/answer-validator';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-construire',
		title: 'Construire',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['CP'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const block = (...body: string[]) => ['```collection', ...body, '```'].join('\n');

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('assignBlankIndices — bloc ```collection à construire', () => {
	it('une case, numéro posé dans le bloc', () => {
		const result = assignBlankIndices(block('construire: 34'));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['math']);
		expect(result.statement).toBe(block('case: 0', 'construire: 34'));
		expect(result.buildBlanks).toEqual({ 0: 'construire: 34' });
	});

	it('collection à dessiner : aucune case, bloc inchangé', () => {
		const statement = block('unités: 23');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.statement).toBe(statement);
		expect(result.buildBlanks).toBeUndefined();
	});

	it('numérotée dans l’ordre du texte avec les ? et [_]', () => {
		const statement = ['$? + 1$', '', block('construire: 34'), '', 'Mot : [_]'].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(3);
		expect(result.statement).toContain('case: 1');
		expect(result.statement).toContain('{{blank:2}}');
		expect(result.buildBlanks).toEqual({ 1: 'construire: 34' });
	});

	it('bloc en retrait (liste) ou cité : pas de case, signalé', () => {
		const statement = ['- Construis :', '', '  ```collection', '  construire: 34', '  ```'].join(
			'\n'
		);
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Un bloc collection à construire doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('bloc ```collection à construire : la case et sa réponse', () => {
	it('sans blanks[] : la case est créée, réponse = la valeur du bloc', () => {
		const instance = generate(
			template({
				statement: `Construis 34 avec des barres et des cubes.\n\n${block('construire: 34')}`
			})
		);
		expect(instance.blanks).toHaveLength(1);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'math',
			expectedAnswer: '34',
			construire: 'collection'
		});
		expect(String(instance.statement)).toContain('case: 0');
	});

	it('variables résolues avant le bloc', () => {
		const instance = generate(
			template({
				statement: block('construire: {{n}}'),
				variables: [{ name: 'n', expression: '58' }]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('58');
	});

	it('juge ordinaire : valeur juste, quelle que soit la composition ; fausse ; vide', () => {
		const instance = generate(template({ statement: block('construire: 34') }));
		expect(validateAnswer('34', instance, '34').status).toBe('correct');
		expect(validateAnswer('32', instance, '32').isCorrect).toBe(false);
		expect(validateAnswer('', instance, '').isCorrect).toBe(false);
	});

	it('avec d’autres cases : la case du bloc est insérée à son rang', () => {
		const instance = generate(
			template({
				statement: `$? + 1 = 3$\n\n${block('construire: 34')}`,
				blanks: [{ expectedAnswer: '2' }]
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['2', '34']);
	});

	it('une réponse écrite pour le bloc : refusée (une seule source)', () => {
		const result = generateInstance(
			template({ statement: block('construire: 34'), blanks: [{ expectedAnswer: '34' }] }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case 1.*bloc collection/i);
	});

	it('case: écrite par l’auteur : refusée', () => {
		const result = generateInstance(
			template({ statement: block('case: 0', 'construire: 34') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case: est posée automatiquement/);
	});

	it('bloc en erreur : refusé avec son message', () => {
		const result = generateInstance(template({ statement: block('construire: 0') }), 42);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Case 1 \(bloc collection\).*1 à 100/);
	});

	// Revue de la PR 1 : le bloc se délimite comme le parseur (ligne vide gardée si la
	// suite commence par une clé, Q66), sinon la case disparaissait sans message
	it('ligne vide dans un bloc fermé : la case existe quand même', () => {
		const withOther = generate(
			template({
				statement: `$? + 1 = 3$\n\n${block('dessin: paquets', '', 'construire: 34')}`,
				blanks: [{ expectedAnswer: '2' }]
			})
		);
		expect(withOther.blanks?.map((b) => b.expectedAnswer)).toEqual(['2', '34']);
		const alone = generate(template({ statement: block('', 'construire: 34') }));
		expect(alone.blanks?.map((b) => b.expectedAnswer)).toEqual(['34']);
		expect(String(alone.statement)).toContain('case: 0');
	});

	it('bloc non fermé : refusé (l’élève verrait « Collection indisponible »)', () => {
		const result = generateInstance(
			template({
				statement: ['Construis.', '```collection', 'construire: 34', '', 'Fin.'].join('\n')
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Case 1 \(bloc collection\).*non fermé/);
	});

	it('« ordre indifférent » : refusé (une construction ne s’échange pas avec une autre case)', () => {
		const t = template({
			statement: `$?$\n\n${block('construire: 34')}`,
			blanks: [{ expectedAnswer: '2' }]
		});
		t.options = { ...t.options, orderIndependent: true };
		const result = generateInstance(t, 42);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/ordre indifférent/);
	});

	it('le validateur de modèle accepte une question sans blanks[] à bloc à construire', () => {
		const errors = validateTemplate(
			template({ statement: block('construire: 34') }) as QuestionTemplate
		);
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});
});
