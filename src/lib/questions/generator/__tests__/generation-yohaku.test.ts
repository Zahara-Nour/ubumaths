/**
 * Question « grille yohaku » (bloc ```yohaku, au moins une case entre crochets ; chantier
 * `outil-yohaku`, journal `docs/wip/outil-yohaku-progress.md`)
 *
 * Une case par bloc ; réponse attendue = l'opération, la solution de l'auteur et les totaux,
 * jamais écrite dans le modèle ; la grille de l'élève est jugée sur ses contraintes.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import { isBlankValueCorrect, validateAnswer } from '#lib/utils/answer-validator.ts';
import { buildExpectedResult, EMPTY_GRID_TEXT } from '../../expected-result';
import { toPublicQuestion } from '../../public-question';
import { findUnmaskedAnswers } from '../../masked-statement';
import { parseYohakuContent } from '#lib/ubumark/parser/yohaku-parser.ts';
import {
	ecrireReponse,
	readExpectedYohakuAnswer,
	YOHAKU_INCOMPLET
} from '#lib/ubumark/utils/yohaku-answer.ts';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-yohaku',
		title: 'Grille yohaku',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['3'],
		level: 1
	} as QuestionTemplate;
}

const yohaku = (...body: string[]) => ['```yohaku', ...body, '```'].join('\n');
const CORPS = ['opération: produit', 'ligne: [x+2] | [x+3]', 'ligne: [2x+1] | x+1'];
const ENONCE = `Remplis la grille.\n\n${yohaku(...CORPS)}`;

function generate(t: QuestionTemplate, seed = 42) {
	const result = generateInstance(t, seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function generationErrors(t: QuestionTemplate): string {
	const result = generateInstance(t, 42);
	expect(result.success).toBe(false);
	return result.success ? '' : result.errors.join(' ; ');
}

describe('assignBlankIndices — grille yohaku', () => {
	it('une case texte, `case:` posée dans le bloc', () => {
		const result = assignBlankIndices(yohaku(...CORPS));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(yohaku('case: 0', ...CORPS));
		expect(result.buildBlanks).toEqual({ 0: { kind: 'yohaku', source: CORPS.join('\n') } });
	});

	it('bloc dans une liste : pas de case, signalé', () => {
		const statement = [
			'- Remplis :',
			'',
			'  ```yohaku',
			...CORPS.map((l) => `  ${l}`),
			'  ```'
		].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors?.join(' ')).toMatch(
			/Une grille à remplir doit être au premier niveau/
		);
	});
});

describe('grille yohaku : la case et sa réponse', () => {
	it('réponse attendue lisible, `expectedAnswerLatex` est une réponse juste', () => {
		const instance = generate(template({ statement: ENONCE }));
		const blank = instance.blanks![0];
		expect([blank.type, blank.construire]).toEqual(['text', 'yohaku']);
		const attendu = readExpectedYohakuAnswer(blank.expectedAnswer);
		expect(attendu?.operation).toBe('produit');
		expect(attendu?.remplir).toEqual([
			[true, true],
			[true, false]
		]);
		// Contrat commun : la réponse juste donnée en exemple passe le juge
		expect(isBlankValueCorrect(blank.expectedAnswerLatex!, blank, instance)).toBe(true);
	});

	it('une autre grille juste est acceptée, une grille fausse refusée avec son message', () => {
		// Quatre cases libres : (3, 2, 2, 3) donne les mêmes totaux que (2, 3, 3, 2)
		const instance = generate(
			template({
				statement: yohaku('opération: produit', 'ligne: [2] | [3]', 'ligne: [3] | [2]')
			})
		);
		const autre = ecrireReponse(['3', '2', '2', '3']);
		expect(validateAnswer([autre], instance, [autre]).isCorrect).toBe(true);
		const fausse = ecrireReponse(['3', '2', '2', '4']);
		const verdict = validateAnswer([fausse], instance, [fausse]);
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.feedback).toMatch(/^La 2e ligne et la 2e colonne ne donnent pas le bon produit/);
		const incomplete = ecrireReponse(['3', '', '2', '3']);
		expect(validateAnswer([incomplete], instance, [incomplete]).feedback).toBe(YOHAKU_INCOMPLET);
	});

	it('variables dans le bloc', () => {
		const t = template({
			statement: yohaku('opération: produit', 'ligne: [x+{{a}}] | [x+3]', 'ligne: [2x+1] | x+1'),
			variables: [{ name: 'a', expression: '2..9' }]
		});
		for (let seed = 0; seed < 5; seed++) {
			const instance = generate(t, seed);
			const blank = instance.blanks![0];
			expect(isBlankValueCorrect(blank.expectedAnswerLatex!, blank, instance)).toBe(true);
		}
	});

	it('bloc mal écrit : refusé au prof', () => {
		expect(
			generationErrors(template({ statement: yohaku('ligne: [x+2] | x+3', 'ligne: 2x+1 | x+1') }))
		).toMatch(/Case 1 \(grille à remplir\).*opération/);
	});

	it('`case:` écrite par le prof : refusée', () => {
		expect(generationErrors(template({ statement: yohaku('case: 0', ...CORPS) }))).toMatch(
			/case: est posée automatiquement/
		);
	});

	it('réponse écrite dans blanks[] pour la case : refusée', () => {
		expect(
			generationErrors(template({ statement: yohaku(...CORPS), blanks: [{ expectedAnswer: 'x' }] }))
		).toMatch(/Case 1.*cases de la grille/);
	});

	it('le validateur de modèle accepte une question sans blanks[] à yohaku', () => {
		const errors = validateTemplate(template({ statement: yohaku(...CORPS) }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('copie corrigée : une ligne pour le bloc ; sans rien écrit, « rien écrit »', () => {
		const instance = generate(template({ statement: ENONCE }));
		const builds = buildExpectedResult(instance, { values: ['["x+2","x+3","2x+1"]'] }).lines.filter(
			(l) => l.kind === 'build'
		);
		expect(builds).toHaveLength(1);
		expect(builds[0]).toMatchObject({ kind: 'build', buildKind: 'yohaku' });
		const { lines } = buildExpectedResult(instance, { values: [''] });
		expect(JSON.stringify(lines)).toContain(EMPTY_GRID_TEXT);
	});
});

describe('évaluation notée', () => {
	it('l’énoncé envoyé garde la grille ; la solution de l’auteur ne fuit pas dans la réponse', () => {
		const full = generate(template({ statement: ENONCE }));
		const { statement } = toPublicQuestion(full, { position: 0, delaySeconds: 20 });
		const marque = statement.split('```yohaku\n')[1].split('\n```')[0];
		expect(parseYohakuContent(marque).caseIndex).toBe(0);
		expect(findUnmaskedAnswers(statement)).toEqual([]);
	});
});
