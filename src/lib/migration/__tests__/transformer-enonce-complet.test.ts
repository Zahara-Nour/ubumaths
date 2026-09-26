/**
 * Énoncé complet : énoncé secondaire, expression, cases dans une formule
 * =====================================================================
 *
 * Ordre d'affichage TinyMath (`ui/Question.svelte`) : énoncé, énoncé
 * secondaire (`enounces2`), expression, puis ligne de réponse. Avant :
 * - `enounces2` n'était repris NULLE PART (38 questions ; #486 perdait le
 *   tableau de proportionnalité sans lequel on ne peut pas répondre) ;
 * - en mode « champ réponse », l'expression disparaissait (#554 : « Résous
 *   cette équation » sans l'équation) ;
 * - `$$x=...$$` ne donnait aucune case (seul `$$...$$` exact était reconnu).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformQuestion } from '../question-transformer';
import { convertTinyCASToNew } from '../syntax-converter';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

function instances(index: number, count = 10): QuestionInstance[] {
	const result = transformQuestion(questions[index], index);
	expect(result.success).toBe(true);
	const template = { ...result.template!, id: 't' } as QuestionTemplate;
	return Array.from({ length: count }, (_, i) => {
		const generated = generateInstance(template, i + 1);
		if (!generated.success) throw new Error(`#${index} : ${generated.errors.join('; ')}`);
		return generated.instance;
	});
}

function variable(instance: QuestionInstance, name: string): number {
	return Number(instance.resolvedVariables!.find((v) => v.name === name)!.value);
}

describe('#554 « Résous cette équation » (champ réponse `$$x=...$$`)', () => {
	it('affiche l’équation, une case, et accepte la solution', () => {
		for (const instance of instances(554)) {
			const [a, b] = ['a', 'b'].map((name) => variable(instance, name));
			const statement = String(instance.statement).replace(/\s/g, '');
			// L'équation (x+a=a+b ou a+x=a+b) est affichée
			expect(statement).toMatch(new RegExp(`x\\+${a}=${a + b}|${a}\\+x=${a + b}`));
			expect(instance.blanks).toHaveLength(1);
			expect(validateAnswer([String(b)], instance, [String(b)]).isCorrect).toBe(true);
			expect(validateAnswer([String(b + 1)], instance, [String(b + 1)]).isCorrect).toBe(false);
		}
	});
});

describe('#486 coefficient de proportionnalité (énoncé secondaire = tableau)', () => {
	it('affiche le tableau', () => {
		for (const instance of instances(486, 5)) {
			expect(String(instance.statement)).toContain('\\begin{array}');
		}
	});
});

describe('#487 énoncé secondaire identique au champ réponse', () => {
	it('un seul tableau (avec sa case), et la question génère', () => {
		for (const instance of instances(487, 5)) {
			const statement = String(instance.statement);
			expect(statement.match(/\\begin\{array\}/g)).toHaveLength(1);
			expect(statement).not.toContain('...');
			expect(instance.blanks).toHaveLength(1);
		}
	});
});

describe('les 38 questions à énoncé secondaire (`enounces2`)', () => {
	it('le reprennent toutes dans l’énoncé transformé', () => {
		const missing: number[] = [];
		let checked = 0;
		for (const question of questions.filter((q) => q.enounces2?.length)) {
			const { globalIndex } = question._migration;
			const template = transformQuestion(question, globalIndex).template;
			const statements = JSON.stringify([
				template?.shared?.statement,
				template?.variations.map((v) => v.statement)
			]).replace(/\s|\$/g, '');
			// Un fragment distinctif de l'énoncé secondaire converti
			const converted = (convertTinyCASToNew(question.enounces2![0]).converted ?? '')
				.replace(/\s|\$/g, '')
				.slice(0, 15);
			// Sauf s'il est identique au champ réponse (#487-489), déjà affiché par lui
			const sameAsField = question.enounces2![0].trim() === question.answerFields?.[0]?.trim();
			const shown = statements.includes(JSON.stringify(converted).slice(1, -1));
			if (!shown && !sameAsField) missing.push(globalIndex);
			checked++;
		}
		expect(checked).toBe(38);
		expect(missing).toEqual([]);
	});
});
