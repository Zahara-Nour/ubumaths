/**
 * Garde de complexité (Q58) contre tout le corpus du dépôt
 * ========================================================
 *
 * Aucune réponse légitime ne doit être refusée par `isAnswerTooComplex` :
 * - réponses ATTENDUES : chaque variation de chaque modèle, plusieurs tirages ;
 * - réponses des SPECS de test (justes ou non : un élève peut les écrire).
 *
 * Sources : `docs/relecture/<lot>/*.json` (632 questions relues, instantané de la
 * base) et `scripts/questions/**\/*.json` (modèles écrits depuis). Les cases
 * « intervalles » ont leur propre garde et ne passent pas par celle-ci.
 *
 * Le test affiche le maximum observé de chaque mesure : les limites de
 * `ANSWER_COMPLEXITY_LIMITS` en gardent au moins trois fois la marge (pour
 * l'exposant, sur sa valeur : 4 chiffres admis, 2 observés).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';
import { draftTemplate, parseReviewFile } from '$lib/migration/review/review-file';
import { generateInstance } from '../generator/instance-generator';
import {
	ANSWER_COMPLEXITY_LIMITS,
	isAnswerTooComplex,
	measureAnswerComplexity,
	type AnswerComplexity
} from '../answer-complexity';
import type { QuestionTemplate } from '../types';

// Constantes
const RELECTURE_DIR = join(process.cwd(), 'docs/relecture');
const SCRIPTS_DIR = join(process.cwd(), 'scripts/questions');
/** Tirages par variation */
const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7];
/** Garde contre un corpus vide ou déplacé */
const MINIMUM_TEMPLATES = 650;
const MARGIN = 3;

// Functions
function jsonFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return jsonFiles(path);
		return name.endsWith('.json') ? [path] : [];
	});
}

function loadCorpus(): { source: string; template: QuestionTemplate }[] {
	const reviewed = jsonFiles(RELECTURE_DIR).flatMap((path) => {
		const source = relative(process.cwd(), path);
		const template = draftTemplate(
			parseReviewFile(JSON.parse(readFileSync(path, 'utf-8')), source)
		);
		return template ? [{ source, template }] : [];
	});
	const written = jsonFiles(SCRIPTS_DIR).map((path) => {
		const source = relative(process.cwd(), path);
		// Modèle brut, comme le lit `pnpm question:specs --file`
		const raw = JSON.parse(readFileSync(path, 'utf-8')) as QuestionTemplate;
		return { source, template: { ...raw, id: raw.id ?? source } };
	});
	return [...reviewed, ...written];
}

/** Toutes les réponses écrites que la garde verra pour ce modèle */
function answersOf(template: QuestionTemplate): string[] {
	const answers: string[] = [];
	for (const variation of template.variations) {
		const single: QuestionTemplate = { ...template, variations: [variation] };
		for (const seed of SEEDS) {
			const result = generateInstance(single, seed);
			if (!result.success) continue;
			for (const blank of result.instance.blanks ?? []) {
				if (blank.answerKind !== 'intervalles') answers.push(blank.expectedAnswer);
			}
		}
	}
	for (const spec of template.testSpecs ?? []) answers.push(...(spec.answers ?? []));
	return answers.filter((answer) => answer.trim() !== '');
}

describe('garde de complexité — corpus du dépôt', () => {
	const corpus = loadCorpus();

	it(`contient au moins ${MINIMUM_TEMPLATES} modèles`, () => {
		expect(corpus.length).toBeGreaterThanOrEqual(MINIMUM_TEMPLATES);
	});

	it('ne refuse aucune réponse attendue ni aucune réponse de spec', () => {
		const refused: string[] = [];
		const max: AnswerComplexity = { length: 0, depth: 0, exponentDigits: 0 };
		const witness: Record<keyof AnswerComplexity, string> = {
			length: '',
			depth: '',
			exponentDigits: ''
		};
		let count = 0;
		for (const { source, template } of corpus) {
			for (const answer of answersOf(template)) {
				count++;
				const measure = measureAnswerComplexity(answer);
				for (const key of Object.keys(max) as (keyof AnswerComplexity)[]) {
					if (measure[key] > max[key]) {
						max[key] = measure[key];
						witness[key] = `${source} : ${answer}`;
					}
				}
				if (isAnswerTooComplex(answer)) refused.push(`${source} : ${answer}`);
			}
		}
		console.log(`${count} réponses mesurées ; maximum observé`, max, witness);

		expect(count).toBeGreaterThan(5000);
		expect(refused).toEqual([]);
		// Marge ≥ ×3 sur chaque mesure
		expect(ANSWER_COMPLEXITY_LIMITS.length).toBeGreaterThanOrEqual(MARGIN * max.length);
		expect(ANSWER_COMPLEXITY_LIMITS.depth).toBeGreaterThanOrEqual(MARGIN * max.depth);
		// Exposant : marge prise sur sa VALEUR (×3 sur le nombre de chiffres laisserait
		// passer des exposants à 6 chiffres, de l'ordre de 500 ms chacun)
		expect(10 ** ANSWER_COMPLEXITY_LIMITS.exponentDigits).toBeGreaterThanOrEqual(
			MARGIN * 10 ** max.exponentDigits
		);
	}, 300_000);
});
