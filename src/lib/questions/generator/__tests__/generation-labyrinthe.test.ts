/**
 * Question « labyrinthe à parcourir » (bloc ```labyrinthe + `parcourir: oui`, chantier
 * `labyrinthe` ; journal `docs/wip/labyrinthe-progress.md`)
 *
 * Une case par bloc ; le générateur pose une graine dans le bloc (chaque instance a son
 * labyrinthe) ; réponse attendue = la grille, l'entrée et le bon chemin (`6x4 2 | 2,1 …`),
 * jamais écrite dans le modèle ; le chemin de l'élève est jugé sur la règle.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import { isBlankValueCorrect, validateAnswer } from '#lib/utils/answer-validator.ts';
import { buildExpectedResult, EMPTY_PATH_TEXT } from '../../expected-result';
import { toPublicQuestion } from '../../public-question';
import { findUnmaskedAnswers } from '../../masked-statement';
import { parseLabyrintheContent } from '#lib/ubumark/parser/labyrinthe-parser.ts';
import {
	ecrireChemin,
	LABYRINTHE_SORTIE,
	readExpectedLabyrintheAnswer
} from '#lib/ubumark/utils/labyrinthe-answer.ts';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-labyrinthe',
		title: 'Labyrinthe des nombres premiers',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['3'],
		level: 1
	} as QuestionTemplate;
}

const labyrinthe = (...body: string[]) => ['```labyrinthe', ...body, '```'].join('\n');
const GRILLE = ['grille: 6 x 4', 'règle: premier'];
const PARCOURIR = [...GRILLE, 'parcourir: oui'];
const ENONCE = `Trouve la sortie en ne passant que par des nombres premiers.\n\n${labyrinthe(...PARCOURIR)}`;

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

/** Le bloc de l'énoncé d'une instance, analysé */
function blocDe(statement: string) {
	return parseLabyrintheContent(statement.split('```labyrinthe\n')[1].split('\n```')[0]);
}

describe('assignBlankIndices — labyrinthe à parcourir', () => {
	it('une case texte, `case:` posée dans le bloc', () => {
		const result = assignBlankIndices(labyrinthe(...PARCOURIR));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(labyrinthe('case: 0', ...PARCOURIR));
		expect(result.buildBlanks).toEqual({
			0: { kind: 'labyrinthe', source: PARCOURIR.join('\n') }
		});
	});

	it('labyrinthe d’affichage (sans parcourir) : aucune case', () => {
		const result = assignBlankIndices(labyrinthe(...GRILLE));
		expect(result.totalBlanks).toBe(0);
	});

	it('bloc dans une liste : pas de case, signalé', () => {
		const statement = [
			'- Trouve la sortie :',
			'',
			'  ```labyrinthe',
			...PARCOURIR.map((l) => `  ${l}`),
			'  ```'
		].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors?.join(' ')).toMatch(
			/Un labyrinthe à parcourir doit être au premier niveau/
		);
	});

	it('labyrinthe à parcourir comme option d’un bloc choix : refusé', () => {
		const option = ['- ```labyrinthe', ...PARCOURIR.map((l) => `  ${l}`), '  ```'];
		const result = assignBlankIndices(['````choix', ...option, '- non', '````'].join('\n'));
		expect(result.choiceErrors?.join(' ')).toMatch(/premier niveau/);
	});
});

describe('labyrinthe à parcourir : la case et sa réponse', () => {
	it('graine posée dans le bloc, réponse = la grille et le bon chemin', () => {
		const instance = generate(template({ statement: ENONCE }));
		const node = blocDe(instance.statement);
		expect(node.errors).toEqual([]);
		expect(node.source).toMatch(/^graine: \d+$/m);
		const blank = instance.blanks![0];
		expect([blank.type, blank.construire]).toEqual(['text', 'labyrinthe']);
		const lu = readExpectedLabyrintheAnswer(blank.expectedAnswer);
		// La grille du juge est celle que l'élève voit
		expect(lu?.chemin).toEqual(node.spec?.chemin);
		// `expectedAnswerLatex` est une réponse juste (contrat commun, rejoué par check-template)
		expect(blank.expectedAnswerLatex).toBe(ecrireChemin(node.spec!.chemin));
	});

	it('deux graines, deux labyrinthes ; même graine, le même', () => {
		const t = template({ statement: ENONCE });
		expect(generate(t, 1).statement).not.toBe(generate(t, 2).statement);
		expect(generate(t, 1).statement).toBe(generate(t, 1).statement);
	});

	it('le bon chemin est juste ; arrêté avant la sortie, faux et dit pourquoi', () => {
		const instance = generate(template({ statement: ENONCE }));
		const chemin = blocDe(instance.statement).spec!.chemin;
		const juste = ecrireChemin(chemin);
		expect(validateAnswer([juste], instance, [juste]).status).toBe('correct');
		expect(isBlankValueCorrect(juste, instance.blanks![0], instance)).toBe(true);
		const court = ecrireChemin(chemin.slice(0, -1));
		expect(validateAnswer([court], instance, [court]).feedback).toBe(LABYRINTHE_SORTIE);
		expect(validateAnswer([''], instance, ['']).isCorrect).toBe(false);
	});

	it('variables dans le bloc (règle tirée)', () => {
		const t = template({
			statement: labyrinthe('grille: 5 x 4', 'règle: multiple de {{d}}', 'parcourir: oui'),
			variables: [{ name: 'd', expression: '3..9' }]
		});
		for (let seed = 0; seed < 5; seed++) {
			expect(blocDe(generate(t, seed).statement).errors).toEqual([]);
		}
	});

	it('bloc mal écrit : refusé au prof', () => {
		expect(
			generationErrors(template({ statement: labyrinthe('règle: premier', 'parcourir: oui') }))
		).toMatch(/Case 1 \(labyrinthe à parcourir\).*il manque la ligne grille/);
	});

	it('`case:` écrite par le prof : refusée', () => {
		expect(generationErrors(template({ statement: labyrinthe('case: 0', ...PARCOURIR) }))).toMatch(
			/case: est posée automatiquement/
		);
	});

	it('réponse écrite dans blanks[] pour la case : refusée', () => {
		expect(
			generationErrors(
				template({ statement: labyrinthe(...PARCOURIR), blanks: [{ expectedAnswer: 'x' }] })
			)
		).toMatch(/Case 1.*chemin du labyrinthe/);
	});

	it('le validateur de modèle accepte une question sans blanks[] à labyrinthe', () => {
		const errors = validateTemplate(template({ statement: labyrinthe(...PARCOURIR) }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('copie corrigée : une ligne pour le bloc ; sans chemin, « aucun chemin »', () => {
		const instance = generate(template({ statement: ENONCE }));
		const builds = buildExpectedResult(instance, { values: ['1,1'] }).lines.filter(
			(l) => l.kind === 'build'
		);
		expect(builds).toHaveLength(1);
		expect(builds[0]).toMatchObject({ kind: 'build', buildKind: 'labyrinthe' });
		const { lines } = buildExpectedResult(instance, { values: [''] });
		expect(JSON.stringify(lines)).toContain(EMPTY_PATH_TEXT);
	});
});

describe('évaluation notée', () => {
	it('l’énoncé envoyé garde la grille et sa graine (le juge et l’écran voient la même)', () => {
		const full = generate(template({ statement: ENONCE }));
		const { statement } = toPublicQuestion(full, { position: 0, delaySeconds: 20 });
		const node = blocDe(statement);
		expect(node.errors).toEqual([]);
		expect(node.caseIndex).toBe(0);
		expect(findUnmaskedAnswers(statement)).toEqual([]);
	});
});
